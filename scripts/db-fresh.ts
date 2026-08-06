import "dotenv/config";

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import postgres from "postgres";

async function confirmReset() {
  if (process.env.DB_FRESH_CONFIRM === "reset" || process.argv.includes("--yes")) return;

  if (!process.stdin.isTTY) {
    throw new Error("Database reset requires confirmation. Run with DB_FRESH_CONFIRM=reset or add --yes.");
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question("This will drop and recreate the public schema. Type reset to continue: ");
  rl.close();

  if (answer !== "reset") {
    throw new Error("Database reset cancelled.");
  }
}

function run(command: string, args: string[]) {
  const isWindows = process.platform === "win32";
  const executable = isWindows ? process.env.ComSpec ?? "cmd.exe" : command;
  const commandArgs = isWindows ? ["/d", "/s", "/c", command, ...args] : args;
  const result = spawnSync(executable, commandArgs, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running pnpm db:fresh. Add it to the root .env file.");
  }

  await confirmReset();

  console.log("Resetting database schema...");
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    await sql`drop schema if exists public cascade`;
    await sql`create schema public`;
    await sql`grant all on schema public to public`;
  } finally {
    await sql.end();
  }

  console.log("Pushing latest schema...");
  run("pnpm", ["db:push"]);

  console.log("Generating Drizzle migration snapshot...");
  run("pnpm", ["db:generate"]);

  console.log("Running seed.ts...");
  run("pnpm", ["db:seed"]);

  console.log("Database fresh complete.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
