# Permissions and Setup

## iOS Snapshots

iOS snapshots use XCTest and do not require macOS Accessibility permissions.

## iOS Physical Device Runner

For physical devices, XCTest runner setup requires valid signing/provisioning.
Use Automatic Signing in Xcode, or provide optional overrides:

- `AGENT_DEVICE_IOS_TEAM_ID`
- `AGENT_DEVICE_IOS_SIGNING_IDENTITY`
- `AGENT_DEVICE_IOS_PROVISIONING_PROFILE`
- `AGENT_DEVICE_IOS_BUNDLE_ID` (optional runner bundle-id base override)

Free Apple Developer accounts may reject generic bundle IDs. Set `AGENT_DEVICE_IOS_BUNDLE_ID` to a unique reverse-DNS identifier.

Security guidance:
- These variables are optional and only needed for physical-device XCTest setup.
- Treat values as sensitive host configuration.
- Prefer Xcode Automatic Signing when possible.

If setup/build takes long, increase `AGENT_DEVICE_DAEMON_TIMEOUT_MS` (default `90000`).

If daemon startup fails with stale metadata, clean stale files and retry:
- `~/.agent-device/daemon.json`
- `~/.agent-device/daemon.lock`

## Permission Settings

Permission settings are app-scoped and require an active session:

```bash
agent-device settings permission grant camera
agent-device settings permission deny microphone
agent-device settings permission reset contacts
agent-device settings permission grant photos full    # iOS only: full|limited
agent-device settings faceid enroll                   # iOS simulator
agent-device settings faceid match                    # iOS simulator
agent-device settings fingerprint match               # Android
```

## Simulator Troubleshooting

- If snapshots return 0 nodes, restart Simulator and re-open the app.
- iOS 16+ "Allow Paste" prompt is suppressed by XCUITest runtime.
