---
description: "Reset SpecKit pipeline to a specific step"
argument-hint: "<step>"
allowed-tools: ["Bash(python *orchestrator.py*)", "Read(docs/features/*/orchestrator-state.json)"]
---

# SpecKit Orchestrator — Rollback

Reset the SpecKit pipeline to a specific step, marking that step and all subsequent steps as pending.

## Usage

```
/speckit-orchestrator:rollback <step>
```

## Valid Steps

`specify`, `clarify`, `plan`, `plan-review`, `tasks`, `analyze`, `implement`

## Instructions

1. Run the orchestrator rollback command:
   ```bash
   SCRIPTS_DIR="${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || SCRIPTS_DIR="${AGENTSKILLS_ROOT:-}/skills/speckit-orchestrator/scripts"
   [ -d "$SCRIPTS_DIR" ] || { echo "Error: speckit scripts not found. Set AGENTSKILLS_ROOT." >&2; exit 1; }
   python "$SCRIPTS_DIR/orchestrator.py" rollback <step>
   ```

2. Show confirmation and updated progress to the user.

3. Inform the user they can resume with:
   ```
   /speckit-orchestrator:execute
   ```
