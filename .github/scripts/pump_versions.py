#!/usr/bin/env python3
"""Auto-bump versions for changed skills and local plugins since the last v* tag.

Conventional-commits aware. Stdlib only. Writes back in-place.

Outputs (when run inside GitHub Actions, $GITHUB_OUTPUT is set):
  bumped=true|false
  root_version=<new-root-version>
  tags=<space-separated per-unit + root tags>
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SKILLS_DIR = REPO / "skills"
PLUGINS_DIR = REPO / "plugins"
MARKETPLACE_JSON = REPO / ".claude-plugin" / "marketplace.json"

LEVEL_NONE, LEVEL_PATCH, LEVEL_MINOR, LEVEL_MAJOR = 0, 1, 2, 3
LEVEL_NAMES = {LEVEL_PATCH: "patch", LEVEL_MINOR: "minor", LEVEL_MAJOR: "major"}

CC_RE = re.compile(r"^(?P<type>[a-zA-Z]+)(?:\([^)]*\))?(?P<bang>!)?:")
SEMVER_RE = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")
SKILL_VERSION_LINE_RE = re.compile(
    r'^(?P<indent>\s+)version:\s*(?P<quote>["\']?)(?P<ver>\d+\.\d+\.\d+)(?P=quote)\s*$'
)


def run(args: list[str], cwd: Path = REPO) -> str:
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def since_ref() -> str:
    """Last v* tag, or repo root commit if no tag exists."""
    try:
        return run(["git", "describe", "--tags", "--match", "v*", "--abbrev=0"])
    except subprocess.CalledProcessError:
        return run(["git", "rev-list", "--max-parents=0", "HEAD"])


def commits_touching(path: str, since: str) -> list[tuple[str, str]]:
    """Return [(subject, body), ...] for commits in since..HEAD touching path."""
    sep = "\x1e"
    fmt = f"%s%n%b{sep}"
    out = run(["git", "log", f"{since}..HEAD", f"--pretty=format:{fmt}", "--", path])
    if not out:
        return []
    commits = []
    for chunk in out.split(sep):
        chunk = chunk.strip("\n")
        if not chunk:
            continue
        subject, _, body = chunk.partition("\n")
        commits.append((subject, body))
    return commits


def commit_level(subject: str, body: str) -> int:
    m = CC_RE.match(subject)
    if not m:
        return LEVEL_PATCH
    if m.group("bang") or "BREAKING CHANGE" in body:
        return LEVEL_MAJOR
    t = m.group("type").lower()
    if t == "feat":
        return LEVEL_MINOR
    return LEVEL_PATCH


def level_for_path(path: str, since: str) -> int:
    commits = commits_touching(path, since)
    if not commits:
        return LEVEL_NONE
    return max((commit_level(s, b) for s, b in commits), default=LEVEL_PATCH)


def bump(version: str, level: int) -> str:
    m = SEMVER_RE.match(version)
    if not m:
        raise ValueError(f"Not semver: {version}")
    major, minor, patch = (int(x) for x in m.groups())
    if level == LEVEL_MAJOR:
        return f"{major + 1}.0.0"
    if level == LEVEL_MINOR:
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def read_skill_version(skill_md: Path) -> str | None:
    text = skill_md.read_text()
    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    in_metadata = False
    for line in parts[1].splitlines():
        stripped = line.rstrip()
        if stripped == "metadata:":
            in_metadata = True
            continue
        if in_metadata:
            m = SKILL_VERSION_LINE_RE.match(stripped)
            if m:
                return m.group("ver")
            if line and not line.startswith((" ", "\t")):
                in_metadata = False
    return None


SKILL_VERSION_SUB_RE = re.compile(
    r'(?m)^(?P<indent>[ \t]+)version:[ \t]*(?P<quote>["\']?)\d+\.\d+\.\d+(?P=quote)[ \t]*$'
)


def write_skill_version(skill_md: Path, new_version: str) -> bool:
    """Rewrite metadata.version in SKILL.md frontmatter, preserving all surrounding bytes."""
    text = skill_md.read_text()
    parts = text.split("---", 2)
    if len(parts) < 3:
        return False
    fm = parts[1]

    def repl(m: re.Match) -> str:
        return f'{m.group("indent")}version: {m.group("quote")}{new_version}{m.group("quote")}'

    new_fm, count = SKILL_VERSION_SUB_RE.subn(repl, fm, count=1)
    if count == 0:
        return False
    skill_md.write_text("---" + new_fm + "---" + parts[2])
    return True


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def local_plugin_names(marketplace: dict) -> set[str]:
    out = set()
    for p in marketplace.get("plugins", []):
        src = p.get("source")
        if isinstance(src, str):
            out.add(p["name"])
    return out


PLUGIN_JSON_VERSION_RE = re.compile(r'("version"\s*:\s*")[^"]*(")')


def write_plugin_json_version(path: Path, new_version: str) -> bool:
    """Surgical version update for plugin.json — preserves all formatting."""
    text = path.read_text()
    new_text, n = PLUGIN_JSON_VERSION_RE.subn(
        rf'\g<1>{new_version}\g<2>', text, count=1
    )
    if n == 0:
        return False
    path.write_text(new_text)
    return True


# Indentation-anchored to top-level (2-space) and metadata-block (4-space) keys.
MARKETPLACE_ROOT_VERSION_RE = re.compile(
    r'(?m)^(  "version"\s*:\s*")[^"]*(")'
)
MARKETPLACE_METADATA_VERSION_RE = re.compile(
    r'(?m)^(    "version"\s*:\s*")[^"]*(")'
)


def write_marketplace_versions(
    path: Path,
    new_root: str,
    plugin_versions: dict[str, str],
) -> None:
    """Surgical version updates for marketplace.json — preserves array layout, em-dashes, etc."""
    text = path.read_text()
    text, n = MARKETPLACE_ROOT_VERSION_RE.subn(
        rf'\g<1>{new_root}\g<2>', text, count=1
    )
    if n == 0:
        raise RuntimeError("root version key not found in marketplace.json")
    text, _ = MARKETPLACE_METADATA_VERSION_RE.subn(
        rf'\g<1>{new_root}\g<2>', text, count=1
    )
    for name, ver in plugin_versions.items():
        pattern = re.compile(
            rf'("name"\s*:\s*"{re.escape(name)}".*?"version"\s*:\s*")[^"]*(")',
            re.DOTALL,
        )
        text, n = pattern.subn(rf'\g<1>{ver}\g<2>', text, count=1)
        if n == 0:
            raise RuntimeError(f"plugin {name} version key not found")
    path.write_text(text)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    since = since_ref()
    print(f"Diffing since: {since}", file=sys.stderr)

    marketplace = read_json(MARKETPLACE_JSON)
    local_plugins = local_plugin_names(marketplace)

    bumps: list[tuple[str, str, str, str, int]] = []  # (kind, name, old, new, level)
    root_level = LEVEL_NONE

    if SKILLS_DIR.is_dir():
        for skill_dir in sorted(p for p in SKILLS_DIR.iterdir() if p.is_dir()):
            rel = f"skills/{skill_dir.name}"
            level = level_for_path(rel, since)
            if level == LEVEL_NONE:
                continue
            skill_md = skill_dir / "SKILL.md"
            if not skill_md.exists():
                continue
            old = read_skill_version(skill_md)
            if not old:
                print(f"WARN: no metadata.version in {skill_md}, skipping", file=sys.stderr)
                continue
            new = bump(old, level)
            if not args.dry_run:
                if not write_skill_version(skill_md, new):
                    print(f"WARN: failed to write version to {skill_md}", file=sys.stderr)
                    continue
            bumps.append(("skill", skill_dir.name, old, new, level))
            root_level = max(root_level, level)

    if PLUGINS_DIR.is_dir():
        for plugin_dir in sorted(p for p in PLUGINS_DIR.iterdir() if p.is_dir()):
            name = plugin_dir.name
            if name not in local_plugins:
                continue
            rel = f"plugins/{name}"
            level = level_for_path(rel, since)
            if level == LEVEL_NONE:
                continue
            plugin_json_path = plugin_dir / ".claude-plugin" / "plugin.json"
            if not plugin_json_path.exists():
                continue
            plugin_json = read_json(plugin_json_path)
            old = plugin_json.get("version")
            if not old:
                print(f"WARN: no version in {plugin_json_path}, skipping", file=sys.stderr)
                continue
            new = bump(old, level)
            if not args.dry_run:
                if not write_plugin_json_version(plugin_json_path, new):
                    print(f"WARN: failed to write version to {plugin_json_path}", file=sys.stderr)
                    continue
            bumps.append(("plugin", name, old, new, level))
            root_level = max(root_level, level)

    if root_level == LEVEL_NONE:
        print("No bumps needed.")
        emit_outputs(False, marketplace.get("version", "0.0.0"), [])
        return 0

    old_root = marketplace.get("version", "0.0.0")
    new_root = bump(old_root, root_level)
    if not args.dry_run:
        plugin_version_updates = {
            name: new for kind, name, _, new, _ in bumps if kind == "plugin"
        }
        write_marketplace_versions(MARKETPLACE_JSON, new_root, plugin_version_updates)

    print("\nBump summary:")
    for kind, name, old, new, level in bumps:
        print(f"  {kind:7s} {name:30s} {old} -> {new}  ({LEVEL_NAMES[level]})")
    print(f"  root    marketplace                    {old_root} -> {new_root}  ({LEVEL_NAMES[root_level]})")

    tags = [f"{name}-v{new}" for _, name, _, new, _ in bumps]
    emit_outputs(True, new_root, tags)
    return 0


def emit_outputs(bumped: bool, root_version: str, tags: list[str]) -> None:
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if not gh_out:
        return
    with open(gh_out, "a") as f:
        f.write(f"bumped={'true' if bumped else 'false'}\n")
        f.write(f"root_version={root_version}\n")
        f.write(f"tags={' '.join(tags)}\n")


if __name__ == "__main__":
    sys.exit(main())
