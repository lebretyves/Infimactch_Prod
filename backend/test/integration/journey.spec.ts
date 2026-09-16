import { normalizeOffer } from "../../src/public-data/offers";
import {
  AutomationService,
  retryOutbox,
} from "../../src/automation/automation.module";
import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { projectRoot } from "../../src/config";
import { DocumentsService } from "../../src/documents/documents.module";
import { MatchingService } from "../../src/matching/matching.module";
import { missionSelect } from "../../src/missions/missions.service";
import { RppsService, RppsResult } from "../../src/profiles/rpps";
import { test, before as beforeAll, after as afterAll } from "node:test";
import { expect } from "expect";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApp } from "../../src/app";
import { Database, queueProfileMatches } from "../../src/database/database";
let app: INestApplication, db: Database;
const clients: any[] = [];
async function account(family: string, kind?: string) {
  const agent = request.agent(app.getHttpServer());
  const csrf = await agent.get("/api/v1/auth/csrf").expect(200);
  const body: any = {
    email: randomUUID() + "@example.invalid",
    password: "Fictional-test-password-123",
    family,
    termsVersion: "2026-09-14",
  };
  if (kind)
    Object.assign(body, {
      organizationType: kind,
      name: "FICTIF " + kind,
      address: "1 rue fictive Paris",
      referent: "Contact fictif",
      ...(kind === "ESTABLISHMENT"
        ? { finess: "000000001" }
        : { siret: "00000000000001" }),
    });
  const reg = await agent
    .post("/api/v1/auth/register")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .set("Idempotency-Key", randomUUID())
    .send(body)
    .expect(201);
  const me = await agent.get("/api/v1/auth/me").expect(200);
  const client = {
    agent,
    id: reg.body.user.id,
    email: body.email,
    password: body.password,
    cookie: reg.headers["set-cookie"]![0]!.split(";")[0]!,
    token: reg.body.csrfToken,
    org: me.body.organizations[0]?.id,
  };
  clients.push(client);
  return client;
}
async function workflow(path: string, eventId?: string) {
  const response = await fetch(process.env.N8N_WEBHOOK_BASE! + "/" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-InfiMatch-Token": process.env.SERVICE_TOKEN!,
    },
    body: JSON.stringify({ eventId }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.text();
  expect(response.status).toBe(200);
  return JSON.parse(body);
}
function post(c: any, path: string, body: any = {}) {
  return c.agent
    .post("/api/v1/" + path)
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", c.token)
    .set("Idempotency-Key", randomUUID())
    .send(body);
}
beforeAll(async () => {
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  db = app.get(Database);
});
afterAll(async () => {
  await app?.close();
});
test("full internal journey and concurrency, with isolated fixture RPPS", async () => {
  const agency = await account("ENTERPRISE", "AGENCY"),
    facility = await account("ENTERPRISE", "ESTABLISHMENT"),
    outsider = await account("ENTERPRISE", "AGENCY"),
    n = await account("NURSE"),
    n2 = await account("NURSE");
  await db.query(
    "INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2)",
    [agency.org, facility.org],
  );
  const slot = { start: "2030-01-10T20:00:00Z", end: "2030-01-11T06:00:00Z" };
  const profile = {
    displayName: "Infirmier FICTIF",
    qualifications: ["IDE"],
    skills: ["TRIAGE"],
    experience: [],
    available: [slot],
    unavailable: [],
    latitude: 48,
    longitude: 2,
    radiusKm: 30,
    acceptedShifts: ["NIGHT"],
    preferredShifts: ["NIGHT"],
    visible: true,
  };
  for (const c of [n, n2]) {
    await c.agent
      .put("/api/v1/profile")
      .set("Origin", process.env.APP_ORIGIN!)
      .set("X-CSRF-Token", c.token)
      .set("Idempotency-Key", randomUUID())
      .send({ ...profile, verified: true })
      .expect(400);
    await c.agent
      .put("/api/v1/profile")
      .set("Origin", process.env.APP_ORIGIN!)
      .set("X-CSRF-Token", c.token)
      .set("Idempotency-Key", randomUUID())
      .send(profile)
      .expect(200);
  }
  await post(n, "internal/automation/reminders").expect(401);
  const dto = {
    ...slot,
    agencyId: agency.org,
    establishmentId: facility.org,
    title: "Mission FICTIVE",
    description: "Description de demonstration fictive",
    qualification: "IDE",
    service: "URGENCES",
    population: "ADULT",
    block: "NONE",
    requiredSkills: ["TRIAGE"],
    desiredSkills: [],
    minExperienceMonths: 0,
    shift: "NIGHT",
    address: "Lieu fictif Paris",
    latitude: 48,
    longitude: 2,
    hourlySalary: 25,
  };
  await post(outsider, "missions", dto).expect(404);
  const denied = await db.query(
    "SELECT details FROM audit WHERE actor_id=$1 AND event='ACCESS_DENIED' ORDER BY id DESC LIMIT 1",
    [outsider.id],
  );
  expect(denied[0].details).toMatchObject({
    method: "POST",
    path: "/api/v1/missions",
    status: 404,
  });
  const created = await post(agency, "missions", dto).expect(201),
    id = created.body.id;
  await post(agency, "missions/" + id + "/publish").expect(201);
  await post(n, "missions/" + id + "/applications", { version: 1 }).expect(409);
  // Integration fixture only: no public endpoint can set FOUND. No real RPPS lookup claimed.
  await db.query(
    "UPDATE profile SET rpps_status='FOUND',rpps_number='10000000001' WHERE user_id IN($1,$2)",
    [n.id, n2.id],
  );
  await db.transaction((em) => queueProfileMatches(em, n.id));
  const matches = await n.agent.get("/api/v1/me/matches?limit=50").expect(200);
  const explanation = matches.body.items.find((x: any) => x.missionId === id);
  expect(explanation.historyStatus).toBe("SAVED");
  const saved = await n.agent
    .get("/api/v1/matches/" + explanation.explanationId + "/explanation")
    .expect(200);
  expect(saved.body.stale).toBe(false);
  await n2.agent
    .get("/api/v1/matches/" + explanation.explanationId + "/explanation")
    .expect(404);
  const listing = await post(n, "listings/search", {
    qualifications: ["IDE"],
    ideServices: ["URGENCES"],
    latitude: 48,
    longitude: 2,
    radiusKm: 30,
  }).expect(201);
  expect(listing.body.items.some((x: any) => x.id === "m_" + id)).toBe(true);
  const [external] = await db.query(
    "INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance) VALUES('TEST_FIXTURE',$1,'Offre IDE FICTIVE','Donnees synthetiques de test','https://example.invalid/fictif','Paris','IDE','fixture','{\"fictional\":true}') RETURNING id",
    [randomUUID()],
  );
  const normalized = normalizeOffer({
    id: "HTTP_FIXTURE",
    intitule: "IDE H/F",
    description: "Mission fictive",
    typeContrat: "MIS",
    lieuTravail: { libelle: "Paris", commune: "75115" },
  });
  await db.query("UPDATE external_offer SET provenance=$1 WHERE id=$2", [
    JSON.stringify(normalized.provenance),
    external.id,
  ]);
  const common = await post(n, "listings/search", {
    qualifications: ["IDE"],
    limit: 50,
  }).expect(201);
  expect(
    common.body.items.find((x: any) => x.id === "e_" + external.id)
      .applicationMode,
  ).toBe("REDIRECT");
  const externalDetail = await request(app.getHttpServer())
    .get("/api/v1/listings/e_" + external.id)
    .expect(200);
  const externalPage = await request(app.getHttpServer())
    .get("/api/v1/listings/external?limit=50")
    .expect(200);
  for (const item of [
    common.body.items.find((x: any) => x.id === "e_" + external.id),
    externalDetail.body,
    externalPage.body.items.find((x: any) => x.id === "e_" + external.id),
  ]) {
    expect(item.correspondence).toMatchObject({
      mode: "EXTERNAL_CRITERIA",
      score: null,
      eligibilityVerified: false,
    });
    expect(item.correspondence.criteria.qualification).toEqual({
      value: "IDE",
      status: "PROVIDER_REPORTED",
    });
    expect(item.raw_hash).toBeUndefined();
  }
  await post(n, "me/favorites", {
    kind: "EXTERNAL",
    targetId: external.id,
  }).expect(201);
  await post(n, "me/favorites", {
    kind: "EXTERNAL",
    targetId: external.id,
  }).expect(201);
  await db.query("UPDATE external_offer SET active=false WHERE id=$1", [
    external.id,
  ]);
  const favorites = await n.agent.get("/api/v1/me/favorites").expect(200);
  expect(
    favorites.body.filter((x: any) => x.target_id === external.id),
  ).toHaveLength(1);
  expect(
    favorites.body.find((x: any) => x.target_id === external.id).active,
  ).toBe(false);
  const documentBody = {
    mime: "application/pdf",
    contentBase64: Buffer.from("%PDF-1.7 FICTIONAL TEST DOCUMENT").toString(
      "base64",
    ),
    fictional: true,
  };
  await n.agent
    .post("/api/v1/me/documents")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", n.token)
    .send(documentBody)
    .expect(400);
  const documentKey = randomUUID();
  const upload = () =>
    n.agent
      .post("/api/v1/me/documents")
      .set("Origin", process.env.APP_ORIGIN!)
      .set("X-CSRF-Token", n.token)
      .set("Idempotency-Key", documentKey)
      .send(documentBody)
      .expect(201);
  const [document, documentReplay] = await Promise.all([upload(), upload()]);
  expect(documentReplay.body.id).toBe(document.body.id);
  await n.agent
    .post("/api/v1/me/documents")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", n.token)
    .set("Idempotency-Key", documentKey)
    .send({
      ...documentBody,
      contentBase64: Buffer.from("%PDF-1.7 DIFFERENT FICTIONAL TEST").toString(
        "base64",
      ),
    })
    .expect(409);
  await n2.agent.get("/api/v1/me/documents/" + document.body.id).expect(404);
  await n.agent.get("/api/v1/me/documents/" + document.body.id).expect(200);
  const [opened] = await db.query(
    "SELECT id FROM outbox WHERE event='MatchRequested' AND payload->>'missionId'=$1 ORDER BY created_at DESC LIMIT 1",
    [id],
  );
  expect(["PROCESSED", "ALREADY_PROCESSED"]).toContain(
    (await workflow("matches", opened.id)).status,
  );
  expect((await workflow("matches", opened.id)).status).toBe(
    "ALREADY_PROCESSED",
  );
  const notifications = await db.query(
    "SELECT id FROM notification WHERE user_id=$1 AND event_id=$2 AND kind='MATCH'",
    [n.id, opened.id],
  );
  expect(notifications.length).toBe(1);
  await post(n2, "me/notifications/" + notifications[0]!.id + "/read").expect(
    404,
  );
  await post(n, "me/notifications/" + notifications[0]!.id + "/read").expect(
    201,
  );
  await db.query(
    "UPDATE mission SET created_at=now()-interval '2 hours' WHERE id=$1",
    [id],
  );
  await workflow("reminders");
  expect(
    (await db.query("SELECT * FROM reminder_window WHERE mission_id=$1", [id]))
      .length,
  ).toBe(1);
  const a = await post(n, "missions/" + id + "/applications", {
    version: 1,
  }).expect(201);
  const b = await post(n2, "missions/" + id + "/applications", {
    version: 1,
  }).expect(201);
  await post(facility, "missions/" + id + "/assignments", {
    applicationId: a.body.id,
  })
    .set("Idempotency-Key", "unauthorized")
    .expect(404);
  const results = await Promise.all([
    post(agency, "missions/" + id + "/assignments", {
      applicationId: a.body.id,
    }).set("Idempotency-Key", "assign-a"),
    post(agency, "missions/" + id + "/assignments", {
      applicationId: b.body.id,
    }).set("Idempotency-Key", "assign-b"),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  const stale = await n.agent
    .get("/api/v1/matches/" + explanation.explanationId + "/explanation")
    .expect(200);
  expect(stale.body.stale).toBe(true);
  await app
    .get(MatchingService)
    .runs.updateOne(
      { _id: explanation.explanationId },
      { $set: { expiresAt: new Date(0) } },
    );
  await n.agent
    .get("/api/v1/matches/" + explanation.explanationId + "/explanation")
    .expect(404);
  const winner = results.find((r) => r.status === 201)!;
  const winnerApplication = winner.body.application_id,
    winningKey = winnerApplication === a.body.id ? "assign-a" : "assign-b";
  const replay = await post(agency, "missions/" + id + "/assignments", {
    applicationId: winnerApplication,
  })
    .set("Idempotency-Key", winningKey)
    .expect(201);
  expect(replay.body.id).toBe(winner.body.id);
  await post(agency, "missions/" + id + "/assignments", {
    applicationId: randomUUID(),
  })
    .set("Idempotency-Key", winningKey)
    .expect(409);
  expect(
    await db.query(
      "SELECT * FROM assignment WHERE mission_id=$1 AND status='ACTIVE'",
      [id],
    ),
  ).toHaveLength(1);
  expect(
    await db.query(
      "SELECT * FROM outbox WHERE event='AssignmentCreated' AND payload->>'missionId'=$1",
      [id],
    ),
  ).toHaveLength(1);
  const [assignedEvent] = await db.query(
    "SELECT id FROM outbox WHERE event='AssignmentCreated' AND payload->>'missionId'=$1",
    [id],
  );
  const confirmation = await workflow("confirmation", assignedEvent.id);
  expect(confirmation.status).toBe("READY");
  expect((await workflow("confirmation", assignedEvent.id)).documentId).toBe(
    confirmation.documentId,
  );
  await (winnerApplication === a.body.id ? n : n2).agent
    .get("/api/v1/me/documents/" + confirmation.documentId)
    .expect(200);
  await outsider.agent
    .get("/api/v1/me/documents/" + confirmation.documentId)
    .expect(404);
  await workflow("reminders");
  expect(
    (await db.query("SELECT * FROM reminder_window WHERE mission_id=$1", [id]))
      .length,
  ).toBe(1);
  await post(
    winnerApplication === a.body.id ? n : n2,
    "applications/" + winnerApplication + "/withdrawal",
  ).expect(409);
  const assignedNurse = winnerApplication === a.body.id ? n : n2;
  await assignedNurse.agent
    .put("/api/v1/profile")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", assignedNurse.token)
    .set("Idempotency-Key", randomUUID())
    .send({ ...profile, available: [] })
    .expect(409);
  const bankKey = randomUUID();
  const bank = await n.agent
    .put("/api/v1/me/bank-details")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", n.token)
    .set("Idempotency-Key", bankKey)
    .send({ iban: "FR001234567890DEMO12345678", fictional: true })
    .expect(200);
  const bankReplay = await n.agent
    .put("/api/v1/me/bank-details")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", n.token)
    .set("Idempotency-Key", bankKey)
    .send({ iban: "FR001234567890DEMO12345678", fictional: true })
    .expect(200);
  expect(bankReplay.body.id).toBe(bank.body.id);
  await n.agent
    .put("/api/v1/me/bank-details")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", n.token)
    .set("Idempotency-Key", bankKey)
    .send({ iban: "FR991234567890DEMO87654321", fictional: true })
    .expect(409);
  const replacementBank = await n.agent
    .put("/api/v1/me/bank-details")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", n.token)
    .set("Idempotency-Key", randomUUID())
    .send({ iban: "FR111111111111DEMO11111111", fictional: true })
    .expect(200);
  expect(replacementBank.body.id).not.toBe(bank.body.id);
  const [supersededBank] = await db.query(
    "SELECT superseded_at FROM document WHERE id=$1",
    [bank.body.id],
  );
  expect(supersededBank.superseded_at).not.toBeNull();
  await n.agent.get("/api/v1/me/documents/" + bank.body.id).expect(404);
  const bankRead = await n.agent.get("/api/v1/me/bank-details").expect(200);
  expect(bankRead.body.iban).not.toContain("DEMO");
  expect(bankRead.body.iban.endsWith("1111")).toBe(true);
  await post(agency, "missions/" + id + "/cancel").expect(201);
  const cancelledConfirmation = await agency.agent
    .get("/api/v1/assignments/" + winner.body.id + "/confirmation")
    .expect(200);
  expect(cancelledConfirmation.body.status).toBe("CANCELLED");
  expect(
    (
      await db.query("SELECT status FROM assignment WHERE id=$1", [
        winner.body.id,
      ])
    )[0].status,
  ).toBe("CANCELLED");
  await post(agency, "missions/" + id + "/reopen").expect(201);
  await post(agency, "missions/" + id + "/publish").expect(201);
  await post(agency, "missions/" + id + "/assignments", {
    applicationId: winnerApplication,
  })
    .set("Idempotency-Key", "stale")
    .expect(409);
  await post(n, "missions/" + id + "/applications", { version: 2 }).expect(201);
  await post(n, "auth/logout").expect(201);
  await n.agent.get("/api/v1/auth/me").expect(401);
  await request(app.getHttpServer())
    .get("/api/v1/auth/me")
    .set("Cookie", n.cookie)
    .expect(401);
  const csrf = await n.agent.get("/api/v1/auth/csrf").expect(200);
  n.token = csrf.body.csrfToken;
  await post(n, "auth/login", {
    email: n.email,
    password: "Wrong-password-123",
  }).expect(401);
  const login = await post(n, "auth/login", {
    email: n.email,
    password: n.password,
  }).expect(201);
  expect(login.headers["set-cookie"][0].split(";")[0]).not.toBe(n.cookie);
  await n.agent.get("/api/v1/auth/me").expect(200);
  await db.query(
    "UPDATE session SET expire=now()-interval '1 second' WHERE sess->>'userId'=$1",
    [n.id],
  );
  await n.agent.get("/api/v1/auth/me").expect(401);
});
test("CSRF required before registration", async () => {
  await request(app.getHttpServer())
    .post("/api/v1/auth/register")
    .send({})
    .expect(403);
});

test("account revocation invalidates sessions and disabled login stays generic", async () => {
  const client = await account("NURSE");
  await client.agent.get("/api/v1/profile").expect(200);
  await db.query(
    "UPDATE account SET session_version=session_version+1 WHERE id=$1",
    [client.id],
  );
  await client.agent.get("/api/v1/profile").expect(401);

  const csrf = await client.agent.get("/api/v1/auth/csrf").expect(200);
  const login = await client.agent
    .post("/api/v1/auth/login")
    .set("Origin", process.env.APP_ORIGIN!)
    .set("X-CSRF-Token", csrf.body.csrfToken)
    .send({ email: client.email, password: client.password })
    .expect(201);
  client.token = login.body.csrfToken;
  await client.agent.get("/api/v1/profile").expect(200);

  await db.query(
    "UPDATE account SET active=false,session_version=session_version+1 WHERE id=$1",
    [client.id],
  );
  try {
    await client.agent.get("/api/v1/profile").expect(401);
    const retryCsrf = await client.agent.get("/api/v1/auth/csrf").expect(200);
    const refused = await client.agent
      .post("/api/v1/auth/login")
      .set("Origin", process.env.APP_ORIGIN!)
      .set("X-CSRF-Token", retryCsrf.body.csrfToken)
      .send({ email: client.email, password: client.password })
      .expect(401);
    expect(refused.body.message).toBe("Invalid credentials");
    const rejected = await db.query(
      "SELECT id FROM audit WHERE actor_id=$1 AND event='ACCOUNT_SESSION_REJECTED'",
      [client.id],
    );
    expect(rejected.length).toBeGreaterThanOrEqual(2);
  } finally {
    await db.query(
      "UPDATE account SET active=true,session_version=session_version+1 WHERE id=$1",
      [client.id],
    );
  }
});

test("a late RPPS answer cannot overwrite a newer number", async () => {
  const n = await account("NURSE");
  let release!: (v: RppsResult) => void;
  let started!: () => void;
  const initiated = new Promise<void>((r) => (started = r));
  class Controlled extends RppsService {
    protected override async lookup(number: string): Promise<RppsResult> {
      if (number === "10000000001") {
        started();
        return new Promise((r) => (release = r));
      }
      return { status: "NOT_FOUND", reason: "FIXTURE" };
    }
  }
  const service = new Controlled(db);
  const first = service.verify(n.id, "10000000001");
  await initiated;
  expect((await service.verify(n.id, "10000000002")).status).toBe("NOT_FOUND");
  release({ status: "FOUND", reason: "FIXTURE" });
  expect((await first).status).toBe("STALE_RESULT_IGNORED");
  const [profile] = await db.query(
    "SELECT rpps_number,rpps_status FROM profile WHERE user_id=$1",
    [n.id],
  );
  expect(profile).toMatchObject({
    rpps_number: "10000000002",
    rpps_status: "NOT_FOUND",
  });
});

test("PostgreSQL exclusion is a backstop against overlapping active assignments", async () => {
  const [template] = await db.query(
    "SELECT id FROM mission ORDER BY created_at DESC LIMIT 1",
  );
  const [p] = await db.query(
    "SELECT user_id FROM profile ORDER BY user_id LIMIT 1",
  );
  const ids = [randomUUID(), randomUUID()];
  await expect(
    db.transaction(async (em) => {
      for (const id of ids) {
        await em.query(
          "INSERT INTO mission(id,agency_id,establishment_id,title,description,qualification,service,population,block,required_skills,desired_skills,min_experience_months,start_at,end_at,shift,address,location,hourly_salary,status) SELECT $1,agency_id,establishment_id,title,description,qualification,service,population,block,required_skills,desired_skills,min_experience_months,start_at,end_at,shift,address,location,hourly_salary,'FILLED' FROM mission WHERE id=$2",
          [id, template.id],
        );
        const [a] = await em.query(
          "INSERT INTO application(mission_id,nurse_id,consent_version,status) VALUES($1,$2,1,'ACCEPTED') RETURNING id",
          [id, p.user_id],
        );
        await em.query(
          "INSERT INTO assignment(mission_id,nurse_id,application_id,start_at,end_at) SELECT id,$2,$3,start_at,end_at FROM mission WHERE id=$1",
          [id, p.user_id, a.id],
        );
      }
    }),
  ).rejects.toMatchObject({ code: "23P01" });
  expect(
    await db.query("SELECT id FROM mission WHERE id=ANY($1)", [ids]),
  ).toHaveLength(0);
});

test("MongoDB failure returns an explicit degraded result and an audit trace", async () => {
  const actor = clients.find((c) => !c.org).id;
  const [p] = await db.query("SELECT * FROM profile WHERE user_id=$1", [actor]);
  const [m] = await db.query(missionSelect + " ORDER BY m.id LIMIT 1");
  const service = app.get(MatchingService);
  await service.connection.close();
  const result = await service.calculate(actor, m, p, []);
  expect(result.historyStatus).toBe("UNAVAILABLE");
  expect(result.explanationId).toBe(null);
  await expect(
    service.explanation(actor, "000000000000000000000000"),
  ).rejects.toMatchObject({ status: 503 });
  const rows = await db.query(
    "SELECT id FROM audit WHERE actor_id=$1 AND event='MATCHING_HISTORY_UNAVAILABLE'",
    [actor],
  );
  expect(rows.length).toBeGreaterThan(0);
});

test("an ended assignment completes atomically and cannot be reopened", async () => {
  const agency = clients[0],
    n = clients.find((c) => !c.org);
  const id = randomUUID();
  const [template] = await db.query(
    "SELECT id FROM mission WHERE agency_id=$1 LIMIT 1",
    [agency.org],
  );
  await db.transaction(async (em) => {
    await em.query(
      "INSERT INTO mission(id,agency_id,establishment_id,title,description,qualification,service,population,block,required_skills,desired_skills,min_experience_months,start_at,end_at,shift,address,location,hourly_salary,status) SELECT $1,agency_id,establishment_id,'FICTIF ended mission',description,qualification,service,population,block,required_skills,desired_skills,min_experience_months,now()-interval '2 hours',now()-interval '1 hour',shift,address,location,hourly_salary,'FILLED' FROM mission WHERE id=$2",
      [id, template.id],
    );
    const [a] = await em.query(
      "INSERT INTO application(mission_id,nurse_id,consent_version,status) VALUES($1,$2,1,'ACCEPTED') RETURNING id",
      [id, n.id],
    );
    await em.query(
      "INSERT INTO assignment(mission_id,nurse_id,application_id,start_at,end_at) SELECT id,$2,$3,start_at,end_at FROM mission WHERE id=$1",
      [id, n.id, a.id],
    );
  });
  await post(agency, "missions/" + id + "/complete").expect(201);
  const [row] = await db.query(
    "SELECT m.status AS mission,a.status AS assignment FROM mission m JOIN assignment a ON a.mission_id=m.id WHERE m.id=$1",
    [id],
  );
  expect(row).toEqual({ mission: "COMPLETED", assignment: "COMPLETED" });
  await post(agency, "missions/" + id + "/reopen").expect(409);
});

test("document key rotation reads previous versions and writes the active version", async () => {
  const actor = clients.find((c) => !c.org).id;
  const original = process.env.DOCUMENT_KEY!,
    version = process.env.DOCUMENT_KEY_VERSION,
    previous = process.env.DOCUMENT_KEY_V1;
  const [old] = await db.query(
    "SELECT id FROM document WHERE owner_id=$1 AND kind='EVIDENCE' AND status='READY' LIMIT 1",
    [actor],
  );
  let created: string | undefined;
  try {
    process.env.DOCUMENT_KEY_VERSION = "2";
    process.env.DOCUMENT_KEY_V1 = original;
    process.env.DOCUMENT_KEY = randomBytes(32).toString("base64");
    const rotated = new DocumentsService(db);
    expect(
      (await rotated.read(actor, old.id)).data.subarray(0, 5).toString(),
    ).toBe("%PDF-");
    const content = Buffer.from("%PDF-1.7 FICTIONAL ROTATION TEST");
    const result = await rotated.store(
      actor,
      "EVIDENCE",
      "application/pdf",
      content,
    );
    created = result.id;
    expect((await rotated.read(actor, created)).data).toEqual(content);
    expect(
      (
        await db.query("SELECT key_version FROM document WHERE id=$1", [
          created,
        ])
      )[0].key_version,
    ).toBe(2);
  } finally {
    process.env.DOCUMENT_KEY = original;
    if (version === undefined) delete process.env.DOCUMENT_KEY_VERSION;
    else process.env.DOCUMENT_KEY_VERSION = version;
    if (previous === undefined) delete process.env.DOCUMENT_KEY_V1;
    else process.env.DOCUMENT_KEY_V1 = previous;
    if (created) {
      await db.query("DELETE FROM document WHERE id=$1", [created]);
      await rm(resolve(process.env.DOCUMENT_DIRECTORY || resolve(projectRoot, "data/documents"), created + ".bin"), {
        force: true,
      });
    }
  }
});

test("secondary lists paginate, reject invalid limits and protect private caching", async () => {
  const n = clients[4],
    agency = clients[0],
    outsider = clients[2];
  await db.query(
    "INSERT INTO notification(user_id,kind,message) SELECT $1,'TEST','FICTIF page '||g FROM generate_series(1,53) g",
    [n.id],
  );
  const first = await n.agent
    .get("/api/v1/me/notifications?limit=20&offset=0")
    .expect(200);
  const second = await n.agent
    .get("/api/v1/me/notifications?limit=20&offset=20")
    .expect(200);
  expect(first.body.length).toBe(20);
  expect(second.body.length).toBe(20);
  expect(
    first.body.some((a: any) => second.body.some((b: any) => a.id === b.id)),
  ).toBe(false);
  expect(first.headers["cache-control"]).toBe("no-store");
  for (const [client, path] of [
    [n, "me/favorites"],
    [n, "me/history"],
    [n, "me/documents"],
    [n, "me/notifications"],
    [n, "me/applications"],
    [agency, "missions"],
    [agency, "staffing-requests"],
  ]) {
    await client.agent.get("/api/v1/" + path + "?limit=51").expect(400);
    await client.agent.get("/api/v1/" + path + "?offset=-1").expect(400);
  }
  const fixtures = await db.query(
    "INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash) VALUES('PAGINATION_FIXTURE',$1,'Offre fictive A','Test pagination','https://example.invalid/a','Paris','IDE','fixture-a'),('PAGINATION_FIXTURE',$2,'Offre fictive B','Test pagination','https://example.invalid/b','Paris','IDE','fixture-b') RETURNING id",
    [randomUUID(), randomUUID()],
  );
  try {
    const external1 = await request(app.getHttpServer())
      .get("/api/v1/listings/external?limit=1&offset=0")
      .expect(200);
    const external2 = await request(app.getHttpServer())
      .get("/api/v1/listings/external?limit=1&offset=1")
      .expect(200);
    expect(external1.body.items[0].id).not.toBe(external2.body.items[0].id);
  } finally {
    await db.query("DELETE FROM external_offer WHERE id=ANY($1::uuid[])", [
      fixtures.map((fixture: any) => fixture.id),
    ]);
  }
  const foreign = await outsider.agent
    .get("/api/v1/missions?limit=50")
    .expect(200);
  expect(foreign.body.length).toBe(0);
});

test("sensitive mission commands replay atomically, reject changed content and recheck rights", async () => {
  const agency = clients[0],
    facility = clients[1];
  const dto = {
    agencyId: agency.org,
    establishmentId: facility.org,
    title: "FICTIF idempotence",
    description: "FICTIF description de recette",
    qualification: "IDE",
    service: "URGENCES",
    population: "ADULT",
    block: "NONE",
    requiredSkills: [],
    desiredSkills: [],
    minExperienceMonths: 0,
    start: "2034-01-10T08:00:00Z",
    end: "2034-01-10T16:00:00Z",
    shift: "DAY",
    address: "Lieu fictif de recette",
    latitude: 48,
    longitude: 2,
    hourlySalary: 25,
  };
  await post(agency, "missions", dto).unset("Idempotency-Key").expect(400);
  const key = randomUUID();
  const [a, b] = await Promise.all([
    post(agency, "missions", dto).set("Idempotency-Key", key).expect(201),
    post(agency, "missions", dto).set("Idempotency-Key", key).expect(201),
  ]);
  expect(a.body).toEqual(b.body);
  await post(agency, "missions", { ...dto, hourlySalary: 26 })
    .set("Idempotency-Key", key)
    .expect(409);
  const publishKey = randomUUID(),
    path = "missions/" + a.body.id + "/publish";
  const p = await post(agency, path)
    .set("Idempotency-Key", publishKey)
    .expect(201);
  const replay = await post(agency, path)
    .set("Idempotency-Key", publishKey)
    .expect(201);
  expect(p.body).toEqual(replay.body);
  const events = await db.query(
    "SELECT id FROM outbox WHERE event='MissionOPEN' AND payload->>'missionId'=$1",
    [a.body.id],
  );
  expect(events.length).toBe(1);
  await db.query(
    "UPDATE membership SET active=false WHERE user_id=$1 AND organization_id=$2",
    [agency.id, agency.org],
  );
  try {
    await post(agency, path).set("Idempotency-Key", publishKey).expect(404);
  } finally {
    await db.query(
      "UPDATE membership SET active=true WHERE user_id=$1 AND organization_id=$2",
      [agency.id, agency.org],
    );
  }
  const needKey = randomUUID();
  const need = {
    establishmentId: facility.org,
    title: "FICTIF besoin",
    description: "FICTIF besoin de recette",
    details: {qualification:'IDE',service:'URGENCES',start:'2035-01-10T06:00:00Z',end:'2035-01-10T14:00:00Z',shift:'DAY',headcount:1,population:'ADULT',block:'NONE',requiredSkills:[],minExperienceMonths:0,address:'1 rue fictive Paris'},
  };
  const n1 = await post(facility, "staffing-requests", need)
    .set("Idempotency-Key", needKey)
    .expect(201);
  const n2 = await post(facility, "staffing-requests", need)
    .set("Idempotency-Key", needKey)
    .expect(201);
  expect(n1.body.id).toBe(n2.body.id);
});

test("completed mission confirmation remains READY on delayed generation and replay", async () => {
  const agency = clients[0];
  const [a] = await db.query(
    "SELECT a.id,a.mission_id,m.version FROM assignment a JOIN mission m ON m.id=a.mission_id WHERE m.agency_id=$1 AND a.status='COMPLETED' ORDER BY a.created_at DESC LIMIT 1",
    [agency.org],
  );
  const [e] = await db.query(
    "INSERT INTO outbox(event,payload,available_at) VALUES('AssignmentCreated',$1,now()+interval '1 day') RETURNING id",
    [
      JSON.stringify({
        assignmentId: a.id,
        missionId: a.mission_id,
        version: a.version,
      }),
    ],
  );
  const service = app.get(AutomationService);
  const generated = await service.confirmation(e.id);
  expect(generated.status).toBe("READY");
  const replay = await service.confirmation(e.id);
  expect(replay.status).toBe("READY");
  expect(replay.documentId).toBe(generated.documentId);
  const download = await agency.agent
    .get("/api/v1/me/documents/" + generated.documentId)
    .expect(200);
  expect(download.headers["x-infimatch-document-state"]).toBe("READY");
});

test("expired outbox lease is retried and HTTP success without business receipt is insufficient", async () => {
  const [m] = await db.query(
    "SELECT id,version FROM mission WHERE agency_id=$1 LIMIT 1",
    [clients[0].org],
  );
  const [e] = await db.query(
    "INSERT INTO outbox(event,payload,attempts,lease_until,lease_token) VALUES('MatchRequested',$1,1,now()-interval '1 second',$2) RETURNING id",
    [JSON.stringify({ missionId: m.id, version: m.version }), randomUUID()],
  );
  const service = app.get(AutomationService);
  const first = await service.dispatch(
    1,
    async () => new Response("{}", { status: 200 }),
    e.id,
  );
  expect(first[0]?.status).toBe("RETRY_PENDING");
  let [state] = await db.query(
    "SELECT completed_at,attempts FROM outbox WHERE id=$1",
    [e.id],
  );
  expect(state.completed_at).toBe(null);
  expect(state.attempts).toBe(2);
  await db.query("UPDATE outbox SET available_at=now() WHERE id=$1", [e.id]);
  const second = await service.dispatch(
    1,
    async () => {
      await db.query(
        "INSERT INTO workflow_receipt(event_id,action) VALUES($1,'matches')",
        [e.id],
      );
      return new Response("{}", { status: 200 });
    },
    e.id,
  );
  expect(second[0]?.status).toBe("COMPLETED");
  [state] = await db.query(
    "SELECT completed_at,attempts FROM outbox WHERE id=$1",
    [e.id],
  );
  expect(state.completed_at).not.toBe(null);
  expect(state.attempts).toBe(3);
});

test("expired PDF lease cannot overwrite the document published by its successor", async () => {
  const [a] = await db.query(
    "SELECT a.id,a.mission_id,m.version,a.nurse_id FROM assignment a JOIN mission m ON m.id=a.mission_id WHERE m.agency_id=$1 AND a.status='COMPLETED' ORDER BY a.created_at DESC LIMIT 1",
    [clients[0].org],
  );
  const [e] = await db.query(
    "INSERT INTO outbox(event,payload,available_at) VALUES('AssignmentCreated',$1,now()+interval '1 day') RETURNING id",
    [
      JSON.stringify({
        assignmentId: a.id,
        missionId: a.mission_id,
        version: a.version,
      }),
    ],
  );
  await db.query(
    "UPDATE mission_confirmation SET status='FAILED',document_id=NULL,lease_until=NULL WHERE assignment_id=$1",
    [a.id],
  );
  const real = app.get(DocumentsService);
  let started!: () => void, release!: () => void;
  const entered = new Promise<void>((r) => (started = r)),
    wait = new Promise<void>((r) => (release = r));
  let firstDocument: string | undefined;
  const slow = {
    store: async (...args: Parameters<DocumentsService["store"]>) => {
      started();
      await wait;
      const stored = await real.store(...args);
      firstDocument = stored.id;
      return stored;
    },
  } as DocumentsService;
  const stale = new AutomationService(db, slow).confirmation(e.id);
  const observed = stale.then(
    () => ({ rejected: false }),
    () => ({ rejected: true }),
  );
  await entered;
  await db.query(
    "UPDATE mission_confirmation SET lease_until=now()-interval '1 second' WHERE assignment_id=$1",
    [a.id],
  );
  const winner = await new AutomationService(db, real).confirmation(e.id);
  release();
  expect((await observed).rejected).toBe(true);
  const [current] = await db.query(
    "SELECT status,document_id FROM mission_confirmation WHERE assignment_id=$1",
    [a.id],
  );
  expect(current.status).toBe("READY");
  expect(current.document_id).toBe(winner.documentId);
  await clients[0].agent
    .get("/api/v1/me/documents/" + firstDocument)
    .expect(404);
});

test("V1 recommendations rank only eligible entries and expose pending RPPS separately", async () => {
  const n = clients[clients.length - 1];
  await db.query(
    "UPDATE profile SET qualifications=ARRAY['IDE'],rpps_status='PENDING' WHERE user_id=$1",
    [n.id],
  );
  const response = await n.agent.get("/api/v1/me/matches?limit=50").expect(200);
  expect(response.body.items).toEqual([]);
  expect(response.body.rppsStatus).toBe("PENDING");
  expect(response.body.excluded).toBeGreaterThan(0);
  const [m] = await db.query(
    "SELECT id FROM mission WHERE agency_id=$1 AND status='OPEN' ORDER BY created_at DESC LIMIT 1",
    [clients[0].org],
  );
  const candidates = await clients[0].agent
    .get("/api/v1/missions/" + m.id + "/candidates?limit=50")
    .expect(200);
  expect(
    candidates.body.items.every(
      (r: any) => r.eligible === true && r.score !== null,
    ),
  ).toBe(true);
});

test("exhausted automation reports its state and explicit retry refuses active leases", async () => {
  const [e] = await db.query(
    "INSERT INTO outbox(event,payload,attempts) VALUES('MatchRequested','{}',4) RETURNING id",
  );
  const service = app.get(AutomationService);
  const result = await service.dispatch(
    1,
    async () => new Response("", { status: 503 }),
    e.id,
  );
  expect(result[0]?.status).toBe("EXHAUSTED");
  expect(
    await service.dispatch(
      1,
      async () => {
        throw new Error("must not be called");
      },
      e.id,
    ),
  ).toEqual([]);
  await db.query(
    "UPDATE outbox SET lease_until=now()+interval '1 minute' WHERE id=$1",
    [e.id],
  );
  await expect(retryOutbox(db, e.id)).rejects.toThrow("reserved");
  await db.query(
    "UPDATE outbox SET lease_until=now()-interval '1 second' WHERE id=$1",
    [e.id],
  );
  expect((await retryOutbox(db, e.id)).status).toBe("QUEUED");
  const [row] = await db.query(
    "SELECT attempts,lease_token,last_error FROM outbox WHERE id=$1",
    [e.id],
  );
  expect(row).toEqual({ attempts: 0, lease_token: null, last_error: null });
  await db.query("UPDATE outbox SET completed_at=now() WHERE id=$1", [e.id]);
});

test("OpenAPI documents idempotency headers and paginated response contracts", async () => {
  const result = await request(app.getHttpServer())
    .get("/api/docs-json")
    .set("Accept-Encoding", "identity")
    .set("Connection", "close")
    .expect(200);
  const command = result.body.paths["/api/v1/missions"].post;
  expect(
    command.parameters.some(
      (p: any) => p.name === "Idempotency-Key" && p.required,
    ),
  ).toBe(true);
  expect(command.responses[201].content["application/json"].schema.$ref).toBe(
    "#/components/schemas/MissionCommand",
  );
  const list = result.body.paths["/api/v1/me/notifications"].get;
  expect(list.parameters.some((p: any) => p.name === "offset")).toBe(true);
  expect(list.responses[200].content["application/json"].schema.type).toBe(
    "array",
  );
});

test("partial external comparison is private and incomplete leads require explicit opt-in", async () => {
  const first = await account("NURSE"),
    second = await account("NURSE");
  await db.query(
    "UPDATE profile SET qualifications=$2,rpps_status='FOUND' WHERE user_id=$1",
    [first.id, ["IDE"]],
  );
  await db.query(
    "UPDATE profile SET qualifications=$2,rpps_status='PENDING' WHERE user_id=$1",
    [second.id, ["IADE"]],
  );
  const normalized = normalizeOffer({
    id: "PRIVATE_PARTIAL",
    intitule: "IDE Urgences",
    description: "Fictional fixture",
    typeContrat: "MIS",
    lieuTravail: { libelle: "Paris" },
  });
  const [e] = await db.query(
    "INSERT INTO external_offer(source,source_id,title,description,url,location_label,qualification,raw_hash,provenance) VALUES('TEST_FIXTURE',$1,$2,'Fictional','https://example.invalid/partial','Paris','IDE','fixture',$3) RETURNING id",
    [randomUUID(), normalized.title, JSON.stringify(normalized.provenance)],
  );
  const id = "e_" + e.id,
    path = "/api/v1/me/listings/" + id + "/correspondence";
  try {
    await request(app.getHttpServer()).get(path).expect(401);
    const a = await first.agent.get(path).expect(200),
      b = await second.agent.get(path).expect(200);
    expect(a.headers["cache-control"]).toBe("no-store");
    expect(a.body.profileCorrespondence.criteria.qualification.status).toBe(
      "MATCH",
    );
    expect(b.body.profileCorrespondence.criteria.qualification.status).toBe(
      "MISMATCH",
    );
    expect(a.body.profileCorrespondence.score).toBeNull();
    expect(a.body.profileCorrespondence.criteria.availability.status).toBe(
      "OFFER_MISSING",
    );
    const publicDetail = await request(app.getHttpServer())
      .get("/api/v1/listings/" + id)
      .expect(200);
    expect(publicDetail.body.profileCorrespondence).toBeUndefined();
    const filters = {
      qualifications: ["IDE"],
      start: "2030-01-10T08:00:00Z",
      end: "2030-01-10T20:00:00Z",
      limit: 50,
    };
    const strict = await post(first, "listings/search", filters).expect(201);
    expect(strict.body.items.some((x: any) => x.id === id)).toBe(false);
    const relaxed = await post(first, "listings/search", {
      ...filters,
      includeUncertainExternal: true,
    }).expect(201);
    const lead = relaxed.body.items.find((x: any) => x.id === id);
    expect(lead.requestedFiltersVerified).toBe(false);
    expect(lead.unverifiedSearchFilters).toEqual(["start", "end"]);
    expect(lead.profileCorrespondence.criteria.availability.status).toBe(
      "OFFER_MISSING",
    );
    expect(lead.profileCorrespondence.eligibilityVerified).toBe(false);
    await post(first, "listings/search", {
      ...filters,
      includeUncertainExternal: "true",
    }).expect(400);
    await first.agent
      .get("/api/v1/me/listings/not-an-id/correspondence")
      .expect(404);
    await db.query(
      "UPDATE external_offer SET expires_at=now()-interval '1 day' WHERE id=$1",
      [e.id],
    );
    await first.agent.get(path).expect(404);
  } finally {
    await db.query("DELETE FROM external_offer WHERE id=$1", [e.id]);
  }
});

test("stored parser is exposed with proof and stable reimports; preferences persist", async () => {
 const {importOffers}=await import("../../src/public-data/offers");
 const {reparseOffers}=await import("../../src/public-data/reparse-offers");
 const id="parser-"+randomUUID();
 const raw={id,intitule:"IDE mission intérim",description:"Diplôme infirmier requis. Horaires : 7h à 19h. Salaire : 2750 euros brut par mois.",typeContrat:"MIS",lieuTravail:{libelle:"Paris"}};
 await importOffers(db,[raw],false);
 const [stored]=await db.query("SELECT * FROM external_offer WHERE source_id=$1",[id]);
 const first=stored.parsed_offer;
 expect(first.parserVersion).toBe("4.0.0");
 const detail=await request(app.getHttpServer()).get("/api/v1/listings/e_"+stored.id).expect(200);
 expect(detail.body.parsedOffer.inputHash).toBe(first.inputHash);
 expect(detail.body.parsed_offer).toBeUndefined();
 await importOffers(db,[raw],false);
 expect((await db.query("SELECT parsed_offer FROM external_offer WHERE id=$1",[stored.id]))[0].parsed_offer.parsedAt).toBe(first.parsedAt);
 await importOffers(db,[{...raw,description:raw.description+" Permis B obligatoire."}],false);
 expect((await db.query("SELECT parsed_offer FROM external_offer WHERE id=$1",[stored.id]))[0].parsed_offer.inputHash).not.toBe(first.inputHash);
 await reparseOffers(db,true);
 expect((await reparseOffers(db,false)).changed).toBe(0);
 const c=await account("NURSE");
 await c.agent.put("/api/v1/me/notification-preferences").set("Origin",process.env.APP_ORIGIN!).set("X-CSRF-Token",c.token).send({enabled:false}).expect(200);
 expect((await c.agent.get("/api/v1/me/notification-preferences").expect(200)).body.enabled).toBe(false);
 await request(app.getHttpServer()).get("/api/v1/me/notification-preferences").expect(401);
 await c.agent.get("/api/v1/me/listings/e_"+stored.id+"/correspondence").expect(200);
});

test("idle expiry is enforced server-side; background reads never refresh activity",async()=>{
 const c=await account("NURSE");
 const before=(await c.agent.get("/api/v1/auth/me").expect(200)).body.session;
 const after=(await c.agent.get("/api/v1/auth/me").expect(200)).body.session;
 expect(after.idleExpiresAt).toBe(before.idleExpiresAt);
 await post(c,"auth/activity").expect(201);
 await db.query("UPDATE session SET sess=jsonb_set(sess::jsonb,'{lastActivityAt}',to_jsonb($2::bigint))::json WHERE sess::jsonb->>'userId'=$1",[c.id,Date.now()-16*60*1000]);
 await c.agent.get("/api/v1/auth/me").expect(401);
 await post(c,"auth/activity").expect(403);
});

test("retention commits SQL before file cleanup and preserves reminder deduplication", async () => {
 const {applyRetention,cleanupRemovedDocuments}=await import("../../src/security/retention");
 const {readFile,stat}=await import("node:fs/promises");
 const c=await account("NURSE"),docs=app.get(DocumentsService);
 const bank=await docs.store(c.id,"BANK","application/json",Buffer.from('{"fictional":true}'));
 await db.query("UPDATE document SET superseded_at=now()-interval '31 days' WHERE id=$1",[bank.id]);
 const [mission]=await db.query("SELECT id,version FROM mission LIMIT 1");
 const [event]=await db.query("INSERT INTO outbox(event,payload,completed_at) VALUES('ReminderCreated','{}',now()-interval '31 days') RETURNING id");
 await db.query("INSERT INTO reminder_window(mission_id,version,window_key,event_id) VALUES($1,$2,'retention-test',$3)",[mission.id,mission.version,event.id]);
 const path=resolve(process.env.DOCUMENT_DIRECTORY!,bank.id+".bin"),encrypted=await readFile(path);
 await expect(db.transaction(async em=>{await applyRetention(em);throw Error("forced rollback");})).rejects.toThrow("forced rollback");
 expect((await readFile(path)).equals(encrypted)).toBe(true);
 expect((await db.query("SELECT id FROM document WHERE id=$1",[bank.id])).length).toBe(1);
 const result=await db.transaction(em=>applyRetention(em));
 expect((await db.query("SELECT id FROM outbox WHERE id=$1",[event.id])).length).toBe(1);
 expect((await readFile(path)).equals(encrypted)).toBe(true);
 await cleanupRemovedDocuments(db,result.documentIds??[]);
 await expect(stat(path)).rejects.toThrow();
 await cleanupRemovedDocuments(db,result.documentIds??[]);
});

test("account closure clears profile and private traces on real PostgreSQL",async()=>{
 const {anonymizeAccount,cleanupRemovedDocuments}=await import("../../src/security/retention");
 const c=await account("NURSE");
 await db.query("UPDATE profile SET skills=ARRAY['TRIAGE'],experience='[{\"service\":\"URGENCES\"}]',available='[{\"start\":\"2030-01-01\"}]',details='{\"firstName\":\"Fictif\"}',radius_km=25 WHERE user_id=$1",[c.id]);
 await db.query("INSERT INTO notification(user_id,kind,message) VALUES($1,'TEST','private')",[c.id]);
 const result=await db.transaction(em=>anonymizeAccount(em,c.id));await cleanupRemovedDocuments(db,result.documentIds);
 const [p]=await db.query("SELECT * FROM profile WHERE user_id=$1",[c.id]);
 expect(p.skills).toEqual([]);expect(p.experience).toEqual([]);expect(p.available).toEqual([]);expect(p.details).toEqual({});expect(p.notifications_enabled).toBe(false);
 expect((await db.query("SELECT id FROM notification WHERE user_id=$1",[c.id])).length).toBe(0);
 const [a]=await db.query("SELECT * FROM account WHERE id=$1",[c.id]);expect(a.active).toBe(false);expect(a.password_hash).toBe('disabled');
 await c.agent.get('/api/v1/auth/me').expect(401);
});


test("closure CLI removes Mongo history and can be retried",async()=>{
 const {spawnSync}=await import("node:child_process");
 const c=await account("NURSE"),matching=new MatchingService(db);await matching.ready();
 try {
 await matching.connection.collection("matchingruns").insertOne({ownerId:c.id,fixture:true});
 for(let i=0;i<2;i++){
  const run=spawnSync(process.execPath,["backend/dist/cli.js","anonymize-account","--account",c.id,"--apply"],{cwd:projectRoot,env:process.env,encoding:"utf8"});
  if(run.status!==0)throw new Error(run.stderr || "Closure CLI failed");
 }
 expect(await matching.connection.collection("matchingruns").countDocuments({ownerId:c.id})).toBe(0);
 } finally {await matching.onModuleDestroy();}
});

test("closure requests are private, replayable, cancellable and require operator approval",async()=>{
 const c=await account('NURSE'),other=await account('NURSE');
 await request(app.getHttpServer()).get('/api/v1/me/closure-request').expect(401);
 const first=await post(c,'me/closure-request').expect(201),again=await post(c,'me/closure-request').expect(201);
 expect(first.body.id).toBe(again.body.id);
 expect((await other.agent.get('/api/v1/me/closure-request').expect(200)).body.request).toBeNull();
 const {processClosures}=await import('../../src/security/closure');
 expect((await processClosures(db)).processed).toBe(0);
 await c.agent.delete('/api/v1/me/closure-request').set('Origin',process.env.APP_ORIGIN!).set('X-CSRF-Token',c.token).expect(200);
 expect((await c.agent.get('/api/v1/me/closure-request')).body.request.status).toBe('CANCELLED');
 const next=await post(c,'me/closure-request').expect(201);expect(next.body.id).not.toBe(first.body.id);
 await db.query("UPDATE closure_request SET status='CANCELLED' WHERE id=$1",[next.body.id]);
});

test("freshness never treats a bounded import as a complete snapshot",async()=>{
 const {importOffers}=await import('../../src/public-data/offers');const {retireStaleOffers}=await import('../../src/public-data/freshness');
 const id='fresh-'+randomUUID(),raw={id,intitule:'IDE interim',description:'Mission en interim.',typeContrat:'MIS'};
 await importOffers(db,[raw],false);
 const [offer]=await db.query('SELECT id FROM external_offer WHERE source_id=$1',[id]);
 await importOffers(db,[],false);
 expect((await db.query('SELECT active FROM external_offer WHERE id=$1',[offer.id]))[0].active).toBe(true);
 await db.query("UPDATE external_offer SET imported_at=now()-interval '31 days' WHERE id=$1",[offer.id]);
 expect((await retireStaleOffers(db)).unverified).toBeGreaterThan(0);
 expect((await db.query('SELECT active FROM external_offer WHERE id=$1',[offer.id]))[0].active).toBe(true);
 await retireStaleOffers(db,true);
 expect((await db.query('SELECT provenance FROM external_offer WHERE id=$1',[offer.id]))[0].provenance.retiredReason).toBe('STALE_UNVERIFIED');
 await importOffers(db,[raw],false);
 expect((await db.query('SELECT active FROM external_offer WHERE id=$1',[offer.id]))[0].active).toBe(true);
});

test("every OpenAPI operation has a success contract and controlled errors",async()=>{
 const r=await request(app.getHttpServer()).get('/api/docs-json').set('Accept-Encoding','identity').set('Connection','close').expect(200);
 const schemas=r.body.components.schemas;
 for(const [path,item]of Object.entries(r.body.paths) as any){for(const method of ['get','post','put','patch','delete']){
  const op=item[method];if(!op)continue;
  const response=op.responses[method==='post'?201:200];
  if(!response?.content)throw Error('Missing success schema: '+method+' '+path);
  expect(op.responses[403].content['application/json'].schema.$ref).toBe('#/components/schemas/Error');
 }}
 expect(schemas.AuthReceipt.required).toContain('csrfToken');expect(schemas.Profile.properties.available.type).toBe('array');
 expect(r.body.paths['/api/v1/auth/google'].post.responses[201].content['application/json'].schema.oneOf.length).toBe(2);
 expect(r.body.paths['/api/v1/me/documents/{id}'].get.responses[200].content['application/pdf'].schema.format).toBe('binary');
});
