import sharp from "sharp";
import { readdirSync, statSync, writeFileSync } from "fs";
import { join, extname } from "path";

const ROOT = "public";
const exts = new Set([".png", ".jpg", ".jpeg"]);
const targets = [];

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(extname(e.name).toLowerCase())) targets.push(p);
  }
}
walk(ROOT);

const results = [];
const failed = [];
for (const src of targets) {
  const out = src.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  try {
    await sharp(src).webp({ quality: 82 }).toFile(out);
    results.push({ src, out, o: statSync(src).size, n: statSync(out).size });
  } catch (e) {
    failed.push([src, String(e)]);
  }
}
const totO = results.reduce((a, r) => a + r.o, 0);
const totN = results.reduce((a, r) => a + r.n, 0);
console.log(`converted: ${results.length}, failed: ${failed.length}`);
console.log(`total: ${(totO / 1048576).toFixed(1)}MB -> ${(totN / 1048576).toFixed(1)}MB`);

const manifest = results.map((r) =>
  "/" + r.src.slice(ROOT.length + 1).replace(/\\/g, "/").replace(/\.(png|jpg|jpeg)$/i, ".webp")
);
writeFileSync("scripts/webp-manifest.json", JSON.stringify(manifest));
failed.slice(0, 10).forEach((f) => console.log("FAIL", f[0], f[1]));
