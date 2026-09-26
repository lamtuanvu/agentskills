# Apply and preserve context

Start with applicable agent instructions, then the canonical constitution and
context index. Select rules by the requested scope, affected paths, and domain
risks; follow their linked sources. Read applicable nested instructions as well.
If governance is absent, report that fact and offer initialization when useful;
ordinary authorized development does not require bootstrapping this skill first.

Build a compact task context for the developer, selected workflow, or reviewer:

```text
Task and intended outcome: <current request / existing brief path>
Scope and exclusions: <affected areas; boundaries that must remain intact>
Governance: <constitution path + version/date; applicable rule IDs + source paths>
Relevant context: <architecture decisions and conventions that affect this task>
Validation and review: <applicable checks; reviewers; evidence and gate criteria>
Open decisions: <conflicts, unknowns, accepted exceptions and their authority>
Workflow and artifacts: <developer's chosen workflow and existing artifact paths>
```

Keep the packet proportional to the task. In one workspace, use precise paths
and rule IDs. For another workspace or agent without file access, include the
relevant excerpts and provenance or arrange access; a path it cannot read is not
a sufficient handoff. Do not copy the entire project knowledge base into every
prompt.

Use the developer's chosen workflow if available. Superpowers, SpecKit and manual
development are examples, not prerequisites. Do not require a particular brief
filename, invent a plan, install a workflow, initialize pipeline state, or change
the workflow's stages to apply governance. If a selected workflow is unavailable,
report that limitation and continue independent context work.

Recheck applicability when scope changes. A task that crosses a data boundary may
need another rule and reviewer; document the reason. Resolve conflicting rules
with their decision owner rather than selecting the convenient one. Explicit user
changes to project agreements should be recorded under the amendment procedure.

At handoff, use the selected workflow's existing progress artifact where possible.
Record completed work and evidence, remaining work, decisions, exceptions, and
the governance version used. Do not create a second workflow state machine.
Persist newly established project knowledge in its canonical source and update
the index. Keep provisional task assumptions in task context, not the constitution.
On resume, reload current governance and reconcile material changes since the
handoff before relying on old conclusions.
