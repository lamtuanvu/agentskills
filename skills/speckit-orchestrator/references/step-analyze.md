# Step: Analyze

Check consistency across all pipeline artifacts.

## Input

- `docs/features/<feature>/idea.md` — source of truth
- `specs/<feature>/spec.md` — specification
- `specs/<feature>/plan.md` — implementation plan
- `specs/<feature>/tasks.md` — task breakdown

## Output

- Analysis findings (inline) with fixes applied if needed

## Instructions

### First Run (status: pending or in_progress)

1. Read all artifacts: `idea.md`, `spec.md`, `plan.md`, `tasks.md`.
2. Check for:
   - **Scope drift** — features in spec/plan/tasks not in idea.md
   - **Missing coverage** — requirements in idea.md not addressed in tasks
   - **Contradictions** — conflicting statements across artifacts
   - **Completeness** — all plan steps have corresponding tasks
   - **Testability** — testing tasks exist for all implementation tasks
3. Classify findings as HIGH (must fix) or LOW (advisory).
4. If **no HIGH findings** — mark step as completed, advance to implement.
5. If **HIGH findings exist** — set status to `needs_resolve`, apply fixes.

### Resolution Run (status: needs_resolve)

1. Do NOT re-analyze from scratch. Instead:
   - Read the existing findings
   - Apply concrete edits to fix HIGH issues in `plan.md`, `tasks.md`, or `spec.md`
   - Re-analyze to verify fixes
2. If re-analysis finds **no HIGH findings** — mark completed, advance to implement.
3. If **still HIGH findings** — keep as `needs_resolve` and loop back.

## Constraints

- Scope drift from idea.md is always a HIGH finding.
- Do not modify idea.md — it is the source of truth.
- If unfixable contradictions exist, HALT and report to the user.
