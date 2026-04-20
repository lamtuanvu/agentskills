---
description: "Execute the next step in the SpecKit pipeline (specify->clarify->plan->plan-review->tasks->analyze->implement). Supports agent-teams for parallel plan review and implementation. Assumes idea.md exists."
allowed-tools: ["Bash(python *orchestrator.py*)", "Bash(python *partition_tasks.py*)", "Bash(python *verify_state.py*)", "Read(docs/features/*/orchestrator-state.json)", "Read(docs/features/*/idea.md)", "Read(specs/*/spec.md)", "Read(specs/*/plan.md)", "Read(specs/*/tasks.md)"]
---

# SpecKit Orchestrator — Execute

## Overview

This command executes the next step in the SpecKit pipeline for feature development:

```
specify → clarify → plan → [plan-review] → tasks → analyze → implement
                             ^                                  ^
                        Team phase (parallel           Team phase (parallel
                        specialist reviews)            implementation + tests)
```

**Prerequisites:**
- Feature branch exists (e.g., `042-dark-mode-toggle`)
- `docs/features/<feature>/idea.md` exists with the approved plan
- `docs/features/<feature>/orchestrator-state.json` exists

**The stop hook handles auto-continuation.** After each step, the hook reads `orchestrator-state.json` and feeds `/speckit-orchestrator:execute` to run the next step. It only allows stop when a step fails, the pipeline completes, the pipeline is paused, or a **human-in-the-loop** step just completed (currently: `clarify`). After `clarify` completes, the pipeline pauses so the user can review clarification results before continuing to `plan`.

**Agent Teams** (optional): When enabled, `plan-review` and `implement` steps use multi-agent teams for parallel work. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Falls back to sequential when unavailable.

## When to Use

```
/speckit-orchestrator:execute
```

Use this when:
- Brainstorming is complete and idea.md exists
- You want to run the next step in the speckit pipeline
- You're on a feature branch with orchestrator state

## Pipeline Steps

Each execute call runs the next step. The stop hook auto-continues on success:

| Step | Command | Purpose | Team? | Pauses? |
|------|---------|---------|-------|---------|
| 1 | `/speckit.specify` | Generate spec.md from idea.md | No | No |
| 2 | `/speckit.clarify` | Resolve ambiguities (NEVER skip) | No | Yes — MUST wait for user |
| 3 | `/speckit.plan` | Generate implementation plan | No | No |
| 4 | Team phase | Parallel specialist plan reviews | Yes | No |
| 5 | `/speckit.tasks` | Generate tasks.md | No | No |
| 6 | `/speckit.analyze` | Check consistency | No | No |
| 7 | `/speckit.implement` | Execute tasks (parallel if teams) | Yes | No |

Steps marked "Team?" use agent teams when `teams_enabled` is true. When false, step 4 is skipped and step 7 runs sequentially.

### Clarify Step — Human-in-the-Loop (CRITICAL)

The `clarify` step is a **mandatory human checkpoint**. The pipeline MUST stop after this step and wait for the user — no exceptions.

**Rules:**
1. **NEVER auto-answer clarification questions** — present them to the user and STOP. The user decides every answer.
2. **NEVER skip clarify or select a default** — even if `/speckit.clarify` finds zero ambiguities, you must still present that finding to the user and wait for their explicit confirmation before continuing.
3. **NEVER mark clarify as `"skipped"`** — always run it, always wait for the user, always mark as `"completed"` only after the user has reviewed.
4. After running `/speckit.clarify`:
   - **Questions found** → display all questions, then STOP. Do NOT answer them. Wait for the user to provide answers in a follow-up message. Only after the user responds, incorporate their answers and mark `clarify` as `"completed"`.
   - **No questions found** → display: _"No ambiguities found in the spec. Ready to proceed to the plan step?"_ then STOP. Wait for the user to confirm before marking `clarify` as `"completed"`.
