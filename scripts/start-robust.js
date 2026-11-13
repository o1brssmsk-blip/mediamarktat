const { spawn } = require("node:child_process");

const port = String(process.env.PORT ? Number(process.env.PORT) : 3000);
const hostname = process.env.HOSTNAME || process.env.HOST || "0.0.0.0";
const nodeEnv = process.env.NODE_ENV || "production";
const nodeOptions =
  process.env.NODE_OPTIONS || "--max-old-space-size=3072";

const railwayDomain =
  process.env.RAILWAY_PUBLIC_DOMAIN ||
  process.env.RAILWAY_STATIC_URL ||
  process.env.RAILWAY_URL ||
  null;

const effectiveSiteUrl = railwayDomain
  ? `https://${railwayDomain}`
  : process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    "http://localhost:3000";

const env = {
  ...process.env,
  PORT: port,
  HOSTNAME: hostname,
  HOST: hostname,
  NODE_ENV: nodeEnv,
  NODE_OPTIONS: nodeOptions,
  NEXT_PUBLIC_SITE_URL: effectiveSiteUrl,
  PUBLIC_SITE_URL: effectiveSiteUrl,
  NEXT_TELEMETRY_DISABLED: "1",
};

console.log("[start-robust] Starting Next.js with:");
console.log("[start-robust]   PORT        =", port);
console.log("[start-robust]   HOSTNAME    =", hostname);
console.log("[start-robust]   NODE_ENV    =", nodeEnv);
console.log("[start-robust]   NODE_OPTIONS=", nodeOptions);
console.log("[start-robust]   SITE_URL    =", effectiveSiteUrl);
console.log("[start-robust]   Command     =", "npx next start -p", port, "--hostname", hostname);

const child = spawn("npx", ["next", "start", "-p", port, "--hostname", hostname], {
  stdio: "inherit",
  env,
  shell: false,
});

child.on("error", (err) => {
  console.error("[start-robust] Failed to spawn next start:", err);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  console.log(
    `[start-robust] next start exited — code=${code ?? "none"} signal=${signal ?? "none"}`
  );
  process.exit(code == null ? (signal ? 130 : 0) : Number(code) || 0);
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
