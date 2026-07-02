export const meta = {
  name: 'fix-bug',
  description: 'Root-cause bug fix: reproduce, generate >=2 hypotheses, falsify, GATE on a proven root cause before any fix, then fix in isolation + adversarial regression check. args: {bug|task, max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Diagnose' }, { title: 'Root-cause gate' }, { title: 'Fix' }, { title: 'Verify' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const bug = (args && (args.bug || args.task)) || 'Provide args.bug'
const MAX = (args && args.max_iter) || 3
const FIX_MAX = (args && args.fix_max_iter) || 3 // bounded fix→verify retries (contract says loop)
const BREAKER = (args && args.circuit_breaker) || 2 // same verify fail-reason N× ⇒ bail
// tiers — work: diagnose/fix (writes code) | judge: root-cause gate + adversarial verify
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const HYP = { type: 'object', properties: { repro: { type: 'string' }, evidence: { type: 'string' }, hypotheses: { type: 'array', items: { type: 'string' } } }, required: ['hypotheses'] }
const CAUSE = { type: 'object', properties: { proven: { type: 'boolean' }, root_cause: { type: 'string' }, converging_evidence: { type: 'array', items: { type: 'string' } }, ruled_out: { type: 'array', items: { type: 'string' } } }, required: ['proven'] }
// VER is a MEASUREMENT: the verifier must actually RUN the repro test + regression suite and record real exit codes, never infer from prose
const VER = { type: 'object', properties: { ran_repro: { type: 'boolean' }, repro_exit_code: { type: 'integer' }, ran_regression: { type: 'boolean' }, regression_exit_code: { type: 'integer' }, repro_green: { type: 'boolean' }, regression_green: { type: 'boolean' }, hits_root_cause: { type: 'boolean' }, new_high: { type: 'boolean' }, fail_reason: { type: 'string' } }, required: ['ran_repro', 'repro_exit_code', 'ran_regression', 'regression_exit_code', 'repro_green', 'regression_green', 'hits_root_cause'] }

let round = 0, cause = null, diag = null
while (round < MAX) {
  round++
  phase('Diagnose')
  diag = await agent(`Reproduce the bug and collect evidence (data, code, log). Generate >=2 DISTINCT root-cause hypotheses (anti-anchor; do not fixate on the first). ${cause ? `Prior ruled-out: ${JSON.stringify(cause.ruled_out)}` : ''} Bug: ${bug}`, { schema: HYP, label: `diagnose:${round}`, model: M.work })
  phase('Root-cause gate')
  cause = await agent(`Independent reviewer: try to DISPROVE each hypothesis against the evidence. Return proven=true ONLY when evidence from >=2 of {data,code,log} converges AND a repro test would FAIL for the predicted reason. Hypotheses: ${JSON.stringify(diag.hypotheses)}. Evidence: ${diag.evidence}`, { schema: CAUSE, label: `cause-gate:${round}`, model: M.judge, effort: 'high' })
  if (cause && cause.proven) break
  log(`round ${round}: root cause not yet proven`)
}
if (!cause || !cause.proven) return { status: 'STUCK', reason: 'root cause not proven within max_iter', diagnosis: diag }

// bounded fix→verify loop: feed the verifier's complaint back into the next fix attempt; circuit-break on a stuck reason
let fixRound = 0, fix = null, ver = null
const reasons = []
while (fixRound < FIX_MAX) {
  fixRound++
  phase('Fix')
  fix = await agent(`${fixRound === 1 ? 'Write a FAILING repro test FIRST, then implement' : 'Revise'} the fix against this PROVEN root cause. Never patch the symptom; never weaken/delete a test to pass. ${ver ? `Prior verify FAILED: ${ver.fail_reason || JSON.stringify({ repro_green: ver.repro_green, regression_green: ver.regression_green, hits_root_cause: ver.hits_root_cause, new_high: ver.new_high })}. Address it.` : ''} Root cause: ${cause.root_cause}. Bug: ${bug}`, { label: `fix:${fixRound}`, model: M.work, isolation: 'worktree' })

  phase('Verify')
  ver = await agent(`Adversarially verify the fix (you are NOT the fixer). MEASURE, don't infer: (1) RUN the repro test, record ran_repro + repro_exit_code (repro_green = exit 0); (2) RUN the full regression suite, record ran_regression + regression_exit_code (regression_green = exit 0); (3) does the fix hit the root cause, not a symptom? (4) any new sev>=HIGH? If you could not run a suite, set its ran_* false and green false. Fix: ${fix}`, { schema: VER, label: `verify:${fixRound}`, model: M.judge, effort: 'high' })
  const ok = ver && ver.ran_repro && ver.repro_green && ver.ran_regression && ver.regression_green && ver.hits_root_cause && !ver.new_high
  log(`fix round ${fixRound}: repro_exit=${ver && ver.repro_exit_code} reg_exit=${ver && ver.regression_exit_code} ok=${!!ok}`)
  if (ok) return { status: 'DONE', root_cause: cause, fix, verify: ver, fix_rounds: fixRound }

  const reason = (ver && ver.fail_reason) || (ver && !ver.hits_root_cause ? 'not-root-cause' : ver && !ver.regression_green ? 'regression-red' : 'repro-red')
  reasons.push(reason)
  const tail = reasons.slice(-BREAKER)
  if (tail.length >= BREAKER && tail.every(r => r === reason)) return { status: 'STUCK', reason: `circuit_breaker: ${reason}`, root_cause: cause, fix, verify: ver, fix_rounds: fixRound }
}
return { status: 'STUCK', reason: 'fix did not verify within fix_max_iter', root_cause: cause, fix, verify: ver, fix_rounds: fixRound }