5. Only set `clarify: "completed"` and `current_step: "plan"` **after** the user has explicitly reviewed and responded. The stop hook gates on the `plan` step — it will not auto-continue past clarify.

## Execution Instructions

### Running the Pipeline

1. **Switch to feature branch:**
   ```bash
   git checkout 042-dark-mode-toggle
   ```

2. **Run next step:**
   ```
   /speckit-orchestrator:execute
   ```

3. **Orchestrator will:**
   - Read `orchestrator-state.json` to find next pending step
   - Read `idea.md` for context
   - Run the appropriate `/speckit.*` command (or team phase)
   - **Update `step_status` to `"completed"` and advance `current_step`** (this is the signal the stop hook reads)
   - **If step failed → STOP and wait for user**

4. The **stop hook** detects the completed step and auto-feeds `/speckit-orchestrator:execute` for the next step. Pipeline runs to completion unless a step fails.

### Context for Each Step

When running each `/speckit.*` command, pass this context:

```
Follow docs/features/<feature>/idea.md strictly.
Do not add features beyond what idea.md specifies.
All work must align with the approved plan.
```

**Additional context for the `plan` step:**

```
The plan MUST include a detailed testing section covering:
- Unit tests for each module/component
- Integration tests for API endpoints and service interactions
- E2E tests for backend (full request lifecycles, data pipelines)
- E2E tests for frontend (complete user journeys, critical paths)
The testing section should specify test frameworks, file locations,
and concrete test scenarios for each category.
```

### Post-Specify Verification

After `/speckit.specify` completes and before marking the step as completed, run:

```bash
python "${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts/verify_state.py" --fix
```

This verifies that `spec_dir` in orchestrator state matches the actual directory created by speckit. If there's a mismatch (e.g., speckit created `specs/042-dark-mode-toggle/` but state says `specs/dark-mode-toggle/`), `--fix` will auto-correct the state file.

### Analyze Resolution Flow (needs_resolve)

When `/speckit-orchestrator:execute` detects the `analyze` step with status `needs_resolve`:

1. **Do NOT run `/speckit.analyze` fresh.** Instead:
   - Read the existing analysis output to identify HIGH/must-fix findings
   - Apply concrete edits to the artifacts (`plan.md`, `tasks.md`, `spec.md`, etc.) to resolve the findings
   - Re-run `/speckit.analyze` to verify the fixes addressed all issues

2. **After re-analysis:**
   - If re-analysis finds **no HIGH/must-fix findings** → set `analyze: "completed"`, advance `current_step` to `implement`
   - If re-analysis **still has HIGH findings** → keep `analyze: "needs_resolve"` with `current_step: "analyze"` (stop hook will loop back)

### Analyze Step Completion Logic

When running `/speckit.analyze` for the **first time** (status was `pending` or `in_progress`):

- If analysis finds **no HIGH/must-fix findings** → set `analyze: "completed"`, advance normally
- If analysis finds **HIGH findings that need artifact fixes** → set `analyze: "needs_resolve"` with `current_step: "analyze"` (do NOT advance to implement)

The stop hook will detect `needs_resolve` and auto-feed `/speckit-orchestrator:execute`, which will then guide the agent through the resolution flow above.

### After Each Step (Critical for Stop Hook)

**You MUST update `orchestrator-state.json` before finishing:**
1. Set the current step's `step_status` to `"completed"`
2. Set `current_step` to the next step name
3. Update `last_updated` timestamp

The stop hook reads these fields to decide whether to auto-continue.

**On success**, display a brief status:
```
✅ specify — complete.
```

**On failure**, display the error and STOP:
```
══════════════════════════════════════════════════════════════
❌ STEP FAILED: clarify
══════════════════════════════════════════════════════════════

Error: <description of what went wrong>

Fix the issue, then run:
  /speckit-orchestrator:execute

══════════════════════════════════════════════════════════════
```

### After All Steps Complete

