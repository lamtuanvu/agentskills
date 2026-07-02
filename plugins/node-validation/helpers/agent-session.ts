/**
 * agent-session.ts — produce a pre-authenticated node session for the dev-cycle
 * validation contract's `auth_session` verb, by wrapping the repo's existing
 * AuthClient (BIP39 + OTS onboarding). Prints `{ session, inject_target }` JSON on
 * stdout so the agentic E2E driver can inject it into the LIVE frontend origin.
 *
 * Run by bin/node-validation with cwd = <repo>/tests/e2e and env:
 *   NODE_VALIDATION_BASE_URL       node origin (no /api suffix), e.g. http://127.0.0.1:3000
 *   NODE_VALIDATION_USER           username to onboard (default e2e-agent)
 *   NODE_VALIDATION_INJECT_TARGET  live FE origin to inject into, e.g. http://127.0.0.1:5173
 *   NODE_VALIDATION_REPO           repo root (to resolve the AuthClient module absolutely)
 *
 * NOTE (needs live verification): the AuthClient module path and its onboarding flow are
 * wired against tests/e2e/src/harness/auth.ts as of this writing; run once live to confirm.
 */
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const base = process.env.NODE_VALIDATION_BASE_URL;
const user = process.env.NODE_VALIDATION_USER || 'e2e-agent';
const injectTarget = process.env.NODE_VALIDATION_INJECT_TARGET || base || '';
const repo = process.env.NODE_VALIDATION_REPO || join(process.cwd(), '..', '..');

if (!base) {
  console.error('agent-session: NODE_VALIDATION_BASE_URL required');
  process.exit(1);
}

const authModule = pathToFileURL(join(repo, 'tests/e2e/src/harness/auth.ts')).href;

try {
  const { AuthClient } = await import(authModule);
  const client = new AuthClient(base);
  const session = await client.onboard(user);
  // emit only what a browser injector needs + provenance
  process.stdout.write(JSON.stringify({
    session: {
      token: session.token,
      refreshToken: session.refreshToken,
      publicKey: session.publicKey,
      nodeId: session.nodeId,
    },
    inject_target: injectTarget,
    base_url: `${base}/api`,
  }) + '\n');
} catch (err) {
  console.error(`agent-session: failed to onboard via AuthClient (${authModule}):`, err instanceof Error ? err.message : err);
  process.exit(1);
}
