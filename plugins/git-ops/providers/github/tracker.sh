#!/usr/bin/env bash
# tracker.sh — deterministic, idempotent GitHub Issues + ProjectV2 lifecycle ops.
#
# The tracker half of the `github` git-ops provider. Generalized from the original
# dev-cycle issue-ops.sh: every default is supplied by config/env (never baked to a
# specific org/repo/project), so a misconfiguration fails loud instead of writing to
# the wrong board.
#
# Design invariants (unchanged from the original, proven logic):
#   - Idempotent: every write is "ensure state == X", safe to re-run (stop-hook re-entry).
#   - Binding key: label `dc/<slug>` groups a feature's issues; a body marker identifies role/task.
#       parent:  <!-- dc:feature=<slug> role=parent -->
#       subtask: <!-- dc:feature=<slug> task=<task-id> -->
#   - Runtime ID discovery: project/field/option IDs are queried live (never hardcoded) so a
#     board schema change surfaces as a clear error instead of silent wrong writes.
#
# Config (env — normally set by `bin/git-ops` from .dev-cycle/config.json):
#   DC_OWNER  DC_REPO  DC_PROJECT   (REQUIRED — no defaults)
#   DC_ASSIGNEE=@me                 (optional)
#   DEV_CYCLE_DRYRUN=1  -> print mutations instead of executing them.
#
# Usage:
#   tracker ensure    <slug> --title T [--body-file F|--body B] [--target-date D] [--assignee A]
#   tracker subissue  <slug> --task <id> --title T [--body-file F|--body B]
#   tracker status    <slug|#> "<Status>"
#   tracker substatus <slug> --task <id> "<Status>"
#   tracker field     <#> <target-date|start-date> <YYYY-MM-DD>
#   tracker comment   <slug|#> (--body B | --body-file F)
#   tracker reconcile <slug> "<Status>"
#   tracker tasks     <slug|#> --file F
#   tracker check|uncheck <slug|#> "<substring>"
#   tracker show      <slug>
set -euo pipefail

DC_OWNER="${DC_OWNER:-}"
DC_REPO="${DC_REPO:-}"
DC_PROJECT="${DC_PROJECT:-}"
DC_ASSIGNEE_DEFAULT="${DC_ASSIGNEE:-@me}"
DRY="${DEV_CYCLE_DRYRUN:-0}"

log()  { printf '  %s\n' "$*" >&2; }
die()  { printf 'tracker: %s\n' "$*" >&2; exit 1; }
gql()  { gh api graphql "$@"; }
run()  { if [ "$DRY" = "1" ]; then log "[dry-run] $*"; else "$@"; fi; }

command -v gh >/dev/null || die "gh CLI not found"
command -v jq >/dev/null || die "jq not found"
[ -n "$DC_OWNER" ] && [ -n "$DC_REPO" ] && [ -n "$DC_PROJECT" ] \
  || die "DC_OWNER/DC_REPO/DC_PROJECT must be set (from .dev-cycle/config.json tracker block or env)"
REPO="${DC_OWNER}/${DC_REPO}"

# ---- runtime discovery (memoized in globals) -------------------------------
PROJECT_ID=""; STATUS_FIELD_ID=""
discover_project() {
  [ -n "$PROJECT_ID" ] && return 0
  local j
  j=$(gql -f query='query($o:String!,$n:Int!){ organization(login:$o){ projectV2(number:$n){
        id field(name:"Status"){ ... on ProjectV2SingleSelectField{ id } } } } }' \
      -f o="$DC_OWNER" -F n="$DC_PROJECT")
  PROJECT_ID=$(jq -r '.data.organization.projectV2.id' <<<"$j")
  STATUS_FIELD_ID=$(jq -r '.data.organization.projectV2.field.id' <<<"$j")
  [ "$PROJECT_ID" != "null" ] || die "project $DC_PROJECT not found under org $DC_OWNER"
}
status_option_id() {
  discover_project
  gql -f query='query($id:ID!){ node(id:$id){ ... on ProjectV2{ field(name:"Status"){
        ... on ProjectV2SingleSelectField{ options{ id name } } } } } }' -f id="$PROJECT_ID" \
    | jq -r --arg n "$1" '.data.node.field.options[] | select(.name|ascii_downcase==($n|ascii_downcase)) | .id' \
    | head -1
}
issue_node_id() { gh issue view "$1" --repo "$REPO" --json id -q '.id'; }
issue_url()     { gh issue view "$1" --repo "$REPO" --json url -q '.url'; }
issue_item_id() {
  discover_project
  local num="$1" nid item
  nid=$(issue_node_id "$num")
  item=$(gql -f query='query($id:ID!){ node(id:$id){ ... on Issue{ projectItems(first:30){ nodes{ id project{ id } } } } } }' -f id="$nid" \
        | jq -r --arg p "$PROJECT_ID" '.data.node.projectItems.nodes[] | select(.project.id==$p) | .id' | head -1)
  if [ -z "$item" ] || [ "$item" = "null" ]; then
    item=$(gh project item-add "$DC_PROJECT" --owner "$DC_OWNER" --url "$(issue_url "$num")" --format json --jq '.id')
  fi
  printf '%s' "$item"
}
issue_field_id() {
  gql -f query='query($o:String!,$r:String!){ repository(owner:$o,name:$r){ issueFields(first:50){ nodes{ __typename ... on IssueFieldDate{ id name } } } } }' \
      -f o="$DC_OWNER" -f r="$DC_REPO" \
    | jq -r --arg n "$1" '.data.repository.issueFields.nodes[] | select((.name // "")|ascii_downcase==($n|ascii_downcase)) | .id' | head -1
}
ensure_label() { gh label create "$1" --repo "$REPO" --color "$2" --description "${3:-}" --force >/dev/null 2>&1 || true; }

