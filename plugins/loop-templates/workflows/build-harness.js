export const meta = {
  name: 'build-harness',
  description: 'Detect a project stack and DRAFT a generic-runner harness manifest (.dev-cycle/harness.json) + a smoke scenario for the dev-cycle agentic-harness skill. Parallel detectors → synthesize stack_profile → draft manifest+smoke → adversarial critic flags missing verbs / fragile commands / destructive ops. Does NOT gate or write files (the skill does). args: { repo_path?, hint?, model_fast?, model_work?, model_judge? }',
  phases: [{ title: 'Detect' }, { title: 'Draft' }, { title: 'Critic' }],
}

if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }
const repo = (args && (args.repo_path || args.task)) || '.'
const hint = (args && args.hint) || ''
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const PROFILE = { type: 'object', properties: { services: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, up: { type: 'string' }, down: { type: 'string' }, health: { type: 'string' } }, required: ['name', 'up', 'health'] } }, frontend_url: { type: 'string' }, auth_strategy: { type: 'string' }, seed_cmd: { type: 'string' }, reset_targets: { type: 'array', items: { type: 'string' } }, tests_api: { type: 'string' }, tests_ui: { type: 'string' }, log_globs: { type: 'array', items: { type: 'string' } }, driver: { type: 'string' }, notes: { type: 'string' } }, required: ['services'] }
const MANIFEST = { type: 'object', properties: { manifest: { type: 'object' }, smoke_scenario: { type: 'object' } }, required: ['manifest', 'smoke_scenario'] }
const CRIT = { type: 'object', properties: { risks: { type: 'array', items: { type: 'string' } }, destructive_ops: { type: 'array', items: { type: 'string' } }, missing_verbs: { type: 'array', items: { type: 'string' } } }, required: ['risks', 'destructive_ops'] }

const DETECTORS = [
  { k: 'services', p: 'Detect runnable services + their start/stop/health: dev-server/compose/Procfile/Makefile targets, ports, health endpoints.' },
  { k: 'frontend', p: 'Detect the web frontend framework + dev URL/port (Vite/Next/CRA/etc.), or report none.' },
  { k: 'auth', p: 'Detect the auth mechanism a UI test must satisfy (form login / JWT / storageState / crypto handshake→custom-script).' },
  { k: 'data', p: 'Detect seed/fixture commands and the clean/reset targets (dirs, db-reset commands).' },
  { k: 'tests', p: 'Detect test runners + how to run api vs ui suites; and log/metric sources for observability.' },
]

phase('Detect')
const findings = (await parallel(DETECTORS.map(d => () =>
  agent(`Explore the repo at ${repo} and ${d.p} ${hint ? `Hint: ${hint}` : ''} Report concrete commands/paths only — no guesses; say "unknown" if not found.`, { label: `detect:${d.k}`, phase: 'Detect', model: M.work })
))).filter(Boolean)

const profile = await agent(`Synthesize a single stack_profile from these detector reports. Prefer concrete commands; pick ONE canonical start/health per service. Reports:\n${JSON.stringify(findings)}`, { schema: PROFILE, label: 'synthesize', phase: 'Detect', model: M.work, effort: 'high' })

phase('Draft')
const draft = await agent(`Draft a .dev-cycle/harness.json manifest AND a minimal smoke scenario from this stack_profile, matching the dev-cycle harness schema (services[{name,up,down,health}], frontend_url, auth{strategy}, seed, reset{targets,destructive:true}, observe{logs,console,network,metrics}, faults[], scenarios_dir, driver, tests{api,ui}). The smoke scenario: navigate "/", wait networkidle, one expect + one ai_judge "renders real content, no error/blank/spinner". Stack profile:\n${JSON.stringify(profile)}`, { schema: MANIFEST, label: 'draft', phase: 'Draft', model: M.judge, effort: 'high' })

phase('Critic')
const crit = await agent(`Adversarially critique this draft manifest for a project you will auto-verify. List: risks (fragile/ambiguous commands, missing health, wrong port), destructive_ops (any verb that wipes data or is outbound — reset targets, faults), and missing_verbs (contract verbs with no manifest backing). Manifest:\n${JSON.stringify(draft.manifest)}`, { schema: CRIT, label: 'critic', phase: 'Critic', model: M.judge, effort: 'high' })

return { status: (profile && profile.services && profile.services.length) ? 'DONE' : 'STUCK', stack_profile: profile, manifest: draft.manifest, smoke_scenario: draft.smoke_scenario, risks: crit.risks, destructive_ops: crit.destructive_ops, missing_verbs: crit.missing_verbs }
