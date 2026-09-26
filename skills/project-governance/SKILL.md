---
name: project-governance
description: "Use when establishing or maintaining a project's constitution, persistent context, scoped rules, conventions, boundaries, or reviewer responsibilities across development workflows. Applies to governance initialization, context handoffs, and compliance reviews; does not select or run a development pipeline."
metadata:
  author: lamtuanvu
  version: "1.0.0"
---

# Project Governance

Keep project knowledge and engineering agreements usable across sessions, agents,
and workflows. Developers may use Superpowers, SpecKit, a custom workflow, or work
directly. Governance defines the project's constraints; the chosen workflow owns
its steps, artifacts, and execution state.

## Choose the requested operation

| Request | Guidance |
|---------|----------|
| Initialize, adopt existing rules, migrate governance | [Initialize](references/initialize.md) |
| Load context, start work, resume or hand off | [Apply context](references/apply-context.md) |
| Add a reviewer, review a plan or change | [Review](references/review.md) |
| Amend a rule, check governance status | [Maintain](references/maintain.md) |

Initialization establishes a constitution, the context needed to interpret it,
scoped conventions, and reviewer responsibilities. It does not start development.
No feature branch, `idea.md`, `spec.md`, state machine, CLI, or external skill is
required. Read only the operation's reference and the project documents it needs.

## Persistent project contract

Use existing canonical documents where available. For a new project, default to:

```text
.project/
  constitution.md      # Principles, boundaries, authority, amendment policy
  context.md           # Purpose, architecture and source/rule/reviewer index
  rules/<aspect>.md    # Scoped conventions, checks, applicability and provenance
  reviewers/<name>.md  # Responsibilities, triggers, evidence and review contract
  decisions.md         # Dated decisions, exceptions and superseded rules
```

Only create aspect and reviewer files justified by the project. Existing ADRs,
architecture docs, CODEOWNERS and policies remain sources of truth; link to them.
Record actual paths in the context index, including constitutions outside
`.project/`. Never maintain two competing constitutions.

Add a short context-loading section to the project's agent instructions so future
sessions read the constitution, context index, and applicable scoped rules. Keep
the substantive rules in their canonical files.

## Working agreements

- Separate **established**, **proposed**, and **unknown** requirements. Record
  sources; a framework choice does not establish a styling or architecture rule.
- Follow applicable instruction precedence. A constitution cannot override host
  instructions or the user's authorized scope. Surface conflicts; do not silently
  waive an established project rule or change it to make a review pass.
- Apply rules and reviewers by affected paths, domains, and risk. A CLI does not
  acquire frontend tests; a docs edit does not acquire every specialist reviewer.
- Keep reviewer findings distinct from human approval. Missing required review
  evidence is an unmet check, never a pass.
- Keep workflow artifacts where their workflow expects them. Pass governance
  context into that workflow without adding stages or stop hooks.

Example: initialize governance for a Python CLI from `AGENTS.md`, `pyproject.toml`,
and existing architecture docs. Capture module boundaries and CLI compatibility
rules, then pass those paths and relevant reviewer criteria into a Superpowers
task. Its plan and task files stay in their original locations.
