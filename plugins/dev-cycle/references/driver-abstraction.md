# Driver abstraction

The agentic E2E tier drives a real browser. Pick the driver via
`.dev-cycle/config.json → validation.driver`. The right driver depends on the surface:

| Surface | Driver | Why |
|---|---|---|
| Web app, human-mimic (agentic) | **`chrome`** (Claude-in-Chrome MCP) or **`preview`** (Claude Preview MCP) | Web browsers are tier-"read" under computer-use, so a browser MCP is the correct web driver — DOM-aware, fast, can click/fill/screenshot. |
| Web app, scripted deterministic tiers | **`playwright`** | Fast, repeatable, no LLM in the loop; the provider owns the Playwright project. |
| Native desktop / device firmware surface | computer-use | Reserved for non-web surfaces (e.g. a Pi LCD). Not used for web. |

## chrome vs preview

- **`preview`** (Claude Preview MCP, `mcp__Claude_Preview__*`) — best when the app has a
  dev server this session can `preview_start`; gives console/network/inspect tightly
  coupled to that server. Good default for local dev.
- **`chrome`** (Claude-in-Chrome MCP, `mcp__claude-in-chrome__*`) — best when driving an
  already-running origin (e.g. a live Vite FE at `:5173`), or when you need a real
  browser profile. Load its tools via ToolSearch before use.

The `e2e-agentic.js` engine tells the driver agent which MCP toolset to use based on
`driver`. Scripted tiers (`playwright`) bypass the engine and call the provider's
`drive_scenario` directly.

## Session injection

The agentic driver starts from a **pre-authenticated session** (`auth_session`) so it
does not re-do login every scenario. The provider returns `{session, inject_target}`;
the driver injects it into the **live frontend origin** (cookie/localStorage/JWT) before
the first `navigate`. Providers with exotic auth (crypto handshakes, multi-node) wrap
that in `auth_session` so the general engine stays auth-agnostic.
