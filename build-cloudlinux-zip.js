const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = "C:/Users/Administrator/Desktop/Albert Heijn/albert-heijn-demo";
const src = path.join(root, "runtime-package-fix");
const dst = path.join(root, "runtime-package-cloudlinux");
const zip = path.join(root, "albert-heijn-cpanel-cloudlinux-nonode_modules.zip");

function rmSafe(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyWithoutNodeModules(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    if (path.basename(from) === "node_modules") return;
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
      copyWithoutNodeModules(path.join(from, name), path.join(to, name));
    }
    return;
  }

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

if (!fs.existsSync(src)) {
  throw new Error("runtime-package-fix not found");
}

rmSafe(dst);
copyWithoutNodeModules(src, dst);
rmSafe(zip);

execSync(
  `powershell -NoProfile -Command "Set-Location '${root}'; Compress-Archive -Path '.\\\\runtime-package-cloudlinux\\\\*' -DestinationPath '.\\\\albert-heijn-cpanel-cloudlinux-nonode_modules.zip' -Force"`,
  { stdio: "inherit" }
);

const info = fs.statSync(zip);
console.log(`ZIP: ${zip}`);
console.log(`SIZE: ${info.size}`);
