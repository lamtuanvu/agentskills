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
