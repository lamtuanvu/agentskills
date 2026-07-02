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
