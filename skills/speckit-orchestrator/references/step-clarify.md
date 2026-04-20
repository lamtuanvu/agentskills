# Step: Clarify (Human-in-the-Loop)

Resolve ambiguities in the specification. This is a **mandatory human checkpoint**.

## Input

- `specs/<feature>/spec.md` — the specification to review for ambiguities

## Output

- Updated `spec.md` with clarifications applied (after user responds)

## Instructions

1. Read `specs/<feature>/spec.md`.
2. Identify ambiguities, underspecified areas, or contradictions.
3. Present findings to the user:
   - **Questions found** — display all questions, then **STOP**. Do NOT answer them yourself. Wait for the user to provide answers.
   - **No questions found** — display: "No ambiguities found in the spec. Ready to proceed to the plan step?" then **STOP**. Wait for user confirmation.
4. After the user responds, incorporate their answers into `spec.md`.

## Critical Rules

1. **NEVER auto-answer clarification questions** — present them to the user and STOP.
2. **NEVER skip this step or select a default** — even if zero ambiguities are found, you must present that finding and wait for explicit user confirmation.
3. **NEVER mark this step as complete without user interaction** — the user must explicitly review and respond before proceeding.
4. Only mark `clarify` as `"completed"` **after** the user has reviewed and responded.
