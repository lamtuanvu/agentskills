# Agentic Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `agentic-harness` skill that auto-builds a comprehensive, self-tested agentic validation harness for any project, driven by a declarative manifest and a generic runner.

**Architecture:** Hybrid C+B. A generic manifest-driven runner (`dev-cycle/bin/harness`) implements the extended validation contract by executing manifest-declared commands / hooks. A `build-harness.js` Workflow does the detect/draft compute. The `agentic-harness` skill conducts: invoke the Workflow → gate → write the manifest → self-verify by actually running the verbs → gate destructive ops → finalize.

**Tech Stack:** Bash (runner), JSON Schema (manifest), a dynamic Workflow JS script (harness-executed, uses `agent`/`parallel`/`pipeline`), Markdown (skill + contract docs). Reuses `dev-cycle`'s `e2e-agentic.js` and validation contract.

## Global Constraints

- Public marketplace repo — everything GENERIC. No project-specific names/internals (no org/repo/stack names, no private protocols). Examples use `your-org`/`your-repo`/placeholder commands. (Verbatim rule: never reference private project names here.)
- Node syntax checks must use the working binary `/Users/vulam/.nvm/versions/node/v24.11.1/bin/node` (the shell's `node`/brew node are broken in this environment).
- Workflow scripts: `export const meta` first; args arrive as a JSON string (normalize with `JSON.parse`); top-level `await`/`return` are harness-wrapped (syntax-check by stripping `export` and wrapping in `async function`).
- Runner prints a single JSON object on stdout per verb; all logs go to stderr.
- Human-in-the-loop: the runner NEVER self-runs destructive/outbound verbs (`reset` with `destructive:true`, `inject_fault`) — those require an explicit `--confirm` flag; the skill supplies it only after a user gate.
- Bash scripts: `set -euo pipefail`; `bash -n` clean; `chmod +x` executables.

---

### Task 1: Manifest schema + fixture sample app

**Files:**
- Create: `plugins/dev-cycle/schemas/harness.schema.json`
- Create: `plugins/dev-cycle/schemas/harness.example.json`
- Create: `plugins/dev-cycle/tests/fixtures/sample-manifest.json`
- Create: `plugins/dev-cycle/tests/fixtures/index.html`

**Interfaces:**
- Produces: the manifest shape every other task reads — top-level keys `services[] {name, up, down, health, restart?}`, `frontend_url`, `auth {strategy, hook?, login_url?, credentials?}`, `seed {cmd?|hook?}`, `reset {targets[]?, cmd?, destructive:bool}`, `observe {logs[], console:bool, network:bool, metrics[]}`, `faults[] {name, inject, restore}`, `scenarios_dir`, `driver`, `evidence_dir`.

- [ ] **Step 1: Write the schema**

Create `plugins/dev-cycle/schemas/harness.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": ".dev-cycle/harness.json — generic harness manifest",
  "type": "object",
  "required": ["services", "scenarios_dir", "driver"],
  "properties": {
    "services": {
      "type": "array", "minItems": 1,
      "items": {
        "type": "object", "required": ["name", "up", "health"],
        "properties": {
          "name": { "type": "string" },
          "up": { "type": "string", "description": "command to start the service" },
          "down": { "type": "string" },
          "restart": { "type": "string" },
          "health": { "type": "string", "description": "http URL polled until 200/401, or a shell command (prefix 'sh:')" }
        }
      }
    },
    "frontend_url": { "type": "string" },
    "auth": {
      "type": "object",
      "properties": {
        "strategy": { "enum": ["none", "form-login", "jwt-inject", "storageState", "custom-script"] },
        "hook": { "type": "string", "description": "hook name under .dev-cycle/hooks/ for custom-script" },
        "login_url": { "type": "string" },
        "credentials": { "type": "object" }
      }
    },
    "seed": { "type": "object", "properties": { "cmd": { "type": "string" }, "hook": { "type": "string" } } },
    "reset": { "type": "object", "properties": { "targets": { "type": "array", "items": { "type": "string" } }, "cmd": { "type": "string" }, "destructive": { "type": "boolean", "default": true } } },
    "observe": {
      "type": "object",
      "properties": {
        "logs": { "type": "array", "items": { "type": "string" } },
        "console": { "type": "boolean" },
        "network": { "type": "boolean" },
        "metrics": { "type": "array", "items": { "type": "string" } }
      }
    },
    "faults": {
      "type": "array",
      "items": { "type": "object", "required": ["name", "inject", "restore"], "properties": {
        "name": { "type": "string" }, "inject": { "type": "string" }, "restore": { "type": "string" } } }
    },
    "scenarios_dir": { "type": "string" },
    "driver": { "enum": ["chrome", "preview", "playwright"] },
    "evidence_dir": { "type": "string", "default": ".dev-cycle/evidence" }
  }
}
```

- [ ] **Step 2: Write the example + fixture manifest + fixture page**

Create `plugins/dev-cycle/schemas/harness.example.json`:

```json
{
  "services": [
    { "name": "web", "up": "your start command", "down": "your stop command", "health": "http://127.0.0.1:8080/health" }
  ],
  "frontend_url": "http://127.0.0.1:5173",
  "auth": { "strategy": "form-login", "login_url": "/login" },
  "seed": { "cmd": "your seed command" },
  "reset": { "targets": ["./.data"], "destructive": true },
  "observe": { "logs": ["logs/*.log"], "console": true, "network": true, "metrics": [] },
  "faults": [{ "name": "kill-web", "inject": "your kill cmd", "restore": "your restart cmd" }],
  "scenarios_dir": "e2e/scenarios",
  "driver": "chrome",
  "evidence_dir": ".dev-cycle/evidence"
}
```

Create `plugins/dev-cycle/tests/fixtures/index.html`:

```html
<!doctype html><html><body><div id="app">sample app up</div></body></html>
```

Create `plugins/dev-cycle/tests/fixtures/sample-manifest.json` (drives a throwaway python static server on :8099, served from this fixtures dir):

```json
{
  "services": [
    { "name": "web", "up": "python3 -m http.server 8099 --directory FIXTURE_DIR", "down": "sh:pkill -f 'http.server 8099' || true", "health": "http://127.0.0.1:8099/index.html" }
  ],
  "frontend_url": "http://127.0.0.1:8099/index.html",
  "auth": { "strategy": "none" },
  "seed": { "cmd": "sh:echo seeded" },
  "reset": { "targets": [], "cmd": "sh:echo reset", "destructive": true },
  "observe": { "logs": [], "console": true, "network": true, "metrics": [] },
  "faults": [{ "name": "noop", "inject": "sh:echo inject", "restore": "sh:echo restore" }],
  "scenarios_dir": "plugins/dev-cycle/tests/fixtures",
  "driver": "chrome",
  "evidence_dir": ".dev-cycle/evidence"
}
```

- [ ] **Step 3: Validate the example + fixture against the schema**

Run:
```bash
cd /Volumes/LaCie/econv1-workspace/claude-code-marketplace/.claude/worktrees/loving-mahavira-f9069c
python3 - <<'PY'
import json
s=json.load(open('plugins/dev-cycle/schemas/harness.schema.json'))
for f in ['plugins/dev-cycle/schemas/harness.example.json','plugins/dev-cycle/tests/fixtures/sample-manifest.json']:
    m=json.load(open(f))
    assert m.get('services') and m.get('scenarios_dir') and m.get('driver'), f
    for svc in m['services']: assert svc.get('name') and svc.get('up') and svc.get('health'), f
print("schema + examples OK")
PY
```
Expected: `schema + examples OK`

- [ ] **Step 4: Commit**

```bash
git add plugins/dev-cycle/schemas/harness.schema.json plugins/dev-cycle/schemas/harness.example.json plugins/dev-cycle/tests/fixtures/
git commit -m "feat(dev-cycle): harness manifest schema + fixtures"
```

---

### Task 2: Runner skeleton — dispatch, manifest load, helpers

**Files:**
- Create: `plugins/dev-cycle/bin/harness`
- Create: `plugins/dev-cycle/lib/harness-common.sh`

**Interfaces:**
- Consumes: manifest shape from Task 1.
- Produces: `bin/harness <verb> [--manifest F] [--confirm] …`; sourced helpers `hlog`, `hdie`, `jout`, `mf <jq-path>` (read manifest value), `run_cmd <cmd>` (execute a manifest command; `sh:`-prefixed runs raw, else via `bash -c`), `MANIFEST`, `EVIDENCE_DIR`. Verbs resolve to `lib/<group>.sh` sourced files. Unknown verb → error; missing manifest → error.

- [ ] **Step 1: Write the failing test**

Create `plugins/dev-cycle/tests/harness.test.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
H="$ROOT/plugins/dev-cycle/bin/harness"
FIX="$ROOT/plugins/dev-cycle/tests/fixtures"
MAN=/tmp/harness-test-manifest.json
sed "s#FIXTURE_DIR#$FIX#g" "$FIX/sample-manifest.json" > "$MAN"
pass=0; fail=0
check(){ if eval "$2"; then echo "ok   $1"; pass=$((pass+1)); else echo "FAIL $1"; fail=$((fail+1)); fi; }

# Task 2 assertions
check "usage on no args" "bash '$H' 2>&1 | grep -q usage"
check "unknown verb errors" "bash '$H' bogus --manifest '$MAN' 2>&1 | grep -qi 'unknown'"
check "missing manifest errors" "bash '$H' health --manifest /tmp/nope.json 2>&1 | grep -qi 'manifest'"

echo "PASS=$pass FAIL=$fail"; [ "$fail" = 0 ]
```

- [ ] **Step 2: Run to verify it fails**

Run: `bash plugins/dev-cycle/tests/harness.test.sh`
Expected: FAIL (harness not created yet)

- [ ] **Step 3: Write the common helpers**

Create `plugins/dev-cycle/lib/harness-common.sh`:

```bash
# shared helpers for the harness runner (sourced, not executed)
hlog() { printf 'harness: %s\n' "$*" >&2; }
hdie() { printf 'harness: %s\n' "$*" >&2; exit 1; }
jout() { printf '%s\n' "$1"; }

# read a jq path from the manifest (empty string if absent)
mf() { jq -r "$1 // empty" "$MANIFEST" 2>/dev/null || true; }

# execute a manifest command: "sh:<raw>" runs raw; otherwise via bash -c. Honors DRY.
run_cmd() {
  local cmd="$1"
  [ -z "$cmd" ] && return 0
  case "$cmd" in
    sh:*) cmd="${cmd#sh:}";;
  esac
  if [ "${HARNESS_DRY:-0}" = 1 ]; then hlog "[dry] $cmd"; return 0; fi
  bash -c "$cmd"
}
```

- [ ] **Step 4: Write the runner dispatch**

Create `plugins/dev-cycle/bin/harness`:

```bash
#!/usr/bin/env bash
# harness — generic, manifest-driven validation harness runner (dev-cycle).
# Implements the extended validation contract by executing commands declared in
# .dev-cycle/harness.json. One JSON object per verb on stdout; logs to stderr.
set -euo pipefail
SELF="${BASH_SOURCE[0]}"; while [ -h "$SELF" ]; do SELF="$(readlink "$SELF")"; done
BIN_DIR="$(cd "$(dirname "$SELF")" && pwd)"
ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$BIN_DIR")}"
LIB="$ROOT/lib"
. "$LIB/harness-common.sh"

VERB="${1:-}"; shift || true
MANIFEST=""; CONFIRM=0; ARGS=()
while [ $# -gt 0 ]; do case "$1" in
  --manifest) MANIFEST="$2"; shift 2;;
  --confirm) CONFIRM=1; shift;;
  *) ARGS+=("$1"); shift;;
esac; done
[ -n "$MANIFEST" ] || MANIFEST="$(pwd)/.dev-cycle/harness.json"

usage() { cat >&2 <<EOF
usage: harness <verb> [--manifest F] [--confirm] [verb-args]
  verbs: bring_up health teardown restart seed auth_session reset
         drive_scenario assert observe inject_fault
EOF
}
[ -n "$VERB" ] || { usage; exit 0; }
command -v jq >/dev/null || hdie "jq required"
[ -f "$MANIFEST" ] || hdie "manifest not found: $MANIFEST"
EVIDENCE_DIR="$(mf '.evidence_dir')"; [ -n "$EVIDENCE_DIR" ] || EVIDENCE_DIR=".dev-cycle/evidence"

case "$VERB" in
  bring_up|health|teardown|restart)   . "$LIB/harness-lifecycle.sh"; verb_"$VERB" "${ARGS[@]:-}";;
  seed|auth_session|reset)            . "$LIB/harness-data.sh"; verb_"$VERB" "${ARGS[@]:-}";;
  drive_scenario|assert)              . "$LIB/harness-drive.sh"; verb_"$VERB" "${ARGS[@]:-}";;
  observe|inject_fault)               . "$LIB/harness-observe.sh"; verb_"$VERB" "${ARGS[@]:-}";;
  *) hdie "unknown verb '$VERB'";;
esac
```

Note: verb-group libs are created in later tasks. For this task's test, temporarily the four `case` branches will fail to source missing files for real verbs, but the three assertions (usage / unknown / missing-manifest) run before any lib is sourced. Verify that ordering holds.

- [ ] **Step 5: Make executable and run the test**

Run:
```bash
chmod +x plugins/dev-cycle/bin/harness
bash -n plugins/dev-cycle/bin/harness && bash -n plugins/dev-cycle/lib/harness-common.sh
bash plugins/dev-cycle/tests/harness.test.sh
```
Expected: `bash -n` clean; test shows `ok` for the three Task-2 checks, `PASS=3 FAIL=0` (the file exits 0 because only Task-2 checks exist so far).

- [ ] **Step 6: Commit**

```bash
git add plugins/dev-cycle/bin/harness plugins/dev-cycle/lib/harness-common.sh plugins/dev-cycle/tests/harness.test.sh
git commit -m "feat(dev-cycle): harness runner skeleton (dispatch + helpers)"
```

---

### Task 3: Lifecycle verbs — bring_up / health / teardown / restart

**Files:**
- Create: `plugins/dev-cycle/lib/harness-lifecycle.sh`
- Modify: `plugins/dev-cycle/tests/harness.test.sh` (append lifecycle checks)

**Interfaces:**
- Consumes: `mf`, `run_cmd`, `MANIFEST`, `hlog`, `jout`.
- Produces: `verb_bring_up` (starts every service backgrounded, polls each health, prints `{"ready":bool,"services":[…],"frontend_url":…}`); `verb_health` (polls, prints `{"ready":bool}`); `verb_teardown`; `verb_restart`.

- [ ] **Step 1: Append the failing tests**

Append to `plugins/dev-cycle/tests/harness.test.sh` (before the final `echo PASS`):

```bash
check "bring_up reports ready" "bash '$H' bring_up --manifest '$MAN' | jq -e '.ready==true' >/dev/null"
check "health reports ready" "bash '$H' health --manifest '$MAN' | jq -e '.ready==true' >/dev/null"
check "teardown ok" "bash '$H' teardown --manifest '$MAN' | jq -e '.ok==true' >/dev/null"
```

- [ ] **Step 2: Run to verify it fails**

Run: `bash plugins/dev-cycle/tests/harness.test.sh`
Expected: the three new checks FAIL (lib missing / verbs undefined).

- [ ] **Step 3: Implement the lifecycle lib**

Create `plugins/dev-cycle/lib/harness-lifecycle.sh`:

```bash
# lifecycle verbs (sourced by bin/harness). Depends on harness-common.sh helpers.

_poll_health() { # <health-spec> -> 0 if healthy within timeout
  local h="$1" i code
  for i in $(seq 1 60); do
    case "$h" in
      sh:*) if bash -c "${h#sh:}" >/dev/null 2>&1; then return 0; fi;;
      http*) code="$(curl -s -o /dev/null -w '%{http_code}' "$h" 2>/dev/null || echo 000)"
             [ "$code" = 200 ] || [ "$code" = 401 ] && return 0;;
      *) return 0;;
    esac
    sleep 1
  done
  return 1
}

verb_bring_up() {
  local n up health ready=true results="[]"
  local count; count="$(jq '.services | length' "$MANIFEST")"
  for i in $(seq 0 $((count-1))); do
    n="$(mf ".services[$i].name")"; up="$(mf ".services[$i].up")"; health="$(mf ".services[$i].health")"
    hlog "bring_up: starting $n -> $up"
    ( HARNESS_DRY="${HARNESS_DRY:-0}"; run_cmd "$up" >/tmp/harness-$n.log 2>&1 & echo $! >/tmp/harness-$n.pid )
    if _poll_health "$health"; then hlog "  $n healthy"; else hlog "  $n NOT healthy"; ready=false; fi
    results="$(jq -c --arg n "$n" --argjson r "$([ "$ready" = true ] && echo true || echo false)" '. + [{name:$n, healthy:$r}]' <<<"$results")"
  done
  jout "$(jq -nc --argjson ready "$ready" --arg fe "$(mf '.frontend_url')" --argjson s "$results" '{ready:$ready, frontend_url:$fe, services:$s}')"
}

verb_health() {
  local ready=true count; count="$(jq '.services | length' "$MANIFEST")"
  for i in $(seq 0 $((count-1))); do _poll_health "$(mf ".services[$i].health")" || ready=false; done
  jout "$(jq -nc --argjson ready "$ready" '{ready:$ready}')"
}

verb_teardown() {
  local count; count="$(jq '.services | length' "$MANIFEST")"
  for i in $(seq 0 $((count-1))); do run_cmd "$(mf ".services[$i].down")" || true; done
  jout '{"ok":true}'
}

verb_restart() {
  local count; count="$(jq '.services | length' "$MANIFEST")"
  for i in $(seq 0 $((count-1))); do
    local r; r="$(mf ".services[$i].restart")"
    if [ -n "$r" ]; then run_cmd "$r" || true; else run_cmd "$(mf ".services[$i].down")" || true; run_cmd "$(mf ".services[$i].up")" || true; fi
  done
  jout '{"ok":true}'
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
bash -n plugins/dev-cycle/lib/harness-lifecycle.sh
bash plugins/dev-cycle/tests/harness.test.sh
```
Expected: lifecycle checks `ok`; the python static server comes up on :8099 and health returns 200. `FAIL=0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/dev-cycle/lib/harness-lifecycle.sh plugins/dev-cycle/tests/harness.test.sh
git commit -m "feat(dev-cycle): harness lifecycle verbs (bring_up/health/teardown/restart)"
```

---

### Task 4: Data verbs — seed / auth_session / reset (reset gated)

**Files:**
- Create: `plugins/dev-cycle/lib/harness-data.sh`
- Modify: `plugins/dev-cycle/tests/harness.test.sh`

**Interfaces:**
- Consumes: `mf`, `run_cmd`, `CONFIRM`, helpers.
- Produces: `verb_seed` (`{"seeded":bool}`); `verb_auth_session` (`{"session":…,"inject_target":…}` — for `custom-script` runs the hook; for `none` emits empty session); `verb_reset` — **refuses unless `--confirm` when `reset.destructive` is true**, prints `{"ok":bool,"skipped":"needs --confirm"?}`.

- [ ] **Step 1: Append failing tests**

Append to `harness.test.sh`:

```bash
check "seed ok" "bash '$H' seed --manifest '$MAN' | jq -e '.seeded==true' >/dev/null"
check "auth none returns session key" "bash '$H' auth_session --manifest '$MAN' | jq -e 'has(\"session\")' >/dev/null"
check "reset refused without --confirm" "bash '$H' reset --manifest '$MAN' | jq -e '.skipped!=null' >/dev/null"
check "reset runs with --confirm" "bash '$H' reset --manifest '$MAN' --confirm | jq -e '.ok==true' >/dev/null"
```

- [ ] **Step 2: Run to verify fail**

Run: `bash plugins/dev-cycle/tests/harness.test.sh`
Expected: the four new checks FAIL.

- [ ] **Step 3: Implement the data lib**

Create `plugins/dev-cycle/lib/harness-data.sh`:

```bash
# data verbs (sourced). Depends on harness-common.sh + $CONFIRM from bin/harness.

verb_seed() {
  local cmd hook; cmd="$(mf '.seed.cmd')"; hook="$(mf '.seed.hook')"
  if [ -n "$hook" ]; then run_cmd "sh:bash .dev-cycle/hooks/$hook" || { jout '{"seeded":false}'; return; }
  elif [ -n "$cmd" ]; then run_cmd "$cmd" || { jout '{"seeded":false}'; return; }
  else hlog "seed: nothing declared (no-op)"; fi
  jout '{"seeded":true}'
}

verb_auth_session() {
  local strat; strat="$(mf '.auth.strategy')"; [ -n "$strat" ] || strat="none"
  local inject; inject="$(mf '.frontend_url')"
  case "$strat" in
    none) jout "$(jq -nc --arg t "$inject" '{session:{}, inject_target:$t}')";;
    custom-script)
      local hook; hook="$(mf '.auth.hook')"; [ -n "$hook" ] || hdie "auth custom-script needs .auth.hook"
      # the hook prints the session JSON on stdout
      local s; s="$(run_cmd "sh:bash .dev-cycle/hooks/$hook")" || hdie "auth hook failed"
      jout "$(jq -nc --argjson s "${s:-{}}" --arg t "$inject" '{session:$s, inject_target:$t}')";;
    *) # form-login / jwt-inject / storageState — declarative shell of the session for the driver to complete
      jout "$(jq -nc --arg strat "$strat" --arg lu "$(mf '.auth.login_url')" --arg t "$inject" \
        '{session:{strategy:$strat, login_url:$lu}, inject_target:$t}')";;
  esac
}

verb_reset() {
  local destructive; destructive="$(mf '.reset.destructive')"
  if [ "$destructive" = "true" ] && [ "${CONFIRM:-0}" != 1 ]; then
    jout '{"ok":false,"skipped":"needs --confirm (destructive reset)"}'; return
  fi
  local cmd; cmd="$(mf '.reset.cmd')"; [ -n "$cmd" ] && run_cmd "$cmd" || true
  local count; count="$(jq '.reset.targets | length // 0' "$MANIFEST" 2>/dev/null || echo 0)"
  for i in $(seq 0 $((count-1))); do local t; t="$(mf ".reset.targets[$i]")"; [ -n "$t" ] && run_cmd "sh:rm -rf \"$t\"" || true; done
  jout '{"ok":true}'
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
bash -n plugins/dev-cycle/lib/harness-data.sh
bash plugins/dev-cycle/tests/harness.test.sh
```
Expected: all data checks `ok`; `FAIL=0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/dev-cycle/lib/harness-data.sh plugins/dev-cycle/tests/harness.test.sh
git commit -m "feat(dev-cycle): harness data verbs (seed/auth_session/reset, reset gated)"
```

---

### Task 5: Drive verbs — drive_scenario / assert

**Files:**
- Create: `plugins/dev-cycle/lib/harness-drive.sh`
- Modify: `plugins/dev-cycle/tests/harness.test.sh`

**Interfaces:**
- Consumes: `mf`, `run_cmd`, helpers.
- Produces: `verb_drive_scenario --tier api|ui|agentic [--scenario F]` — api/ui run manifest `tests.api`/`tests.ui` commands (optional; skip if absent); agentic prints `{"delegate":"e2e-agentic","args":{driver,base_url,scenarios_dir}}` for the skill/union to run. `verb_assert` runs `tests.ui` (or no-op).

- [ ] **Step 1: Append failing tests**

Append to `harness.test.sh`:

```bash
check "drive agentic emits delegate" "bash '$H' drive_scenario --tier agentic --manifest '$MAN' | jq -e '.delegate==\"e2e-agentic\"' >/dev/null"
check "drive api no-op when absent" "bash '$H' drive_scenario --tier api --manifest '$MAN' | jq -e 'has(\"tier\")' >/dev/null"
```

- [ ] **Step 2: Run to verify fail**

Run: `bash plugins/dev-cycle/tests/harness.test.sh` — Expected: two new checks FAIL.

- [ ] **Step 3: Implement the drive lib**

Create `plugins/dev-cycle/lib/harness-drive.sh`:

```bash
# drive verbs (sourced).
_arg() { # read a --flag value out of the verb args array passed as "$@"
  local want="$1"; shift
  while [ $# -gt 0 ]; do [ "$1" = "$want" ] && { printf '%s' "${2:-}"; return; }; shift; done
}

verb_drive_scenario() {
  local tier scenario; tier="$(_arg --tier "$@")"; scenario="$(_arg --scenario "$@")"; [ -n "$tier" ] || tier="agentic"
  case "$tier" in
    api) local c; c="$(mf '.tests.api')"; if [ -n "$c" ]; then run_cmd "$c"; jout '{"tier":"api","ran":true}'; else jout '{"tier":"api","ran":false,"reason":"no tests.api"}'; fi;;
    ui)  local c; c="$(mf '.tests.ui')"; if [ -n "$c" ]; then run_cmd "$c"; jout '{"tier":"ui","ran":true}'; else jout '{"tier":"ui","ran":false,"reason":"no tests.ui"}'; fi;;
    agentic)
      local base; base="$(mf '.frontend_url')"; [ -n "$base" ] || base="$(mf '.services[0].health')"
      jout "$(jq -nc --arg d "$(mf '.driver')" --arg b "$base" --arg s "$(mf '.scenarios_dir')" --arg sc "$scenario" \
        '{delegate:"e2e-agentic", args:{driver:$d, base_url:$b, scenarios_dir:$s} + (if $sc=="" then {} else {scenario:$sc} end)}')";;
    *) hdie "drive_scenario: --tier must be api|ui|agentic";;
  esac
}

verb_assert() { local c; c="$(mf '.tests.ui')"; [ -n "$c" ] && run_cmd "$c" && jout '{"ok":true}' || jout '{"ok":true,"note":"no scripted asserts"}'; }
```

Note: `.tests.api`/`.tests.ui` are optional manifest keys (not in the required schema); add them to the schema `properties` in this step:

Modify `plugins/dev-cycle/schemas/harness.schema.json` — add under `properties`:
```json
    "tests": { "type": "object", "properties": { "api": { "type": "string" }, "ui": { "type": "string" } } },
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
bash -n plugins/dev-cycle/lib/harness-drive.sh
python3 -c "import json; json.load(open('plugins/dev-cycle/schemas/harness.schema.json')); print('schema ok')"
bash plugins/dev-cycle/tests/harness.test.sh
```
Expected: drive checks `ok`; schema parses; `FAIL=0`.

- [ ] **Step 5: Commit**

```bash
git add plugins/dev-cycle/lib/harness-drive.sh plugins/dev-cycle/schemas/harness.schema.json plugins/dev-cycle/tests/harness.test.sh
git commit -m "feat(dev-cycle): harness drive verbs (drive_scenario/assert)"
```

---

### Task 6: Observability + fault verbs — observe / inject_fault (fault gated)

**Files:**
- Create: `plugins/dev-cycle/lib/harness-observe.sh`
- Modify: `plugins/dev-cycle/tests/harness.test.sh`

**Interfaces:**
- Consumes: `mf`, `run_cmd`, `CONFIRM`, `EVIDENCE_DIR`, helpers.
- Produces: `verb_observe` (copies matching log files + fetches metrics into `EVIDENCE_DIR`, prints `{"evidence_dir":…,"captured":[…]}`); `verb_inject_fault --name N [--restore]` — **refuses without `--confirm`**, else runs the named fault's `inject`/`restore`, prints `{"ok":bool}` or `{"skipped":…}`.

- [ ] **Step 1: Append failing tests**

Append to `harness.test.sh`:

```bash
check "observe writes evidence dir" "bash '$H' observe --manifest '$MAN' | jq -e '.evidence_dir!=null' >/dev/null"
check "inject_fault refused w/o confirm" "bash '$H' inject_fault --name noop --manifest '$MAN' | jq -e '.skipped!=null' >/dev/null"
check "inject_fault runs w/ confirm" "bash '$H' inject_fault --name noop --manifest '$MAN' --confirm | jq -e '.ok==true' >/dev/null"
```

- [ ] **Step 2: Run to verify fail**

Run: `bash plugins/dev-cycle/tests/harness.test.sh` — Expected: three new checks FAIL.

- [ ] **Step 3: Implement the observe lib**

Create `plugins/dev-cycle/lib/harness-observe.sh`:

```bash
# observability + fault verbs (sourced).
_arg() { local want="$1"; shift; while [ $# -gt 0 ]; do [ "$1" = "$want" ] && { printf '%s' "${2:-}"; return; }; shift; done; }
_has_flag() { local want="$1"; shift; for a in "$@"; do [ "$a" = "$want" ] && return 0; done; return 1; }

verb_observe() {
  mkdir -p "$EVIDENCE_DIR"
  local captured="[]" count; count="$(jq '.observe.logs | length // 0' "$MANIFEST" 2>/dev/null || echo 0)"
  for i in $(seq 0 $((count-1))); do
    local glob; glob="$(mf ".observe.logs[$i]")"
    for f in $glob; do [ -f "$f" ] && cp "$f" "$EVIDENCE_DIR/" 2>/dev/null && captured="$(jq -c --arg f "$f" '. + [$f]' <<<"$captured")"; done
  done
  local mcount; mcount="$(jq '.observe.metrics | length // 0' "$MANIFEST" 2>/dev/null || echo 0)"
  for i in $(seq 0 $((mcount-1))); do
    local url; url="$(mf ".observe.metrics[$i]")"
    [ -n "$url" ] && curl -s "$url" -o "$EVIDENCE_DIR/metrics-$i.txt" 2>/dev/null && captured="$(jq -c --arg u "$url" '. + [$u]' <<<"$captured")"
  done
  jout "$(jq -nc --arg d "$EVIDENCE_DIR" --argjson c "$captured" '{evidence_dir:$d, captured:$c}')"
}

verb_inject_fault() {
  local name; name="$(_arg --name "$@")"; [ -n "$name" ] || hdie "inject_fault: --name required"
  if [ "${CONFIRM:-0}" != 1 ]; then jout '{"ok":false,"skipped":"needs --confirm (fault injection)"}'; return; fi
  local idx; idx="$(jq --arg n "$name" '.faults | map(.name) | index($n)' "$MANIFEST" 2>/dev/null)"
  [ "$idx" != "null" ] && [ -n "$idx" ] || hdie "no fault named '$name'"
  if _has_flag --restore "$@"; then run_cmd "$(mf ".faults[$idx].restore")"; else run_cmd "$(mf ".faults[$idx].inject")"; fi
  jout '{"ok":true}'
}
```

- [ ] **Step 4: Run full test suite to verify pass**

Run:
```bash
bash -n plugins/dev-cycle/lib/harness-observe.sh
bash plugins/dev-cycle/tests/harness.test.sh
```
Expected: all checks across Tasks 2-6 `ok`; final line `PASS=15 FAIL=0` (exit 0). Then `bash '$H' teardown --manifest "$MAN"` leaves nothing running.

- [ ] **Step 5: Commit**

```bash
git add plugins/dev-cycle/lib/harness-observe.sh plugins/dev-cycle/tests/harness.test.sh
git commit -m "feat(dev-cycle): harness observe + inject_fault verbs (fault gated)"
```

---

### Task 7: Extend the validation contract doc

**Files:**
- Modify: `plugins/dev-cycle/references/validation-contract.md`

**Interfaces:** Documentation only. Adds `observe` and `inject_fault` as optional verbs and references the generic runner + manifest.

- [ ] **Step 1: Add the optional-verbs section**

Modify `plugins/dev-cycle/references/validation-contract.md` — append after the Verbs table:

```markdown
## Optional verbs (observability + resilience)

Providers may additionally implement these; the generic manifest-driven runner
(`dev-cycle/bin/harness`) does, from `.dev-cycle/harness.json`:

| Verb | Purpose | Returns |
|---|---|---|
| `observe` | Capture logs/console/network/metrics into an evidence dir. | `{ evidence_dir, captured[] }` |
| `inject_fault --name <n> [--restore]` | Apply/undo a declared fault (kill service, drop network, skew time) to validate resilience. **Gated:** requires `--confirm`. | `{ ok }` or `{ skipped }` |

## The generic runner

`dev-cycle/bin/harness <verb>` is a universal, config-driven provider: set
`validation.provider: "generic"` and `validation.manifest: ".dev-cycle/harness.json"`.
It executes manifest-declared commands / `custom-script` hooks — no per-project provider
code. The `agentic-harness` skill auto-builds the manifest and self-verifies it.
```

- [ ] **Step 2: Verify + commit**

Run: `grep -q 'inject_fault' plugins/dev-cycle/references/validation-contract.md && echo ok`
Expected: `ok`

```bash
git add plugins/dev-cycle/references/validation-contract.md
git commit -m "docs(dev-cycle): extend validation contract with observe + inject_fault"
```

---

### Task 8: `build-harness.js` Workflow (detect → draft → critic)

**Files:**
- Create: `plugins/loop-templates/workflows/build-harness.js`

**Interfaces:**
- Produces: a Workflow returning `{ status, stack_profile, manifest, smoke_scenario, risks, destructive_ops }`. Consumed by the `agentic-harness` skill.

- [ ] **Step 1: Write the workflow**

Create `plugins/loop-templates/workflows/build-harness.js`:

```javascript
export const meta = {
  name: 'build-harness',
  description: 'Detect a project stack and DRAFT a generic-runner harness manifest (.dev-cycle/harness.json) + a smoke scenario for the dev-cycle agentic-harness skill. Parallel detectors → synthesize stack_profile → draft manifest+smoke → adversarial critic flags missing verbs / fragile commands / destructive ops. Does NOT gate or write files (the skill does). args: { repo_path?, hint?, model_fast?, model_work?, model_judge? }',
  phases: [{ title: 'Detect' }, { title: 'Draft' }, { title: 'Critic' }],
}

if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }
const repo = (args && (args.repo_path || args.task)) || '.'
const hint = (args && args.hint) || ''
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const PROFILE = { type: 'object', properties: { services: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, up: { type: 'string' }, down: { type: 'string' }, health: { type: 'string' } }, required: ['name', 'up', 'health'] } }, frontend_url: { type: 'string' }, auth_strategy: { type: 'string' }, seed_cmd: { type: 'string' }, reset_targets: { type: 'array', items: { type: 'string' } }, tests_api: { type: 'string' }, tests_ui: { type: 'string' }, log_globs: { type: 'array', items: { type: 'string' } }, driver: { type: 'string' }, notes: { type: 'string' } }, required: ['services'] }
const MANIFEST = { type: 'object', properties: { manifest: { type: 'object' }, smoke_scenario: { type: 'object' } }, required: ['manifest', 'smoke_scenario'] }
const CRIT = { type: 'object', properties: { risks: { type: 'array', items: { type: 'string' } }, destructive_ops: { type: 'array', items: { type: 'string' } }, missing_verbs: { type: 'array', items: { type: 'string' } } }, required: ['risks', 'destructive_ops'] }

const DETECTORS = [
  { k: 'services', p: 'Detect runnable services + their start/stop/health: dev-server/compose/Procfile/Makefile targets, ports, health endpoints.' },
  { k: 'frontend', p: 'Detect the web frontend framework + dev URL/port (Vite/Next/CRA/etc.), or report none.' },
  { k: 'auth', p: 'Detect the auth mechanism a UI test must satisfy (form login / JWT / storageState / crypto handshake→custom-script).' },
  { k: 'data', p: 'Detect seed/fixture commands and the clean/reset targets (dirs, db-reset commands).' },
  { k: 'tests', p: 'Detect test runners + how to run api vs ui suites; and log/metric sources for observability.' },
]

phase('Detect')
const findings = (await parallel(DETECTORS.map(d => () =>
  agent(`Explore the repo at ${repo} and ${d.p} ${hint ? `Hint: ${hint}` : ''} Report concrete commands/paths only — no guesses; say "unknown" if not found.`, { label: `detect:${d.k}`, phase: 'Detect', model: M.work })
))).filter(Boolean)

const profile = await agent(`Synthesize a single stack_profile from these detector reports. Prefer concrete commands; pick ONE canonical start/health per service. Reports:\n${JSON.stringify(findings)}`, { schema: PROFILE, label: 'synthesize', phase: 'Detect', model: M.work, effort: 'high' })

phase('Draft')
const draft = await agent(`Draft a .dev-cycle/harness.json manifest AND a minimal smoke scenario from this stack_profile, matching the dev-cycle harness schema (services[{name,up,down,health}], frontend_url, auth{strategy}, seed, reset{targets,destructive:true}, observe{logs,console,network,metrics}, faults[], scenarios_dir, driver, tests{api,ui}). The smoke scenario: navigate "/", wait networkidle, one expect + one ai_judge "renders real content, no error/blank/spinner". Stack profile:\n${JSON.stringify(profile)}`, { schema: MANIFEST, label: 'draft', phase: 'Draft', model: M.judge, effort: 'high' })

phase('Critic')
const crit = await agent(`Adversarially critique this draft manifest for a project you will auto-verify. List: risks (fragile/ambiguous commands, missing health, wrong port), destructive_ops (any verb that wipes data or is outbound — reset targets, faults), and missing_verbs (contract verbs with no manifest backing). Manifest:\n${JSON.stringify(draft.manifest)}`, { schema: CRIT, label: 'critic', phase: 'Critic', model: M.judge, effort: 'high' })

return { status: (profile && profile.services && profile.services.length) ? 'DONE' : 'STUCK', stack_profile: profile, manifest: draft.manifest, smoke_scenario: draft.smoke_scenario, risks: crit.risks, destructive_ops: crit.destructive_ops, missing_verbs: crit.missing_verbs }
```

- [ ] **Step 2: Syntax-check (harness-wrapped)**

Run:
```bash
NODE=/Users/vulam/.nvm/versions/node/v24.11.1/bin/node
f=plugins/loop-templates/workflows/build-harness.js
sed 's/^export const meta/const meta/' "$f" > /tmp/b.txt; { printf 'async function __wf(){\n'; cat /tmp/b.txt; printf '\n}\n'; } > /tmp/c.mjs
"$NODE" --check /tmp/c.mjs && echo "ok build-harness.js"
```
Expected: `ok build-harness.js`

- [ ] **Step 3: Simulate the control flow (stubbed harness)**

Run:
```bash
NODE=/Users/vulam/.nvm/versions/node/v24.11.1/bin/node
cat > /tmp/sim-bh.mjs <<'EOF'
import fs from 'fs'
const src = fs.readFileSync(process.argv[2],'utf8').replace(/^export const meta/m,'const meta')
async function agent(p,o={}){ const s=o.schema
  if(s&&s.properties&&s.properties.services&&!s.properties.manifest) return {services:[{name:'web',up:'run',health:'http://x/health'}],driver:'chrome'}
  if(s&&s.properties&&s.properties.manifest) return {manifest:{services:[{name:'web',up:'run',health:'http://x/health'}],scenarios_dir:'e2e',driver:'chrome'},smoke_scenario:{name:'smoke',steps:[]}}
  if(s&&s.properties&&s.properties.risks) return {risks:[],destructive_ops:['reset'],missing_verbs:[]}
  return 'detector report' }
async function parallel(t){return Promise.all(t.map(x=>x().catch(()=>null)))}
function phase(){} function log(){}
const args={repo_path:'.'}
const fn=new Function('agent','parallel','phase','log','args',`return (async()=>{\n${src}\n})()`)
const r=await fn(agent,parallel,phase,log,args)
console.log(JSON.stringify({status:r.status,has_manifest:!!r.manifest,destructive:r.destructive_ops}))
EOF
"$NODE" /tmp/sim-bh.mjs plugins/loop-templates/workflows/build-harness.js
```
Expected: `{"status":"DONE","has_manifest":true,"destructive":["reset"]}`

- [ ] **Step 4: Commit**

```bash
git add plugins/loop-templates/workflows/build-harness.js
git commit -m "feat(loop-templates): build-harness workflow (detect/draft/critic)"
```

---

### Task 9: `agentic-harness` skill (the conductor)

**Files:**
- Create: `plugins/dev-cycle/skills/agentic-harness/SKILL.md`

**Interfaces:**
- Consumes: `build-harness.js` output; `dev-cycle/bin/harness` verbs; `e2e-agentic.js`.
- Produces: the documented procedure a coding agent follows to build + self-verify a harness.

- [ ] **Step 1: Write the skill**

Create `plugins/dev-cycle/skills/agentic-harness/SKILL.md`:

````markdown
---
name: agentic-harness
description: >
  Automatically build a comprehensive, self-tested agentic validation harness that lets
  an agent fully control a project's stack (lifecycle, data, auth, agentic UI, observability,
  fault injection) and validate features by mimicking human actions. Use when the user says
  "build a validation harness", "set up agentic validation", "let the agent drive/validate
  the app", or runs /dev-cycle:init-validation. Supersedes the hand-filled provider skeleton:
  it detects the stack, writes .dev-cycle/harness.json, and proves it green.
