import {RefreshService} from "./public-data/refresh.service";
import {enrichFranceTravailLocations} from "./public-data/offer-geolocation";
import { executeClosure,replayApprovedErasure, processClosures, approveClosure } from "./security/closure";
import { retireStaleOffers } from "./public-data/freshness";
import { reparseOffers } from "./public-data/reparse-offers";
import { retryOutbox } from "./automation/automation.module";
import { importFiness } from "./reference-data/finess";
import { DocumentsService } from "./documents/documents.module";
import { seedDemo } from "./demo/seed";
import "reflect-metadata";
import "./config";
import { fetchOffers, importOffers } from "./public-data/offers";
import { Command } from "commander";
import { Database, audit } from "./database/database";
import {
  cleanupRemovedDocuments,
  applyRetention,
  inspectRetention,
} from "./security/retention";
export function createCli() {
  const cli = new Command()
    .name("infimatch")
    .description("InfiMatch backend administration")
    .version("0.1.0");
  cli.command("reparse-offers").description("Recompute stored offer extractions without provider calls; dry-run unless --apply")
    .option("--apply", "Persist new or changed extractions")
    .action(async opts => { const db = await new Database().connect(); try { console.log(JSON.stringify(await reparseOffers(db, !!opts.apply))); } finally { await db.onModuleDestroy(); } });
  cli
    .command("migrate")
    .description("Apply explicit SQL migrations")
    .action(async () => {
      const db = await new Database().connect();
      try {
        const result = await db.source.runMigrations();
        console.log(JSON.stringify({ migrations: result.map((m) => m.name) }));
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli
    .command("link-organizations")
    .requiredOption("--agency <uuid>")
    .requiredOption("--establishment <uuid>")
    .description(
      "Operator bootstrap: authorize an agency-establishment relationship",
    )
    .action(async (opts) => {
      const db = await new Database().connect();
      try {
        await db.transaction(async (em) => {
          const rows = await em.query(
            "SELECT id,kind FROM organization WHERE id IN($1,$2) ORDER BY id FOR UPDATE",
            [opts.agency, opts.establishment],
          );
          if (
            !rows.some((r: any) => r.id === opts.agency && r.kind === "AGENCY") ||
            !rows.some(
              (r: any) =>
                r.id === opts.establishment && r.kind === "ESTABLISHMENT",
            )
          )
            throw new Error("Invalid organization kinds");
          await em.query(
            "INSERT INTO agency_link(agency_id,establishment_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
            [opts.agency, opts.establishment],
          );
        });
        console.log("Organization link recorded");
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli
    .command("import-offers")
    .option(
      "--limit <number>",
      "Page size (1-150); follow all pages for the four keyword searches",
      "50",
    )
    .option("--department <code>", "Department, e.g. 75; commune checked locally")
    .option("--dry-run", "Acquire and normalize without database writes", false)
    .action(async (opts) => {
      const raw = await fetchOffers(Number(opts.limit), fetch, opts.department);
      const db = await new Database().connect();
      try {
        console.log(
          JSON.stringify(await importOffers(db, await enrichFranceTravailLocations(raw), opts.dryRun), null, 2),
        );
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli
    .command("import-jobspipe")
    .option("--limit <number>", "Compatibility option: resumable free-tier pages contain at most 25 offers", "25")
    .option("--dry-run", "Read collection state only; no paid provider request", false)
    .action(async (opts) => {
      if(!Number.isInteger(Number(opts.limit))||Number(opts.limit)<1||Number(opts.limit)>25)throw Error('JobsPipe free page maximum is 25');
      const db=await new Database().connect();
      try{console.log(JSON.stringify(opts.dryRun?await db.query("SELECT provider,enabled,collection_state FROM source_control WHERE provider='JOBSPIPE'"):await new RefreshService(db).run('JOBSPIPE',true),null,2));}
      finally{await db.onModuleDestroy();}
    });
  cli
    .command("seed")
    .description("Create isolated fictional demo data; never marks RPPS as found")
    .action(async () => {
      const db = await new Database().connect();
      try {
        console.log(JSON.stringify(await seedDemo(db), null, 2));
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli
    .command("reconcile-documents")
    .option(
      "--minimum-age-minutes <number>",
      "Only inspect interrupted writes older than this age",
      "5",
    )
    .action(async (opts) => {
      const db = await new Database().connect();
      try {
        console.log(
          JSON.stringify(
            await new DocumentsService(db).reconcile(
              Number(opts.minimumAgeMinutes),
            ),
          ),
        );
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli
    .command("import-finess")
    .requiredOption("--file <path>")
    .requiredOption("--source-url <url>")
    .description("Import a complete official FINESS gzip snapshot atomically")
    .action(async (opts) => {
      const db = await new Database().connect();
      try {
        console.log(
          JSON.stringify(
            await importFiness(db, opts.file, opts.sourceUrl),
            null,
            2,
          ),
        );
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli
    .command("retry-outbox")
    .requiredOption("--event <uuid>")
    .description(
      "Explicitly requeue an interrupted or exhausted event; refuses an active lease",
    )
    .action(async (opts) => {
      const db = await new Database().connect();
      try {
        console.log(JSON.stringify(await retryOutbox(db, opts.event)));
      } finally {
        await db.onModuleDestroy();
      }
    });
  for (const action of ["disable", "enable", "revoke-sessions"] as const)
    cli
      .command(
        action === "revoke-sessions"
          ? "revoke-account-sessions"
          : action + "-account",
      )
      .requiredOption("--account <uuid>")
      .description(
        action === "disable"
          ? "Disable an account and revoke all sessions"
          : action === "enable"
            ? "Enable an account with all previous sessions revoked"
            : "Revoke every session for an active account",
      )
      .action(async (opts) => {
        const db = await new Database().connect();
        try {
          const result = await db.transaction(async (em) => {
            const [account] = await em.query(
              "SELECT id,active FROM account WHERE id=$1::uuid FOR UPDATE",
              [opts.account],
            );
            if (!account) throw new Error("Account not found");
            const active =
              action === "disable"
                ? false
                : action === "enable"
                  ? true
                  : account.active;
            const [updated] = await em.query(
              "UPDATE account SET active=$2,session_version=session_version+1 WHERE id=$1 RETURNING id,active,session_version",
              [opts.account, active],
            );
            await em.query("DELETE FROM session WHERE sess->>'userId'=$1", [
              opts.account,
            ]);
            await audit(
              em,
              null,
              action === "disable"
                ? "ACCOUNT_DISABLED"
                : action === "enable"
                  ? "ACCOUNT_ENABLED"
                  : "ACCOUNT_SESSIONS_REVOKED",
              opts.account,
            );
            return updated;
          });
          console.log(JSON.stringify(result));
        } finally {
          await db.onModuleDestroy();
        }
      });
  cli
    .command("purge-retention")
    .description(
      "Apply V1 retention: expired sessions, old traces, staging files and superseded bank details",
    )
    .option("--apply", "Delete matching rows and files; default is a dry-run", false)
    .action(async (opts) => {
      const db = await new Database().connect();
      try {
        if (!opts.apply) {
          console.log(
            JSON.stringify(
              await db.transaction(async (em) => ({
                dryRun: true,
                ...(await inspectRetention(em)),
              })),
            ),
          );
          return;
        }
        const result = await db.transaction((em) => applyRetention(em));
        await cleanupRemovedDocuments(db, result.documentIds ?? []);
        console.log(JSON.stringify(result));
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli
    .command("anonymize-account")
    .requiredOption("--account <uuid>")
    .option("--apply", "Persist anonymization; default is a dry-run", false)
    .description(
      "Exercise of rights: close the account, wipe private profile fields and user documents",
    )
    .action(async (opts) => {
      const db = await new Database().connect();
      try {
        if (!opts.apply) {
          const [account] = await db.query(
            "SELECT id,email,active FROM account WHERE id=$1::uuid",
            [opts.account],
          );
          if (!account) throw new Error("Account not found");
          const [documents] = await db.query(
            "SELECT count(*)::int AS n FROM document WHERE owner_id=$1 AND kind IN('EVIDENCE','BANK','CV')",
            [opts.account],
          );
          console.log(
            JSON.stringify({
              dryRun: true,
              id: account.id,
              active: account.active,
              documents: documents.n,
            }),
          );
          return;
        }
        const result = await executeClosure(db, opts.account);
        console.log(JSON.stringify(result));
      } finally {
        await db.onModuleDestroy();
      }
    });
  cli.command("retire-stale-offers").option("--apply", "Retire expired or unverified offers",false).action(async opts=>{const db=await new Database().connect();try{console.log(JSON.stringify(await retireStaleOffers(db,opts.apply)));}finally{await db.onModuleDestroy();}});
  cli.command("closure-requests").action(async()=>{const db=await new Database().connect();try{console.log(JSON.stringify(await db.query("SELECT id,account_id,status,requested_at FROM closure_request WHERE status IN('REQUESTED','APPROVED') ORDER BY requested_at")));}finally{await db.onModuleDestroy();}});
  cli.command("approve-closure").requiredOption("--request <uuid>").action(async opts=>{const db=await new Database().connect();try{console.log(JSON.stringify(await approveClosure(db,opts.request)));}finally{await db.onModuleDestroy();}});
  cli.command("process-closure-requests").option("--apply", "Process operator-approved requests",false).action(async opts=>{const db=await new Database().connect();try{const result=opts.apply?await processClosures(db):{dryRun:true,requests:await db.query("SELECT id FROM closure_request WHERE status='APPROVED'")};console.log(JSON.stringify(result));if("failed" in result && result.failed)process.exitCode=1;}finally{await db.onModuleDestroy();}});
  cli.command("replay-erasures").requiredOption("--ledger <path>").action(async opts=>{
   const {readFile}=await import("node:fs/promises");
   const entries=(await readFile(opts.ledger,"utf8")).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line).accountId);
   if(entries.some(id=>typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)))throw Error("Invalid erasure ledger");
   const db=await new Database().connect();let processed=0;
   try{for(const id of new Set(entries)){if(!(await db.query("SELECT id FROM account WHERE id=$1",[id])).length)continue;await replayApprovedErasure(db,id);processed++;}console.log(JSON.stringify({processed}));}finally{await db.onModuleDestroy();}
  });
  cli.command("retry-document-erasures").option("--apply", "Retry committed document deletions",false).action(async opts=>{const db=await new Database().connect();try{if(opts.apply)await cleanupRemovedDocuments(db);console.log(JSON.stringify({dryRun:!opts.apply,pending:Number((await db.query("SELECT count(*) AS n FROM document_erasure"))[0].n)}));}finally{await db.onModuleDestroy();}});
  return cli;
}
if (require.main === module) void createCli().parseAsync().catch((e) => {
  console.error(
    "Command failed:",
    e instanceof Error ? e.message : "unknown error",
  );
  process.exitCode = 1;
});
