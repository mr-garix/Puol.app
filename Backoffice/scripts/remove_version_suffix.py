from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATTERN = re.compile(r"(['\"])([^'\"]*?)(@(?=\d)[^'\"]*)\1")

def strip_version(match: re.Match[str]) -> str:
    quote, path, suffix = match.groups()
    # Only remove suffixes like @1.2.3 (no slashes allowed)
    if "/" in suffix:
        return match.group(0)
    return f"{quote}{path}{quote}"

changed_files: list[Path] = []
for file_path in ROOT.rglob("*.ts*"):
    text = file_path.read_text(encoding="utf-8")
    new_text, count = PATTERN.subn(strip_version, text)
    if count:
        file_path.write_text(new_text, encoding="utf-8")
        changed_files.append(file_path)

print(f"Updated {len(changed_files)} files:")
for path in changed_files:
    print(f" - {path.relative_to(ROOT)}")
