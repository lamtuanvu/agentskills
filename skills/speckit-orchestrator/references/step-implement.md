# Step: Implement

Execute the tasks to build the feature.

## Input

- `specs/<feature>/tasks.md` — ordered task list
- `specs/<feature>/plan.md` — implementation plan
- `docs/features/<feature>/idea.md` — source of truth

## Output

- Implemented feature code (files created/modified per tasks.md)
- Test files written alongside implementation
- `specs/<feature>/reports/test-report.md` — test execution report

## Instructions

1. Read `tasks.md` for the ordered task list.
2. Execute each task sequentially in dependency order:
   - Create or modify files as specified
   - Write tests alongside each implementation task
   - Verify each task's acceptance criteria before moving to the next
3. After all tasks are complete:
   - Run the full test suite (detect the project's test runner: Jest, Vitest, pytest, etc.)
   - Generate a test report at `specs/<feature>/reports/test-report.md`

## Test Report

The test report should include:

| Section | Contents |
|---------|----------|
| Summary | Total/passed/failed/skipped by category (unit, integration, e2e) |
| Coverage | Line/branch/function coverage per module (if tooling available) |
| Details | Per-file test results with durations |
| Failures | Full error messages for any failed tests |
| Gaps | Scenarios not covered and why |

If the project has no test runner configured, list what test files were created and instructions for running them manually.

## Constraints

- Follow `idea.md` strictly. Do not implement features beyond what tasks.md specifies.
- If a task fails or is blocked, stop and report the issue rather than skipping it.
- Commit logical units of work (don't batch everything into one commit).
