import { spawn } from "node:child_process";

const port = "4173";
const timeoutMs = 10_000;
const server = spawn("npm", ["run", "dev", "--", "--port", port], {
  stdio: "ignore",
  detached: true,
  env: { ...process.env, READINESS_CHECK: "true" },
});

const stopServer = () => {
  if (server.pid === undefined) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
};

const waitForHealth = async () => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.status === 200) return;
    } catch {
      // The development server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`development server did not return HTTP 200 within ${timeoutMs}ms`);
};

try {
  await waitForHealth();
  console.log(`Development server health check: PASS (http://127.0.0.1:${port}/)`);
} catch (error) {
  console.error(`Development server health check: FAILED (${error.message})`);
  process.exitCode = 1;
} finally {
  stopServer();
}
