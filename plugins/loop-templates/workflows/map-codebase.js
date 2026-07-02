export const meta = {
  name: 'map-codebase',
  description: 'Map/onboard a codebase: classify areas, fan out explorers, synthesize a map, adversarial gap-check, loop until no new area (saturation). args: {path|task, max_iter?, model_fast?, model_work?, model_judge?}',
  phases: [{ title: 'Classify' }, { title: 'Explore' }, { title: 'Gap-check' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const root = (args && (args.path || args.task)) || '.'
const MAX = (args && args.max_iter) || 4
// tiers — fast: mechanical | work: generation/exploration | judge: adversary/gate
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

const AREAS = { type: 'object', properties: { areas: { type: 'array', items: { type: 'string' } } }, required: ['areas'] }
const SUM = { type: 'object', properties: { area: { type: 'string' }, summary: { type: 'string' }, key_flows: { type: 'array', items: { type: 'string' } }, entry_points: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } } }, required: ['area', 'summary'] }
const GAP = { type: 'object', properties: { unexplored: { type: 'array', items: { type: 'string' } } }, required: ['unexplored'] }

phase('Classify')
const c = await agent(`List the subsystems/areas under "${root}" and route each by type (config|core|tests|infra). Return the area list.`, { schema: AREAS, label: 'classify', agentType: 'Explore', model: M.fast })
let areas = (c && c.areas) || []

const mapped = []
const seen = new Set()
let round = 0, dry = 0
while (round < MAX && dry < 1 && areas.length) {
  round++
  const fresh = areas.filter(a => !seen.has(a))
  fresh.forEach(a => seen.add(a))
  if (!fresh.length) { dry++; break }
  phase('Explore')
  const sums = (await parallel(fresh.map((a, i) => () =>
    agent(`Explore codebase area "${a}" under ${root}. Produce a module summary, key flows, entry points, ownership, and risks.`, { schema: SUM, label: `explore:${round}.${i}`, agentType: 'Explore', model: M.work })
  ))).filter(Boolean)
  mapped.push(...sums)
  phase('Gap-check')
  const gap = await agent(`Given this partial codebase map, adversarially find what was NOT covered — unread dirs, untested paths, missing areas. Areas mapped: ${JSON.stringify(mapped.map(m => m.area))}. Root: ${root}`, { schema: GAP, label: `gapcheck:${round}`, agentType: 'Explore', model: M.judge, effort: 'high' })
  areas = (gap && gap.unexplored) || []
  if (!areas.length) dry++
  log(`round ${round}: mapped ${sums.length}, gap found ${areas.length}`)
}

return { status: 'DONE', area_map: mapped, unexplored: areas }