The orchestrator auto-archives the state file (`orchestrator-state.json` → `orchestrator-state.completed.json`) so the stop hook no longer triggers for this feature.

**Before displaying completion**, read the test report at `specs/<feature>/reports/test-report.md` and include its summary.

Display:
```
══════════════════════════════════════════════════════════════
✅ PIPELINE COMPLETE
══════════════════════════════════════════════════════════════

 [✓] Specify   →  [✓] Clarify      →  [✓] Plan     →  [✓] Plan Review ⚡
 [✓] Tasks     →  [✓] Analyze      →  [✓] Implement ⚡

Feature <feature-name> is fully implemented.
State archived → orchestrator-state.completed.json

── Test Report Summary ──────────────────────────────────────
 Total: XX tests | Passed: XX | Failed: XX | Skipped: XX
 Unit:        XX passed / XX total
 Integration: XX passed / XX total
 E2E Backend: XX passed / XX total
 E2E Frontend:XX passed / XX total

 Full report: specs/<feature>/reports/test-report.md
══════════════════════════════════════════════════════════════
```

---

## Team Steps

### Detecting Team Availability

Before running a team step, check:
1. Is `teams_enabled` true in state?
2. If not → skip `plan-review`, run `implement` sequentially

### Plan Review Team Phase (Step 4)

**Trigger:** `plan` step completed, `teams_enabled` is true.

**Procedure:**

1. **Check for UI keywords** in `idea.md`:
   Search for: `UI`, `frontend`, `component`, `design`, `page`, `form`, `modal`, `dialog`, `button`, `layout`, `responsive`, `CSS`, `style`, `theme`
   If found → spawn `ui-reviewer` alongside other reviewers

2. **Create team:**
   ```
   TeamCreate: speckit-<feature>-plan-review
   ```

3. **Update state:**
   ```json
   {
     "current_step": "plan-review",
     "step_status": { "plan-review": "in_progress" },
     "team_state": {
       "active_team": "speckit-<feature>-plan-review",
       "phase": "plan-review",
       "teammates": {
         "security-reviewer": { "status": "in_progress", "output": "reviews/security.md" },
         "performance-reviewer": { "status": "in_progress", "output": "reviews/performance.md" },
         "conventions-reviewer": { "status": "in_progress", "output": "reviews/conventions.md" }
       },
       "started_at": "<ISO8601>",
       "timeout_minutes": 15
     }
   }
   ```

4. **Spawn teammates** (all in parallel):
   - `security-reviewer` — read `agents/security-reviewer.md`, mode: plan
   - `performance-reviewer` — read `agents/performance-reviewer.md`, mode: plan
   - `conventions-reviewer` — read `agents/conventions-reviewer.md`, mode: plan
   - `ui-reviewer` (conditional) — read `agents/ui-reviewer.md`, mode: plan

5. **Monitor:** Poll `TaskList` until all teammates are `completed` or `failed`

6. **Consolidate findings:**
   - Read all `specs/<feature>/reviews/*.md` files
   - Create `specs/<feature>/reviews/summary.md` with combined verdict
   - If any reviewer says "REVISE REQUIRED" → pause pipeline for user review
   - If all PASS → continue automatically

7. **Teardown:**
   - `SendMessage` type: `shutdown_request` to each teammate
   - `TeamDelete`
   - Clear `team_state` in state
   - Set `plan-review: "completed"`, advance `current_step` to `tasks`

### Implementation Team Phase (Step 7)

**Trigger:** `analyze` step completed, `teams_enabled` is true.

**Procedure:**

1. **Partition tasks:**
   ```bash
   python "${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts/partition_tasks.py" specs/<feature>/tasks.md --max-groups 3
   ```
   If `parallelizable: false` → run sequential implementation (no team)

2. **Create team:**
   ```
   TeamCreate: speckit-<feature>-implement
   ```

3. **Update state** with team_state (similar to plan-review)