---

# Agentic harness builder

Build a working harness for the generic runner (`${CLAUDE_PLUGIN_ROOT}/bin/harness`) so an
agent can fully control the stack and run fully-agentic, human-mimicking validation. The
artifact is a declarative `.dev-cycle/harness.json` the runner executes — no bespoke
provider code.

## Autonomy boundary (do not violate)

- **Autonomous in the middle:** detection, drafting, and the non-destructive self-verify
  loop run without asking.
- **GATE at the edges (always stop for the human):**
  1. after detection, before writing anything — confirm the stack + plan;
  2. before running any destructive/outbound verb — a `reset` with `destructive:true`, or
     any `inject_fault`.
- Never pass `--confirm` to the runner without a preceding human approval for that action.

## Procedure

1. **Detect + draft.** Run the compute Workflow:
   `Workflow({ scriptPath: "<loop-templates>/workflows/build-harness.js", args: { repo_path: "<repo>", hint } })`.
   It returns `{ stack_profile, manifest, smoke_scenario, risks, destructive_ops }`.

2. **GATE — plan approval.** Present the detected stack, the proposed `harness.json`, and the
   flagged `destructive_ops`/`risks` via `AskUserQuestion`. If detection was ambiguous
   (multiple candidate commands, unknown auth), ask the user to choose — never guess.

