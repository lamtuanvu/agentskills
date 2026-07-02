#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
H="$ROOT/plugins/dev-cycle/bin/harness"
FIX="$ROOT/plugins/dev-cycle/tests/fixtures"
MAN=/tmp/harness-test-manifest.json
sed "s#FIXTURE_DIR#$FIX#g" "$FIX/sample-manifest.json" > "$MAN"
pass=0; fail=0
check(){ if (set +o pipefail; eval "$2"); then echo "ok   $1"; pass=$((pass+1)); else echo "FAIL $1"; fail=$((fail+1)); fi; }

# Task 2 assertions
check "usage on no args" "bash '$H' 2>&1 | grep -q usage"
check "unknown verb errors" "bash '$H' bogus --manifest '$MAN' 2>&1 | grep -qi 'unknown'"
check "missing manifest errors" "bash '$H' health --manifest /tmp/nope.json 2>&1 | grep -qi 'manifest'"

# Task 3 assertions
check "bring_up reports ready" "bash '$H' bring_up --manifest '$MAN' | jq -e '.ready==true' >/dev/null"
check "health reports ready" "bash '$H' health --manifest '$MAN' | jq -e '.ready==true' >/dev/null"
check "teardown ok" "bash '$H' teardown --manifest '$MAN' | jq -e '.ok==true' >/dev/null"

echo "PASS=$pass FAIL=$fail"; [ "$fail" = 0 ]
