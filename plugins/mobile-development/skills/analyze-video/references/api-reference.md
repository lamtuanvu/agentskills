# Gemini Video Understanding API Reference

## Input Methods and Limits

| Method | Max Size | Best For |
|--------|----------|----------|
| File API | 20GB (paid) / 2GB (free) | Large files (>100MB), long videos (>10min), reusable files |
| Inline Data | <100MB | Small files, short duration (<1min), one-off inputs |
| YouTube URLs | N/A | Public YouTube videos only |

## Supported Video Formats

- `video/mp4`, `video/mpeg`, `video/mov`, `video/avi`
- `video/x-flv`, `video/mpg`, `video/webm`, `video/wmv`, `video/3gpp`

## Technical Specifications

- Default sampling: 1 frame per second (FPS), audio at 1Kbps
- Frame tokenization: 258 tokens per frame (default), 66 tokens (low resolution)
- Audio: 32 tokens per second
- Approximate total: ~300 tokens per second at default resolution
- 1M context window models: up to 1 hour (default res), 3 hours (low res)
- Timestamp format: `MM:SS` (e.g., `01:15`)

## YouTube Limitations

- Free tier: max 8 hours of uploads per day
- Public videos only (no private/unlisted)
- Gemini 2.5+: up to 10 videos per request
- Older models: 1 video per request

## Advanced Features

### Custom Frame Rate

Lower FPS for static content (lectures), higher FPS for fast-action:

```javascript
const part = {
  inlineData: { data: base64Video, mimeType: "video/mp4" },
  videoMetadata: { fps: 5 }
};
```

### Video Clipping (Start/End Offsets)

```javascript
const part = {
  fileData: { fileUri: "https://youtube.com/watch?v=..." },
  videoMetadata: { startOffset: "60s", endOffset: "120s" }
};
```

### Timestamp Referencing in Prompts

Reference specific moments using `MM:SS` format:

```
"What happens at 01:30? Describe the transition at 02:45."
```

### Context Caching

For videos >10 minutes or repeated analysis against the same file, implement context caching to reduce costs and improve latency.

## Available Models

- `gemini-2.5-flash` - Fast, cost-efficient (recommended default)
- `gemini-2.5-pro` - Higher quality analysis
- `gemini-2.0-flash` - Previous generation fast model

## Common Prompting Patterns

### General Description
```
Describe this video in detail. Include key events, visual elements, and timestamps.
```

### UI/UX Analysis
```
Identify all UI elements, buttons, text, and user interactions visible in this video. Note timestamps for each screen transition.
```

### Content Extraction
```
Extract all text visible on screen throughout the video. Include timestamps.
```

### Action Sequence
```
List every action performed in chronological order with timestamps.
```

### Bug/Issue Detection
```
Identify any visual glitches, errors, unexpected behaviors, or UI issues in this screen recording.
```

### Accessibility Review
```
Analyze this app recording for accessibility issues: contrast, touch targets, missing labels, navigation flow.
```
