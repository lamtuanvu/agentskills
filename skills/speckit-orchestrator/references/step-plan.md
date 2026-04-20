# Step: Plan

Generate an implementation plan from the specification.

## Input

- `specs/<feature>/spec.md` — the clarified specification
- `docs/features/<feature>/idea.md` — the approved feature plan (source of truth)

## Output

- `specs/<feature>/plan.md` — step-by-step implementation plan

## Instructions

1. Read both `spec.md` and `idea.md`.
2. Generate a detailed implementation plan covering:
   - Architecture decisions and component breakdown
   - File-by-file changes needed
   - Dependency ordering (what must be built first)
   - Integration points between components
   - Migration steps (if modifying existing code)

3. **The plan MUST include a detailed testing section covering:**
   - Unit tests for each module/component
   - Integration tests for API endpoints and service interactions
   - E2E tests for backend (full request lifecycles, data pipelines)
   - E2E tests for frontend (complete user journeys, critical paths)
   - The testing section should specify test frameworks, file locations, and concrete test scenarios for each category

4. Write the plan to `specs/<feature>/plan.md`.

## Constraints

- Follow `idea.md` strictly. Do not add features beyond what it specifies.
- All work must align with the approved plan.
- Keep the plan actionable — each step should be concrete enough to implement directly.
