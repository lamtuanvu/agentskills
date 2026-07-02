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

# Task 4 assertions
check "seed ok" "bash '$H' seed --manifest '$MAN' | jq -e '.seeded==true' >/dev/null"
check "auth none returns session key" "bash '$H' auth_session --manifest '$MAN' | jq -e 'has(\"session\")' >/dev/null"
check "reset refused without --confirm" "bash '$H' reset --manifest '$MAN' | jq -e '.skipped!=null' >/dev/null"
check "reset runs with --confirm" "bash '$H' reset --manifest '$MAN' --confirm | jq -e '.ok==true' >/dev/null"

# custom-script auth branch (previously untested; covers the argjson brace fix)
mkdir -p .dev-cycle/hooks
printf '#!/usr/bin/env bash\necho '"'"'{"ok":true}'"'"'\n' > .dev-cycle/hooks/testauth
chmod +x .dev-cycle/hooks/testauth
AUTHMAN=/tmp/harness-auth.json
jq '.auth.strategy="custom-script" | .auth.hook="testauth"' "$FIX/sample-manifest.json" | sed "s#FIXTURE_DIR#$FIX#g" > "$AUTHMAN"

check "auth custom-script single json + session" "test \$(bash '$H' auth_session --manifest /tmp/harness-auth.json | wc -l) -eq 1 && bash '$H' auth_session --manifest /tmp/harness-auth.json | jq -e '.session.ok==true' >/dev/null"

# cleanup temp hook (do not remove a pre-existing .dev-cycle/)
rm -rf .dev-cycle/hooks/testauth
rmdir .dev-cycle/hooks 2>/dev/null || true

# Task 5 assertions
check "drive agentic emits delegate" "bash '$H' drive_scenario --tier agentic --manifest '$MAN' | jq -e '.delegate==\"e2e-agentic\"' >/dev/null"
check "drive api no-op when absent" "bash '$H' drive_scenario --tier api --manifest '$MAN' | jq -e 'has(\"tier\")' >/dev/null"

echo "PASS=$pass FAIL=$fail"; [ "$fail" = 0 ]
