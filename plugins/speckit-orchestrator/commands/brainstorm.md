---
description: "Brainstorm and plan a new feature using multi-angle analysis (agent team or parallel subagents). Produces an approved idea.md file."
argument-hint: "<feature-description>"
---

# SpecKit Brainstorm

## Overview

This command facilitates feature brainstorming by analyzing the proposed feature from multiple angles simultaneously. Four specialist analysts — UX, architecture, feasibility, and devil's advocate — explore the codebase and challenge the idea in parallel, then the lead synthesizes their findings into a comprehensive `idea.md`.

Uses agent teams to spawn a full team with shared task list and inter-agent messaging.

**Output**: `docs/features/<feature>/idea.md` + `orchestrator-state.json` + git branch

**Next Step**: After all artifacts are created, the user manually starts the pipeline with `/speckit-orchestrator:execute`.

## CRITICAL: This Command Produces idea.md ONLY

**DO NOT write any implementation code during brainstorming.**

This command's sole purpose is to produce an approved `idea.md` file. The SpecKit pipeline (`specify → clarify → plan → tasks → analyze → implement`) handles everything else.

## Workflow

### Step 1: Understand the Feature Request

Parse the user's feature description from the command arguments. If the description is too vague to brief analysts on, use `AskUserQuestion` to gather essential context:
- What problem does this solve?
- Who is the target user?
- Any constraints or preferences?

Keep this brief — the analysts will do the deep exploration. You just need enough to write a clear brief.

Extract feature info:
- Feature name (kebab-case): e.g., `dark-mode-toggle`
- Sequence number: auto-determined (see Step 5.1)

### Step 2: Create the Brainstorm Team

1. **Create the team:**
   ```
   TeamCreate: speckit-<feature-name>-brainstorm
   ```

2. **Create 4 tasks** (one per analyst) using `TaskCreate`:

   | Task | Assignee | Description |
   |------|----------|-------------|
   | UX analysis | `ux-analyst` | Analyze feature from UI/UX perspective |
   | Architecture analysis | `architect` | Analyze feature from architecture perspective |
   | Feasibility analysis | `feasibility-analyst` | Analyze feature for technical feasibility and risks |
   | Devil's advocate | `devils-advocate` | Challenge assumptions and find weaknesses |

### Step 2.1: Spawn Teammates

Spawn all 4 teammates in parallel using the `Task` tool with `team_name` set to your team. Each teammate gets:

- **Their agent instructions** from the corresponding file in `agents/`
- **The feature description** from the user
- **The codebase context** — they will explore it themselves

**Spawn prompt template** (customize per role):
```
You are the [role] for a brainstorm analysis team.

Feature under analysis: "<feature-description>"

Read your agent instructions at plugins/speckit-orchestrator/agents/[agent-file].md,
then explore the codebase to understand the current state.

Analyze this feature from your specialist perspective and write your report.
When done, send your full report to the team lead and mark your task as completed.
```

**Teammates to spawn:**

| Name | Agent file | Subagent type |
|------|-----------|---------------|
| `ux-analyst` | `agents/ux-analyst.md` | `general-purpose` |
| `architect` | `agents/architect.md` | `general-purpose` |
| `feasibility-analyst` | `agents/feasibility-analyst.md` | `general-purpose` |
| `devils-advocate` | `agents/devils-advocate.md` | `general-purpose` |

Assign each teammate their corresponding task via `TaskUpdate`.

### Step 2.2: Monitor and Coordinate

While teammates work:

1. **Use delegate mode** (Shift+Tab) — do NOT explore the codebase yourself; let the team do the analysis
2. **Monitor `TaskList`** periodically to check progress
3. **Respond to teammate messages** if they have questions
4. **Wait for all 4 teammates to complete** before proceeding

If a teammate gets stuck or fails:
- Send them a message with guidance
- If unrecoverable, note the gap and proceed with the remaining analyses

### Step 2.3: Collect Reports

Teammates send their reports via messages to the lead. Collect all 4 reports and proceed to **Step 3: Synthesize into idea.md Draft**.

### Step 2.4: Shut Down the Team

After collecting all reports:

1. Send `shutdown_request` to each teammate
2. Wait for shutdown confirmations
3. Run `TeamDelete` to clean up team resources

Then proceed to **Step 3: Synthesize into idea.md Draft**.

### Step 3: Synthesize into idea.md Draft

Once all analyst reports are collected, synthesize their findings into a unified `idea.md` draft.

Read all reports and combine them:
- **UX analyst** → informs User Stories, UI/UX section, and relevant requirements
- **Architect** → informs Technical Approach, Architecture, Affected Components, Dependencies
- **Feasibility analyst** → informs Technical Approach, Testing Strategy, risk-related requirements
- **Devil's advocate** → informs Out of Scope, Open Questions, and any adjusted requirements

