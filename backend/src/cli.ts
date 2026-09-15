import { retryOutbox } from "./automation/automation.module";
import { importFiness } from "./reference-data/finess";
import { DocumentsService } from "./documents/documents.module";
import { seedDemo } from "./demo/seed";
import "reflect-metadata";
import "./config";
import { fetchOffers, importOffers } from "./public-data/offers";
import { Command } from "commander";
import { Database } from "./database/database";
const cli = new Command()
  .name("infimatch")
  .description("InfiMatch backend administration")
  .version("0.1.0");
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
    "Maximum offers per keyword (4 queries, up to 150 each)",
    "50",
  )
  .option("--department <code>", "Department, e.g. 75; commune checked locally")
  .option("--dry-run", "Acquire and normalize without database writes", false)
  .action(async (opts) => {
    const raw = await fetchOffers(Number(opts.limit), fetch, opts.department);
    const db = await new Database().connect();
    try {
      console.log(
        JSON.stringify(await importOffers(db, raw, opts.dryRun), null, 2),
      );
    } finally {
      await db.onModuleDestroy();
    }
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
void cli.parseAsync().catch((e) => {
  console.error(
    "Command failed:",
    e instanceof Error ? e.message : "unknown error",
  );
  process.exitCode = 1;
});
