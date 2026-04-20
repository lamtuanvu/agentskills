---
name: speckit-brainstorm
description: "Brainstorm and plan a new feature before SpecKit pipeline execution. Explores ideas, defines requirements, and produces an approved idea.md file. Use this before speckit-orchestrator."
argument-hint: "<feature-description>"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
metadata:
  author: lamtuanvu
  version: "1.0.0"
---

# SpecKit Brainstorm

Facilitates feature brainstorming and planning. Guides the user through exploring a feature idea, defining requirements, and producing an approved `idea.md` file.

**Output**: `docs/features/<feature>/idea.md` + `orchestrator-state.json` + git branch

**Next Step**: After this skill completes, invoke the `speckit-orchestrator` skill to run the pipeline.

## When to Use

- Starting a new feature from scratch
- User has a vague idea that needs refinement
- Preparing for SpecKit pipeline execution

## Workflow

### Step 1: Explore and Brainstorm

When invoked:

1. **Understand the Feature**
   - Ask clarifying questions about the user's intent
   - Explore existing codebase patterns and architecture
   - Identify affected components

2. **Define Requirements**
   - Core functionality (must-have)
   - Nice-to-have features (if time permits)
   - Out of scope (explicitly excluded)

3. **Technical Considerations**
   - Architecture impact
   - Database/API/UI changes
   - Integration points

4. **Draft the Plan**
   - Structure using the idea.md template (see `references/idea-template.md`)
   - Include all decisions made during brainstorming

### Step 2: Get User Approval

Present the complete plan to the user and **WAIT for their approval**.

- If the user provides feedback, iterate on the plan until approved.
- **Never write idea.md without explicit user approval.**

### Step 3: Create Feature Artifacts

After the user approves:

1. **Determine the feature name** (kebab-case, e.g., `dark-mode-toggle`)

2. **Determine sequence number and create branch:**
   ```bash
   git branch -a | grep -oE '[0-9]{3}-' | sort -rn | head -1
   ```
   Increment the highest `NNN` prefix by 1 (start at `001` if none exist). Create branch:
   ```bash
   git checkout -b <NNN>-<feature-name>
   ```

3. **Create feature directory:**
   ```bash
   mkdir -p docs/features/<feature-name>
   ```

4. **Write idea.md** to `docs/features/<feature-name>/idea.md` using the approved plan content.

5. **Create orchestrator-state.json:**
   ```bash
   python scripts/init_feature.py <feature-name> <NNN>-<feature-name>
   ```

### Step 4: STOP

Display completion and **STOP**. Do NOT automatically start the pipeline.

```
Brainstorming complete.

  Feature: <feature-name>
  Branch:  <NNN>-<feature-name>
  Idea:    docs/features/<feature-name>/idea.md

To start the SpecKit pipeline, invoke speckit-orchestrator.
```

## Critical Rules

1. **STOP after creating artifacts** — do not start the pipeline automatically.
2. **Plan must be approved** — never write idea.md without user confirmation.
3. **idea.md is the source of truth** — the pipeline enforces it strictly.

## idea.md Structure

```markdown
# Feature: <Feature Name>

## Summary
<1-2 sentence description>

## Problem Statement
<What problem does this solve?>

## Requirements

### Must Have
- <core requirement 1>

### Nice to Have
- <optional feature 1>

### Out of Scope
- <explicitly excluded item>

## Technical Approach
<High-level technical decisions>

## Affected Components
- <component 1>

## Open Questions
<Unresolved questions for the clarify phase>
```

## Scripts

- `scripts/init_feature.py` — Initialize `orchestrator-state.json` for a new feature

## References

- `references/idea-template.md` — Full template for idea.md files