**idea.md template:**

```markdown
# Feature: <Feature Name>

## Summary
<1-2 sentence description of what this feature does>

## Problem Statement
<What problem does this feature solve? Why is it needed?>

## User Stories
- As a [user type], I want to [action] so that [benefit]

## Requirements

### Must Have (P0)
- [ ] <core requirement 1>
- [ ] <core requirement 2>

### Nice to Have (P1)
- [ ] <optional feature 1>

### Out of Scope
- <excluded item> — <reason>

## Technical Approach

### Architecture
<High-level architecture decisions>

### Database Changes
<Any new tables, columns, or migrations — or "None">

### API Changes
<New or modified endpoints — or "None">

### UI/UX
<User interface considerations — or "None">

## Affected Components
- <file or module 1>
- <file or module 2>

## Dependencies
- <external dependency or prerequisite>

## Testing Strategy

### Unit Tests
- <component/module> — <what behaviors to test>

### Integration Tests
- <flow/API endpoint> — <what interactions to verify>

### E2E Tests — Backend
- <API workflow> — <full request lifecycle to verify>

### E2E Tests — Frontend
- <user flow> — <complete user journey to test>

## Risks & Mitigations
- <Risk 1> — <Mitigation>
- <Risk 2> — <Mitigation>

## Open Questions
1. <Any unresolved questions for the clarify phase>

## Success Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>
```

### Step 4: Present Plan and Guide User to Continue

Present the synthesized `idea.md` draft to the user as plain text output (do NOT use `AskUserQuestion` here — that would trigger immediate implementation while still in plan mode).

Display the full draft followed by the transition guide:

```
Here's the synthesized idea.md based on analysis from 4 specialist analysts
(UX, Architecture, Feasibility, Devil's Advocate):

<display the full idea.md draft>

══════════════════════════════════════════════════════════════
📋 NEXT STEPS — To approve and start the pipeline
══════════════════════════════════════════════════════════════

  1. Press [Esc] to exit this query
  2. Switch to Edit mode (if not already in edit mode)
  3. Ask: "Write the approved plan to idea.md and create
     the feature artifacts"

  — OR if you want changes, ask me to revise the draft
    before writing it.

This will create idea.md, orchestrator-state.json,
and the git branch, then continue to the SpecKit pipeline.
══════════════════════════════════════════════════════════════
```

**Do NOT use `AskUserQuestion` for approval here.** The agent cannot programmatically exit plan mode, so if the user approves via `AskUserQuestion`, the agent will attempt to write files while still in plan mode and fail. The user must manually press Esc, switch to edit mode, and then instruct the agent to proceed.

**STOP here. Do not proceed to Step 5 until the user returns in edit mode and explicitly asks to write the artifacts.**

### Step 5: Create Feature Artifacts (ONLY After Approval)

After the user approves the idea.md draft:

**Step 5.1: Determine sequence number and create git branch**

Auto-determine the next sequence number by scanning existing branches:
```bash
git branch -a | grep -oE '[0-9]{3}-' | sort -rn | head -1
```
- Extract the highest `NNN` prefix from all branches matching `NNN-*`
- If none found, start at `001`
- Otherwise, increment by 1 and zero-pad to 3 digits
- Example: if `002-plugin-search` exists → next is `003`

Create the branch:
```bash
git checkout -b <NNN>-<feature-name>
```
Branch name always follows the pattern `NNN-feature-name` (e.g., `001-dark-mode-toggle`, `014-plugin-rating-reviews`). This convention is required by the stop hook for feature name extraction.

**Step 5.2: Write `docs/features/<feature>/idea.md`**
- Create the directory: `mkdir -p docs/features/<feature-name>`
- Write the **approved draft** as `docs/features/<feature-name>/idea.md`

**Step 5.3: Create `orchestrator-state.json`**

Write the state file to `docs/features/<feature-name>/orchestrator-state.json`:

```json
{
  "feature_name": "<feature-name>",
  "branch_name": "<NNN>-<feature-name>",
  "idea_file": "docs/features/<feature-name>/idea.md",
  "spec_dir": "specs/<feature-name>",
  "current_step": "specify",
  "step_status": {
    "specify": "pending",
    "clarify": "pending",
    "plan": "pending",
    "plan-review": "pending",
    "tasks": "pending",
    "analyze": "pending",
    "implement": "pending"
  },
  "started_at": "<ISO8601>",
  "last_updated": "<ISO8601>",
  "teams_enabled": true,
  "team_state": null
}
```

**Step 5.4: Verify the state file**

Read back the state file and confirm:
- `current_step` is `"specify"`
- All 7 steps are present and `"pending"`
- `idea_file` path matches the idea.md you wrote

