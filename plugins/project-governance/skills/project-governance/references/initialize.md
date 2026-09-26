# Initialize project governance

## Discover before drafting

Read applicable agent instructions and inspect the repository for existing
constitutions, contribution guides, architecture docs/ADRs, CODEOWNERS, build and
test configuration, and domain-specific conventions. Inspect representative code
only as needed to establish current practice. Read legacy
`.specify/memory/constitution.md` and project config if present; their existence
does not select SpecKit as the workflow.

Summarize what is established, what is merely observed, and what is missing.
Infer project name, purpose, stack, and commands from evidence. Ask only about
material unknowns, such as intended boundaries, ownership, or approval authority.
Continue documenting known facts while answers are pending. Never invent named
owners, approved policies, or successful checks.

If governance already exists, preserve its canonical location and content.
Create an index around it and fill missing pieces. If multiple sources conflict,
identify the specific conflict and seek a decision for that portion; continue
independent work. Moving a constitution is a separate requested migration: update
all known consumers and leave a pointer at the old path instead of a second copy.

## Establish the project contract

Use [the constitution template](../assets/constitution-template.md) as a starting
structure. Adapt it to the project rather than filling every possible category.
Record:

- Purpose, in-scope capabilities, explicit exclusions, and external constraints.
- Principles and module/service/data boundaries, with stable IDs for citations.
- Which domain rules apply, what evidence validates them, and which reviews block
  completion or release according to existing agreements.
- Who owns decisions and amendments; distinguish human approvers from AI reviewers.
- Document status, source evidence, unresolved decisions, version, and date.

Imported agreements remain established. New normative choices are proposals until
accepted by their decision owner (or already authorized by the current request).
Draft usable files now; request review of the concrete unresolved choices at the
end. Never label an unapproved draft ratified or let it silently replace existing
policy. If a document mixes established rules and proposals, label individual
rules and keep established rules effective while proposals await a decision.

Write `context.md` as the small entrypoint: purpose, architecture map, exact paths
to the constitution and related sources, actual development/check commands with
their evidence, and the indexes below. Distinguish inspected configuration from
commands actually run. Do not copy secrets or environment-specific credentials.

| Aspect | Applies to | Canonical rules/source | Status |
|--------|------------|------------------------|--------|
| Project-specific aspect | Paths, domain or change trigger | Exact path | Established / proposed / unknown |

| Reviewer | Triggers | Definition | Role and gate |
|----------|----------|------------|---------------|
| Project-specific reviewer | Paths, domain or risk | Exact path | Advisory / required; human approver if known |

Use [the rule template](../assets/rule-template.md) for rules without an existing
canonical home. Common aspects include architecture, language conventions, data,
security, API compatibility, UI/accessibility, testing, operations, and docs.
These are discovery prompts, not mandatory policies or files. Specify when each
rule applies and what is out of scope. Include source paths or decision references.

Select reviewers using [the review guidance](review.md). Reuse existing definitions
and ownership first. No reviewer set, language, test tier, severity gate, architecture,
or UI library is imposed by this skill. For unresolved reviewer choices, record
the proposal; do not install or report them as established gates.

## Make context discoverable

Preserve unrelated content in agent instructions. For a portable project, add a
small section to `AGENTS.md`; if another entrypoint is already used, integrate
there, and create a portable pointer only if useful. Substitute the actual paths:

```markdown
## Project context

Before working, read `.project/constitution.md` and `.project/context.md`.
Load the scoped rules and reviewer definitions relevant to the task's affected
areas from the context index. Pass these references and applicable rule IDs to
any selected workflow or delegated reviewer. Keep the project's established
constraints in effect across plans, implementation, and review. Surface conflicts
and unresolved decisions; use the documented amendment process for rule changes.
```

Do not add a mandatory development pipeline or overwrite existing workflow
guidance. If existing instructions mandate a workflow and the user requests a
change, update that specific agreement explicitly and record the decision.

## Verify and finish

Check all generated links, source references, rule applicability, reviewer
definitions, and instruction entrypoints. Ensure templates have no unfilled
placeholders; genuine unknowns must be explicit open decisions with their impact.
Summarize created, updated, and reused files, plus any decisions awaiting review.
Initialization does not certify project compliance or execute a feature.

Re-running initialization is additive: inspect and preserve previous edits,
avoid duplicate instruction sections, and report any proposed revisions. Do not
interpret repair or `--force` as permission to erase project agreements.
