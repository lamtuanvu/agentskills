---
description: Verify dev-cycle readiness — speckit + loop-templates + git-ops + validation providers all resolvable and healthy
---

# /dev-cycle:doctor

Print a readiness checklist for this repo. Check and report each:

1. **speckit-orchestrator** present and initialized here (state dir + `partition_tasks.py`
   resolvable).
2. **loop-templates** present — the bundled workflows exist at
   `<loop-templates>/workflows/` (spot-check `speckit-implement.js`, `plan-review.js`,
   `analyze-consistency.js`).
3. **git-ops** resolves and a **dry-run reconcile** works:
   `${git-ops}/bin/git-ops doctor` (reads config, mutates nothing). Report owner/repo/project.
4. **validation provider** (if `validation.provider` set) resolves; `bring_up` + health
   pass and the sample scenario drives green. If unset → note E2E tiers will **skip**.
5. **config** — `.dev-cycle/config.json` present and valid against
   `${CLAUDE_PLUGIN_ROOT}/schemas/config.schema.json`.

Print ✅/⚠️/❌ per item and a one-line overall verdict. Do not mutate anything (use
`DEV_CYCLE_DRYRUN=1` for any tracker touch).
