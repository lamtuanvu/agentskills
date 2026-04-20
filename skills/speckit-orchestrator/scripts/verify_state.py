#!/usr/bin/env python3
"""
Verify alignment between orchestrator state and filesystem.

Checks:
1. Current git branch matches state's branch_name
2. docs/features/<feature>/ dir exists
3. idea.md exists in feature dir
4. spec_dir path exists on disk; if not, search for specs/<branch_name>/
5. State JSON has required fields

Usage:
    python verify_state.py [--fix] [--quiet]

Exit codes:
    0 = all checks pass
    1 = fixable issues found (use --fix to auto-correct)
    2 = critical error (manual intervention required)
"""

import argparse
import json
import os
import subprocess
import sys


REQUIRED_FIELDS = [
    "feature_name", "branch_name", "idea_file", "spec_dir",
    "current_step", "step_status", "started_at", "last_updated",
]


def get_current_branch():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def find_state_file(base_dir):
    """Find state file by scanning docs/features/*/orchestrator-state.json."""
    features_dir = os.path.join(base_dir, "docs", "features")
    if not os.path.isdir(features_dir):
        return None, None

    branch = get_current_branch()

    for entry in os.listdir(features_dir):
        candidate = os.path.join(features_dir, entry, "orchestrator-state.json")
        if os.path.exists(candidate):
            try:
                with open(candidate, "r") as f:
                    data = json.load(f)
                if data.get("branch_name") == branch:
                    return candidate, data
            except (json.JSONDecodeError, OSError):
                continue

    # Fallback: try feature name derived from branch
    if branch:
        import re
        match = re.match(r"^\d+-(.+)$", branch)
        feature = match.group(1) if match else branch
        candidate = os.path.join(features_dir, feature, "orchestrator-state.json")
        if os.path.exists(candidate):
            try:
                with open(candidate, "r") as f:
                    data = json.load(f)
                return candidate, data
            except (json.JSONDecodeError, OSError):
                pass

    return None, None


def main():
    parser = argparse.ArgumentParser(
        description="Verify orchestrator state alignment with filesystem"
    )
    parser.add_argument(
        "--fix", action="store_true",
        help="Auto-fix correctable issues (e.g., spec_dir mismatch)",
    )
    parser.add_argument(
        "--quiet", action="store_true",
        help="Only output errors, suppress passing checks",
    )
    parser.add_argument(
        "--base-dir", default=os.getcwd(),
        help="Base directory (default: current working directory)",
    )
    args = parser.parse_args()

    base_dir = args.base_dir
    quiet = args.quiet
    fix = args.fix

    # Find state file
    state_file, state = find_state_file(base_dir)
    if not state_file:
        print("ERROR: No orchestrator-state.json found for current branch.")
        sys.exit(2)

    if not quiet:
        print(f"State file: {state_file}")

    issues = []  # (level, message) where level is "warn", "fix", "error"

    # Check 5: Required fields
    for field in REQUIRED_FIELDS:
        if field not in state:
            issues.append(("error", f"Missing required field: {field}"))

    if any(level == "error" for level, _ in issues):
        for level, msg in issues:
            print(f"  [{level.upper()}] {msg}")
        print("\nCritical errors found. Fix state file manually.")
        sys.exit(2)

    feature_name = state["feature_name"]
    branch_name = state["branch_name"]

    # Check 1: Branch matches
    current_branch = get_current_branch()
    if current_branch and current_branch != branch_name:
        issues.append((
            "warn",
            f"Current branch '{current_branch}' != state branch_name '{branch_name}'",
        ))

    # Check 2: Feature dir exists
    feature_dir = os.path.join(base_dir, "docs", "features", feature_name)
    if not os.path.isdir(feature_dir):
        issues.append(("error", f"Feature dir not found: {feature_dir}"))

    # Check 3: idea.md exists
    idea_file = state.get("idea_file", "")
    if idea_file and not os.path.exists(idea_file):
        # Try relative path
        idea_abs = os.path.join(base_dir, idea_file) if not os.path.isabs(idea_file) else idea_file
        if not os.path.exists(idea_abs):
            issues.append(("warn", f"idea.md not found: {idea_file}"))

    # Check 4: spec_dir exists
    spec_dir = state.get("spec_dir", "")
    spec_dir_abs = spec_dir if os.path.isabs(spec_dir) else os.path.join(base_dir, spec_dir)
    spec_dir_exists = os.path.isdir(spec_dir_abs)

    if not spec_dir_exists:
        # Search for specs/<branch_name>/
        branch_spec = os.path.join(base_dir, "specs", branch_name)
        if os.path.isdir(branch_spec):
            issues.append((
                "fix",
                f"spec_dir '{spec_dir}' not found, but 'specs/{branch_name}' exists",
            ))
            if fix:
                # Auto-fix: update spec_dir in state
                new_spec_dir = os.path.join(base_dir, "specs", branch_name)
                state["spec_dir"] = new_spec_dir
                from datetime import datetime, timezone
                state["last_updated"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                with open(state_file, "w") as f:
                    json.dump(state, f, indent=2)
                if not quiet:
                    print(f"  [FIXED] spec_dir updated to '{new_spec_dir}'")
        else:
            # Neither exists — spec may not be created yet (pre-specify)
            step = state.get("current_step", "")
            if step != "specify":
                issues.append(("warn", f"spec_dir '{spec_dir}' not found on disk"))

    # Report
    has_critical = any(level == "error" for level, _ in issues)
    has_fixable = any(level == "fix" for level, _ in issues)
    has_warnings = any(level == "warn" for level, _ in issues)

    if not issues:
        if not quiet:
            print("  All checks passed.")
        sys.exit(0)

    for level, msg in issues:
        if level == "fix" and fix:
            continue  # Already printed the fix above
        print(f"  [{level.upper()}] {msg}")

    if has_critical:
        print("\nCritical errors found. Manual intervention required.")
        sys.exit(2)

    if has_fixable and not fix:
        print(f"\nFixable issues found. Re-run with --fix to auto-correct.")
        sys.exit(1)

    if has_fixable and fix:
        # All fixable issues were fixed
        remaining = [m for l, m in issues if l not in ("fix",)]
        if not remaining:
            if not quiet:
                print("  All fixable issues resolved.")
            sys.exit(0)

    # Only warnings remain
    sys.exit(0)


if __name__ == "__main__":
    main()
