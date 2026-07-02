export const meta = {
  name: 'review-code',
  description: 'Review a feature diff/PR: reflect-gate on approach/intent, then fan out review lenses (correctness+security on the smart tier), synthesize severity-ranked findings. args: {intent|task, diff?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Reflect' }, { title: 'Review' }, { title: 'Verify' }, { title: 'Synthesize' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const intent = (args && (args.intent || args.task)) || 'infer the intent from the diff'
const diffRef = (args && args.diff) || 'the current working diff (run: git diff; git diff --staged)'
// tiers — fast: low-stakes lens | work: most lenses | judge: reflect-gate + correctness/security
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const REFLECT = { type: 'object', properties: { pass: { type: 'boolean' }, reasoning: { type: 'string' }, concerns: { type: 'array', items: { type: 'string' } } }, required: ['pass', 'reasoning'] }
const FIND = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: { lens: { type: 'string' }, severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }, location: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' } }, required: ['lens', 'severity', 'location', 'issue'] } } }, required: ['findings'] }
const VERDICT = { type: 'object', properties: { refuted: { type: 'boolean' }, reasoning: { type: 'string' }, adjusted_severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] } }, required: ['refuted', 'reasoning'] }
const rank = s => ({ CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 }[s] ?? 0)

phase('Reflect')
const reflect = await agent(`REFLECT before line-reviewing. Read ${diffRef}. Does it meet the intent/AC? Solve the REAL problem not a symptom? Approach sound? Simpler path exists? Scope right (no creep/gap)? Intent: ${intent}`, { schema: REFLECT, label: 'reflect', model: M.judge, effort: 'high' })
if (!reflect || !reflect.pass) return { status: 'BLOCKED', stage: 'reflect-gate', reflect }

// per-lens model: correctness + security are the blocking axes -> judge; readability -> fast; rest -> work
const LENSES = [
  { l: 'correctness/edge-cases', m: M.judge },
  { l: 'security', m: M.judge },
  { l: 'performance', m: M.work },
  { l: 'error-handling', m: M.work },
  { l: 'tests-actually-test-behavior', m: M.work },
  { l: 'readability/maintainability', m: M.fast },
  { l: 'regressions/blast-radius', m: M.work },
]
phase('Review')
const batches = (await parallel(LENSES.map(({ l, m }) => () =>
  agent(`Review ${diffRef} through the "${l}" lens ONLY. Assume issues exist. Tag severity, cite exact location, give a concrete fix. Intent: ${intent}`, { schema: FIND, label: `lens:${l}`, model: m, effort: 'high' })
))).filter(Boolean)

// dedup by normalized location+issue, keeping the highest severity per cluster
const raw = batches.flatMap(b => (b && b.findings) || [])
const seen = new Map()
for (const f of raw) {
  const k = `${(f.location || '').toLowerCase().trim()}|${(f.issue || '').toLowerCase().slice(0, 80)}`
  const prev = seen.get(k)
  if (!prev || rank(f.severity) > rank(prev.severity)) seen.set(k, f)
}
const deduped = [...seen.values()]

// adversarial refute-verify on the blocking-candidate severities only (kills false positives)
phase('Verify')
const candidates = deduped.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity))
const verified = (await parallel(candidates.map(f => () =>
  agent(`Adversarially REFUTE this review finding against ${diffRef}. Default refuted=true unless the diff clearly exhibits it. If real but mis-severitied, set adjusted_severity. Finding: ${JSON.stringify(f)}. Intent: ${intent}`,
    { schema: VERDICT, label: `refute:${(f.location || '').slice(0, 24)}`, phase: 'Verify', model: M.judge, effort: 'high' })
    .then(v => ({ ...f, severity: (v && v.adjusted_severity) || f.severity, refuted: !!(v && v.refuted), verdict_reason: v && v.reasoning }))
))).filter(Boolean)

phase('Synthesize')
const survivors = verified.filter(f => !f.refuted)
const nonBlocking = deduped.filter(f => !['CRITICAL', 'HIGH'].includes(f.severity))
const all = [...survivors, ...nonBlocking]
// severity drives blocking: any surviving CRITICAL always blocks; surviving HIGH blocks too
const blocking = survivors.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity))
return { status: blocking.length ? 'CHANGES_REQUESTED' : 'APPROVED', reflect_verdict: reflect, findings: all, must_fix: blocking }
