export const meta = {
  name: 'analyze-consistency',
  description: 'Default-on cross-artifact consistency check: run pairwise consistency passes (spec↔plan, plan↔tasks, tasks↔spec) in parallel, then reconcile contradictions/gaps into a single verdict. Replaces speckit\'s single-threaded analyze. args: { feature, spec_path?, plan_path?, tasks_path?, reviews_dir?, model_fast?, model_work?, model_judge? }',
  phases: [{ title: 'Pairwise' }, { title: 'Reconcile' }, { title: 'Persist' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const feature = (args && (args.feature || args.task)) || 'the feature'
const specPath = (args && args.spec_path) || `specs/${feature}/spec.md`
const planPath = (args && args.plan_path) || `specs/${feature}/plan.md`
const tasksPath = (args && args.tasks_path) || `specs/${feature}/tasks.md`
const reviewsDir = (args && args.reviews_dir) || `specs/${feature}/reviews`
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const CONTRA = { type: 'object', properties: { contradictions: { type: 'array', items: { type: 'object', properties: {
  kind: { enum: ['contradiction', 'gap', 'ambiguity', 'drift'] }, severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }, a_ref: { type: 'string' }, b_ref: { type: 'string' }, detail: { type: 'string' },
}, required: ['kind', 'severity', 'detail'] } } }, required: ['contradictions'] }

const PAIRS = [
  { key: 'spec↔plan', a: specPath, b: planPath, hint: 'Does the plan cover every spec requirement, and introduce nothing the spec did not ask for?' },
  { key: 'plan↔tasks', a: planPath, b: tasksPath, hint: 'Does every plan component map to a task, and does every task trace to a plan component?' },
  { key: 'tasks↔spec', a: tasksPath, b: specPath, hint: 'Do the tasks, when done, satisfy every acceptance criterion in the spec — no AC uncovered, no task orphaned?' },
]

phase('Pairwise')
const pairResults = (await parallel(PAIRS.map(p => () =>
  agent(`Cross-check two artifacts for consistency. Read BOTH from disk. Report contradictions, gaps (something in A missing from B), ambiguities, and drift. ${p.hint}\nA (${p.key.split('↔')[0]}): ${p.a}\nB (${p.key.split('↔')[1]}): ${p.b}`,
    { schema: CONTRA, label: `pair:${p.key}`, phase: 'Pairwise', model: M.work, effort: 'high' })
    .then(r => ({ pair: p.key, contradictions: (r && r.contradictions) || [] }))
))).filter(Boolean)

const all = pairResults.flatMap(r => r.contradictions.map(c => ({ ...c, pair: r.pair })))
const blocking = all.filter(c => ['CRITICAL', 'HIGH'].includes(c.severity))

phase('Reconcile')
const reconciliation = await agent(`Reconcile these cross-artifact findings for feature "${feature}". Merge duplicates across pairs, resolve which are genuine (vs a reviewer misreading), and for each genuine blocking item state the single concrete edit that fixes it (which artifact, what change). Findings: ${JSON.stringify(all)}`,
  { label: 'reconcile', phase: 'Reconcile', model: M.judge, effort: 'high' })

const status = blocking.length ? 'INCONSISTENT' : 'CONSISTENT'

phase('Persist')
await agent(`Write a consistency report to \`${reviewsDir}/analyze.md\` (create the directory if needed). Verdict: ${status}. Sections: summary, Blocking (CRITICAL/HIGH), Non-blocking, and the reconciliation guidance. Findings JSON:\n${JSON.stringify(all)}\nReconciliation:\n${reconciliation}`,
  { label: 'persist-analyze', phase: 'Persist', model: M.work })

return { status, feature, analyze_path: `${reviewsDir}/analyze.md`, contradictions: all, blocking, reconciliation }
