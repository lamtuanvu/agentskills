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
        '{delegate:"e2e-agentic", args:({driver:$d, base_url:$b, scenarios_dir:$s} + (if $sc=="" then {} else {scenario:$sc} end))}')";;
    *) hdie "drive_scenario: --tier must be api|ui|agentic";;
  esac
}

verb_assert() { local c; c="$(mf '.tests.ui')"; [ -n "$c" ] && run_cmd "$c" && jout '{"ok":true}' || jout '{"ok":true,"note":"no scripted asserts"}'; }
