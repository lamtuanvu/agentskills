export const meta = {
  name: 'design-architecture',
  description: 'Design an architecture: freeze grounding, generate >=2 fundamentally different candidates, tournament them on decision criteria vs OUR context, validate assumptions. args: {goal|task, context?, min_candidates?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Ground' }, { title: 'Candidates' }, { title: 'Tournament' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const goal = (args && (args.goal || args.task)) || 'Provide args.goal'
const ctx = (args && args.context) || 'infer from the repo'
const N = (args && args.min_candidates) || 2
// tiers — work: grounding | judge: candidate design + tournament (high-value, low-volume)
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const GROUND = { type: 'object', properties: { constraints: { type: 'array', items: { type: 'string' } }, decision_criteria: { type: 'array', items: { type: 'string' } }, traps: { type: 'array', items: { type: 'string' } } }, required: ['constraints', 'decision_criteria'] }
const CAND = { type: 'object', properties: { name: { type: 'string' }, summary: { type: 'string' }, decisions: { type: 'array', items: { type: 'object', properties: { decision: { type: 'string' }, grounding: { type: 'string' }, assumption: { type: 'string' } }, required: ['decision', 'grounding'] } } }, required: ['name', 'summary', 'decisions'] }
// structured decision output so the union can auto-record an ADR
const DECISION = { type: 'object', properties: { winner: { type: 'string' }, rationale: { type: 'string' }, validated_assumptions: { type: 'array', items: { type: 'object', properties: { assumption: { type: 'string' }, holds: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['assumption', 'holds'] } }, rejected_with_reason: { type: 'array', items: { type: 'object', properties: { candidate: { type: 'string' }, reason: { type: 'string' } }, required: ['candidate', 'reason'] } }, best_ideas_to_graft: { type: 'array', items: { type: 'string' } } }, required: ['winner', 'rationale', 'validated_assumptions', 'rejected_with_reason'] }

phase('Ground')
const g = await agent(`Establish the grounding for an architecture decision: constraints, decision_criteria (the axes to judge on), and traps. Goal: ${goal}. Context: ${ctx}`, { schema: GROUND, label: 'ground', model: M.work })

// candidates on the WORK tier (reserve judge for the tournament/critic per tier policy)
phase('Candidates')
const cands = (await parallel(Array.from({ length: N }, (_, i) => () =>
  agent(`Propose architecture candidate #${i + 1} that is FUNDAMENTALLY different from the others. Every decision MUST cite a grounding-fact and the assumption it rests on. Goal: ${goal}. Constraints: ${JSON.stringify(g.constraints)}. Context: ${ctx}`, { schema: CAND, label: `candidate:${i + 1}`, model: M.work, effort: 'high' })
))).filter(Boolean)

phase('Tournament')
const decision = await agent(`Judge these architecture candidates pairwise against the decision_criteria and OUR context (not generic best-practice). Force each to state its trade-off. Pick a clear winner, validate its high-risk assumptions (mark each holds true/false with evidence), record why each rejected candidate lost, and note the best ideas worth grafting from runners-up. Criteria: ${JSON.stringify(g.decision_criteria)}. Context: ${ctx}. Candidates: ${JSON.stringify(cands)}`, { schema: DECISION, label: 'tournament', model: M.judge, effort: 'high' })

return { status: (cands.length >= N && decision && decision.winner) ? 'DONE' : 'STUCK', grounding: g, candidates: cands, decision }