### Step 6: Report and Wait for User

After all artifacts are created, display:

```
══════════════════════════════════════════════════════════════
BRAINSTORMING COMPLETE
══════════════════════════════════════════════════════════════

 Analysis mode: [Agent Team | Parallel Subagents]
   [✓] UX Analyst
   [✓] Architect
   [✓] Feasibility Analyst
   [✓] Devil's Advocate

 Artifacts:
   1. Created git branch: <NNN>-<feature-name>
   2. Created idea.md: docs/features/<feature-name>/idea.md
   3. Created orchestrator-state.json (7 steps, starting at specify)
   4. Verified state file

Pipeline: specify → clarify → plan → plan-review → tasks → analyze → implement
          ^
     Starting here

To start the pipeline:
  /speckit-orchestrator:execute
══════════════════════════════════════════════════════════════
```

**Do NOT automatically invoke `/speckit-orchestrator:execute`.** The user must review the artifacts and decide when to start the pipeline. This is a human-in-the-loop checkpoint.

If any artifact creation step **failed**, STOP and wait for the user to resolve it.

## Critical Rules

### NO PLAN MODE

This command uses parallel analysis (team or subagents). Do NOT use `EnterPlanMode`. The analysts do the exploration work; the lead synthesizes and coordinates.

### NO CODE, NO IMPLEMENTATION

**This command produces `idea.md` ONLY.** Do not:
- Write any implementation code
- Create any source files
- Modify any existing code
- Run any build/test commands
- Skip ahead to implementation

The SpecKit pipeline handles everything after `idea.md` is created.

### WAIT FOR ALL ANALYSTS

**Do not synthesize until all analysts have reported back** (or failed). The value of this approach is getting multiple independent perspectives. Synthesizing early defeats the purpose.

### USER MUST APPROVE idea.md

**Never write idea.md without user approval.**

- Present the synthesized draft as plain text output (NOT via `AskUserQuestion`)
- Display the transition guide telling the user to press Esc, switch to edit mode, then ask to write
- The user returns in edit mode and explicitly asks to write — that is the approval
- If the user asks for changes first, revise the draft and present again with the guide

### DO NOT AUTO-CONTINUE TO PIPELINE

After artifacts are created:
- All steps passed → STOP and display the command for the user to start the pipeline
- Any step failed → STOP, display failure, wait for user
- DO NOT automatically invoke `/speckit-orchestrator:execute`
- DO NOT skip the pipeline and jump to implementation
- The user must explicitly start the pipeline when ready

### CLEAN UP

**Always shut down teammates and delete the team** before creating artifacts. The brainstorm team is temporary — it exists only for the analysis phase.

## Plan Mode Exit Guide

**Known limitation:** Claude Code agents can enter plan mode but cannot programmatically exit it. The `ExitPlanMode` tool signals readiness for approval, but the agent remains in plan mode until the user manually exits. If the user approves via `AskUserQuestion` while still in plan mode, the agent immediately attempts implementation but cannot write files — causing failure.

**Solution:** Never use `AskUserQuestion` for the final approval. Instead, present the plan as plain text with the transition guide, then STOP. The user manually exits plan mode and returns in edit mode to instruct the agent to write files.

**If the agent gets stuck in plan mode at any point**, it MUST display this guide:

```
══════════════════════════════════════════════════════════════
⚠️  PLAN MODE — Manual Exit Required
══════════════════════════════════════════════════════════════

The plan is complete but I cannot exit plan mode
automatically. Please follow these steps:

  1. Press [Esc] to exit this query
  2. Switch to Edit mode (press Tab until you see "Edit"
     or use the mode selector)
  3. Then ask me: "Write the approved plan to idea.md
     and continue with artifact creation"

I'll then create the feature artifacts and start the
SpecKit pipeline.
══════════════════════════════════════════════════════════════
```

**When to show this guide:**
- At the end of Step 4 (always — this is the primary trigger)
- Any time the agent detects it is stuck in plan mode and needs to write files
- If `ExitPlanMode` fails or the agent cannot proceed to file writes

**The agent MUST always display this guide at the end of the plan presentation, regardless of whether it is in plan mode or not.** This ensures the user always knows how to proceed.

## Resources

### agents/
- `ux-analyst.md` — UI/UX analysis agent
- `architect.md` — Architecture analysis agent
- `feasibility-analyst.md` — Technical feasibility agent
- `devils-advocate.md` — Assumption challenger agent

### scripts/
- `init_feature.py` — Initialize orchestrator-state.json for a feature

### references/
- `idea-template.md` — Full template for idea.md files

### assets/
- `idea-template.md` — Simplified brainstorming template
