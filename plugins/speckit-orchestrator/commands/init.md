---
description: "Initialize a project with the SpecKit development workflow — creates directory scaffold, constitution, reviewer skills, full-review aggregator, and CLAUDE.md integration"
argument-hint: "[--force]"
allowed-tools: ["Bash", "Read", "Write", "Edit"]
---

# SpecKit Init

## Overview

This command bootstraps a project with the full SpecKit development workflow. It can be run on a fresh project or an existing project that doesn't have the SpecKit infrastructure yet. Running it again on an already-initialized project is safe — it detects what exists and only adds what's missing.

## When to Use

```
/speckit-orchestrator:init
/speckit-orchestrator:init --force   # overwrite existing setup
```

Use this command:
- When starting a new project that will use the SpecKit pipeline
- When adding SpecKit to an existing project
- When upgrading or repairing a partial SpecKit setup

## Initialization Procedure

### Step 1 — Detect Existing Setup

Check what's already present:

```bash
[ -f ".specify/memory/constitution.md" ] && echo "constitution:yes" || echo "constitution:no"
[ -f ".claude/skills/full-review/SKILL.md" ] && echo "full-review:yes" || echo "full-review:no"
[ -f ".specify/memory/project-config.json" ] && echo "config:yes" || echo "config:no"
[ -d ".claude/skills" ] && ls .claude/skills/ || echo "no-reviewers"
```

Based on results, classify the state:

- **Fresh project** (nothing present) → proceed with full setup
- **Partial setup** (some pieces present) → display what's found, offer to add only what's missing; if `--force` was passed, overwrite all
- **Already initialized** (constitution + full-review + config all present) → display current state and ask if they want to re-initialize; if `--force` was passed, proceed without asking

For partial setup, list specifically what will be created vs skipped.

### Step 2 — Gather Project Context

Ask the user the following questions (present all at once, wait for answers):

```
To set up your SpecKit constitution, I need a few details:

1. Project name (used in the constitution header):
   > 

2. Tech stack (e.g., "Next.js 15 + TypeScript + PostgreSQL + Tailwind"):
   > 

3. Primary domain / purpose (1 sentence — what does this app do?):
   > 

4. Does this project have a UI / frontend? (yes/no):
   > 

5. Key quality concerns to emphasize (select all that apply):
   [a] Security (auth, input validation, data exposure)
   [b] Performance (query efficiency, caching, bundle size)
   [c] Data integrity (transactions, race conditions, migrations)
   [d] Reliability (infra, deployments, observability)
   [e] API design (REST conventions, validation, error shapes)
   > (e.g., "a b c" or "all")
```

Wait for the user's answers before proceeding.

### Step 3 — Create Directory Scaffold

```bash
mkdir -p .specify/memory
mkdir -p .specify/templates
mkdir -p .claude/skills
mkdir -p docs/features
mkdir -p docs/review
mkdir -p specs
```

Report each directory: "Created" or "Already exists".

### Step 4 — Generate Constitution

1. Read the constitution template from `<PLUGIN_DIR>/assets/constitution-template.md`
   (resolve `PLUGIN_DIR` as the directory containing this command file)
2. Substitute placeholders:
   - `{{PROJECT_NAME}}` → user's project name
   - `{{DATE}}` → today's date (ISO 8601)
   - `{{PRIMARY_DOMAIN}}` → user's domain description
   - `{{TECH_STACK}}` → user's tech stack
   - `{{TECH_STACK_TABLE}}` → generate a 2-column Markdown table from the tech stack. For each technology identified, add a row describing its constraint. Examples:
     - Next.js → `| UI components | Use shadcn/ui or equivalent — no raw HTML elements |`
     - Tailwind → `| Styling | Tailwind utility classes only — no inline styles, no CSS-in-JS |`
     - PostgreSQL → `| Database | Use ORM migrations — never direct schema mutations in production |`
     - TypeScript → `| Type safety | strict: true — no implicit any, no untyped catch blocks |`
3. Emphasize the quality concerns chosen by the user — if they selected security (a), add a note to Principle II about their specific tech stack's auth pattern; etc.
4. Write to `.specify/memory/constitution.md`

Report: "Constitution written → .specify/memory/constitution.md"

### Step 5 — Install Reviewer Skills

Present the reviewer selection menu:

