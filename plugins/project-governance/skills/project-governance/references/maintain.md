# Maintain governance

## Status

Read the canonical constitution, context index, applicable rule/reviewer sources,
and decision log. Report established versus proposed policy, missing or broken
references, unresolved ownership, and drift between documented conventions and
repository evidence. Report reviewer availability separately from reviewer
definition presence. Status is an inspection; it does not start a pipeline or
claim tests/reviews passed without their evidence.

## Amendments and exceptions

Read the project's amendment policy and the affected rule's provenance. Draft the
specific change with rationale, affected scopes, validation/reviewer implications,
and migration impact. Follow the existing decision authority and already granted
authorization; do not invent a new approval ceremony. If approval is required and
missing, preserve the effective rule and present the concrete proposal to its
owner. If no authority is recorded, surface that gap before claiming ratification.

Once authorized, update the canonical source, version/date, context index,
dependent reviewer checks, and instruction references as needed. Record the
decision, rationale, source of authorization, and superseded rule in the existing
decision log or `.project/decisions.md`. For a temporary exception, record its
scope, owner, reason, expiry or revisit trigger, and compensating checks.

Do not amend rules solely to silence a finding. Separate the finding's disposition
from a policy change, and re-evaluate affected work against the authorized version.
Preserve meaningful history and custom content; avoid whole-file regeneration.

## Adopting legacy SpecKit projects

An existing `.specify/memory/constitution.md` may remain canonical. Index it and
retain existing reviewer definitions and established rules. Separate reusable
governance from workflow-specific settings such as teams, pipeline phases, or
agentic validation. Those settings remain owned by the chosen workflow.

If the developer requests removal of a mandatory SpecKit pipeline, make that an
explicit policy revision using their authorization and the amendment policy.
Update the relevant instruction sections and reviewer checks. Keep rules not
affected by the workflow change. Preserve in-progress pipeline state and unrelated
SpecKit artifacts; pause a legacy pipeline through its own controls when requested.
Governance initialization itself installs no stop hooks and resumes no pipeline.

Only relocate the constitution when requested. Inventory `.specify` consumers
first, update them to the new canonical path, and use a compatibility pointer if
supported. If a consumer requires inline contents and cannot follow a pointer,
keep the existing canonical path until that consumer can be updated; do not create
two independently editable constitutions.
