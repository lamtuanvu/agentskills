#!/bin/bash

# SpecKit Orchestrator Stop Hook
# Intercepts stop signals to auto-continue the pipeline between steps.
# Only blocks stop when a step was positively completed and a next step exists.
# Any ambiguity → allow stop (safety-first to prevent infinite loops).
#
# Team-aware: skips teammate sessions entirely and allows the lead to stop
# during team phases so it can receive teammate messages naturally.

set -euo pipefail

# Debug log (remove after diagnosis)
DEBUG_LOG="/tmp/speckit-stop-hook-debug.log"
_dbg() { echo "[$(date +%H:%M:%S)] $*" >> "$DEBUG_LOG"; }
_dbg "=== Stop hook fired ==="

# Read hook input from stdin
HOOK_INPUT=$(cat)
_dbg "HOOK_INPUT keys: $(echo "$HOOK_INPUT" | jq -r 'keys | join(", ")' 2>/dev/null || echo 'parse-error')"

# -------------------------------------------------------------------
# -1. Dedup: prevent running twice when plugin is loaded from both
#     installed cache and local dev directory. Uses session_id + epoch
#     second as a lock (mkdir is atomic).
# -------------------------------------------------------------------
DEDUP_SID=$(echo "$HOOK_INPUT" | jq -r '.session_id // ""' 2>/dev/null || echo "")
if [[ -n "$DEDUP_SID" ]]; then
  DEDUP_DIR="/tmp/speckit-stop-${DEDUP_SID}-$(date +%s)"
  if ! mkdir "$DEDUP_DIR" 2>/dev/null; then
    # Another instance already claimed this cycle
    _dbg "EXIT: dedup lock failed"
    exit 0
  fi
  trap 'rm -rf "$DEDUP_DIR"' EXIT
fi

# -------------------------------------------------------------------
# 0. Skip for teammate / spawned-agent sessions
#    Each teammate is a full Claude Code session that loads the same
#    plugins and hooks. Only the lead session should auto-continue
#    the pipeline. Teammates communicate via the messaging system.
# -------------------------------------------------------------------

# Check environment variables that Claude Code sets for teammates
if [[ -n "${CLAUDE_AGENT_TEAM_NAME:-}" ]] || \
   [[ -n "${CLAUDE_TEAMMATE_NAME:-}" ]]; then
  _dbg "EXIT: teammate env vars set"
  exit 0
fi

# Check hook input for teammate/team metadata (present in TeammateIdle
# and TaskCompleted; may also appear in Stop for teammate sessions)
TEAMMATE_NAME=$(echo "$HOOK_INPUT" | jq -r '.teammate_name // ""' 2>/dev/null || echo "")
TEAM_NAME_INPUT=$(echo "$HOOK_INPUT" | jq -r '.team_name // ""' 2>/dev/null || echo "")
if [[ -n "$TEAMMATE_NAME" ]] || [[ -n "$TEAM_NAME_INPUT" ]]; then
  _dbg "EXIT: teammate/team in hook input"
  exit 0
fi

