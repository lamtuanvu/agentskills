#!/usr/bin/env bash
# scm.sh — GitHub SCM conventions for the git-ops `github` provider.
#
# Branch/commit/PR/merge helpers driven by the .dev-cycle/config.json `scm` block
# (surfaced as env by bin/git-ops). Runs git against the current working tree, so it
# is safe inside a git worktree (operates on whatever branch/worktree is checked out).
#
# Config (env — set by bin/git-ops from config.scm):
#   DC_OWNER  DC_REPO                         (REQUIRED)
#   GITOPS_BRANCH_PREFIX=NNN-kebab            branch naming: "NNN-kebab" -> <zero-padded#>-<slug>; "kebab" -> <slug>
#   GITOPS_COMMIT_CONVENTION=conventional     commit message shaping
#   GITOPS_PR_CLOSES_PARENT=true              add "Closes #<parent>" to PR body
#   DEV_CYCLE_DRYRUN=1                         print instead of execute
#
# Usage:
#   scm branch  <slug> [--number N]                 # create+checkout the feature branch, print its name
#   scm branch-name <slug> [--number N]             # print the branch name only (no git op)
#   scm commit  --message M [--issue N] [--type T]  # stage-all + conventional commit with (#N)
#   scm pr      <slug> --parent N --branch B [--title T] [--body-file F]   # gh pr create (Closes #parent)
#   scm merge   <pr#> [--method squash|merge|rebase]
#   scm current-branch
set -euo pipefail

DC_OWNER="${DC_OWNER:-}"; DC_REPO="${DC_REPO:-}"
PREFIX="${GITOPS_BRANCH_PREFIX:-NNN-kebab}"
CONVENTION="${GITOPS_COMMIT_CONVENTION:-conventional}"
PR_CLOSES="${GITOPS_PR_CLOSES_PARENT:-true}"
DRY="${DEV_CYCLE_DRYRUN:-0}"

log() { printf '  %s\n' "$*" >&2; }
die() { printf 'scm: %s\n' "$*" >&2; exit 1; }
run() { if [ "$DRY" = "1" ]; then log "[dry-run] $*"; else "$@"; fi; }

command -v git >/dev/null || die "git not found"
[ -n "$DC_OWNER" ] && [ -n "$DC_REPO" ] || die "DC_OWNER/DC_REPO must be set"
REPO="${DC_OWNER}/${DC_REPO}"

kebab() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'; }

branch_name() { # <slug> [number]
  local slug; slug=$(kebab "$1"); local num="${2:-}"
  case "$PREFIX" in
    NNN-kebab) if [ -n "$num" ]; then printf '%03d-%s' "$num" "$slug"; else printf '%s' "$slug"; fi;;
    kebab|"") printf '%s' "$slug";;
    *) # treat any other value as a literal prefix string
       printf '%s%s' "$PREFIX" "$slug";;
  esac
}

cmd_branch_name() { local slug="$1"; shift; local num=""; while [ $# -gt 0 ]; do case "$1" in --number) num="$2"; shift 2;; *) shift;; esac; done; branch_name "$slug" "$num"; }

cmd_branch() {
  local slug="$1"; shift; local num=""
  while [ $# -gt 0 ]; do case "$1" in --number) num="$2"; shift 2;; *) die "branch: unknown arg $1";; esac; done
  local b; b=$(branch_name "$slug" "$num")
  if git show-ref --verify --quiet "refs/heads/$b"; then run git checkout "$b" >/dev/null 2>&1
  else run git checkout -b "$b" >/dev/null 2>&1; fi
  log "on branch $b"; printf '%s\n' "$b"
}

cmd_commit() {
  local msg="" issue="" type="feat"
  while [ $# -gt 0 ]; do case "$1" in --message) msg="$2"; shift 2;; --issue) issue="$2"; shift 2;; --type) type="$2"; shift 2;; *) die "commit: unknown arg $1";; esac; done
  [ -n "$msg" ] || die "commit: --message required"
  local full="$msg"
  if [ "$CONVENTION" = "conventional" ] && ! printf '%s' "$msg" | grep -Eq '^[a-z]+(\(.+\))?!?: '; then full="${type}: ${msg}"; fi
  [ -n "$issue" ] && ! printf '%s' "$full" | grep -q "(#$issue)" && full="${full} (#${issue})"
  run git add -A
  run git commit -m "$full" >/dev/null
  log "committed: $full"
}

cmd_pr() {
  local slug="$1"; shift; local parent="" branch="" title="" bodyfile=""
  while [ $# -gt 0 ]; do case "$1" in --parent) parent="$2"; shift 2;; --branch) branch="$2"; shift 2;; --title) title="$2"; shift 2;; --body-file) bodyfile="$2"; shift 2;; *) die "pr: unknown arg $1";; esac; done
  [ -n "$branch" ] || branch=$(git rev-parse --abbrev-ref HEAD)
  [ -n "$title" ] || title="$slug"
  local body=""
  [ -n "$bodyfile" ] && body="$(cat "$bodyfile")"$'\n\n'
  if [ "$PR_CLOSES" = "true" ] && [ -n "$parent" ]; then body+="Closes #${parent}"; fi
  run git push -u origin "$branch" >/dev/null 2>&1 || true
  if [ "$DRY" = "1" ]; then log "[dry-run] gh pr create --repo $REPO --head $branch --title '$title' (body: ${body:0:60}...)"; printf 'DRYRUN\n'; return 0; fi
  local url; url=$(gh pr create --repo "$REPO" --head "$branch" --title "$title" --body "$body")
  log "opened PR $url"; printf '%s\n' "${url##*/}"
}

cmd_merge() {
  local pr="$1"; shift; local method="squash"
  while [ $# -gt 0 ]; do case "$1" in --method) method="$2"; shift 2;; *) shift;; esac; done
  run gh pr merge "$pr" --repo "$REPO" "--$method" --delete-branch >/dev/null
  log "merged PR #$pr ($method)"
}

sub="${1:-}"; [ -n "$sub" ] || die "usage: scm <branch|branch-name|commit|pr|merge|current-branch> ..."; shift
case "$sub" in
  branch) cmd_branch "$@";; branch-name) cmd_branch_name "$@";; commit) cmd_commit "$@";;
  pr) cmd_pr "$@";; merge) cmd_merge "$@";; current-branch) git rev-parse --abbrev-ref HEAD;;
  *) die "unknown subcommand '$sub'";;
esac