```
Reviewer skills extend the pipeline with domain-specific code review.
The full-review command runs all installed reviewers in parallel.

CORE (always installed):
  [✓] security-auditor        — OWASP, auth bypass, input validation, XSS
  [✓] code-health-reviewer    — TypeScript strictness, test coverage, complexity
  [✓] performance-profiler    — N+1 queries, caching, bundle size, streaming

OPTIONAL (enter y/n for each):
  [ ] data-integrity-reviewer     — transactions, race conditions, atomic operations
  [ ] api-design-reviewer         — REST conventions, Zod validation, error shapes
  [ ] ui-standards-reviewer       — component library usage, no inline styles [auto-yes if UI project]
  [ ] infra-reliability-reviewer  — Docker security, CI/CD, deployment safety
  [ ] agent-ai-security-reviewer  — prompt injection, LLM output safety, tool hijacking
  [ ] architecture-reviewer       — clean architecture, dependency inversion, hexagonal
  [ ] authorization-reviewer      — RBAC, permission guards, ownership chain
```

If the user said "yes" to having a UI (Step 2, question 4), auto-select `ui-standards-reviewer`.

For each reviewer the user selects (plus the 3 mandatory ones):

1. Read `<PLUGIN_DIR>/assets/reviewer-template.md`
2. Adapt the template to the specific reviewer's domain by substituting:
   - `{{REVIEWER_NAME}}` → e.g., `security-auditor`
   - `{{REVIEWER_DISPLAY_NAME}}` → e.g., `Security Auditor`
   - `{{FOCUS_DESCRIPTION}}` → domain-specific description
   - `{{FOCUS_AREA}}` → e.g., `security vulnerabilities and authentication`
   - `{{FOCUS_AREA_KEYWORDS}}` → e.g., `auth, API routes, user input handling, data access`
   - `{{CATEGORY_1}}`, `{{CATEGORY_2}}` → domain-specific checklist categories
   - `{{DATE}}` → today's date

   Use these domain definitions per reviewer:

   | Reviewer | Focus description | Category 1 | Category 2 |
   |----------|-----------------|------------|------------|
   | security-auditor | OWASP Top 10 vulnerabilities, authentication bypass, input validation, XSS, secrets exposure | Authentication & Authorization | Input Validation & Output Encoding |
   | code-health-reviewer | TypeScript strictness, test coverage gaps, cyclomatic complexity, dead code | Type Safety | Test Coverage |
   | performance-profiler | Database N+1 queries, missing indexes, caching gaps, bundle size, LLM streaming | Database & Query Performance | Caching & Bundle Size |
   | data-integrity-reviewer | TOCTOU races, transaction isolation, atomic operations, migration safety | Transaction Safety | Race Conditions |
   | api-design-reviewer | REST conventions, Zod validation, error shapes, HTTP status codes, thin handlers | Request Validation | Response Design |
   | ui-standards-reviewer | Component library usage, no inline styles, design token compliance, accessibility | Component Library Compliance | Styling & Tokens |
   | infra-reliability-reviewer | Docker security, non-root user, secret handling, CI/CD pipelines, deployment safety | Container Security | CI/CD Safety |
   | agent-ai-security-reviewer | Prompt injection, LLM output XSS, tool call hijacking, webhook injection | Prompt Injection | LLM Output Safety |
   | architecture-reviewer | Clean architecture, domain logic in core layer, dependency inversion, thin handlers | Layer Separation | Dependency Direction |
   | authorization-reviewer | RBAC enforcement, permission guards, ownership chain (IDOR), org scoping | Permission Enforcement | Multi-Tenant Isolation |

3. Write the adapted SKILL.md to `.claude/skills/<reviewer-name>/SKILL.md`
4. Report: "[✓] <reviewer-name> → .claude/skills/<reviewer-name>/SKILL.md"

Collect the list of installed reviewers (all 3 mandatory + user-selected optional ones).

### Step 6 — Generate Full-Review Aggregator

Build `.claude/skills/full-review/SKILL.md` that launches all installed reviewers as parallel subagents.

**YAML frontmatter:**
```yaml
---
name: full-review
description: "Runs all <N> reviewer skills in parallel — <comma-separated list of reviewer names>. Results aggregated into a single severity-ranked master report. Scopes to current PR diff by default; pass --all for full codebase."
argument-hint: "[--pr | --diff | --all]"
---
```