3. **Write artifacts.** Write `.dev-cycle/harness.json` (validate against
   `${CLAUDE_PLUGIN_ROOT}/schemas/harness.schema.json`), the smoke scenario into
   `scenarios_dir`, and stub any `custom-script` hooks under `.dev-cycle/hooks/`.

4. **Self-verify loop (non-destructive, autonomous, bounded).** Run, in order:
   `bin/harness bring_up` → `health` → `seed` → `auth_session` →
   `drive_scenario --tier agentic` (take its delegate args and run
   `<dev-cycle>/workflows/e2e-agentic.js`) → `observe`. If any step fails: read the
   evidence (`observe` output, logs, ai-judge failures), PATCH the manifest/hook, and
   retry. Bound to a few rounds with a circuit breaker (same failure twice → stop and
   report). Do NOT run `reset --confirm` or `inject_fault` here.

5. **GATE — destructive verbs.** If the user approved exercising them, run
   `reset --confirm` and each `inject_fault --name … --confirm` (+ `--restore`), verifying
   the stack recovers. Otherwise skip and note them as unverified.

6. **Finalize.** Set `validation.provider: "generic"` and
   `validation.manifest: ".dev-cycle/harness.json"` in `.dev-cycle/config.json`. Run
   `teardown`. Print a readiness checklist (which verbs verified, which gated/unverified,
   the smoke result). Get human sign-off.

