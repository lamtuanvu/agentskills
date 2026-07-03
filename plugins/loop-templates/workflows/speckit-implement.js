export const meta = {
  name: 'speckit-implement',
  description: 'Implement a speckit feature by fanning out file-disjoint task groups (from partition_tasks.py) across isolated worktrees, each gated by a MEASUREMENT verify (ac-verifier inspects the real diff + RUNS the group tests keying on exit code, bug-hunter hunts) with a min-2-round loop + circuit breaker. Fuses speckit efficiency with build-feature quality. args: { feature, spec_path?, plan_path?, tasks_path?, groups[], ungrouped[], max_iter?, model_fast?, model_work?, model_judge? }',
  phases: [{ title: 'Tests' }, { title: 'Implement' }, { title: 'Verify' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const feature = (args && (args.feature || args.task)) || 'the feature'
const specPath = (args && args.spec_path) || ''
const planPath = (args && args.plan_path) || ''
const tasksPath = (args && args.tasks_path) || ''
const MIN = 2
const MAX = (args && args.max_iter) || 6
const BREAKER = (args && args.circuit_breaker) || 2 // same-reason fails before bailing a group
// tiers — work: implementer + bug-hunter + test-writer | judge: ac-verifier (the ONLY role that may PASS)
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

// grounding pointer block (spilled to paths, not inlined — respects the prompt cap)
const GROUND = [
  `Feature: ${feature}`,
  specPath && `Spec: ${specPath}`,
  planPath && `Plan: ${planPath}`,
  tasksPath && `Tasks: ${tasksPath}`,
].filter(Boolean).join('\n')

// normalize groups; fold ungrouped (no shared files) into one sequential group
const rawGroups = (args && Array.isArray(args.groups)) ? args.groups : []
const ungrouped = (args && Array.isArray(args.ungrouped)) ? args.ungrouped : []
const groups = rawGroups.map(g => ({ id: g.id, tasks: g.tasks || [], files: g.files || [] }))
if (ungrouped.length) groups.push({ id: 'ungrouped', tasks: ungrouped, files: [] })
if (!groups.length) return { status: 'STUCK', reason: 'no groups provided (run partition_tasks.py first)', completed_task_ids: [], failed_groups: [], bugs: [] }

// ac-verifier MEASURES: inspects the real worktree diff AND runs the group's tests, gate keys on exit code
const AC = { type: 'object', properties: {
  ac_status: { type: 'array', items: { type: 'object', properties: { ac: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['ac', 'pass'] } },
  tests_ran: { type: 'boolean' }, tests_exit_code: { type: 'integer' }, all_done: { type: 'boolean' }, fail_reason: { type: 'string' },
}, required: ['ac_status', 'tests_ran', 'tests_exit_code', 'all_done'] }
const BUGS = { type: 'object', properties: { bugs: { type: 'array', items: { type: 'object', properties: { severity: { enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }, repro: { type: 'string' }, note: { type: 'string' } }, required: ['severity'] } } }, required: ['bugs'] }

const fileScope = files => files.length ? `You may ONLY create/edit these files (their file-ownership group): ${files.join(', ')}. Touching any other file is a conflict — do not.` : 'This group has no pre-assigned files; keep your edits minimal and self-contained.'

// one test-writer per group, in parallel with implementation, STRICT test-file-only ownership (conflict-free, mirrors speckit's test-writer)
async function writeTests(group) {
  return agent(`test-writer: author failing/So-far-missing tests that pin the acceptance criteria for this task group. Strict file ownership: you may ONLY create/edit test files (\`*.test.*\`, \`*.spec.*\`, or under a \`tests/\`/\`__tests__/\` dir). NEVER edit non-test source. Group tasks:\n${group.tasks.map(t => `- ${t}`).join('\n')}\n${GROUND}`,
    { label: `test-writer:${group.id}`, phase: 'Tests', model: M.work, isolation: 'worktree' })
}

async function runGroup(group) {
  let round = 0, acv = null, bh = null
  const reasons = [] // circuit breaker: track consecutive same fail_reason
  while (round < MAX) {
    round++
    // IMPLEMENT — isolated worktree, disjoint files ⇒ safe in parallel with sibling groups
    const item = await agent(
      `Implement this file-ownership task group in your isolated worktree. ${fileScope(group.files)} Never edit a test to make it pass; never downgrade a failing test. ${acv ? `Prior verify said: ${acv.fail_reason || JSON.stringify((acv.ac_status || []).filter(a => !a.pass))}` : ''}\nTasks:\n${group.tasks.map(t => `- ${t}`).join('\n')}\n${GROUND}`,
      { label: `impl:${group.id}:${round}`, phase: 'Implement', model: M.work, isolation: 'worktree' })

    // VERIFY (measurement) — ac-verifier is the ONLY role that may PASS; it must RUN the tests, not infer
    const [v, b] = await parallel([
      () => agent(`ac-verifier: you are NOT the implementer and may NOT self-PASS the implementer's word. MEASURE: (1) inspect the ACTUAL worktree diff for this group; (2) RUN the group's tests (unit/integration touching these files) and record tests_ran + the real tests_exit_code; (3) set each AC pass ONLY with cited evidence from the diff or a passing test. all_done ⇒ every AC pass AND tests_exit_code === 0. If you could not run tests, tests_ran=false and all_done=false. Never edit a test to pass. Group files: ${group.files.join(', ') || '(none)'}. Tasks:\n${group.tasks.map(t => `- ${t}`).join('\n')}\nWork summary from implementer (context only, NOT evidence): ${item}\n${GROUND}`,
        { schema: AC, label: `ac-verify:${group.id}:${round}`, phase: 'Verify', model: M.judge, effort: 'high' }),
      () => agent(`bug-hunter: assume bugs exist in this group's diff even if all AC pass; hunt them; tag severity; never downgrade. Give a repro. Group files: ${group.files.join(', ') || '(none)'}. Work summary: ${item}\n${GROUND}`,
        { schema: BUGS, label: `bug-hunt:${group.id}:${round}`, phase: 'Verify', model: M.work, effort: 'high' }),
    ])
    acv = v; bh = b
    const highBugs = ((bh && bh.bugs) || []).filter(x => ['CRITICAL', 'HIGH'].includes(x.severity))
    const measured = acv && acv.tests_ran && acv.tests_exit_code === 0
    const allPass = measured && acv.all_done && (acv.ac_status || []).every(a => a.pass) && !highBugs.length
    log(`group ${group.id} round ${round}: measured=${!!measured} exit=${acv && acv.tests_exit_code} all_pass=${!!allPass} high_bugs=${highBugs.length}`)
    if (round >= MIN && allPass) return { id: group.id, status: 'DONE', tasks: group.tasks, ac: acv, bugs: (bh && bh.bugs) || [], rounds: round }

    // circuit breaker — same fail reason N rounds in a row ⇒ bail this group, don't burn max_iter
    const reason = (acv && acv.fail_reason) || (highBugs[0] && `bug:${highBugs[0].severity}`) || 'ac-not-pass'
    reasons.push(reason)
    const tail = reasons.slice(-BREAKER)
    if (tail.length >= BREAKER && tail.every(r => r === reason)) {
      log(`group ${group.id}: circuit breaker — "${reason}" repeated ${BREAKER}×`)
      return { id: group.id, status: 'STUCK', reason: `circuit_breaker: ${reason}`, tasks: group.tasks, ac: acv, bugs: (bh && bh.bugs) || [], rounds: round }
    }
  }
  return { id: group.id, status: 'STUCK', reason: 'gate not met within max_iter', tasks: group.tasks, ac: acv, bugs: (bh && bh.bugs) || [], rounds: round }
}

log(`speckit-implement: ${groups.length} group(s), max_iter=${MAX}, breaker=${BREAKER}`)
// tests authored in parallel with the group loops; then the group loops run file-disjoint in parallel
const results = (await parallel(groups.map(g => () => writeTests(g).then(() => runGroup(g))))).filter(Boolean)

const done = results.filter(r => r.status === 'DONE')
const failed = results.filter(r => r.status !== 'DONE')
const completed_task_ids = done.flatMap(r => r.tasks)
const bugs = results.flatMap(r => (r.bugs || []).map(b => ({ ...b, group: r.id })))
return {
  status: failed.length ? 'STUCK' : 'DONE',
  completed_task_ids,
  completed_groups: done.map(r => r.id),
  failed_groups: failed.map(r => ({ id: r.id, reason: r.reason, tasks: r.tasks })),
  bugs,
  groups: results,
}
