import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "../src/db/client";

async function main() {
  const migrationsDir = path.join(process.cwd(), "migrations");

  await sql.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await sql.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1",
      [file],
    );

    if (applied.length > 0) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const migration = await readFile(path.join(migrationsDir, file), "utf8");
    const statements = migration
      .split(/;\s*(?=\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await sql.query(statement);
    }

    await sql.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    console.log(`Applied ${file} (${statements.length} statements)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
