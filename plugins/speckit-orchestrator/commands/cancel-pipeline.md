---
description: "Pause the SpecKit pipeline so the stop hook allows exit"
allowed-tools: ["Bash(python *orchestrator.py*)", "Read(docs/features/*/orchestrator-state.json)"]
hide-from-slash-command-tool: "true"
---

# Cancel Pipeline

To pause the SpecKit orchestrator pipeline (so the stop hook stops auto-continuing):

1. Run the orchestrator cancel command:
   ```bash
   SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || SCRIPTS_DIR="${AGENTSKILLS_ROOT:-}/skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || { echo "Error: speckit scripts not found. Set AGENTSKILLS_ROOT." >&2; exit 1; }
   python "$SCRIPTS_DIR/orchestrator.py" cancel
   ```

2. Report the result to the user.

3. To resume later, the user can run `/speckit-orchestrator:execute` which clears the pause flag.
