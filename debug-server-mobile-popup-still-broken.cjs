const fs = require("fs");
const http = require("http");
const path = require("path");

const outdir = path.join(process.cwd(), ".dbg");
const sessionId = "mobile-popup-still-broken";
const port = 7778;
const envPath = path.join(outdir, `${sessionId}.env`);
const logPath = path.join(outdir, `trae-debug-log-${sessionId}.ndjson`);

fs.mkdirSync(outdir, { recursive: true });
fs.writeFileSync(envPath, `DEBUG_SERVER_URL=http://127.0.0.1:${port}/event\nDEBUG_SESSION_ID=${sessionId}\n`);
fs.writeFileSync(logPath, "");

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/event") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        fs.appendFileSync(logPath, `${JSON.stringify(payload)}\n`);
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end("invalid json");
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, port, sessionId, logPath }));
    return;
  }

  if (req.method === "DELETE" && req.url === "/logs") {
    fs.writeFileSync(logPath, "");
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`debug server listening on http://127.0.0.1:${port}/event\n`);
});
