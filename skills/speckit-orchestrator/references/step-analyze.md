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

2. **Idea fidelity check** (idea.md as primary reference — run this first):

   Extract from `idea.md`:
   - Every **Must Have (P0)** requirement
   - Every **user story** (`As a … I want … so that …`)
   - Every **success criterion**
   - The stated **problem statement** and **out-of-scope** items

   For each item, verify it is fully traceable through the pipeline:
   - P0 requirement → addressed in `spec.md` → covered in `plan.md` → has at least one task in `tasks.md`
   - User story → has corresponding acceptance criteria in `spec.md`
   - Success criterion → has a verifiable task or test in `tasks.md`
   - Out-of-scope item → not implemented anywhere in `plan.md` or `tasks.md`

   Any P0 requirement or user story with a broken trace is a **HIGH** finding.

3. **Cross-artifact consistency check**:
   - **Scope drift** — features in spec/plan/tasks that are NOT in idea.md (any priority)
   - **Contradictions** — conflicting statements across artifacts (e.g., plan uses a different data model than spec)
   - **Completeness** — all plan sections have corresponding tasks
   - **Testability** — testing tasks exist for all implementation tasks

4. Classify findings as HIGH (must fix before implement) or LOW (advisory).
5. If **no HIGH findings** — mark step as completed, advance to implement.
6. If **HIGH findings exist** — set status to `needs_resolve`, apply fixes to `spec.md`, `plan.md`, or `tasks.md`.

### Resolution Run (status: needs_resolve)

1. Do NOT re-analyze from scratch. Instead:
   - Read the existing findings
   - Apply concrete edits to fix HIGH issues in `plan.md`, `tasks.md`, or `spec.md`
   - Re-run the idea fidelity trace for only the affected items
2. If re-analysis finds **no HIGH findings** — mark completed, advance to implement.
3. If **still HIGH findings** — keep as `needs_resolve` and loop back.

## Constraints

- `idea.md` is the source of truth — never modify it.
- Every P0 requirement and user story in `idea.md` must be traceable to a task; missing trace is always HIGH.
- Scope drift beyond what `idea.md` describes is always HIGH.
- If unfixable contradictions exist (e.g., idea.md itself is internally inconsistent), HALT and report to the user.