**Body** — follow this structure exactly:

```markdown
# Full Review Orchestrator

## Overview

Launches all <N> review skills simultaneously as parallel subagents, then aggregates findings into a master severity-ranked report. Total wall-clock time equals the slowest single reviewer (~2–3 min) rather than the sum (~<N*3> min sequential).

## Scope Resolution

Before launching subagents, determine the **file scope** based on the invocation argument:

### Default — PR / Branch Diff Mode

When invoked with no arguments or `--pr` or `--diff`:

1. Detect base branch:
   ```bash
   BASE=$(git merge-base HEAD $(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo main) 2>/dev/null || git merge-base HEAD main)
   ```
2. Get changed files:
   ```bash
   CHANGED_FILES=$(git diff --name-only $BASE HEAD -- '*.ts' '*.tsx' '*.yaml' '*.yml' '*.json' '*.mjs')
   ```
3. If `CHANGED_FILES` is empty, fall back to whole-codebase mode and note this in the report header.
4. Pass `CHANGED_FILES` to each subagent — subagents must **only review the listed files**.

### Whole-Codebase Mode

When invoked with `--all`: subagents use their full default key-file lists.

## Workflow

### Step 1 — Resolve Scope

Run the scope resolution above. Capture `CHANGED_FILES` or note `--all`.

### Step 2 — Launch <N> Parallel Subagents

Send a **single message** with all <N> Agent tool calls (no dependencies — all run concurrently).

**CRITICAL**: All Agent tool calls MUST be in the same message for true parallel execution.

Task template for each subagent:
```
You are running the {skill-name} review for the project at {ROOT}.

ROOT is the git repository root — run: git rev-parse --show-toplevel

Scope: {SCOPE_DESCRIPTION}
{If diff mode}: Only review these changed files:
{CHANGED_FILES list}