## Notes

- Only a **smoke** scenario is generated. Per-feature scenarios are authored during a
  dev-cycle run, not here.
- No frontend detected → the agentic UI tier degrades to API/scripted tiers; record it,
  don't silently skip.
- Keep everything generic — the manifest holds all project specifics; the runner and this
  skill stay project-agnostic.
````

- [ ] **Step 2: Lint the skill (frontmatter + required sections)**

Run:
```bash
python3 - <<'PY'
import re
t=open('plugins/dev-cycle/skills/agentic-harness/SKILL.md').read()
assert t.startswith('---') and 'name: agentic-harness' in t, "frontmatter"
for s in ['Autonomy boundary','GATE — plan approval','Self-verify loop','build-harness.js','e2e-agentic.js','validation.provider']:
    assert s in t, f"missing: {s}"
print("skill sections OK")
PY
```
Expected: `skill sections OK`

- [ ] **Step 3: Commit**

```bash
git add plugins/dev-cycle/skills/agentic-harness/SKILL.md
git commit -m "feat(dev-cycle): agentic-harness conductor skill"
```

---

### Task 10: Rewire init-validation command + version bumps + registration

**Files:**
- Modify: `plugins/dev-cycle/commands/init-validation.md`
- Modify: `plugins/dev-cycle/.claude-plugin/plugin.json`
- Modify: `plugins/loop-templates/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

**Interfaces:** wiring only.

- [ ] **Step 1: Rewire the command to invoke the skill**

Replace the body of `plugins/dev-cycle/commands/init-validation.md` after the frontmatter with:

```markdown
# /dev-cycle:init-validation

