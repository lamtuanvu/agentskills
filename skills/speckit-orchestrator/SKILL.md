---
name: speckit-orchestrator
description: "Execute the SpecKit feature development pipeline: specify, clarify, plan, tasks, analyze, implement. Manages state, enforces idea.md as source of truth, and runs steps continuously with a human gate at clarify."
argument-hint: "<feature-name> or path to idea.md"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
metadata:
  author: lamtuanvu
  version: "1.0.0"
---

# SpecKit Orchestrator

A pipeline for structured feature development:

```
specify → clarify → plan → tasks → analyze → implement
```

Each step produces artifacts that feed the next. The pipeline enforces consistency with `idea.md` as the single source of truth.

## Prerequisites

- A feature branch exists (e.g., `042-dark-mode-toggle`)
- `docs/features/<feature>/idea.md` exists with the approved feature plan
- `docs/features/<feature>/orchestrator-state.json` exists (or will be created)

## Setup

If `orchestrator-state.json` doesn't exist but `idea.md` does:

```bash
python scripts/orchestrator.py init <feature-name> <branch-name>
```

This creates the state file with all steps set to `pending`.

## Execution Mode

Execute the pipeline from the current step through to completion.
After each step succeeds, **immediately continue to the next step**.

**Stop only at:**
1. **Clarify step** — present questions to the user and WAIT for their response (human-in-the-loop checkpoint)
2. **Step failure** — display the error, stop for the user to fix
3. **Pipeline complete** — display the completion summary

Do NOT stop between other steps. The goal is continuous execution from the current step to completion.

## Pipeline Execution

### For Each Step

1. Read `docs/features/<feature>/orchestrator-state.json` to find the next pending step.
2. Read `docs/features/<feature>/idea.md` for context.
3. Read the step's reference file at `references/step-<name>.md` for detailed instructions.
4. Execute the step following those instructions.
5. On success:
   - Update `orchestrator-state.json`: set `step_status.<step>` to `"completed"`, advance `current_step` to the next step, update `last_updated`.
   - Display: `Step complete: <step>`
   - **Continue immediately to the next step** (except after clarify — wait for user).
6. On failure:
   - Display the error with context.
   - Leave state unchanged.
   - **STOP** and wait for the user to fix the issue.

### Step Details

| Step | Purpose | Reference | Pauses? |
|------|---------|-----------|---------|
| specify | Generate spec.md from idea.md | `references/step-specify.md` | No |
| clarify | Resolve ambiguities (human gate) | `references/step-clarify.md` | **Yes** |
| plan | Generate implementation plan | `references/step-plan.md` | No |
| plan-review | Specialist agents review the plan | N/A (agent team phase) | No |
| tasks | Generate task breakdown | `references/step-tasks.md` | No |
| analyze | Check artifact consistency | `references/step-analyze.md` | No |
| implement | Execute tasks, write tests | `references/step-implement.md` | No |

### Context for Every Step

Pass this context when executing each step:

> Follow `docs/features/<feature>/idea.md` strictly.
> Do not add features beyond what `idea.md` specifies.
> All work must align with the approved plan.

## State Management

### State File

```
docs/features/<feature>/orchestrator-state.json
```

### Schema

```json
{
  "feature_name": "dark-mode-toggle",
  "branch_name": "042-dark-mode-toggle",
  "idea_file": "docs/features/dark-mode-toggle/idea.md",
  "spec_dir": "specs/042-dark-mode-toggle",
  "current_step": "specify",
  "step_status": {
    "specify": "pending",
    "clarify": "pending",
    "plan": "pending",
    "tasks": "pending",
    "analyze": "pending",
    "implement": "pending"
  },
  "started_at": "ISO8601",
  "last_updated": "ISO8601"
}
```

### Updating State

After each step completes, update the JSON:

```json
{
  "step_status": { "<step>": "completed" },
  "current_step": "<next-step>",
  "last_updated": "<ISO8601>"
}
```

The `analyze` step may also use `"needs_resolve"` status — see `references/step-analyze.md`.

## Progress Display

Show progress at the start and after each step:

```
[done] Specify  ->  [done] Clarify  ->  [next] Plan
[ ] Tasks  ->  [ ] Analyze  ->  [ ] Implement
```

## Completion

When all steps are complete:

1. Archive: rename `orchestrator-state.json` to `orchestrator-state.completed.json`.
2. Read the test report at `specs/<feature>/reports/test-report.md`.
3. Display a summary:

```
Pipeline complete: <feature-name>

  [done] Specify -> [done] Clarify -> [done] Plan
  [done] Tasks   -> [done] Analyze -> [done] Implement

  Test Summary: X passed, X failed, X skipped
  Full report: specs/<feature>/reports/test-report.md
```

## Error Recovery

| Error | Action |
|-------|--------|
| Missing `idea.md` | Stop. User must create it first (brainstorm or manual). |
| Missing state file | Run `python scripts/orchestrator.py init <feature> <branch>` |
| Step failure | Fix the issue, then re-invoke this skill to retry from the failed step. |
| Scope drift (analyze) | HALT. User must fix artifacts or update `idea.md`. |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/orchestrator.py` | State initialization and progress display |
| `scripts/verify_state.py` | Verify and fix spec_dir mismatches after specify |
| `scripts/partition_tasks.py` | Partition tasks for parallel execution |
