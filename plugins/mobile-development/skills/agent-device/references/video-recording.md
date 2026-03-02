# Video Recording

Capture device automation sessions as video.

## iOS Simulator

```bash
agent-device record start ./recordings/ios.mov
# ... perform automation actions ...
agent-device record stop
```

iOS recording wraps `simctl` (simulator only).

## Android Emulator/Device

```bash
agent-device record start ./recordings/android.mp4
# ... perform automation actions ...
agent-device record stop
```

Android recording wraps `adb screenrecord`.

## Notes

- iOS: `.mov` format, simulator only.
- Android: `.mp4` format, emulator and physical devices.
- Start recording before the workflow, stop after completion.