find_marked() { # <slug> <marker-substring>
  local out i
  for i in 1 2 3; do
    out=$(gh issue list --repo "$REPO" --label "dc/$1" --state all --limit 200 --json number,body 2>/dev/null \
      | jq -r --arg m "$2" 'map(select(.body // "" | contains($m))) | (.[0].number // empty)')
    [ -n "$out" ] && { printf '%s' "$out"; return 0; }
    sleep 1
  done
  return 0
}

# ---- subcommands -----------------------------------------------------------
set_status() { # <issue#> <status-name>
  local num="$1" name="$2" oid item
  discover_project
  oid=$(status_option_id "$name"); [ -n "$oid" ] || die "unknown Status '$name'"
  item=$(issue_item_id "$num")
  run gql -f query='mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){ updateProjectV2ItemFieldValue(input:{
        projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){ projectV2Item{ id } } }' \
      -f p="$PROJECT_ID" -f i="$item" -f f="$STATUS_FIELD_ID" -f o="$oid" >/dev/null
  log "#$num -> Status: $name"
}

cmd_ensure() {
  local slug="$1"; shift
  local title="" body="" bodyfile="" tdate="" assignee="$DC_ASSIGNEE_DEFAULT"
  while [ $# -gt 0 ]; do case "$1" in
    --title) title="$2"; shift 2;; --body) body="$2"; shift 2;; --body-file) bodyfile="$2"; shift 2;;
    --target-date) tdate="$2"; shift 2;; --priority) shift 2;; --assignee) assignee="$2"; shift 2;;
    *) die "ensure: unknown arg $1";; esac; done
  [ -n "$title" ] || die "ensure: --title required"
  ensure_label "dc/$slug" "1d76db" "dev-cycle feature: $slug"
  local existing; existing=$(find_marked "$slug" "role=parent" || true)
  if [ -n "$existing" ]; then log "parent exists: #$existing"; printf '%s\n' "$existing"; return 0; fi
  local marker="<!-- dc:feature=$slug role=parent -->"
  local full; full="$marker"$'\n\n'
  if [ -n "$bodyfile" ]; then full+="$(cat "$bodyfile")"; else full+="$body"; fi
  if [ "$DRY" = "1" ]; then log "[dry-run] create parent '$title' (label dc/$slug, enhancement)"; printf 'DRYRUN\n'; return 0; fi
  local url; url=$(gh issue create --repo "$REPO" --title "$title" --body "$full" \
      --label "dc/$slug" --label enhancement --assignee "$assignee")
  local num; num="${url##*/}"
  gh project item-add "$DC_PROJECT" --owner "$DC_OWNER" --url "$url" >/dev/null
  [ -n "$tdate" ] && cmd_field "$num" target-date "$tdate"
  set_status "$num" "Backlog"
  log "created parent #$num  $url"; printf '%s\n' "$num"
}

