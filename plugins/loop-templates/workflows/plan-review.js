export const meta = {
  name: 'plan-review',
  description: 'Default-on plan/spec verification: dispatch perspective-diverse reviewer personas (security/performance/conventions/ui via speckit agentTypes) in parallel → dedup findings by location → adversarially refute-verify every CRITICAL/HIGH (kills false positives) → severity drives blocking (CRITICAL always blocks). Persists specs/<feature>/reviews/plan-review.md. No agent-teams flag needed. args: { feature, plan_path?, spec_path?, reviews_dir?, model_fast?, model_work?, model_judge? }',
  phases: [{ title: 'Review' }, { title: 'Verify' }, { title: 'Persist' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const feature = (args && (args.feature || args.task)) || 'the feature'
const planPath = (args && args.plan_path) || `specs/${feature}/plan.md`
const specPath = (args && args.spec_path) || `specs/${feature}/spec.md`
const reviewsDir = (args && args.reviews_dir) || `specs/${feature}/reviews`
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const FIND = { type: 'object', properties: { findings: { type: 'array', items: { type: 'object', properties: {
  lens: { type: 'string' }, severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }, location: { type: 'string' }, issue: { type: 'string' }, fix: { type: 'string' },
}, required: ['lens', 'severity', 'location', 'issue'] } } }, required: ['findings'] }
const VERDICT = { type: 'object', properties: { refuted: { type: 'boolean' }, reasoning: { type: 'string' }, adjusted_severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] } }, required: ['refuted', 'reasoning'] }

// perspective-diverse reviewers (NOT identical skeptics) — dispatched by speckit-orchestrator agentType
const REVIEWERS = [
  { key: 'security', agentType: 'speckit-orchestrator:security-reviewer' },
  { key: 'performance', agentType: 'speckit-orchestrator:performance-reviewer' },
  { key: 'conventions', agentType: 'speckit-orchestrator:conventions-reviewer' },
  { key: 'ui', agentType: 'speckit-orchestrator:ui-reviewer' },
]
const grounding = `Feature: ${feature}. Plan: ${planPath}. Spec: ${specPath}. Read both artifacts from disk before reviewing.`

phase('Review')
const batches = (await parallel(REVIEWERS.map(r => () =>
  agent(`Review the PLAN through your "${r.key}" lens ONLY. Assume issues exist. For each: tag severity (CRITICAL/HIGH/MEDIUM/LOW), cite the exact location in the plan/spec, state the issue, propose a concrete fix. ${grounding}`,
    { schema: FIND, label: `review:${r.key}`, phase: 'Review', model: M.judge, effort: 'high', agentType: r.agentType })
))).filter(Boolean)

// BARRIER: dedup across ALL reviewers by normalized location+issue (plain code, not an agent)
const raw = batches.flatMap(b => (b && b.findings) || [])
const seen = new Map()
for (const f of raw) {
  const k = `${(f.location || '').toLowerCase().trim()}|${(f.issue || '').toLowerCase().slice(0, 80)}`
  const prev = seen.get(k)
  const rank = s => ({ CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 }[s] ?? 0)
  if (!prev || rank(f.severity) > rank(prev.severity)) seen.set(k, f)
}
const deduped = [...seen.values()]

// adversarial refute-verify — only the blocking-candidate severities (kills false positives)
phase('Verify')
const candidates = deduped.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity))
const verified = (await parallel(candidates.map(f => () =>
  agent(`Adversarially REFUTE this plan-review finding. Default to refuted=true unless the plan/spec clearly exhibits the issue. If real but mis-severitied, set adjusted_severity. Finding: ${JSON.stringify(f)}. ${grounding}`,
    { schema: VERDICT, label: `refute:${(f.location || '').slice(0, 24)}`, phase: 'Verify', model: M.judge, effort: 'high' })
    .then(v => ({ ...f, severity: (v && v.adjusted_severity) || f.severity, refuted: !!(v && v.refuted), verdict_reason: v && v.reasoning }))
))).filter(Boolean)

const survivors = verified.filter(f => !f.refuted)
const nonBlocking = deduped.filter(f => !['CRITICAL', 'HIGH'].includes(f.severity))
const allFindings = [...survivors, ...nonBlocking]
// severity drives blocking: any surviving CRITICAL or HIGH blocks
const mustFix = survivors.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity))
const status = mustFix.length ? 'CHANGES_REQUESTED' : 'APPROVED'

phase('Persist')
await agent(`Write a plan review report to \`${reviewsDir}/plan-review.md\` (create the directory if needed). Verdict: ${status}. Structure: summary line, a Must-fix section (CRITICAL/HIGH, blocking), then Non-blocking findings grouped by severity. One bullet per finding: [SEVERITY] location — issue → fix. Findings JSON:\n${JSON.stringify(allFindings)}`,
  { label: 'persist-review', phase: 'Persist', model: M.work })

return { status, feature, reviews_path: `${reviewsDir}/plan-review.md`, findings: allFindings, must_fix: mustFix, reviewers: REVIEWERS.map(r => r.key) }
