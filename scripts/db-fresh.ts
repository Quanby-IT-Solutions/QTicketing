import "dotenv/config";

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";

async function confirmReset() {
  if (process.env.DB_FRESH_CONFIRM === "reset" || process.argv.includes("--yes")) return;

  if (!process.stdin.isTTY) {
    throw new Error("Database reset requires confirmation. Run with DB_FRESH_CONFIRM=reset or add --yes.");
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question(
    "This will drop and recreate the public schema and delete all attached files in S3 storage. Type reset to continue: ",
  );
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

function getS3Configuration() {
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.S3_BUCKET_NAME?.trim();

  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    s3: new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  };
}

async function clearStorage(s3: S3Client, bucket: string) {
  const prefix = "tickets/";
  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (listed.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key));

    if (keys.length > 0) {
      const deleted = await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((key) => ({ Key: key })) },
        }),
      );

      const failedKeys = (deleted.Errors ?? [])
        .map((error) => error.Key)
        .filter((key): key is string => Boolean(key));
      if (failedKeys.length > 0) {
        throw new Error(
          `Failed to delete ${failedKeys.length} object(s) from s3://${bucket}/${prefix}: ${failedKeys.join(", ")}`,
        );
      }

      totalDeleted += keys.length;
      console.log(`Deleted ${keys.length} object(s) from s3://${bucket}/${prefix}`);
    }

    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`S3 cleanup complete. Removed ${totalDeleted} object(s).`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before running pnpm db:fresh. Add it to the root .env file.");
  }

  await confirmReset();

  const s3Configuration = getS3Configuration();
  if (s3Configuration) {
    console.log("Clearing S3 attachments...");
    try {
      await clearStorage(s3Configuration.s3, s3Configuration.bucket);
    } finally {
      s3Configuration.s3.destroy();
    }
    // Storage is cleared before the database is dropped, so if the S3 cleanup
    // fails the reset aborts with the database still intact.
  } else {
    console.warn("AWS credentials or S3_BUCKET_NAME are not configured. Skipping S3 cleanup.");
  }

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
