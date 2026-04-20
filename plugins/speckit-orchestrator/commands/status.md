---
description: "Show current SpecKit pipeline progress"
argument-hint: "[feature-name]"
allowed-tools: ["Bash(python *orchestrator.py*)", "Read(docs/features/*/orchestrator-state.json)"]
---

# SpecKit Orchestrator — Status

Show the current progress of the SpecKit pipeline for a feature.

## Usage

```
/speckit-orchestrator:status
/speckit-orchestrator:status dark-mode-toggle
```

## Instructions

1. Run the orchestrator status command:
   ```bash
   SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || SCRIPTS_DIR="${AGENTSKILLS_ROOT:-}/skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || { echo "Error: speckit scripts not found. Set AGENTSKILLS_ROOT." >&2; exit 1; }
   python "$SCRIPTS_DIR/orchestrator.py" status [feature-name]
   ```
   If no feature name is provided, it auto-detects from the current branch.

2. Display the progress box and next step info to the user.

3. If there is an active team phase, also run:
   ```bash
   python "$SCRIPTS_DIR/orchestrator.py" team-status
   ```
