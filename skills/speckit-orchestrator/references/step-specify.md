# Step: Specify

Generate `spec.md` from `idea.md`.

## Input

- `docs/features/<feature>/idea.md` — the approved feature plan (source of truth)

## Output

- `specs/<feature>/spec.md` — detailed technical specification

## Instructions

1. Read `docs/features/<feature>/idea.md` in full.
2. Generate a comprehensive specification that covers:
   - Functional requirements
   - Non-functional requirements (performance, security, accessibility)
   - API contracts / data models
   - Edge cases and error handling
   - Dependencies and constraints
3. Write the specification to `specs/<feature>/spec.md`.

## Constraints

- Follow `idea.md` strictly. Do not add features beyond what it specifies.
- All work must align with the approved plan.
- Flag any ambiguities for the clarify step rather than making assumptions.

## Post-Step Verification

After writing `spec.md`, run:

```bash
python scripts/verify_state.py --fix
```

This verifies that `spec_dir` in orchestrator state matches the actual directory created. If there's a mismatch (e.g., the spec was written to `specs/042-dark-mode-toggle/` but state says `specs/dark-mode-toggle/`), `--fix` auto-corrects the state file.
