# Session Management

## Named Sessions

```bash
agent-device --session auth open Settings --platform ios
agent-device --session auth snapshot -i
```

Sessions isolate device context. A device can only be held by one session at a time.

## Best Practices

- Name sessions semantically.
- Close sessions when done.
- Use separate sessions for parallel work.
- In iOS sessions, use `open <app>`. `open <url>` opens deep links.
- `open <app> <url>` opens a deep link within an app context.
- For dev loops with runtime state persistence (e.g. React Native Fast Refresh), use `open <app> --relaunch`.
- Use `--save-script [path]` to record replay scripts on `close`.
- For deterministic replay scripts, prefer selector-based actions and assertions.
- Use `replay -u` to update selector drift during maintenance.

## Scoped Device Isolation

Use scoped discovery when sessions must not see host-global device lists:

```bash
agent-device devices --platform ios --ios-simulator-device-set /tmp/tenant-a/simulators
agent-device devices --platform android --android-device-allowlist emulator-5554,device-1234
```

- Scope is applied before selectors (`--device`, `--udid`, `--serial`).
- If selector target is outside scope, resolution fails with `DEVICE_NOT_FOUND`.
- Environment equivalents:
  - `AGENT_DEVICE_IOS_SIMULATOR_DEVICE_SET`
  - `AGENT_DEVICE_ANDROID_DEVICE_ALLOWLIST`

## Listing Sessions

```bash
agent-device session list
```

## Replay Within Sessions

```bash
agent-device replay ./session.ad --session auth
agent-device replay -u ./session.ad --session auth
```
