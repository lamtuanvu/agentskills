# Step: Tasks

Generate a task breakdown from the implementation plan.

## Input

- `specs/<feature>/plan.md` — the implementation plan
- `docs/features/<feature>/idea.md` — the approved feature plan (source of truth)

## Output

- `specs/<feature>/tasks.md` — ordered list of implementation tasks

## Instructions

1. Read `plan.md` and `idea.md`.
2. Break the plan down into discrete, ordered implementation tasks.
3. Each task should include:
   - Clear title and description
   - Files to create or modify
   - Dependencies on other tasks
   - Acceptance criteria
   - Estimated complexity (small/medium/large)
4. Order tasks by dependency — tasks with no dependencies first.
5. Write to `specs/<feature>/tasks.md`.

## Constraints

- Follow `idea.md` strictly. Do not add tasks beyond what the plan specifies.
- Each task should be independently completable and testable.
- Include testing tasks alongside implementation tasks (not as a separate phase).
