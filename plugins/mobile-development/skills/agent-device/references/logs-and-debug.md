# Logs (Token-Efficient Debugging)

Logging is off by default in normal flows. Enable on demand for debugging windows.
App output is written to a session-scoped file so agents can grep it instead of loading full logs into context.
`network dump` parses recent HTTP(s) entries from this same session app log file.

## Data Handling

- Default app logs stored under `~/.agent-device/sessions/<session>/app.log`.
- Replay scripts saved with `--save-script` written to the explicit path provided.
- Log files may contain sensitive runtime data; review before sharing and clean up when finished.
- Use `AGENT_DEVICE_APP_LOG_REDACT_PATTERNS` to redact sensitive patterns at write time.

## Quick Flow

```bash
agent-device open MyApp --platform ios
agent-device logs clear --restart    # Stop stream, clear logs, start streaming again
agent-device network dump 25         # Parse latest HTTP(s) requests from app.log
agent-device logs path               # Print path
agent-device logs doctor             # Check tool/runtime readiness
agent-device logs mark "before tap"  # Insert timeline marker
# ... run flows; on failure, grep the path
agent-device logs stop               # Stop streaming
```

Precondition: `logs clear --restart` requires an active app session (`open <app>` first).

## Command Notes

- `logs path`: returns log file path and metadata.
- `logs start`: starts streaming; requires active app session.
- `logs stop`: stops streaming. Session `close` also stops logging.
- `logs clear`: truncates `app.log` and removes rotated files. Requires logging stopped first.
- `logs clear --restart`: convenience reset for repro loops (stop, clear, restart).
- `logs doctor`: reports backend/tool checks and readiness notes.
- `logs mark`: writes a timestamped marker line to the session log.
- `network dump [limit] [summary|headers|body|all]`: parses recent HTTP(s) lines from session app log.

## Behavior and Limits

- `logs start` appends to `app.log` and rotates to `app.log.1` when exceeding 5 MB.
- `network dump` scans last 4000 app-log lines, returns up to 200 entries, truncates at 2048 chars.
- Android log streaming automatically rebinds after process restarts.
- Retention knobs: `AGENT_DEVICE_APP_LOG_MAX_BYTES`, `AGENT_DEVICE_APP_LOG_MAX_FILES`.

## Grep Patterns

After getting the path from `logs path`, run `grep` so only matching lines enter context:

```bash
grep -n "Error\|Exception\|Fatal" <path>
grep -n -E "Error|Exception|Fatal|crash" <path>
tail -50 <path>
```

## Crash Triage Fast Path

Always start from the session app log, then branch by platform:

```bash
agent-device logs path
grep -n -E "SIGABRT|SIGSEGV|EXC_|fatal|exception|terminated|killed|jetsam|FATAL EXCEPTION" <path>
```

### iOS

```bash
ls -lt ~/Library/Logs/DiagnosticReports | grep -E "<AppName>|<BundleId>" | head
```

- `SIGABRT`: app/runtime abort; inspect `.ips` triggered thread and top frames.
- `SIGKILL` + jetsam markers: memory-pressure kill.
- `EXC_BAD_ACCESS`/`SIGSEGV`: native memory access issue.

### Android

```bash
adb -s <serial> logcat -d | grep -n -E "FATAL EXCEPTION|Process: <package>|Abort message|signal [0-9]+ \\(SIG"
```

- `FATAL EXCEPTION` with Java stack: uncaught Java/Kotlin exception.
- `signal 6 (SIGABRT)` or `signal 11 (SIGSEGV)`: native crash path.
- `Low memory killer` entries: OS memory-pressure/process reclaim.

## Stop Conditions

- If no crash signature in app log, switch to platform-native crash sources.
- If root cause class identified, stop collecting broad logs and focus on reproducing.
