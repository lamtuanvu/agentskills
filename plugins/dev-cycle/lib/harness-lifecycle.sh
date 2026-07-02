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
    ( run_cmd "$up" >/tmp/harness-$n.log 2>&1 & )
    local svc_ok=true
    if _poll_health "$health"; then hlog "  $n healthy"; else hlog "  $n NOT healthy"; ready=false; svc_ok=false; fi
    results="$(jq -c --arg n "$n" --argjson r "$([ "$svc_ok" = true ] && echo true || echo false)" '. + [{name:$n, healthy:$r}]' <<<"$results")"
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
