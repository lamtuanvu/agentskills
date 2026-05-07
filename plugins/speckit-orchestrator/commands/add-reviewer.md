---
description: "Scaffold a new specialist reviewer skill and automatically add it to the full-review aggregator"
argument-hint: "<reviewer-name> [<focus-description>]"
allowed-tools: ["Bash", "Read", "Write", "Edit"]
---

# SpecKit — Add Reviewer

## Overview

This command creates a new specialist reviewer skill for the project and wires it into the `/full-review` aggregator so it runs automatically in every full review.

## When to Use

```
/speckit-orchestrator:add-reviewer <reviewer-name>
/speckit-orchestrator:add-reviewer <reviewer-name> "<focus description>"
```

Examples:
```
/speckit-orchestrator:add-reviewer accessibility-reviewer "WCAG 2.1 AA compliance, ARIA roles, keyboard navigation, color contrast"
/speckit-orchestrator:add-reviewer ml-model-reviewer "model versioning, feature drift, inference latency, training data leakage"
/speckit-orchestrator:add-reviewer payments-reviewer "PCI DSS compliance, card data handling, refund flows, idempotency"
```

## Procedure

### Step 1 — Parse Arguments

Extract from the command arguments:
- `reviewer-name` — the first argument (must be kebab-case, e.g., `accessibility-reviewer`)
- `focus-description` — all remaining arguments as a single string

If `reviewer-name` is missing → ask: "What should the reviewer be named? (use kebab-case, e.g., `payments-reviewer`)"

If `focus-description` is missing → ask: "What aspect of the codebase should this reviewer focus on? (1–2 sentences)"

Normalize reviewer-name: replace spaces with hyphens, lowercase everything.

### Step 2 — Check Prerequisites

```bash
[ -d ".claude/skills" ] && echo "skills-dir:yes" || echo "skills-dir:no"
[ -f ".claude/skills/full-review/SKILL.md" ] && echo "full-review:yes" || echo "full-review:no"
[ -d ".claude/skills/<reviewer-name>" ] && echo "reviewer:exists" || echo "reviewer:new"
```

- If `.claude/skills/` does not exist → stop and display:
  ```
  Error: .claude/skills/ not found. Run /speckit-orchestrator:init first to set up the SpecKit infrastructure.
  ```
- If `.claude/skills/<reviewer-name>/` already exists → warn: "Reviewer '<reviewer-name>' already exists. Overwrite? (yes/no)" — if no, stop.

### Step 3 — Scaffold Reviewer SKILL.md

1. Read the reviewer template from `<PLUGIN_DIR>/assets/reviewer-template.md`
   (resolve PLUGIN_DIR as the directory containing this command file)

2. Create a display name from the reviewer name: `accessibility-reviewer` → `Accessibility Reviewer`

3. Substitute all placeholders:
   - `{{REVIEWER_NAME}}` → the kebab-case reviewer name
   - `{{REVIEWER_DISPLAY_NAME}}` → the display name
   - `{{FOCUS_DESCRIPTION}}` → the user's focus description
   - `{{FOCUS_AREA}}` → extract the core focus from the description (e.g., "accessibility compliance and WCAG standards")
   - `{{FOCUS_AREA_KEYWORDS}}` → extract key terms for when to apply this reviewer (e.g., "UI components, forms, interactive elements, color usage")
   - `{{CATEGORY_1}}` → infer first checklist category from focus (e.g., "WCAG 2.1 Compliance")
   - `{{CATEGORY_2}}` → infer second checklist category from focus (e.g., "Keyboard & Screen Reader Support")
   - `{{DATE}}` → today's date (ISO 8601)

4. Write to `.claude/skills/<reviewer-name>/SKILL.md`

Report: "[✓] Reviewer created → .claude/skills/<reviewer-name>/SKILL.md"

### Step 4 — Update Full-Review Aggregator

Read `.claude/skills/full-review/SKILL.md`.

If the file does not exist → create a minimal full-review SKILL.md with just this single reviewer (use the same structure as described in `/speckit-orchestrator:init` Step 6, but with N=1).

If the file exists, make the following surgical edits:

**Edit 1 — Update YAML frontmatter description**

Find the `description:` line in the YAML frontmatter. It lists all reviewer names. Append `<reviewer-name>` to the list.

Example before: `description: "Runs all 3 reviewer skills in parallel — security-auditor, code-health-reviewer, performance-profiler.`
Example after:  `description: "Runs all 4 reviewer skills in parallel — security-auditor, code-health-reviewer, performance-profiler, <reviewer-name>.`

**Edit 2 — Update the subagent count in Step 2 heading**

Find: `### Step 2 — Launch N Parallel Subagents` (where N is the current count).
Replace N with N+1.

Also find the sentence: `Send a **single message** with all N Agent tool calls`
Replace N with N+1.

**Edit 3 — Append new subagent section**

At the end of the existing subagent list (look for the last `#### Subagent N —` section), add a new section:

```markdown
#### Subagent <N+1> — <Reviewer Display Name>
- Skill: .claude/skills/<reviewer-name>/SKILL.md
- Focus: <focus-description>
```

**Edit 4 — Update Step 3 collector count**

Find: `Wait for all N subagents to complete`
Replace N with N+1.

**Edit 5 — Update reviewer count in footer**

Find: `Reviewed by: N specialist subagents in parallel`
Replace N with N+1.

Report: "[✓] full-review updated → now runs <N+1> reviewers in parallel"

### Step 5 — Update Project Config

Check if `.specify/memory/project-config.json` exists:
```bash
[ -f ".specify/memory/project-config.json" ] && echo "exists" || echo "not-found"
```

If it exists:
- Read the file
- Add `<reviewer-name>` to the `installed_reviewers` array
- Write it back

If it does not exist → skip (report "[−] project-config.json not found — skipped")

### Step 6 — Display Confirmation

```
══════════════════════════════════════════════════════════════
REVIEWER ADDED
══════════════════════════════════════════════════════════════
 Reviewer:  <reviewer-name>
 Focus:     <focus-description>

 [✓] Skill created   → .claude/skills/<reviewer-name>/SKILL.md
 [✓] full-review updated → now runs <N+1> reviewers in parallel
 [✓] project-config.json updated

 Customize the reviewer checklist at:
   .claude/skills/<reviewer-name>/SKILL.md
   (Look for the # TODO sections in the Analysis Checklist)

 Run it standalone:
   /<reviewer-name>
   /<reviewer-name> --all

 Runs automatically with:
   /full-review
══════════════════════════════════════════════════════════════
```

## Error Handling

### Invalid reviewer name
If the name contains characters other than lowercase letters, numbers, and hyphens → normalize it automatically and confirm with the user.

### full-review has unexpected structure
If the full-review SKILL.md does not match the expected structure (missing Step 2 heading or subagent sections) → warn the user and provide manual instructions:
```
Warning: Could not automatically update full-review (unexpected structure).
Manual step: Add the following to .claude/skills/full-review/SKILL.md in the subagents section:

#### Subagent N — <Reviewer Display Name>
- Skill: .claude/skills/<reviewer-name>/SKILL.md
- Focus: <focus-description>
```
