---
description: Verify dev-cycle readiness — governance + loop-templates + git-ops + validation providers all resolvable and healthy
---

# /dev-cycle:doctor

Print a readiness checklist for this repo. Check and report each:

1. **project-governance** plugin present (reviewer agentTypes resolvable) and governance
   initialized here — constitution + context index exist at the configured/discovered
   paths and their links resolve. `${CLAUDE_PLUGIN_ROOT}/scripts/partition_tasks.py` runs.
2. **loop-templates** present — the bundled workflows exist at
   `<loop-templates>/workflows/` (spot-check `implement-tasks.js`, `plan-review.js`,
   `analyze-consistency.js`).
3. **git-ops** resolves and a **dry-run reconcile** works:
   `${git-ops}/bin/git-ops doctor` (reads config, mutates nothing). Report owner/repo/project.
4. **validation provider** (if `validation.provider` set) resolves; `bring_up` + health
   pass and the sample scenario drives green. If unset → note E2E tiers will **skip**.
5. **config** — `.dev-cycle/config.json` present and valid against
   `${CLAUDE_PLUGIN_ROOT}/schemas/config.schema.json`.

Print ✅/⚠️/❌ per item and a one-line overall verdict. Do not mutate anything (use
`DEV_CYCLE_DRYRUN=1` for any tracker touch).