# Check if any active team config lists this session as a teammate (not lead)
SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // ""' 2>/dev/null || echo "")
if [[ -n "$SESSION_ID" ]]; then
  TEAMS_DIR="$HOME/.claude/teams"
  if [[ -d "$TEAMS_DIR" ]]; then
    for CONFIG in "$TEAMS_DIR"/*/config.json; do
      [[ -f "$CONFIG" ]] || continue
      # Check if session_id matches any teammate's agentId
      IS_TEAMMATE=$(jq -r --arg sid "$SESSION_ID" '
        .members // [] | map(select(.agentId == $sid)) | length
      ' "$CONFIG" 2>/dev/null || echo "0")
      if [[ "$IS_TEAMMATE" -gt 0 ]]; then
        _dbg "EXIT: session is a teammate in team config"
        exit 0
      fi
    done
  fi
fi

# -------------------------------------------------------------------
# 1. Determine current branch; skip non-feature branches
# -------------------------------------------------------------------
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

_dbg "BRANCH=$BRANCH"
if [[ -z "$BRANCH" ]] || [[ "$BRANCH" == "main" ]] || [[ "$BRANCH" == "master" ]] || [[ "$BRANCH" == "develop" ]] || [[ "$BRANCH" == "HEAD" ]]; then
  _dbg "EXIT: non-feature branch ($BRANCH)"
  exit 0
fi

# -------------------------------------------------------------------
# 2. Locate orchestrator-state.json by branch name
#    First try direct path (fast), then scan all state files for
#    matching branch_name field (handles branch != feature dir naming).
# -------------------------------------------------------------------
STATE_FILE=""
FEATURE=""

# Fast path: extract feature from branch pattern NNN-feature-name
if [[ "$BRANCH" =~ ^[0-9]+-(.+)$ ]]; then
  CANDIDATE="${BASH_REMATCH[1]}"
else
  CANDIDATE="$BRANCH"
fi

CANDIDATE_FILE="docs/features/${CANDIDATE}/orchestrator-state.json"
if [[ -f "$CANDIDATE_FILE" ]]; then
  STATE_FILE="$CANDIDATE_FILE"
  FEATURE="$CANDIDATE"
fi

# Fallback: scan all state files for matching branch_name
if [[ -z "$STATE_FILE" ]]; then
  for f in docs/features/*/orchestrator-state.json; do
    [[ -f "$f" ]] || continue
    FILE_BRANCH=$(jq -r '.branch_name // ""' "$f" 2>/dev/null || echo "")
    if [[ "$FILE_BRANCH" == "$BRANCH" ]]; then
      STATE_FILE="$f"
      FEATURE=$(jq -r '.feature_name // ""' "$f" 2>/dev/null || echo "")
      break
    fi
  done
fi

# No state file found → allow stop
_dbg "STATE_FILE=$STATE_FILE FEATURE=$FEATURE"
if [[ -z "$STATE_FILE" ]]; then
  _dbg "EXIT: no state file found"
  exit 0
fi

# -------------------------------------------------------------------
# 4. Parse state JSON with jq; if corrupted → allow stop with warning
# -------------------------------------------------------------------
if ! STATE=$(jq '.' "$STATE_FILE" 2>/dev/null); then
  _dbg "EXIT: state file corrupted"
  echo "Warning: SpecKit orchestrator-state.json is corrupted. Allowing stop." >&2
  exit 0
fi

# -------------------------------------------------------------------
# 5. Check pipeline_paused flag → if true, allow stop
# -------------------------------------------------------------------
PAUSED=$(echo "$STATE" | jq -r '.pipeline_paused // false')
if [[ "$PAUSED" == "true" ]]; then
  _dbg "EXIT: pipeline paused"
  exit 0
fi

# -------------------------------------------------------------------
# 6. Check if a team is active → block stop while teammates working
# -------------------------------------------------------------------
TEAM_ACTIVE=$(echo "$STATE" | jq -r '.team_state.active_team // ""')
if [[ -n "$TEAM_ACTIVE" ]]; then
  # Check timeout: if elapsed > timeout_minutes, allow stop with warning
  TEAM_STARTED=$(echo "$STATE" | jq -r '.team_state.started_at // ""')
  TIMEOUT_MINS=$(echo "$STATE" | jq -r '.team_state.timeout_minutes // 15')

  if [[ -n "$TEAM_STARTED" ]]; then
    # Calculate elapsed minutes
    STARTED_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${TEAM_STARTED%%.*}" "+%s" 2>/dev/null || \
                    date -d "${TEAM_STARTED}" "+%s" 2>/dev/null || echo "0")
    NOW_EPOCH=$(date "+%s")
    if [[ "$STARTED_EPOCH" -gt 0 ]]; then
      ELAPSED_MINS=$(( (NOW_EPOCH - STARTED_EPOCH) / 60 ))
      if [[ "$ELAPSED_MINS" -ge "$TIMEOUT_MINS" ]]; then
        # Timeout exceeded → allow stop with warning
        echo "Warning: SpecKit team timeout exceeded (${ELAPSED_MINS}m >= ${TIMEOUT_MINS}m). Allowing stop." >&2
        exit 0
      fi
    fi
  fi

  # Check incomplete teammates
  INCOMPLETE=$(echo "$STATE" | jq '[.team_state.teammates // {} | to_entries[]
    | select(.value.status != "completed" and .value.status != "failed")] | length')

  if [[ "$INCOMPLETE" -gt 0 ]]; then
    # Team phase active — allow the lead to stop and wait for teammate
    # messages. The agent-teams messaging system handles continuation;
    # blocking here causes disruptive re-entry during team coordination.
    exit 0
  fi

  # All teammates done → fall through to normal step logic
