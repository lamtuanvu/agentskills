---
name: agent-device
description: Automates interactions with iOS simulators/devices and Android emulators/devices using the agent-device CLI. This skill should be used when navigating apps, taking snapshots/screenshots, tapping, typing, scrolling, extracting UI info, debugging crashes, inspecting network traffic, or running batch automation on mobile targets.
---

# Mobile Automation with agent-device

For exploration, use snapshot refs. For deterministic replay, use selectors.

## Start Here

Use this skill as a router, not a full manual.

1. Pick one mode:
   - Normal interaction flow
   - Debug/crash flow
   - Replay maintenance flow
2. Run one canonical flow below.
3. Open references only if blocked.

## Prerequisites

Before running any commands, ensure `agent-device` is installed by running the bundled install script:

```bash
bash scripts/ensure-installed.sh
```

This checks if `agent-device` is already available and installs it globally via npm if not.

## Decision Map

- No target context yet: `devices` -> pick target -> `open`
- Normal UI task: `open` -> `snapshot -i` -> `press/fill` -> `diff snapshot -i` -> `close`
- Debug/crash: `open <app>` -> `logs clear --restart` -> reproduce -> `network dump` -> `logs path` -> targeted `grep`
- Replay drift: `replay -u <path>` -> verify updated selectors

## Canonical Flows

### 1) Normal Interaction Flow

```bash
agent-device open Settings --platform ios
agent-device snapshot -i
agent-device press @e3
agent-device diff snapshot -i
agent-device fill @e5 "test"
agent-device close
```

### 2) Debug/Crash Flow

```bash
agent-device open MyApp --platform ios
agent-device logs clear --restart
agent-device network dump 25
agent-device logs path
```

Logging is off by default. Enable only for debugging windows.
`logs clear --restart` requires an active app session (`open <app>` first).

### 3) Replay Maintenance Flow

```bash
agent-device replay -u ./session.ad
```

## Command Skeleton

### Session and Navigation

```bash
agent-device devices
agent-device open [app|url] [url]
agent-device open [app] --relaunch
agent-device close [app]
agent-device home
agent-device back
agent-device app-switcher
agent-device session list
```

Use `boot` only as fallback when `open` cannot find/connect to a ready target.
Use `--target mobile|tv` with `--platform` to pick phone/tablet vs TV targets.

### Snapshot and Targeting

```bash
agent-device snapshot -i
agent-device snapshot -i -s "Camera"       # Scoped to label
agent-device snapshot -i -s @e3            # Scoped to ref
agent-device diff snapshot -i
agent-device find "Sign In" click
agent-device press @e1                     # Tap by ref
agent-device press 'label="Camera"'        # Tap by selector
agent-device fill @e2 "text"
agent-device is visible 'id="anchor"'
```

`press` is canonical tap command; `click` is an alias.

### Utilities

```bash
agent-device appstate
agent-device clipboard read
agent-device clipboard write "token"
agent-device keyboard status                # Android
agent-device keyboard dismiss               # Android
agent-device perf --json
agent-device network dump [limit] [summary|headers|body|all]
agent-device push <bundle|package> <payload.json|inline-json>
agent-device get text @e1
agent-device screenshot out.png
agent-device settings permission grant notifications
agent-device settings appearance dark
agent-device settings wifi on|off
agent-device record start ./recording.mov   # iOS simulator
agent-device record stop
```

### Batch (when sequence is already known)

```bash
agent-device batch --steps-file /tmp/batch-steps.json --json
```

Batch payload format:

```json
[
  { "command": "open", "positionals": ["settings"], "flags": {} },
  { "command": "snapshot", "positionals": [], "flags": { "i": true } },
  { "command": "press", "positionals": ["@e3"], "flags": {} }
]
```

### Key CLI Flags

- `--platform ios|android` - Target platform (required for most commands)
- `--target mobile|tv` - Device class within platform
- `--device <name>` - Device name selector
- `--udid <udid>` - iOS device identifier
- `--serial <serial>` - Android device identifier
- `--session <name>` - Named session management
- `--json` - Structured JSON output
- `--relaunch` - Restart app process in same session

## Guardrails

- Re-snapshot after UI mutations (navigation/modal/list changes).
- Prefer `snapshot -i`; scope/depth only when needed.
- Use refs (`@e1`) for discovery, selectors (`label="X"`) for deterministic replay/assertions.
- Use `fill` for clear-then-type semantics; use `type` for focused append typing.
- Clipboard: supported on Android and iOS simulators; iOS physical devices unsupported.
- `network dump` is best-effort and parses HTTP(s) entries from the session app log.
- Keep logging off unless debugging.
- On Android, non-ASCII `fill/type` may require an ADB keyboard IME.

## Common Mistakes

- Mixing debug flow into normal runs (keep logs off unless debugging).
- Continuing to use stale refs after screen transitions.
- Using URL opens with Android `--activity` (unsupported combination).
- Treating `boot` as default first step instead of fallback.

## References

Open these only when blocked on a specific topic:

- [references/snapshot-refs.md](references/snapshot-refs.md) - Snapshot refs vs selectors, scoping, diff
- [references/logs-and-debug.md](references/logs-and-debug.md) - App logging, crash triage, network dump
- [references/session-management.md](references/session-management.md) - Named sessions, isolation, replay
- [references/batching.md](references/batching.md) - Batch command execution
- [references/coordinate-system.md](references/coordinate-system.md) - Screen coordinate system
- [references/permissions.md](references/permissions.md) - iOS signing, simulator setup
- [references/perf-metrics.md](references/perf-metrics.md) - Startup performance metrics
- [references/video-recording.md](references/video-recording.md) - Screen recording
- [references/remote-tenancy.md](references/remote-tenancy.md) - Multi-tenant lease flows