cmd_subissue() {
  local slug="$1"; shift
  local task="" title="" body="" bodyfile=""
  while [ $# -gt 0 ]; do case "$1" in
    --task) task="$2"; shift 2;; --title) title="$2"; shift 2;;
    --body) body="$2"; shift 2;; --body-file) bodyfile="$2"; shift 2;;
    *) die "subissue: unknown arg $1";; esac; done
  [ -n "$task" ] && [ -n "$title" ] || die "subissue: --task and --title required"
  local parent; parent=$(find_marked "$slug" "role=parent" || true); [ -n "$parent" ] || die "no parent for '$slug' (run ensure first)"
  ensure_label "dc/$slug" "1d76db" "dev-cycle feature: $slug"
  ensure_label "task" "d4c5f9" "dev-cycle sub-task"
  local existing; existing=$(find_marked "$slug" "task=$task" || true)
  if [ -n "$existing" ]; then log "sub #$existing exists (task=$task)"; printf '%s\n' "$existing"; return 0; fi
  local marker="<!-- dc:feature=$slug task=$task -->"
  local full; full="$marker"$'\n\n'"Part of #$parent"$'\n\n'
  if [ -n "$bodyfile" ]; then full+="$(cat "$bodyfile")"; else full+="$body"; fi
  if [ "$DRY" = "1" ]; then log "[dry-run] create sub '$title' under #$parent (task=$task)"; printf 'DRYRUN\n'; return 0; fi
  local url; url=$(gh issue create --repo "$REPO" --title "$title" --body "$full" --label "dc/$slug" --label task --assignee "$DC_ASSIGNEE_DEFAULT")
  local num; num="${url##*/}"
  gh project item-add "$DC_PROJECT" --owner "$DC_OWNER" --url "$url" >/dev/null
  gql -f query='mutation($p:ID!,$c:ID!){ addSubIssue(input:{issueId:$p,subIssueId:$c}){ subIssue{ number } } }' \
      -f p="$(issue_node_id "$parent")" -f c="$(issue_node_id "$num")" >/dev/null
  set_status "$num" "Backlog"
  log "created sub #$num under #$parent  $url"; printf '%s\n' "$num"
}

cmd_status() { # <slug|#> <status>
  local ref="$1" name="$2" num
  if [[ "$ref" =~ ^[0-9]+$ ]]; then num="$ref"; else num=$(find_marked "$ref" "role=parent" || true); [ -n "$num" ] || die "no parent for '$ref'"; fi
  set_status "$num" "$name"
}
cmd_substatus() { local slug="$1"; shift; local task="" name=""; while [ $# -gt 0 ]; do case "$1" in --task) task="$2"; shift 2;; *) name="$1"; shift;; esac; done
  local num; num=$(find_marked "$slug" "task=$task" || true); [ -n "$num" ] || die "no sub task=$task for '$slug'"; set_status "$num" "$name"; }

cmd_field() { # <#> <target-date|start-date> <date>
  local num="$1" which="$2" date="$3" name fid nid
  case "$which" in target-date) name="Target date";; start-date) name="Start date";; *) die "field: use target-date|start-date";; esac
  fid=$(issue_field_id "$name"); [ -n "$fid" ] || die "issue field '$name' not found"
  nid=$(issue_node_id "$num")
  run gql -f query='mutation($i:ID!,$f:ID!,$d:String!){ updateIssueFieldValue(input:{issueId:$i,issueField:{fieldId:$f,dateValue:$d}}){ issue{ number } } }' \
      -f i="$nid" -f f="$fid" -f d="$date" >/dev/null
  log "#$num -> $name: $date"
}

