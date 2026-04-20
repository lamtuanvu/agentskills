#!/usr/bin/env bun
/**
 * GitHub CI failure channel for Claude Code.
 *
 * One-way MCP channel server that:
 * 1. Listens on a local HTTP port for GitHub webhook events
 * 2. Verifies HMAC signatures
 * 3. Filters for CI failure events (workflow_run / check_run with conclusion: failure)
 * 4. Deduplicates events within a 10-minute window
 * 5. Pushes structured failure data into the Claude Code session
 *
 * State directory: ~/.claude/channels/github-ci/
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHmac, timingSafeEqual } from "crypto";
import { readFileSync, appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// --- Logging -----------------------------------------------------------------

const LOG_DIR = join(homedir(), ".claude", "channels", "github-ci");
const LOG_FILE = join(LOG_DIR, "server.log");
try { mkdirSync(LOG_DIR, { recursive: true }); } catch {}

function log(msg: string) {
  const ts = new Date().toISOString();
  const line = `${ts} ${msg}\n`;
  process.stderr.write(line);
  appendFileSync(LOG_FILE, line);
}

// --- Configuration -----------------------------------------------------------

const PORT = Number(process.env.GITHUB_CI_PORT ?? 18792);
const STATE_DIR =
  process.env.GITHUB_CI_STATE_DIR ??
  join(homedir(), ".claude", "channels", "github-ci");
const ENV_FILE = join(STATE_DIR, ".env");
const TG_CHAT_ID = process.env.TG_CHAT_ID ?? "5126220890";

// Load Telegram bot token from env or state .env
let TG_BOT_TOKEN = process.env.TG_BOT_TOKEN ?? "";
if (!TG_BOT_TOKEN) {
  try {
    const envText = readFileSync(ENV_FILE, "utf-8");
    const match = envText.match(/^TG_BOT_TOKEN=(.+)$/m);
    if (match) TG_BOT_TOKEN = match[1].trim();
  } catch {}
}

async function sendTelegram(text: string) {
  if (!TG_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    log(`[github-ci] Telegram send failed: ${e}`);
  }
}

// Load secret from env or state .env file
let WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? "";
if (!WEBHOOK_SECRET) {
  try {
    const envText = readFileSync(ENV_FILE, "utf-8");
    const match = envText.match(/^GITHUB_WEBHOOK_SECRET=(.+)$/m);
    if (match) WEBHOOK_SECRET = match[1].trim();
  } catch {}
}

if (!WEBHOOK_SECRET) {
  log(
    `[github-ci] WARNING: No GITHUB_WEBHOOK_SECRET set. HMAC verification disabled.\n` +
      `Set it in env or ${ENV_FILE}\n`
  );
}

// --- HMAC Verification -------------------------------------------------------

function verifySignature(body: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET) return true; // no secret = skip (warned at startup)
  if (!signature) return false;
  const expected =
    "sha256=" +
    createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// --- Event Filtering ---------------------------------------------------------

const BUILD_PATTERNS = ["build", "test", "ci"];
const REVIEW_PATTERNS = ["review", "code review", "claude code review"];

function matchesPatterns(name: string | null, patterns: string[]): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

interface CIFailure {
  event: string;
  type: string;
  repo: string;
  branch: string | null;
  pr: number | null;
  commit: string | null;
  run_id: number | null;
  workflow_name: string;
  conclusion: string;
  html_url: string | null;
}

function extractFailure(
  event: string,
  payload: any
): CIFailure | null {
  if (event !== "workflow_run" && event !== "check_run") return null;

  const conclusion =
    payload?.conclusion ?? payload?.check_run?.conclusion;
  if (conclusion !== "failure" && conclusion !== "action_required") return null;

  const name =
    payload?.workflow?.name ??
    payload?.name ??
    payload?.check_run?.name ??
    "";

  let type: string | null = null;
  if (matchesPatterns(name, BUILD_PATTERNS)) type = "build_failure";
  else if (matchesPatterns(name, REVIEW_PATTERNS)) type = "review_failure";
  if (!type) return null;

  return {
    event,
    type,
    repo: payload?.repository?.full_name ?? "unknown",
    branch:
      payload?.workflow_run?.head_branch ??
      payload?.check_run?.check_suite?.head_branch ??
      null,
    commit:
      payload?.workflow_run?.head_sha ??
      payload?.check_run?.head_sha ??
      null,
    run_id:
      payload?.workflow_run?.id ?? payload?.check_run?.id ?? null,
    pr:
      payload?.workflow_run?.pull_requests?.[0]?.number ??
      payload?.check_run?.pull_requests?.[0]?.number ??
      null,
    workflow_name: name,
    conclusion,
    html_url:
      payload?.workflow_run?.html_url ??
      payload?.check_run?.html_url ??
      null,
  };
}

// --- Deduplication -----------------------------------------------------------

const DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const seen = new Map<string, number>();

function isDuplicate(key: string): boolean {
  const now = Date.now();
  for (const [k, ts] of seen) {
    if (now - ts > DEDUP_TTL_MS) seen.delete(k);
  }
  if (seen.has(key)) return true;
  seen.set(key, now);
  return false;
}

// --- MCP Server --------------------------------------------------------------

const mcp = new Server(
  { name: "github-ci", version: "0.2.2" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
    },
    instructions: [
      "GitHub CI failure events arrive as <channel source=\"github-ci\" type=\"...\" repo=\"...\" branch=\"...\">.",
      "The content is a JSON object with fields: event, type, repo, branch, pr, commit, run_id, workflow_name, conclusion, html_url.",
      "  {branch} is the HEAD branch (the PR source branch that is failing CI, NOT main/base).",
      "",
      "When you receive a CI failure event (a Telegram notification has already been sent to the user):",
      "",
      "STEP 1 — LOCATE REPO:",
      "  Read ~/.claude/channels/github-ci/repo-map.json to find the local path for {repo}.",
      "  If the repo is not mapped, send a Telegram message to chat_id 5126220890 saying the repo is unmapped and stop.",
      "",
      "STEP 2 — WORKTREE CHECKOUT:",
      "  cd to the repository path, then create a git worktree based on the HEAD branch:",
      "    git fetch origin",
      "    git worktree add ../ci-fix-{branch} origin/{branch}",
      "  If the worktree already exists, remove it first: git worktree remove ../ci-fix-{branch} --force",
      "  cd into the worktree directory (../ci-fix-{branch}).",
      "  Create a new fix branch from the current HEAD: git checkout -b ci-fix/{branch}",
      "",
      "STEP 3 — DIAGNOSE & FIX:",
      "  a. Fetch CI logs: gh run view {run_id} --repo {repo} --log-failed",
      "  b. Analyze the failure (build error, test failure, lint issue, etc.)",
      "  c. Implement the minimal fix on the ci-fix/{branch} branch",
      "  d. Run the project's test suite to verify the fix works",
      "",
      "STEP 4 — COMMIT & PR:",
      "  a. Stage and commit with message: 'fix(ci): {description of what was fixed}'",
      "  b. Push ONLY the fix branch: git push origin ci-fix/{branch}",
      "  c. Create a PR targeting the HEAD branch (NOT main/base):",
      "     gh pr create --repo {repo} --base {branch} --head ci-fix/{branch} --title 'fix(ci): {short description}' --body 'Auto-fix for CI failure in {workflow_name}\\n\\nFailing run: {html_url}'",
      "  d. Comment on the original PR #{pr} to link the fix:",
      "     gh pr comment {pr} --repo {repo} --body '🤖 CI fix proposed in #{fix_pr_number} — {fix_pr_url}'",
      "",
      "STEP 5 — CLEANUP & NOTIFY:",
      "  a. cd back to the main repo directory",
      "  b. Remove the worktree: git worktree remove ../ci-fix-{branch} --force",
      "  c. Send a Telegram message to chat_id 5126220890 with:",
      "     - What failed and why",
      "     - What you fixed",
      "     - The fix PR URL (targeting {branch}, not main)",
      "     - Or if you couldn't fix it, explain why and ask for help",
      "",
      "Constraints:",
      "- NEVER commit or push directly to {branch} — it is the HEAD branch of an open PR",
      "- ALL changes go on ci-fix/{branch}, which opens a PR back into {branch}",
      "- Work ONLY inside the worktree — never modify the main working tree",
      "- Only modify files directly related to the CI failure",
      "- Follow existing code patterns in the repository",
      "- If unsure about the fix, notify via Telegram and ask for guidance instead of guessing",
    ].join("\n"),
  }
);

await mcp.connect(new StdioServerTransport());

// Exit when parent (Claude Code) dies — stdin closes when parent exits
process.stdin.on("end", async () => {
  log("[github-ci] Parent disconnected, shutting down");
  await sendTelegram("⚠️ CI Watcher offline (session disconnected)");
  process.exit(0);
});
process.stdin.on("error", async () => {
  await sendTelegram("⚠️ CI Watcher offline (stdin error)");
  process.exit(0);
});
// Also handle signals
process.on("SIGTERM", async () => {
  log("[github-ci] SIGTERM received");
  await sendTelegram("⚠️ CI Watcher offline (SIGTERM)");
  process.exit(0);
});
process.on("SIGINT", async () => {
  log("[github-ci] SIGINT received");
  await sendTelegram("⚠️ CI Watcher offline (SIGINT)");
  process.exit(0);
});

// --- HTTP Webhook Listener ---------------------------------------------------

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1",
  async fetch(req) {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.text();

    // HMAC verification
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifySignature(body, signature)) {
      log("[github-ci] HMAC verification failed");
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const event = req.headers.get("x-github-event") ?? "";
    const repo = payload?.repository?.full_name ?? "unknown";
    const conclusion = payload?.conclusion ?? payload?.check_run?.conclusion ?? payload?.workflow_run?.conclusion ?? "n/a";
    log(`[github-ci] ${event} from ${repo} (conclusion: ${conclusion})`);

    // Filter for CI failures
    const failure = extractFailure(event, payload);
    if (!failure) {
      return new Response(null, { status: 204 }); // not a failure, ignore
    }

    // Deduplicate
    const dedupKey = `${failure.repo}:${failure.branch}:${failure.commit}:${failure.type}`;
    if (isDuplicate(dedupKey)) {
      log(`[github-ci] Skipping duplicate ${failure.type} for ${failure.repo} @ ${failure.branch}`);
      return new Response(null, { status: 204 });
    }

    // Send Telegram notification directly
    const commit7 = failure.commit?.slice(0, 7) ?? "unknown";
    const tgMsg = `<b>CI FAILURE</b>\n\nRepo: ${failure.repo}\nBranch: ${failure.branch}\nWorkflow: ${failure.workflow_name}\nCommit: ${commit7}\nPR: #${failure.pr ?? "n/a"}\n\n<a href="${failure.html_url}">View Run</a>\n\nClaude Code is investigating...`;
    await sendTelegram(tgMsg);

    // Push to Claude Code for auto-fix
    log(`[github-ci] Routing ${failure.type} for ${failure.repo} @ ${failure.branch}`);

    await mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: JSON.stringify(failure),
        meta: {
          type: failure.type,
          repo: failure.repo,
          branch: failure.branch ?? "unknown",
        },
      },
    });

    return new Response(null, { status: 202 });
  },
});

log(`[github-ci] Channel listening on http://127.0.0.1:${server.port}`);
log(`[github-ci] TG_BOT_TOKEN loaded: ${TG_BOT_TOKEN ? "yes (" + TG_BOT_TOKEN.slice(0, 6) + "...)" : "NO"}`);
await sendTelegram("CI Watcher online. Listening on port " + server.port);
log("[github-ci] Startup Telegram sent");
