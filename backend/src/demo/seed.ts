import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Database } from "../database/database";
import { AuthService } from "../auth/auth.module";
import { ProfilesService } from "../profiles/profiles.module";
import { MissionsService } from "../missions/missions.service";
import { projectRoot } from "../config";
export async function seedDemo(db: Database) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Demo seed prohibited in production");
  const auth = new AuthService(db),
    created: any[] = [];
  const users: any = {};
  for (const role of ["NURSE", "AGENCY", "ESTABLISHMENT"]) {
    const email = role.toLowerCase() + ".demo@example.invalid";
    const [existing] = await db.query(
      "SELECT id,family FROM account WHERE email=$1",
      [email],
    );
    let a = existing;
    if (!a) {
      const password = randomBytes(20).toString("base64url");
      a = await auth.register({
        email,
        password,
        family: role === "NURSE" ? "NURSE" : "ENTERPRISE",
        termsVersion: "2026-09-14",
        ...(role === "NURSE"
          ? {}
          : {
              organizationType: role,
              name: "FICTIF " + role,
              address: "1 rue de demonstration, Paris",
              referent: "Contact fictif",
              ...(role === "ESTABLISHMENT"
                ? { finess: "000000001" }
                : { siret: "00000000000001" }),
            }),
      });
      created.push({ role, email, password });
    }
    const [org] = await db.query(
      "SELECT organization_id FROM membership WHERE user_id=$1",
      [a.id],
    );
    users[role] = { id: a.id, organizationId: org?.organization_id };
  }
  const agency = users.AGENCY.organizationId,
    facility = users.ESTABLISHMENT.organizationId;
  await db.query(
    "INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [agency, facility],
  );
  const [existingMission] = await db.query(
    "SELECT id FROM mission WHERE agency_id=$1 AND title='Mission IDE FICTIVE de demonstration' LIMIT 1",
    [agency],
  );
  if (!existingMission) {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 2);
    start.setUTCHours(19, 0, 0, 0);
    const end = new Date(start.getTime() + 10 * 3600000);
    const slot = { start: start.toISOString(), end: end.toISOString() };
    await new ProfilesService(db).update(users.NURSE.id, {
      displayName: "Infirmier FICTIF",
      qualifications: ["IDE"],
      skills: ["TRIAGE"],
      experience: [],
      available: [slot],
      unavailable: [],
      latitude: 48.8566,
      longitude: 2.3522,
      radiusKm: 30,
      acceptedShifts: ["NIGHT"],
      preferredShifts: ["NIGHT"],
      visible: true,
    });
    const service = new MissionsService(db);
    const m = await service.create(users.AGENCY.id, {
      agencyId: agency,
      establishmentId: facility,
      title: "Mission IDE FICTIVE de demonstration",
      description: "Jeu de demonstration fictif. Aucun recrutement reel.",
      qualification: "IDE",
      service: "URGENCES",
      population: "ADULT",
      block: "NONE",
      requiredSkills: ["TRIAGE"],
      desiredSkills: [],
      minExperienceMonths: 0,
      ...slot,
      shift: "NIGHT",
      address: "Lieu fictif, Paris",
      latitude: 48.8566,
      longitude: 2.3522,
      hourlySalary: 25,
    });
    await service.transition(users.AGENCY.id, m.id, "publish");
  }
  if (created.length) {
    await mkdir(resolve(projectRoot, "data"), { recursive: true });
    await writeFile(
      resolve(projectRoot, "data/demo-credentials-" + Date.now() + ".json"),
      JSON.stringify(created, null, 2),
      { flag: "wx", mode: 0o600 },
    );
  }
  return {
    accountsCreated: created.length,
    credentials: "data/demo-credentials-*.json (local only)",
    rpps: "NOT_CHECKED: no fabricated provider verification",
  };
}
