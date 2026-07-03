export const meta = {
  name: 'benchmark-select',
  description: 'Rank implementation/config variants on a metric, then adversarially audit the benchmark HARNESS (not the result) for fairness/noise/overfit/reproducibility. args: {goal|task, variants[], max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Define' }, { title: 'Measure' }, { title: 'Audit' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const goal = (args && (args.goal || args.task)) || 'Provide args.goal'
const variants = (args && args.variants) || []
if (!variants.length) return { status: 'STUCK', reason: 'no variants provided in args.variants' }
// tiers — fast: mechanical | work: define/measure/rank | judge: harness audit
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const METRIC = { type: 'object', properties: { metrics: { type: 'array', items: { type: 'string' } }, scenarios: { type: 'array', items: { type: 'string' } } }, required: ['metrics'] }
const RES = { type: 'object', properties: { variant: { type: 'string' }, measurements: { type: 'string' }, notes: { type: 'string' } }, required: ['variant', 'measurements'] }
const AUDIT = { type: 'object', properties: { harness_valid: { type: 'boolean' }, threats: { type: 'array', items: { type: 'string' } }, reproducible: { type: 'boolean' } }, required: ['harness_valid', 'reproducible'] }

phase('Define')
const m = await agent(`Define the metric(s) and benchmark scenarios from this goal. Goal: ${goal}`, { schema: METRIC, label: 'define', model: M.work })

phase('Measure')
const results = (await parallel(variants.map((v, i) => () =>
  agent(`Run/measure variant "${v}" on metrics ${JSON.stringify(m.metrics)} and scenarios ${JSON.stringify(m.scenarios || [])}. Collect measurements. Goal: ${goal}`, { schema: RES, label: `measure:${i}`, model: M.work })
))).filter(Boolean)

phase('Audit')
const audit = await agent(`Attack the benchmark HARNESS, NOT the result: fair setup? measurement noise? overfit-to-bench? confound? reproducible? Metrics: ${JSON.stringify(m.metrics)}. Results: ${JSON.stringify(results)}`, { schema: AUDIT, label: 'harness-audit', model: M.judge, effort: 'high' })
const ranking = await agent(`Rank the variants by the metric and name the winner with justification vs a baseline. Metrics: ${JSON.stringify(m.metrics)}. Results: ${JSON.stringify(results)}`, { label: 'rank', model: M.work })

return { status: (audit && audit.harness_valid && audit.reproducible) ? 'DONE' : 'STUCK', metrics: m, results, ranking, harness_audit: audit }