fi

# -------------------------------------------------------------------
# 7. Define step order and read statuses
#    Conditionally include plan-review based on teams_enabled
# -------------------------------------------------------------------
TEAMS_ENABLED=$(echo "$STATE" | jq -r '.teams_enabled // false')

if [[ "$TEAMS_ENABLED" == "true" ]]; then
  STEPS=("specify" "clarify" "plan" "plan-review" "tasks" "analyze" "implement")
else
  STEPS=("specify" "clarify" "plan" "tasks" "analyze" "implement")
fi
TOTAL_STEPS=${#STEPS[@]}

# Check for any failed step → allow stop
for STEP in "${STEPS[@]}"; do
  STATUS=$(echo "$STATE" | jq -r --arg s "$STEP" '.step_status[$s] // "pending"')
  if [[ "$STATUS" == "failed" ]]; then
    _dbg "EXIT: step $STEP failed"
    exit 0
  fi
done

# Find the first non-completed/non-skipped step (the next step to run)
NEXT_STEP=""
NEXT_STEP_INDEX=0
COMPLETED_COUNT=0

for i in "${!STEPS[@]}"; do
  STEP="${STEPS[$i]}"
  STATUS=$(echo "$STATE" | jq -r --arg s "$STEP" '.step_status[$s] // "pending"')
  if [[ "$STATUS" == "completed" ]] || [[ "$STATUS" == "skipped" ]]; then
    COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
  elif [[ -z "$NEXT_STEP" ]]; then
    NEXT_STEP="$STEP"
    NEXT_STEP_INDEX=$i
  fi
done

# -------------------------------------------------------------------
# 8. All steps complete → allow stop (pipeline done)
# -------------------------------------------------------------------
if [[ -z "$NEXT_STEP" ]]; then
  _dbg "EXIT: all steps complete"
  exit 0
fi

# -------------------------------------------------------------------
# 9. Check transcript for failure/completion signals → allow stop
# -------------------------------------------------------------------
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path // ""')

if [[ -n "$TRANSCRIPT_PATH" ]] && [[ -f "$TRANSCRIPT_PATH" ]]; then
  # Look for STEP FAILED or PIPELINE COMPLETE in the last assistant message
  LAST_ASSISTANT=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -1 || echo "")
  if [[ -n "$LAST_ASSISTANT" ]]; then
    LAST_TEXT=$(echo "$LAST_ASSISTANT" | jq -r '
      .message.content |
      map(select(.type == "text")) |
      map(.text) |
      join("\n")
    ' 2>/dev/null || echo "")

    if echo "$LAST_TEXT" | grep -q "STEP FAILED"; then
      _dbg "EXIT: STEP FAILED in transcript"
      exit 0
    fi
    if echo "$LAST_TEXT" | grep -q "PIPELINE COMPLETE"; then
      _dbg "EXIT: PIPELINE COMPLETE in transcript"
      exit 0
    fi
  fi
fi

# -------------------------------------------------------------------
# 10. If current step is still in_progress (not yet completed) → allow stop
#     This prevents infinite loops when a step is ambiguous/stuck.
# -------------------------------------------------------------------
CURRENT_STEP=$(echo "$STATE" | jq -r '.current_step // ""')
CURRENT_STATUS=$(echo "$STATE" | jq -r --arg s "$CURRENT_STEP" '.step_status[$s] // "pending"')

_dbg "CURRENT_STEP=$CURRENT_STEP CURRENT_STATUS=$CURRENT_STATUS COMPLETED_COUNT=$COMPLETED_COUNT NEXT_STEP=$NEXT_STEP"
if [[ "$CURRENT_STATUS" == "in_progress" ]]; then
  _dbg "EXIT: current step in_progress"
  exit 0
fi

# -------------------------------------------------------------------
# 10b. If current step needs_resolve → block stop and auto-continue
# -------------------------------------------------------------------
if [[ "$CURRENT_STATUS" == "needs_resolve" ]]; then
  STEP_NUMBER=$((COMPLETED_COUNT + 1))
  jq -n \
    --arg reason "/speckit-orchestrator:execute" \
    --arg msg "SpecKit Pipeline [${STEP_NUMBER}/${TOTAL_STEPS}] | Feature: ${FEATURE} | Resolving: ${CURRENT_STEP}" \
    '{
      "decision": "block",
      "reason": $reason,
      "systemMessage": $msg
    }'
  exit 0
