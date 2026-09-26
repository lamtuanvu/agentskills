---
description: "Initialize project governance — constitution, context index, scoped rules and reviewer responsibilities — for any development workflow"
argument-hint: '[notes about existing docs or workflow to preserve]'
---

# Initialize project governance

Invoke the `project-governance` skill (bundled with this plugin) and follow its
`references/initialize.md` for the current project. Treat `$ARGUMENTS` as extra
context, such as existing documents or the development workflow in use.

Preserve existing canonical documents and agent instructions. The result is a
constitution, a context index, applicable aspect rules, reviewer responsibilities,
and a short context-loading section in the agent instructions. Report established
policy separately from draft proposals and unresolved decisions. Re-running fills
gaps without replacing existing agreements; a `--force` argument does not erase them.

Initialization does not select or start a development workflow. The developer
continues with Superpowers, `/dev-cycle:run`, a custom workflow, or direct work.
