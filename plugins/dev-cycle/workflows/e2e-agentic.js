export const meta = {
  name: 'e2e-agentic',
  description: 'Browser-driven human-mimic E2E: for each declarative scenario, a DRIVER agent executes the flow through a browser MCP (navigate/wait/click/fill/expect) against a bring_up base_url with an injected auth session and captures evidence (screenshots/console/network); then a SEPARATE ai-judge agent adjudicates the screenshots against the scenario expectations (measurement, not self-report). args: { driver?, base_url, session?, scenarios[]|scenario, scenarios_dir?, model_fast?, model_work?, model_judge? }',
  phases: [{ title: 'Drive' }, { title: 'Judge' }],
}

// the Workflow tool delivers args as a JSON STRING — normalize to an object first
if (typeof args === 'string') { try { args = JSON.parse(args) } catch (e) { args = {} } }

const driver = (args && args.driver) || 'chrome' // chrome | preview | playwright
const baseUrl = (args && args.base_url) || ''
const session = (args && args.session) || '' // authed session json or a path to inject
const scenariosDir = (args && args.scenarios_dir) || ''
// accept a single scenario, an array, or a dir to enumerate
let scenarios = []
if (args && Array.isArray(args.scenarios)) scenarios = args.scenarios
else if (args && args.scenario) scenarios = [args.scenario]
const M = { fast: (args && args.model_fast) || 'haiku', work: (args && args.model_work) || 'sonnet', judge: (args && args.model_judge) || 'opus' }

if (!baseUrl) return { status: 'SKIP', reason: 'no base_url — validation provider bring_up did not run', results: [] }
if (!scenarios.length && !scenariosDir) return { status: 'SKIP', reason: 'no scenarios provided', results: [] }

const EVID = { type: 'object', properties: {
  scenario: { type: 'string' },
  steps: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['action', 'ok'] } },
  screenshots: { type: 'array', items: { type: 'string' } },
  console_errors: { type: 'array', items: { type: 'string' } },
  network_failures: { type: 'array', items: { type: 'string' } },
  driver_error: { type: 'string' },
}, required: ['scenario', 'steps', 'screenshots'] }
const VERDICT = { type: 'object', properties: {
  pass: { type: 'boolean' }, reasoning: { type: 'string' },
  failed_expectations: { type: 'array', items: { type: 'string' } },
}, required: ['pass', 'reasoning'] }

const driverTool = {
  chrome: 'the Claude-in-Chrome MCP (mcp__claude-in-chrome__* — load via ToolSearch; navigate/computer/read_page/find/form_input/read_console_messages/read_network_requests)',
  preview: 'the Claude Preview MCP (mcp__Claude_Preview__* — preview_start/preview_click/preview_fill/preview_screenshot/preview_console_logs/preview_network)',
  playwright: 'Playwright via Bash (the provider drive_scenario already wraps it)',
}[driver] || 'the configured browser MCP'

const scenRef = s => typeof s === 'string' ? `scenario file: ${s}` : `scenario:\n${JSON.stringify(s)}`

// DRIVE (work tier) → JUDGE (judge tier). pipeline so each scenario is judged the moment its drive finishes.
const results = (await pipeline(
  scenariosDir && !scenarios.length ? [{ __dir: scenariosDir }] : scenarios,
  (s, orig, i) => agent(
    `You are the E2E DRIVER. Using ${driverTool}, drive this scenario against base_url ${baseUrl} as a real user would.${session ? ` First inject the pre-authenticated session so you start logged in: ${session}.` : ''} ${orig && orig.__dir ? `Enumerate and run every scenario file under ${orig.__dir}.` : scenRef(orig)}\nExecute each declarative step (navigate/wait/click/fill/expect). Take a screenshot at every \`expect\`/\`ai_judge\` checkpoint and after the final step. Capture console errors and failed network requests. Do NOT judge success yourself — just report exactly what happened and where the screenshots are. If the app never came up, set driver_error.`,
    { schema: EVID, label: `drive:${i}`, phase: 'Drive', model: M.work }),
  (evid, orig, i) => agent(
    `You are the E2E AI-JUDGE and did NOT drive the browser. Look at the captured screenshots and evidence and decide, like a human reviewer, whether the scenario's expectations (its \`expect\`/\`ai_judge\` assertions) are actually met. Be skeptical: a rendered error page, empty state, spinner, or wrong content is a FAIL even if navigation "worked". List any failed expectations. Evidence: ${JSON.stringify(evid)}`,
    { schema: VERDICT, label: `judge:${i}`, phase: 'Judge', model: M.judge, effort: 'high' })
    .then(v => ({ scenario: evid && evid.scenario, pass: !!(v && v.pass && !(evid && evid.driver_error)), verdict: v, evidence: evid }))
)).filter(Boolean)

const failed = results.filter(r => !r.pass)
return {
  status: failed.length ? 'FAIL' : 'PASS',
  driver, base_url: baseUrl,
  passed: results.length - failed.length, total: results.length,
  failed_scenarios: failed.map(r => ({ scenario: r.scenario, failed_expectations: r.verdict && r.verdict.failed_expectations, driver_error: r.evidence && r.evidence.driver_error })),
  results,
}
