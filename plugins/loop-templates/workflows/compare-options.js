export const meta = {
  name: 'compare-options',
  description: 'Compare named candidates on a goal-derived rubric with de-biased sourced evidence and a normalized comparison + recommendation. args: {goal|task, candidates[], context?, max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Rubric' }, { title: 'Research' }, { title: 'De-bias' }, { title: 'Compare' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const goal = (args && (args.goal || args.task)) || 'Provide args.goal'
const candidates = (args && args.candidates) || []
const ourContext = (args && args.context) || null
if (!candidates.length) return { status: 'STUCK', reason: 'no candidates provided in args.candidates' }
// tiers — fast: mechanical | work: generation/research | judge: adversary/gate
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const RUBRIC = { type: 'object', properties: { axes: { type: 'array', items: { type: 'string' } } }, required: ['axes'] }
const CARD = { type: 'object', properties: { candidate: { type: 'string' }, scores: { type: 'array', items: { type: 'object', properties: { axis: { type: 'string' }, finding: { type: 'string' }, source: { type: 'string' }, tag: { enum: ['official', 'vendor-marketing', 'third-party', 'unknown'] } }, required: ['axis', 'finding', 'tag'] } } }, required: ['candidate', 'scores'] }
const DEBIAS = { type: 'object', properties: { candidate: { type: 'string' }, contested: { type: 'array', items: { type: 'string' } }, clean: { type: 'boolean' } }, required: ['candidate', 'clean'] }

phase('Rubric')
const r = await agent(`Derive a FIXED comparison rubric (the axes every candidate is scored on) from this goal BEFORE researching any candidate, so it is apples-to-apples not cherry-picked. Goal: ${goal}`, { schema: RUBRIC, label: 'rubric', model: M.work })
const axes = (r && r.axes) || []

phase('Research')
const cards = await pipeline(candidates,
  (c, _orig, i) => agent(`Research candidate "${c}" and fill the rubric with cited EVIDENCE (paraphrased, never pasted). Tag each claim official|vendor-marketing|third-party|unknown with an as-of date. Rubric axes: ${axes.join(', ')}. Goal: ${goal}`, { schema: CARD, label: `research:${i}`, model: M.work }),
  (card, c, i) => agent(`De-bias this candidate card. Is a "pro" just marketing? a "con" competitor FUD? is it stale? vendor-claim != verified capability; popularity != quality. Reject any contested claim resting only on the vendor's own page. Card: ${JSON.stringify(card)}`, { schema: DEBIAS, label: `debias:${i}`, model: M.judge, effort: 'high' }).then(d => ({ card, debias: d }))
)

phase('Compare')
const matrix = await agent(`Build a NORMALIZED strengths/gaps comparison matrix across all candidates on every rubric axis, then give a recommendation with an ADR (context/options/decision/rationale/consequences/assumptions).${ourContext ? ` Also score OUR stack on the SAME rubric and give the delta vs each candidate. Our context: ${ourContext}` : ''}\nAxes: ${axes.join(', ')}\nCards: ${JSON.stringify(cards.filter(Boolean))}`, { label: 'synthesize', model: M.work, effort: 'high' })

return { status: 'DONE', rubric: axes, cards: cards.filter(Boolean), comparison: matrix }
