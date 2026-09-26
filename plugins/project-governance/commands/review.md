---
description: "Review a plan, spec or code change against the project's applicable rules and reviewers"
argument-hint: '[artifact paths | diff base | PR]'
---

# Governance review

Invoke the `project-governance` skill and follow "Review the requested scope" in
its `references/review.md`. The scope is `$ARGUMENTS`; with no argument, review the
local changes (staged, unstaged and relevant untracked files) against their base.

Load only the applicable established rules and reviewer definitions from the context
index. Delegate to this plugin's specialist agents where they match a required or
useful reviewer, passing the context packet from `references/apply-context.md`.
Reviewers report; they do not modify code or amend rules.

Report scope, governance version, completed/unavailable/inapplicable checks,
findings with rule IDs, outstanding human approvals, and the verdict against the
project's actual gates (satisfied, unmet or unverified).
