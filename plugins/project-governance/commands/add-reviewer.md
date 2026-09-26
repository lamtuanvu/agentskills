---
description: "Add a project-specific reviewer with scoped rules, evidence requirements and responsibilities, independent of workflow"
argument-hint: '<name> [focus description]'
---

# Add a project reviewer

Invoke the `project-governance` skill and follow the reviewer creation procedure
in its `references/review.md` for `$ARGUMENTS`.

Inspect the project's constitution, context index, existing reviewers and ownership.
Create or update a portable reviewer definition for the requested focus, with
concrete project-specific checks, rule sources, triggers, exclusions, evidence
requirements and advisory/required status. Ask only for material missing choices.
Update the canonical context index without duplicating existing entries. Never
invent approved gate policy or treat an AI reviewer as a human approver.

This plugin ships generic specialist agents (`project-governance:security-reviewer`,
`performance-reviewer`, `conventions-reviewer`, `ui-reviewer`, `qa-reviewer`,
`test-writer`). When one matches the focus, the reviewer definition may name it as
the executing agent; the definition stays the source of project-specific checks.
When the project already uses native reviewer skills or a review aggregator,
preserve those interfaces and point them at the canonical definition.

Report the definition path, applicable scope, policy status, and any wrapper or
aggregator changes. Do not launch a workflow or install mandatory reviewers.
