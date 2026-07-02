export const meta = {
  name: 'learn-to-use',
  description: 'Produce a runnable how-to for an SDK/product/repo: read primary sources, EXECUTE each step in a sandbox (executed=verified), audit for staleness, loop on failing steps. args: {target|task, goal?, max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Draft' }, { title: 'Execute' }, { title: 'Audit' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const target = (args && (args.target || args.task)) || 'Provide args.target'
const goal = (args && args.goal) || 'get a minimal working example'
const MAX = (args && args.max_iter) || 3
// tiers — work: draft/execute (execution IS the verifier) | judge: staleness fix reasoning
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const STEPS = { type: 'object', properties: { prereqs: { type: 'array', items: { type: 'string' } }, install: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } }, example_code: { type: 'string' }, version_pins: { type: 'string' } }, required: ['steps'] }
const EXEC = { type: 'object', properties: { all_pass: { type: 'boolean' }, failing_step: { type: 'string' }, error: { type: 'string' }, gotchas: { type: 'array', items: { type: 'string' } } }, required: ['all_pass'] }

phase('Draft')
let draft = await agent(`Identify the MINIMAL capability path (not the full docs) to achieve "${goal}" with ${target}. Read PRIMARY sources (official docs + the repo's actual code/tests/examples; treat blog tutorials as echo and distrust). Draft prereqs, pinned install, minimal ORIGINAL example, and steps with version pins.`, { schema: STEPS, label: 'draft', model: M.work })

let round = 0, execRes = null
while (round < MAX) {
  round++
  phase('Execute')
  execRes = await agent(`EXECUTE every step in a CLEAN sandbox (use Bash). written != verified, executed = verified. Any erroring step is a finding. Report the first failing step + error + gotchas. Steps: ${JSON.stringify(draft)}`, { schema: EXEC, label: `execute:${round}`, model: M.work })
  if (execRes && execRes.all_pass) break
  phase('Audit')
  draft = await agent(`The step "${execRes && execRes.failing_step}" failed with: ${execRes && execRes.error}. Fix ONLY that step (versions pinned? prereqs complete? deprecated API? hidden local state?) and return the corrected full recipe. Current recipe: ${JSON.stringify(draft)}`, { schema: STEPS, label: `fix:${round}`, model: M.judge, effort: 'high' })
  log(`round ${round}: failing step ${execRes && execRes.failing_step}`)
}

return { status: (execRes && execRes.all_pass) ? 'DONE' : 'STUCK', recipe: draft, exec: execRes, rounds: round }
