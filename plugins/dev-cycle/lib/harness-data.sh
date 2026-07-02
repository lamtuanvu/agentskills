# data verbs (sourced). Depends on harness-common.sh + $CONFIRM from bin/harness.

verb_seed() {
  local cmd hook; cmd="$(mf '.seed.cmd')"; hook="$(mf '.seed.hook')"
  if [ -n "$hook" ]; then run_cmd "sh:bash .dev-cycle/hooks/$hook" >/dev/null 2>&1 || { jout '{"seeded":false}'; return; }
  elif [ -n "$cmd" ]; then run_cmd "$cmd" >/dev/null 2>&1 || { jout '{"seeded":false}'; return; }
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
      local s; s="$(run_cmd "sh:bash .dev-cycle/hooks/$hook" 2>/dev/null)" || hdie "auth hook failed"
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
  local cmd; cmd="$(mf '.reset.cmd')"; [ -n "$cmd" ] && run_cmd "$cmd" >/dev/null 2>&1 || true
  local count; count="$(jq '.reset.targets | length // 0' "$MANIFEST" 2>/dev/null || echo 0)"
  for i in $(seq 0 $((count-1))); do local t; t="$(mf ".reset.targets[$i]")"; [ -n "$t" ] && run_cmd "sh:rm -rf \"$t\"" >/dev/null 2>&1 || true; done
  jout '{"ok":true}'
}
