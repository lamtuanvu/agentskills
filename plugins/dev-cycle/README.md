# dev-cycle (the union)

Run a feature end-to-end: **SpecKit** (spine) + **loop-templates** (adversarial
engines) + a swappable **git-ops** tracker projection + a browser-driven **E2E
validation** harness. General and distributable — it hooks a project's GitHub/branches/
stack in via provider contracts, so the union itself knows nothing project-specific.

## Install
Co-install the required plugins from this marketplace:
- `speckit-orchestrator` — pipeline spine + `partition_tasks.py`
- `loop-templates` — the Workflow engines
- `git-ops` (optional) — tracker/SCM adapter (absent → tracker runs pure)
- a validation provider (optional) — E2E backend (absent → E2E tiers skip)

## Onboard a repo
1. `/dev-cycle:init` — bootstrap speckit, propose the git-ops block, detect the stack,
   write `.dev-cycle/config.json`.
2. `/dev-cycle:init-validation` — scaffold the E2E validation provider skeleton.
3. `/dev-cycle:doctor` — verify everything resolves.
4. `/dev-cycle:run "<feature>"` — kickoff opt-in prompt → pipeline.

## What's in here
- `skills/dev-cycle/` — the orchestration skill (run flow, kickoff opt-in, implement-via-
  Workflow, reactive wiring, tracker events, E2E ladder). This is the entry point the
  `/dev-cycle:run` command invokes.
- `workflows/e2e-agentic.js` — the general browser-driven human-mimic engine (driver
  agent + ai-judge).
- `references/` — the validation contract, scenario schema, driver abstraction.
- `schemas/` — `config.schema.json` (authoritative `.dev-cycle/config.json`),
  `scenario.schema.json`, example config.
- `commands/` — `init`, `init-validation`, `run`, `status`, `doctor`.

## Quality model
Verification Workflows (plan-review, analyze-consistency, tasks completeness critic) run
**by default** — cheap, catch defects upstream. Generative Workflows (write-prd,
design-architecture, speckit-implement, review-code) are **opt-in** at kickoff (expensive).
`fix-bug` is a reactive pre-authorization. The implement step runs on
`speckit-implement.js` — parallel over file-disjoint task groups with a measurement gate.
See `skills/dev-cycle/SKILL.md`.