Build a comprehensive, self-tested agentic validation harness for this repo.

**Invoke the `agentic-harness` skill and follow it exactly.** It detects the stack,
writes `.dev-cycle/harness.json` for the generic runner (`${CLAUDE_PLUGIN_ROOT}/bin/harness`),
self-verifies the non-destructive verbs, gates destructive ones, and wires
`validation.provider: "generic"` into `.dev-cycle/config.json`.

If a project already ships a bespoke validation provider, keep it (set
`validation.provider` to that provider instead); the generic runner is the default when
none exists.
```

- [ ] **Step 2: Bump plugin versions**

Modify `plugins/dev-cycle/.claude-plugin/plugin.json`: `"version": "0.1.0"` → `"version": "0.2.0"`.
Modify `plugins/loop-templates/.claude-plugin/plugin.json`: `"version": "0.1.0"` → `"version": "0.2.0"`.

- [ ] **Step 3: Bump marketplace versions**

Modify `.claude-plugin/marketplace.json`: top-level + `metadata.version` `1.6.0` → `1.7.0`; the `loop-templates` and `dev-cycle` plugin entries `"version"` → `0.2.0`.

- [ ] **Step 4: Validate JSON**

Run:
```bash
python3 -c "import json; [json.load(open(f)) for f in ['.claude-plugin/marketplace.json','plugins/dev-cycle/.claude-plugin/plugin.json','plugins/loop-templates/.claude-plugin/plugin.json']]; print('json ok')"
grep -q 'agentic-harness' plugins/dev-cycle/commands/init-validation.md && echo "command rewired"
```
Expected: `json ok` and `command rewired`

- [ ] **Step 5: Commit**

```bash
git add plugins/dev-cycle/commands/init-validation.md plugins/dev-cycle/.claude-plugin/plugin.json plugins/loop-templates/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "feat: wire agentic-harness into init-validation; version bumps (marketplace 1.7.0)"
```

---

### Task 11: Dogfood integration test (detect → manifest → self-verify green)

**Files:**
- Create: `plugins/dev-cycle/tests/dogfood.sh`

**Interfaces:** end-to-end check of the runner against the fixture app (the skill's flow, minus the LLM Workflow/gates, exercised mechanically).

- [ ] **Step 1: Write the dogfood script**

Create `plugins/dev-cycle/tests/dogfood.sh`:

```bash
#!/usr/bin/env bash
# Exercise the generic runner end-to-end against the fixture static app,
# mimicking the skill's non-destructive self-verify sequence.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
H="$ROOT/plugins/dev-cycle/bin/harness"
FIX="$ROOT/plugins/dev-cycle/tests/fixtures"
MAN=/tmp/harness-dogfood.json
sed "s#FIXTURE_DIR#$FIX#g" "$FIX/sample-manifest.json" > "$MAN"
set -e
echo "== bring_up =="; bash "$H" bring_up --manifest "$MAN" | jq -e '.ready==true' >/dev/null
echo "== health ==";  bash "$H" health --manifest "$MAN" | jq -e '.ready==true' >/dev/null
echo "== seed ==";    bash "$H" seed --manifest "$MAN" | jq -e '.seeded==true' >/dev/null
echo "== auth ==";    bash "$H" auth_session --manifest "$MAN" | jq -e 'has("inject_target")' >/dev/null
echo "== drive(agentic delegate) =="; bash "$H" drive_scenario --tier agentic --manifest "$MAN" | jq -e '.delegate=="e2e-agentic"' >/dev/null
echo "== observe ==";  bash "$H" observe --manifest "$MAN" | jq -e '.evidence_dir!=null' >/dev/null
echo "== reset gated =="; bash "$H" reset --manifest "$MAN" | jq -e '.skipped!=null' >/dev/null
echo "== teardown =="; bash "$H" teardown --manifest "$MAN" | jq -e '.ok==true' >/dev/null
echo "DOGFOOD GREEN"
```

- [ ] **Step 2: Run it**

Run: `chmod +x plugins/dev-cycle/tests/dogfood.sh && bash plugins/dev-cycle/tests/dogfood.sh`
Expected: prints each verb line then `DOGFOOD GREEN`; no lingering `http.server 8099` (bring_up→teardown cycle clean).

- [ ] **Step 3: Full regression + commit**

Run:
```bash
bash plugins/dev-cycle/tests/harness.test.sh
NODE=/Users/vulam/.nvm/versions/node/v24.11.1/bin/node
for f in plugins/loop-templates/workflows/build-harness.js; do sed 's/^export const meta/const meta/' "$f">/tmp/b.txt; { printf 'async function __wf(){\n'; cat /tmp/b.txt; printf '\n}\n'; }>/tmp/c.mjs; "$NODE" --check /tmp/c.mjs && echo "ok $f"; done
```
Expected: `PASS=15 FAIL=0`; `ok …build-harness.js`.

```bash
git add plugins/dev-cycle/tests/dogfood.sh
git commit -m "test(dev-cycle): dogfood the generic harness runner end-to-end"
```

---

## Notes for the implementer

- The verb-group libs are sourced by `bin/harness` only for their own verb, so a syntax
  error in one lib can't affect another verb's path — but still `bash -n` each lib.
- `${CLAUDE_PLUGIN_ROOT}` is set by the plugin runtime; in tests, `bin/harness` derives the
  root from its own path, and `--manifest` is passed explicitly.
- Cross-plugin path (`<loop-templates>/workflows/build-harness.js`,
  `<dev-cycle>/workflows/e2e-agentic.js`) resolves to each plugin's install root at
  runtime; the skill states this, `/dev-cycle:doctor` spot-checks it.
- Keep the fixture app trivial — its only job is to give `bring_up`/`health` something real
  to poll so the runner is tested without any private stack.
