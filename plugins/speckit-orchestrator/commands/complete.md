---
description: "Archive the orchestrator state after pipeline completion"
allowed-tools: ["Bash(python *orchestrator.py*)", "Read(docs/features/*/orchestrator-state.json)", "Read(docs/features/*/orchestrator-state.completed.json)"]
---

# SpecKit Orchestrator -- Complete

Archive the orchestrator state file after the pipeline has completed (or when you want to stop the stop hook from auto-continuing).

This renames `orchestrator-state.json` to `orchestrator-state.completed.json`, which:
- Prevents the stop hook from triggering for this feature
- Preserves the state for reference

## Usage

```
/speckit-orchestrator:complete
```

## Instructions

1. Run the orchestrator complete command:
   ```bash
   SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || SCRIPTS_DIR="${AGENTSKILLS_ROOT:-}/skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || { echo "Error: speckit scripts not found. Set AGENTSKILLS_ROOT." >&2; exit 1; }
   python "$SCRIPTS_DIR/orchestrator.py" complete
   ```

2. If the pipeline is not fully complete, use `--force`:
   ```bash
   python "$SCRIPTS_DIR/orchestrator.py" complete --force
   ```

3. Report the result to the user.

## Notes

- This is automatically called when `/speckit-orchestrator:execute` detects all steps are complete
- Use `--force` to archive mid-pipeline (e.g., when abandoning a feature)
- The archived state can still be read for reference at `orchestrator-state.completed.json`