Your job:
1. Read your SKILL.md at .claude/skills/{skill-name}/SKILL.md
2. Follow the workflow in your SKILL.md
3. {If diff mode}: Only include findings in the changed files listed above
4. Return your complete findings report as your final message
```

Subagents to launch (one per installed reviewer):
```
[Generate one #### section per installed reviewer here]
#### Subagent 1 — <Reviewer Display Name>
- Skill: .claude/skills/<reviewer-name>/SKILL.md
- Focus: <focus description>
```

### Step 3 — Collect and Aggregate Results

Wait for all <N> subagents to complete. Then:

1. Read each subagent's findings report
2. Combine all findings into a master table, sorted by severity (CRITICAL first)
3. Count totals per severity across all reviewers
4. Identify cross-cutting patterns (same file flagged by multiple reviewers, systemic issues)

### Step 4 — Write Master Report

Write to `docs/review/full-review-{YYYY-MM-DD}.md`:

```markdown
# Full Review — {DATE}

**Mode:** [PR diff | Whole codebase]
**Files reviewed:** N
**Reviewers:** <N> parallel subagents
**Total findings:** CRITICAL: N | HIGH: N | MEDIUM: N | LOW: N

## Remediation Priority Queue

(Ordered by severity × blast radius — fix in this order)

1. [CRITICAL] <description> — <reviewer> — <file>
2. [HIGH] <description> — <reviewer> — <file>
...

## Findings by Reviewer

### <Reviewer Name>
| ID | Category | Severity | Location | Finding | Recommendation |
...

[Repeat for each reviewer]

## Cross-Cutting Patterns

[Files or patterns flagged by multiple reviewers]

---
Reviewed by: <N> specialist subagents in parallel
```
```

### Step 5 — Display Summary

After writing the report, display:
```
══════════════════════════════════════════════════════════════
FULL REVIEW COMPLETE
══════════════════════════════════════════════════════════════
 Reviewers: <N> parallel subagents
 Files:     N changed files (diff mode) | entire codebase (--all)

 Results:
   CRITICAL: N  ← must fix before merge
   HIGH:     N  ← should fix before merge
   MEDIUM:   N  ← track as tech debt
   LOW:      N  ← improvement suggestions

 Full report → docs/review/full-review-{YYYY-MM-DD}.md
══════════════════════════════════════════════════════════════
```
```

Write this file with the actual N replaced by the count of installed reviewers, and each subagent section populated with the actual reviewer names from Step 5.

Report: "[✓] full-review aggregator → .claude/skills/full-review/SKILL.md (<N> reviewers)"

### Step 7 — Update CLAUDE.md

Check if `CLAUDE.md` exists:
```bash
[ -f "CLAUDE.md" ] && echo "exists" || echo "not-found"
```

If it exists:
- Read the file
- Check if it already contains a `## SpecKit Development Workflow` section
- If the section exists → skip (report "CLAUDE.md already has SpecKit section — skipped")
- If the section is missing → append the section below

If it does not exist:
- Create a minimal CLAUDE.md with the SpecKit section

The SpecKit section to append/create:

```markdown
## SpecKit Development Workflow

This project uses the SpecKit pipeline for feature development.

### Pipeline

```
specify → clarify → plan → [plan-review] → tasks → analyze → implement → test-and-fix → [review-loop]
```

### Starting a New Feature

```
/speckit-orchestrator:brainstorm <feature description>
```

Then follow prompts to create `idea.md` and start the pipeline with:

```
/speckit-orchestrator:execute
```

### Running Code Review

```
/full-review          # review current PR diff (default)
/full-review --all    # review entire codebase
```

### Constitution

Project governance and quality standards → `.specify/memory/constitution.md`

### Project Config

SpecKit settings (opted-in features, installed reviewers) → `.specify/memory/project-config.json`
```

Report: "[✓] CLAUDE.md updated" or "[✓] CLAUDE.md created"

### Step 8 — Opt-In Configuration

Ask the user three questions:

```
Almost done! A few opt-in features to configure:

1. Enable agentic E2E validation?
   The test-and-fix step will use Chrome DevTools MCP to run browser scenarios
   written by the test-writer agent. Requires Chrome DevTools MCP to be configured.
   (yes/no) > 

2. Enable review loop after tests pass?
   After all tests pass, the pipeline will run full-review and automatically fix
   any CRITICAL/HIGH findings — looping until the code is clean (max 3 iterations).
   (yes/no) > 

3. Enable agent teams for parallel execution?
   Plan review and implementation run with parallel specialist agents.
   Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 to be set.
   (yes/no, default: yes) > 
```

Wait for answers.

### Step 9 — Write Project Config

Write `.specify/memory/project-config.json`:

```json
{
  "project_name": "<from Step 2>",
  "tech_stack": "<from Step 2>",
  "agentic_validation_enabled": <true|false from Step 8 Q1>,
  "review_loop_enabled": <true|false from Step 8 Q2>,
  "teams_enabled": <true|false from Step 8 Q3, default true>,
  "installed_reviewers": [<list of reviewer names installed in Step 5>],
  "initialized_at": "<ISO8601 timestamp>",
  "speckit_version": "1.0.0"
}
```

Report: "[✓] Project config → .specify/memory/project-config.json"

### Step 10 — Display Completion

```
══════════════════════════════════════════════════════════════
SPECKIT INITIALIZED
══════════════════════════════════════════════════════════════
 Project: <project-name>
 Tech stack: <tech-stack>

 [✓] Directory scaffold created
 [✓] Constitution → .specify/memory/constitution.md
 [✓] Reviewer skills installed (<N> reviewers):
       <list each reviewer name>
 [✓] full-review aggregator → .claude/skills/full-review/SKILL.md
 [✓] CLAUDE.md updated
 [✓] Project config → .specify/memory/project-config.json

 Opt-in features:
   Agentic E2E validation: [YES / NO]
   Review loop:            [YES / NO]
   Agent teams:            [YES / NO]

 Next step: Start your first feature:
   /speckit-orchestrator:brainstorm <your feature description>
══════════════════════════════════════════════════════════════
```

## Error Handling

### Missing plugin directory
If `<PLUGIN_DIR>/assets/constitution-template.md` cannot be found, report:
```
Error: Cannot find SpecKit assets. Make sure the speckit-orchestrator plugin is installed.
Expected: <PLUGIN_DIR>/assets/constitution-template.md
```

### User selects no optional reviewers
That's fine — proceed with the 3 mandatory ones only.

### CLAUDE.md is very large or complex
Append the section at the end of the file. Do not attempt to restructure the file.

### Partial re-initialization (no --force)
For each component that already exists, display "[−] <component> — already present, skipped" instead of "[✓]".
