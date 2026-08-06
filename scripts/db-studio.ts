import { spawnSync } from "node:child_process";
import net from "node:net";

const host = "127.0.0.1";
const startPort = Number(process.env.DRIZZLE_STUDIO_PORT ?? 4983);

function isPortFree(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findFreePort() {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortFree(port)) return port;
  }

  throw new Error(`No free Drizzle Studio port found from ${startPort} to ${startPort + 49}.`);
}

function runStudio(port: number) {
  const command = `pnpm exec drizzle-kit studio --host ${host} --port ${port}`;
  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

async function main() {
  const port = await findFreePort();
  console.log(`Starting Drizzle Studio on ${host}:${port}`);
  console.log(`Open https://local.drizzle.studio?port=${port}`);
  runStudio(port);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