fi

# -------------------------------------------------------------------
# 10c. Human-in-the-loop steps → allow stop after completion
#      Some steps require human review before continuing.
#      Also: if no steps have completed (pipeline just initialized
#      after brainstorming), allow stop so user can review before
#      the pipeline auto-starts.
# -------------------------------------------------------------------
if [[ "$COMPLETED_COUNT" -eq 0 ]]; then
  # Pipeline just initialized (e.g., after brainstorming) — no steps
  # have run yet. Let the user decide when to start.
  _dbg "EXIT: no steps completed yet (COMPLETED_COUNT=0)"
  exit 0
fi

# Find the last completed step (the one that just finished)
LAST_COMPLETED=""
for i in "${!STEPS[@]}"; do
  STEP="${STEPS[$i]}"
  STATUS=$(echo "$STATE" | jq -r --arg s "$STEP" '.step_status[$s] // "pending"')
  if [[ "$STATUS" == "completed" ]]; then
    LAST_COMPLETED="$STEP"
  fi
done

# Steps that require human review before auto-continuing
HUMAN_PAUSE_STEPS=("clarify")

for HP_STEP in "${HUMAN_PAUSE_STEPS[@]}"; do
  if [[ "$LAST_COMPLETED" == "$HP_STEP" ]]; then
    _dbg "EXIT: human pause after $HP_STEP"
    exit 0
  fi
done

# -------------------------------------------------------------------
# 11. We have a completed current step and a next step → block stop
# -------------------------------------------------------------------
_dbg "BLOCK: auto-continue to $NEXT_STEP (completed=$COMPLETED_COUNT)"
STEP_NUMBER=$((COMPLETED_COUNT + 1))

# Add team indicator for team steps
STEP_LABEL="$NEXT_STEP"
if [[ "$TEAMS_ENABLED" == "true" ]] && { [[ "$NEXT_STEP" == "plan-review" ]] || [[ "$NEXT_STEP" == "implement" ]]; }; then
  STEP_LABEL="${NEXT_STEP} ⚡"
fi

jq -n \
  --arg reason "/speckit-orchestrator:execute" \
  --arg msg "SpecKit Pipeline [${STEP_NUMBER}/${TOTAL_STEPS}] | Feature: ${FEATURE} | Next: ${STEP_LABEL}" \
  '{
    "decision": "block",
    "reason": $reason,
    "systemMessage": $msg
  }'

exit 0
