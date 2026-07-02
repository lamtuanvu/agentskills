export const meta = {
  name: 'plan-and-build',
  description: 'Plan then implement a feature from scratch: scan, size into milestones x testable-AC, gate the plan, then run the build-feature loop per milestone. args: {task, max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Scan' }, { title: 'Plan gate' }, { title: 'Implement' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const task = (args && args.task) || 'Provide args.task'
const MAXP = 2
const MAXI = (args && args.max_iter) || 6
// tiers — work: scan/plan | judge: plan-critic (gate)
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }
// pass any explicit model overrides down to the child build-feature workflow
const childModels = {}
if (args && args.model_fast) childModels.model_fast = args.model_fast
if (args && args.model_work) childModels.model_work = args.model_work
if (args && args.model_judge) childModels.model_judge = args.model_judge

const PLAN = { type: 'object', properties: { sizing: { enum: ['small', 'large'] }, milestones: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, acceptance_criteria: { type: 'array', items: { type: 'string' } }, deps: { type: 'array', items: { type: 'string' } } }, required: ['name', 'acceptance_criteria'] } }, affected_modules: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } } }, required: ['sizing', 'milestones'] }
const PLANCRIT = { type: 'object', properties: { pass: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } }, required: ['pass'] }

phase('Scan')
const scan = await agent(`Scan the codebase area(s) this task touches; collect affected modules, constraints, risks. Task: ${task}`, { label: 'scan', agentType: 'Explore', model: M.work })

let plan = null, round = 0, crit = null
while (round < MAXP) {
  round++
  plan = await agent(`Produce a RIGHT-SIZED plan. small -> 1 milestone, N AC; large -> M independently-shippable milestones, each N AC. Every AC measurable; deps explicit + ordered; no mega-milestone. ${crit ? `Fix these critique issues: ${JSON.stringify(crit.issues)}` : ''} Task: ${task}. Scan: ${scan}`, { schema: PLAN, label: `plan:${round}`, model: M.work })
  phase('Plan gate')
  crit = await agent(`plan-critic: every AC testable? each milestone independently verifiable w/ a clear done-condition? sizing fits (not over/under-split)? no missing AC? deps ordered? Plan: ${JSON.stringify(plan)}`, { schema: PLANCRIT, label: `plan-critic:${round}`, model: M.judge, effort: 'high' })
  if (crit && crit.pass) break
  log(`plan round ${round}: ${JSON.stringify(crit && crit.issues)}`)
}
if (!crit || !crit.pass) return { status: 'STUCK', reason: 'plan gate not passed', plan, critique: crit }

phase('Implement')
const results = []
for (const m of (plan && plan.milestones) || []) {
  const r = await workflow('build-feature', { spec: `Milestone: ${m.name}\nAcceptance criteria: ${JSON.stringify(m.acceptance_criteria)}`, max_iter: MAXI, ...childModels })
  results.push({ milestone: m.name, result: r })
  if (r && r.status === 'STUCK') return { status: 'STUCK', reason: `milestone "${m.name}" stuck`, plan, results }
}
return { status: 'DONE', plan, results }