cmd_comment() { # <slug|#> --body|--body-file
  local ref="$1"; shift; local body="" bodyfile=""
  while [ $# -gt 0 ]; do case "$1" in --body) body="$2"; shift 2;; --body-file) bodyfile="$2"; shift 2;; *) die "comment: unknown arg $1";; esac; done
  local num; if [[ "$ref" =~ ^[0-9]+$ ]]; then num="$ref"; else num=$(find_marked "$ref" "role=parent" || true); [ -n "$num" ] || die "no parent for '$ref'"; fi
  if [ -n "$bodyfile" ]; then run gh issue comment "$num" --repo "$REPO" --body-file "$bodyfile" >/dev/null
  else run gh issue comment "$num" --repo "$REPO" --body "$body" >/dev/null; fi
  log "#$num commented"
}

cmd_reconcile() { # <slug> <status>  (parent + all subs)
  local slug="$1" name="$2"
  local nums; nums=$(gh issue list --repo "$REPO" --label "dc/$slug" --state all --limit 200 --json number -q '.[].number')
  [ -n "$nums" ] || die "no issues for dc/$slug"
  for n in $nums; do set_status "$n" "$name"; done
}

cmd_tasks() { # <slug|#> --file F
  local ref="$1"; shift; local file=""
  while [ $# -gt 0 ]; do case "$1" in --file) file="$2"; shift 2;; *) die "tasks: unknown arg $1";; esac; done
  [ -n "$file" ] && [ -f "$file" ] || die "tasks: --file <tasks.md> required"
  local num; if [[ "$ref" =~ ^[0-9]+$ ]]; then num="$ref"; else num=$(find_marked "$ref" "role=parent" || true); [ -n "$num" ] || die "no parent for '$ref'"; fi
  local body tmp; body=$(gh issue view "$num" --repo "$REPO" --json body -q .body); tmp=$(mktemp)
  TASKS_FILE="$file" python3 - "$body" >"$tmp" <<'PY'
import os,sys,re
body=sys.argv[1]
tasks=[l.strip().lstrip('-* ').strip() for l in open(os.environ['TASKS_FILE']) if l.strip()]
checked=set()
m=re.search(r'<!-- dc:tasks -->(.*?)<!-- /dc:tasks -->', body, re.S)
if m:
    for ln in m.group(1).splitlines():
        mm=re.match(r'\s*- \[x\]\s+(.*)', ln, re.I)
        if mm: checked.add(mm.group(1).strip())
items="\n".join(f"- [{'x' if t in checked else ' '}] {t}" for t in tasks)
block=f"<!-- dc:tasks -->\n### Tasks\n{items}\n<!-- /dc:tasks -->"
sys.stdout.write((body[:m.start()]+block+body[m.end():]) if m else (body.rstrip()+"\n\n"+block+"\n"))
PY
  run gh issue edit "$num" --repo "$REPO" --body-file "$tmp" >/dev/null; rm -f "$tmp"
  log "#$num tasks checklist synced"
}

cmd_check() { # <check|uncheck> <slug|#> "<substring>"
  local mark="$1" ref="$2" pat="$3" num body tmp
  if [[ "$ref" =~ ^[0-9]+$ ]]; then num="$ref"; else num=$(find_marked "$ref" "role=parent" || true); [ -n "$num" ] || die "no parent for '$ref'"; fi
  body=$(gh issue view "$num" --repo "$REPO" --json body -q .body); tmp=$(mktemp)
  MARK="$mark" PAT="$pat" python3 - "$body" >"$tmp" <<'PY'
import os,sys,re
body=sys.argv[1]; pat=os.environ['PAT']; want='x' if os.environ['MARK']=='check' else ' '
def repl(mo):
    block=mo.group(0); out=[]
    for ln in block.splitlines():
        m=re.match(r'(\s*- \[)[ xX](\]\s+)(.*)', ln)
        if m and pat.lower() in m.group(3).lower(): ln=f"{m.group(1)}{want}{m.group(2)}{m.group(3)}"
        out.append(ln)
    return "\n".join(out)
sys.stdout.write(re.sub(r'<!-- dc:tasks -->.*?<!-- /dc:tasks -->', repl, body, flags=re.S))
PY
  run gh issue edit "$num" --repo "$REPO" --body-file "$tmp" >/dev/null; rm -f "$tmp"
  log "#$num $mark: '$pat'"
}

cmd_show() {
  local slug="$1"
  gh issue list --repo "$REPO" --label "dc/$slug" --state all --limit 200 \
     --json number,title,state,labels -q '.[] | "#\(.number) [\(.state)] \(.title)"'
}

cmd_label() { # <slug|#> <label> [--color C] [--desc D]  (ensure label exists + apply to issue)
  local ref="$1" lbl="$2"; shift 2; local color="d73a4a" desc=""
  while [ $# -gt 0 ]; do case "$1" in --color) color="$2"; shift 2;; --desc) desc="$2"; shift 2;; *) shift;; esac; done
  local num; if [[ "$ref" =~ ^[0-9]+$ ]]; then num="$ref"; else num=$(find_marked "$ref" "role=parent" || true); [ -n "$num" ] || die "no parent for '$ref'"; fi
  ensure_label "$lbl" "$color" "$desc"
  run gh issue edit "$num" --repo "$REPO" --add-label "$lbl" >/dev/null
  log "#$num +label $lbl"
}

sub="${1:-}"; [ -n "$sub" ] || die "usage: tracker <ensure|subissue|status|substatus|field|comment|reconcile|tasks|check|uncheck|show|label> ..."; shift
case "$sub" in
  ensure) cmd_ensure "$@";; subissue) cmd_subissue "$@";; status) cmd_status "$@";;
  substatus) cmd_substatus "$@";; field) cmd_field "$@";; comment) cmd_comment "$@";;
  tasks) cmd_tasks "$@";; check) cmd_check check "$@";; uncheck) cmd_check uncheck "$@";;
  reconcile) cmd_reconcile "$@";; show) cmd_show "$@";; label) cmd_label "$@";;
  *) die "unknown subcommand '$sub'";;
esac
