# observability + fault verbs (sourced).
_arg() { local want="$1"; shift; while [ $# -gt 0 ]; do [ "$1" = "$want" ] && { printf '%s' "${2:-}"; return; }; shift; done; }
_has_flag() { local want="$1"; shift; for a in "$@"; do [ "$a" = "$want" ] && return 0; done; return 1; }

verb_observe() {
  mkdir -p "$EVIDENCE_DIR"
  local captured="[]" count; count="$(jq '.observe.logs | length // 0' "$MANIFEST" 2>/dev/null || echo 0)"
  if [ "$count" -gt 0 ]; then
    for i in $(seq 0 $((count-1))); do
      local glob; glob="$(mf ".observe.logs[$i]")"
      for f in $glob; do [ -f "$f" ] && cp "$f" "$EVIDENCE_DIR/" 2>/dev/null && captured="$(jq -c --arg f "$f" '. + [$f]' <<<"$captured")"; done
    done
  fi
  local mcount; mcount="$(jq '.observe.metrics | length // 0' "$MANIFEST" 2>/dev/null || echo 0)"
  if [ "$mcount" -gt 0 ]; then
    for i in $(seq 0 $((mcount-1))); do
      local url; url="$(mf ".observe.metrics[$i]")"
      [ -n "$url" ] && curl -s "$url" -o "$EVIDENCE_DIR/metrics-$i.txt" 2>/dev/null && captured="$(jq -c --arg u "$url" '. + [$u]' <<<"$captured")"
    done
  fi
  jout "$(jq -nc --arg d "$EVIDENCE_DIR" --argjson c "$captured" '{evidence_dir:$d, captured:$c}')"
}

verb_inject_fault() {
  local name; name="$(_arg --name "$@")"; [ -n "$name" ] || hdie "inject_fault: --name required"
  if [ "${CONFIRM:-0}" != 1 ]; then jout '{"ok":false,"skipped":"needs --confirm (fault injection)"}'; return; fi
  local idx; idx="$(jq --arg n "$name" '.faults | map(.name) | index($n)' "$MANIFEST" 2>/dev/null)"
  [ "$idx" != "null" ] && [ -n "$idx" ] || hdie "no fault named '$name'"
  if _has_flag --restore "$@"; then run_cmd "$(mf ".faults[$idx].restore")" >/dev/null 2>&1; else run_cmd "$(mf ".faults[$idx].inject")" >/dev/null 2>&1; fi
  jout '{"ok":true}'
}
