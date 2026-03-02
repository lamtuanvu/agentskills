# Coordinate System

All coordinate-based actions (`press`, `longpress`, `swipe`, `pinch`) use device screen coordinates:

- Origin: top-left of the device screen
- X increases rightward, Y increases downward
- Units: device points for iOS, pixels for Android

Use screenshots to reason about coordinates:

```bash
agent-device screenshot ./screen.png
agent-device press 300 500
agent-device swipe 540 1500 540 500 120
```

Gesture modifiers:

```bash
agent-device press 300 500 --count 12 --interval-ms 45
agent-device press 300 500 --count 6 --hold-ms 120 --jitter-px 2
agent-device press @e5 --double-tap
agent-device swipe 540 1500 540 500 120 --count 8 --pattern ping-pong
```
