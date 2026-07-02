export const meta = {
  name: 'cited-research',
  description: 'Research a question into cited claims that survive adversarial red-team review (fanout research -> adversary refute -> loop-until-dry). args: {question|task, max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Decompose' }, { title: 'Research' }, { title: 'Red-team' }, { title: 'Synthesize' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const question = (args && (args.question || args.task)) || 'Provide args.question'
const MAX_ROUNDS = (args && args.max_iter) || 3
// tiers — fast: mechanical | work: generation/research | judge: adversary/gate
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const SUBQ = { type: 'object', properties: { subquestions: { type: 'array', items: { type: 'string' } } }, required: ['subquestions'] }
const CLAIM = { type: 'object', properties: { claim: { type: 'string' }, sources: { type: 'array', items: { type: 'object', properties: { ref: { type: 'string' }, kind: { enum: ['primary', 'echo'] } }, required: ['ref', 'kind'] } }, confidence: { enum: ['high', 'medium', 'low'] } }, required: ['claim', 'sources', 'confidence'] }
const VERDICT = { type: 'object', properties: { claim: { type: 'string' }, survives: { type: 'boolean' }, counter_evidence: { type: 'string' }, independent_sources: { type: 'integer' } }, required: ['claim', 'survives', 'independent_sources'] }

phase('Decompose')
const decomp = await agent(`Decompose this research question into 3-6 independent sub-questions. Question: ${question}`, { schema: SUBQ, label: 'decompose', model: M.fast })
let subqs = (decomp && decomp.subquestions) || []

const verified = []
const redLog = []
let round = 0, dry = 0
while (round < MAX_ROUNDS && dry < 1 && subqs.length) {
  round++
  phase('Research')
  const claims = (await parallel(subqs.map((q, i) => () =>
    agent(`Research this sub-question. Return a claim WITH at least one source; mark each source primary or echo. No memory-only claims. Sub-question: ${q}${redLog.length ? `\nAddress prior red-team breakage: ${redLog.slice(-3).join(' | ')}` : ''}`, { schema: CLAIM, label: `research:${round}.${i}`, model: M.work })
  ))).filter(Boolean)

  phase('Red-team')
  const verdicts = (await parallel(claims.map((c, i) => () =>
    agent(`Adversarially REFUTE this claim. Assume it is false; hunt counter-evidence; verify its sources are INDEPENDENT (an echo of the same origin does not count). Claim: ${JSON.stringify(c)}`, { schema: VERDICT, label: `redteam:${round}.${i}`, model: M.judge, effort: 'high' })
  ))).filter(Boolean)

  const survivors = verdicts.filter(v => v.survives && v.independent_sources >= 2)
  const broken = verdicts.filter(v => !v.survives)
  broken.forEach(b => redLog.push(b.counter_evidence || b.claim))
  verified.push(...survivors)
  subqs = broken.map(b => `Re-investigate the claim the red-team just broke: ${b.claim}. Counter-evidence: ${b.counter_evidence}`)
  if (!broken.length) dry++
  log(`round ${round}: ${survivors.length} survived, ${broken.length} broke`)
}

phase('Synthesize')
return { status: verified.length ? 'DONE' : 'STUCK', verified_claims: verified, known_unknowns: redLog, rounds: round }
