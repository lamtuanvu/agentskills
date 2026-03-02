# Performance Metrics (`perf` / `metrics`)

Use when measuring launch performance in agent workflows.

## Quick Flow

```bash
agent-device open Settings --platform ios
agent-device perf --json
```

Alias: `agent-device metrics --json`

## What Is Measured

- Session-scoped `startup` timing only.
- Sampling method: `open-command-roundtrip`.
- Unit: milliseconds (`ms`).

## Output Fields

- `metrics.startup.lastDurationMs`: most recent startup sample.
- `metrics.startup.lastMeasuredAt`: ISO timestamp of most recent sample.
- `metrics.startup.sampleCount`: number of retained samples.
- `metrics.startup.samples[]`: recent startup history.
- `sampling.startup.method`: current sampling method identifier.

## Platform Support

- iOS simulator: supported.
- iOS physical device: supported.
- Android emulator/device: supported.
- `fps`, `memory`, `cpu`: currently placeholders (`available: false`).

## Interpretation Guidance

- Values represent command round-trip timing, not true app first-frame telemetry.
- Compare like-for-like runs (same device, same app build, same workflow).
- Use multiple runs and compare trend/median, not one-off samples.

## Common Pitfalls

- Running `perf` before any `open` yields no startup sample.
- Comparing values across different devices introduces noise.
- Interpreting `startup` as CPU/FPS/memory would be incorrect.
