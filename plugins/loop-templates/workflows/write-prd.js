export const meta = {
  name: 'write-prd',
  description: 'Write a PRD with testable acceptance criteria grounded in research: generate 2-3 framings, filter by rubric, adversarially check every AC is verifiable. args: {goal|task, context?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Ground' }, { title: 'Draft' }, { title: 'Critique' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const topic = (args && (args.goal || args.task)) || 'Provide args.goal'
const ctx = (args && args.context) || ''
const MAX = (args && args.max_iter) || 3 // bounded revise→critique retries (contract says loop)
const BREAKER = (args && args.circuit_breaker) || 2 // same critique complaint N× ⇒ bail
// tiers — work: ground/draft/select | judge: adversarial AC critique
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const FRAMING = { type: 'object', properties: { title: { type: 'string' }, scope: { type: 'string' }, acceptance_criteria: { type: 'array', items: { type: 'string' } }, milestones: { type: 'array', items: { type: 'string' } }, assumptions: { type: 'array', items: { type: 'string' } } }, required: ['title', 'scope', 'acceptance_criteria', 'milestones'] }
const CRIT = { type: 'object', properties: { every_ac_testable: { type: 'boolean' }, scope_coherent: { type: 'boolean' }, hidden_assumptions: { type: 'array', items: { type: 'string' } }, issues: { type: 'array', items: { type: 'string' } } }, required: ['every_ac_testable', 'scope_coherent'] }

phase('Ground')
const grounding = await agent(`Gather the grounding for a PRD on: ${topic}. Cite key facts/constraints from research and ${ctx ? `our context: ${ctx}` : 'the repo'}. Keep it factual.`, { label: 'ground', model: M.work })

phase('Draft')
const framings = (await parallel([0, 1, 2].map(i => () =>
  agent(`Draft PRD framing #${i + 1} for: ${topic}. Every AC MUST be measurable. Include scope, testable AC, ordered milestones, and explicit assumptions. Grounding: ${grounding}`, { schema: FRAMING, label: `framing:${i + 1}`, model: M.work })
))).filter(Boolean)
let prd = await agent(`Pick the best PRD framing by rubric (AC testable? scope coherent? assumptions surfaced?) and return it as the working draft. Framings: ${JSON.stringify(framings)}`, { schema: FRAMING, label: 'select', model: M.work })

// bounded critique→revise loop: feed the critic's complaint into the next revision; circuit-break on a stuck complaint
let round = 0, crit = null
const reasons = []
while (round < MAX) {
  round++
  phase('Critique')
  crit = await agent(`Adversarially critique this PRD: is every AC verifiable? scope non-overlapping? assumptions explicit and grounding cited? PRD: ${JSON.stringify(prd)}`, { schema: CRIT, label: `critique:${round}`, model: M.judge, effort: 'high' })
  if (crit && crit.every_ac_testable && crit.scope_coherent) return { status: 'DONE', prd, critique: crit, rounds: round }

  const reason = !crit ? 'no-critique' : !crit.every_ac_testable ? 'ac-not-testable' : 'scope-incoherent'
  reasons.push(reason)
  const tail = reasons.slice(-BREAKER)
  if (tail.length >= BREAKER && tail.every(r => r === reason)) return { status: 'STUCK', reason: `circuit_breaker: ${reason}`, prd, critique: crit, rounds: round }

  phase('Draft')
  prd = await agent(`Revise this PRD to resolve the critique. Make every AC measurable/verifiable, keep scope non-overlapping, surface assumptions with cited grounding. Critique: ${JSON.stringify(crit)}. Current PRD: ${JSON.stringify(prd)}. Grounding: ${grounding}`, { schema: FRAMING, label: `revise:${round}`, model: M.work })
}
return { status: 'STUCK', reason: 'PRD did not pass critique within max_iter', prd, critique: crit, rounds: round }
