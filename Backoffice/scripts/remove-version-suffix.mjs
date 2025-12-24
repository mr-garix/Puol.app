import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const exts = new Set([".ts", ".tsx", ".mts", ".cts"]);
const versionPattern = /(["'])([^"']+?)@\d[\w.:-]*\1/g;

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (exts.has(ext)) {
        processFile(fullPath);
      }
    }
  }
}

const changed = [];

function processFile(filePath) {
  const original = readFileSync(filePath, "utf8");
  const updated = original.replace(versionPattern, (_match, quote, pkg) => {
    return `${quote}${pkg}${quote}`;
  });
  if (updated !== original) {
    writeFileSync(filePath, updated, "utf8");
    changed.push(path.relative(rootDir, filePath));
  }
}

walk(rootDir);
console.log(`Updated ${changed.length} files`);
changed.forEach((f) => console.log(` - ${f}`));