4. **Spawn teammates:**
   - `implementer-1` through `implementer-N` (max 3) — each with assigned task group and file ownership
   - `test-writer` — read `agents/test-writer.md`, starts immediately alongside implementers
   - After implementers + test writer finish:
   - `qa-reviewer` — read `agents/qa-reviewer.md`, mode: plan

5. **Monitor and coordinate:**
   - The lead uses **delegate mode** (coordination only, no direct code changes)
   - Monitor `TaskList` for completion
   - Handle file ownership conflicts if they arise
   - Re-assign failed tasks if possible

6. **After QA:**
   - Read `specs/<feature>/reviews/qa.md`
   - If FAIL → pause pipeline for user review
   - If PASS → continue to test report generation

7. **Generate Test Report:**
   - Run the full test suite (detect and use the project's test runner)
   - Write a detailed report to `specs/<feature>/reports/test-report.md`
   - See **Test Report Format** section below for the required format
   - If tests fail → include failures in the report, pause for user review
   - If all tests pass → continue to completion

8. **Teardown:** Same as plan-review team

---

## Test Report Format

After implementation and QA, the lead runs the full test suite and writes a detailed report to `specs/<feature>/reports/test-report.md`.

**The lead must:**
1. Detect the project's test runner (Jest, Vitest, pytest, etc.)
2. Run all tests (unit, integration, e2e)
3. Collect results and write the report

**Report template:**

```markdown
# Test Report

**Feature:** <feature-name>
**Date:** <ISO8601>
**Test Runner:** <framework and version>

## Summary

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Unit Tests | X | X | X | X |
| Integration Tests | X | X | X | X |
| E2E Tests — Backend | X | X | X | X |
| E2E Tests — Frontend | X | X | X | X |
| **Total** | **X** | **X** | **X** | **X** |

**Overall Status:** PASS / FAIL

## Test Coverage

| Module/Component | Lines | Branches | Functions | Statements |
|------------------|-------|----------|-----------|------------|
| <module> | X% | X% | X% | X% |
| ... | ... | ... | ... | ... |
| **Overall** | **X%** | **X%** | **X%** | **X%** |

*Coverage collected with: <tool> (if available)*

## Unit Tests

| Test File | Tests | Passed | Failed | Duration |
|-----------|-------|--------|--------|----------|
| <file> | X | X | X | Xs |
| ... | ... | ... | ... | ... |

### Failed Unit Tests
- **<test name>** in `<file>`: <error message>

## Integration Tests

| Test File | Tests | Passed | Failed | Duration |
|-----------|-------|--------|--------|----------|
| <file> | X | X | X | Xs |
| ... | ... | ... | ... | ... |

### Failed Integration Tests
- **<test name>** in `<file>`: <error message>

## E2E Tests — Backend

| Test File | Tests | Passed | Failed | Duration |
|-----------|-------|--------|--------|----------|
| <file> | X | X | X | Xs |
| ... | ... | ... | ... | ... |

### Failed E2E Backend Tests
- **<test name>** in `<file>`: <error message>

## E2E Tests — Frontend

| Test File | Tests | Passed | Failed | Duration |
|-----------|-------|--------|--------|----------|
| <file> | X | X | X | Xs |
| ... | ... | ... | ... | ... |

### Failed E2E Frontend Tests
- **<test name>** in `<file>`: <error message>

## What Was Tested

### Covered Scenarios
- <scenario 1> — <which tests cover it>
- <scenario 2> — <which tests cover it>

### Not Covered (Gaps)
- <gap 1> — <reason>
- <gap 2> — <reason>

## Notes
- <any observations about test quality, flaky tests, etc.>
```

**If the project has no test runner configured**, note this in the report and list what test files were created, what they would test, and instructions for running them manually.

**If coverage tooling is not available**, omit the coverage table and note it as unavailable.

---

## State Management

### State File
```
docs/features/<feature>/orchestrator-state.json
```

### State Schema
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
    "plan-review": "pending",
    "tasks": "pending",
    "analyze": "pending",
    "implement": "pending"
  },
  "started_at": "ISO8601",
  "last_updated": "ISO8601",
  "teams_enabled": true,
  "team_state": null
}
```

### Updating State

After each step completes:
```json
{
  "step_status": {
    "specify": "completed"
  },
  "current_step": "clarify"
}
```

During team phases, also update `team_state` with teammate progress.

## Progress Display

```
╔════════════════════════════════════════════════════════════════════════════╗
║  SpecKit Orchestrator (Teams Enabled)                                      ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Feature: dark-mode-toggle                                                 ║
║  Branch: 042-dark-mode-toggle                                              ║
║  Source: docs/features/dark-mode-toggle/idea.md                            ║
╠════════════════════════════════════════════════════════════════════════════╣
║  [✓] Specify  →  [✓] Clarify  →  [✓] Plan  →  [▶] Plan Review ⚡          ║
║  [ ] Tasks    →  [ ] Analyze  →  [ ] Implement ⚡                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Team: speckit-dark-mode-toggle-plan-review                                ║
║    [✓] security-reviewer                                                   ║
║    [▶] performance-reviewer                                                ║
║    [▶] conventions-reviewer                                                ║
╚════════════════════════════════════════════════════════════════════════════╝
```

**Symbols:**
- `[✓]` Completed
- `[−]` Skipped
- `[▶]` In Progress
- `[!]` Needs Resolve (has fixable findings)
- `[ ]` Pending
- `⚡` Team step (parallel agents)

## Critical Rules

### UPDATE STATE ON SUCCESS (Stop Hook Signal)

**The stop hook reads `orchestrator-state.json` to decide auto-continuation. You MUST update state after each step.**

- Step succeeded → set `step_status` to `"completed"`, advance `current_step`, then finish your turn
- Step failed → output "STEP FAILED", leave state as-is, stop for user to fix
- DO NOT skip steps
- DO NOT continue past a failed step

### TEAM STATE MANAGEMENT

**During team phases, keep `team_state` updated:**

- Team started → set `team_state` with all teammates and their status
- Teammate finished → update their status in `team_state`
- All done → clear `team_state` before marking step complete
- The stop hook checks `team_state` to block premature stops

### FOLLOW idea.md

**All steps must follow idea.md strictly.**

- Read idea.md before running any /speckit.* command
- Pass context about following idea.md
- Flag scope drift as error

## Setup (if state doesn't exist)

If `orchestrator-state.json` doesn't exist but `idea.md` does:

1. Create the state file:
   ```bash
   python "${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts/orchestrator.py" init <feature-name> <branch-name>
   ```
   Or without teams:
   ```bash
   python "${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts/orchestrator.py" init <feature-name> <branch-name> --no-teams
   ```

2. Then run:
   ```
   /speckit-orchestrator:execute
   ```

## Error Handling

### Missing idea.md
```
Error: idea.md not found at docs/features/<feature>/idea.md
Create idea.md first (use /speckit-orchestrator:brainstorm or create manually)
```

### Missing state file
```
Error: orchestrator-state.json not found
Run: python "${CLAUDE_PLUGIN_ROOT}/../../skills/speckit-orchestrator/scripts/orchestrator.py" init <feature> <branch>
```

### Team creation failure
```
Warning: Agent teams unavailable, falling back to sequential execution
```
Sets `teams_enabled: false` and continues without teams.

### Teammate failure
- Single reviewer fails → continue with remaining reviewers, note gap in summary
- Implementer fails → lead re-assigns tasks or handles directly
- Test writer fails → non-critical, log warning and continue
- All teammates fail → treat as step failure, allow stop for user intervention

### Teammate timeout
If `team_state.started_at` exceeds `timeout_minutes`:
- Stop hook allows stop with warning
- Lead should check partial results and proceed or abort

### Scope drift detected
If analyze finds artifacts drifting from idea.md:
- Flag as error
- HALT
- User must fix or update idea.md
