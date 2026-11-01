import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "../src/db/client";

async function main() {
  const migrationPath = path.join(process.cwd(), "migrations", "001_init.sql");
  const migration = await readFile(migrationPath, "utf8");
  const statements = migration
    .split(/;\s*(?=\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Applied ${statements.length} statements from ${migrationPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
