export const meta = {
  name: 'build-feature',
  description: 'Implement a feature that already has ACs/milestones: implement highest-open item in isolation, adversarially verify (ac-verifier on the smart tier + bug-hunter), loop min 2 rounds until all AC pass and 0 high bugs. args: {spec|task, max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Implement' }, { title: 'Verify' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const spec = (args && (args.spec || args.task)) || 'Provide args.spec (ACs/milestones)'
const MIN = 2
const MAX = (args && args.max_iter) || 6
const BREAKER = (args && args.circuit_breaker) || 3 // same fail-reason N× in a row ⇒ bail early
// tiers — work: implementer + bug-hunter | judge: ac-verifier (the only role that may set PASS)
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const AC = { type: 'object', properties: { ac_status: { type: 'array', items: { type: 'object', properties: { ac: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['ac', 'pass'] } }, all_done: { type: 'boolean' } }, required: ['ac_status', 'all_done'] }
const BUGS = { type: 'object', properties: { bugs: { type: 'array', items: { type: 'object', properties: { severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }, repro: { type: 'string' } }, required: ['severity'] } } }, required: ['bugs'] }

let round = 0, acv = null, bh = null
const reasons = []
while (round < MAX) {
  round++
  phase('Implement')
  const item = await agent(`Pick the highest OPEN item (bug>=HIGH > AC=FAIL > milestone-not-started) for this feature and implement it in an isolated worktree. Never edit a test to pass. ${acv ? `Current status: ${JSON.stringify(acv.ac_status)}` : ''} Spec: ${spec}`, { label: `impl:${round}`, model: M.work, isolation: 'worktree' })
  phase('Verify')
  const [v, b] = await parallel([
    () => agent(`ac-verifier: with EVIDENCE, decide which ACs now PASS (you are the ONLY role that may set PASS; never edit a test to pass). Spec: ${spec}. Work summary: ${item}`, { schema: AC, label: `ac-verify:${round}`, model: M.judge, effort: 'high' }),
    () => agent(`bug-hunter: assume bugs exist; hunt them even if all AC pass; tag severity; never downgrade. Spec: ${spec}. Work summary: ${item}`, { schema: BUGS, label: `bug-hunt:${round}`, model: M.work, effort: 'high' }),
  ])
  acv = v; bh = b
  const highBugs = ((bh && bh.bugs) || []).filter(x => ['CRITICAL', 'HIGH'].includes(x.severity))
  const allPass = acv && acv.all_done && (acv.ac_status || []).every(a => a.pass) && !highBugs.length
  log(`round ${round}: all_pass=${!!allPass}, high_bugs=${highBugs.length}`)
  if (round >= MIN && allPass) return { status: 'DONE', ac: acv, bugs: bh, rounds: round }

  // circuit breaker — same blocking reason N rounds in a row ⇒ bail, don't burn max_iter
  const reason = highBugs[0] ? `bug:${highBugs[0].severity}` : ((acv && (acv.ac_status || []).find(a => !a.pass)) || {}).ac || 'ac-not-pass'
  reasons.push(reason)
  const tail = reasons.slice(-BREAKER)
  if (tail.length >= BREAKER && tail.every(r => r === reason)) return { status: 'STUCK', reason: `circuit_breaker: ${reason}`, ac: acv, bugs: bh, rounds: round }
}
return { status: 'STUCK', reason: 'gate not met within max_iter', ac: acv, bugs: bh }
