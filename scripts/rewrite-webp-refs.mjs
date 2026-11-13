// Kod icindeki yerel gorsel referanslarini .webp'ye cevirir.
// Sadece "/" ile basan (veya "./", "../") yerel yollari degistirir; uzak URL'ler korunur.
import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, extname } from "path";

const CODE_EXTS = new Set([".ts", ".tsx", ".css", ".html", ".js"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const files = [];

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (CODE_EXTS.has(extname(e.name).toLowerCase())) files.push(p);
  }
}
walk("src");
walk("public");

let changed = 0;
const RE = /(["'(])(\/[^"')\\\s]+\.(png|jpe?g))(["')])/gi;

for (const f of files) {
  const orig = readFileSync(f, "utf8");
  const next = orig.replace(RE, (_m, pre, path, _ext, post) => {
    return pre + path.replace(/\.(png|jpe?g)$/i, ".webp") + post;
  });
  if (next !== orig) {
    writeFileSync(f, next);
    changed++;
    console.log("updated:", f);
  }
}
console.log(`\n${changed} dosya guncellendi`);
