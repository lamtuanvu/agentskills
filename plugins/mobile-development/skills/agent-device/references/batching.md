# Batching

Use batching when the sequence of commands is already known and steps belong to one logical screen flow.
Avoid batching for unrelated flows or highly dynamic workflows.

## CLI Usage

```bash
agent-device batch --session sim --platform ios --steps-file /tmp/batch-steps.json --json
```

## Step Format

Each step requires a `command` field with optional `positionals` and `flags`:

```json
[
  { "command": "open", "positionals": ["settings"], "flags": {} },
  { "command": "wait", "positionals": ["label=\"Privacy & Security\"", "3000"], "flags": {} },
  { "command": "click", "positionals": ["label=\"Privacy & Security\""], "flags": {} },
  { "command": "get", "positionals": ["text", "label=\"Tracking\""], "flags": {} }
]
```

## Constraints

- Nested batch or replay operations are rejected.
- Stop-on-first-error mode: if a step fails, subsequent steps are skipped.
- Recommended batch size: 5-20 steps.

## Common Errors

- `INVALID_ARGS`: malformed step or unsupported flags.
- `SESSION_NOT_FOUND`: no active session for the given name.
- `UNSUPPORTED_OPERATION`: command not available on current platform/target.
- `AMBIGUOUS_MATCH`: selector matches multiple elements.
- `COMMAND_FAILED`: step execution error.

## Reliability Tips

- Add synchronization guards (snapshot/wait) after mutations.
- Account for snapshot drift during navigation.
- Divide extended workflows into phases: navigation, verification/extraction, cleanup.
