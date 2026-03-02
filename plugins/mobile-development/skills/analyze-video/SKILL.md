---
name: analyze-video
description: Analyzes video files and YouTube URLs using the Gemini API to extract detailed descriptions, UI elements, text, actions, timestamps, and more. This skill should be used when the user provides a video file or YouTube URL and wants to understand its content, extract information, detect issues, or get a detailed breakdown of what happens in the video.
---

# Video Analysis with Gemini

Extract detailed information from video files and YouTube URLs using Google's Gemini multimodal models.

## Prerequisites

1. Set the `GEMINI_API_KEY` environment variable. Get a key at https://aistudio.google.com/apikey
2. Run the dependency installer before first use:

```bash
bash scripts/ensure-deps.sh
```

## Quick Start

Analyze a local video file:

```bash
GEMINI_API_KEY=<key> node scripts/analyze-video.mjs ./recording.mp4 "Describe what happens"
```

Analyze a YouTube video:

```bash
GEMINI_API_KEY=<key> node scripts/analyze-video.mjs "https://youtube.com/watch?v=abc" "Summarize this"
```

## Decision Map

- Local video file (<100MB): script uses inline data (fast, no upload wait)
- Local video file (>100MB): script uses File API upload (handles polling automatically)
- YouTube URL: script sends URL directly to Gemini (public videos only)
- Need specific segment: use `--start` and `--end` flags (seconds)
- Fast-moving content: increase FPS with `--fps 5`

## Script Usage

```bash
node scripts/analyze-video.mjs <video-path-or-youtube-url> [prompt] [options]
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--model <name>` | Gemini model | `gemini-2.5-flash` |
| `--fps <number>` | Frame sampling rate | 1 (one per second) |
| `--start <seconds>` | Start offset for clipping | none |
| `--end <seconds>` | End offset for clipping | none |
| `--json` | Output raw JSON response | off |

### Examples

General description:

```bash
node scripts/analyze-video.mjs ./demo.mp4
```

Extract UI elements from a screen recording:

```bash
node scripts/analyze-video.mjs ./app-recording.mp4 "Identify all UI elements, buttons, text, and user interactions. Note timestamps for each screen transition."
```

Analyze a specific segment of a YouTube video:

```bash
node scripts/analyze-video.mjs "https://youtube.com/watch?v=XYZ" "What happens in this segment?" --start 60 --end 120
```

High FPS for fast-action content:

```bash
node scripts/analyze-video.mjs ./gameplay.mp4 "Describe the key moments" --fps 5
```

Use a higher-quality model:

```bash
node scripts/analyze-video.mjs ./presentation.mp4 "Extract all text on screen" --model gemini-2.5-pro
```

## Common Prompts

| Task | Prompt |
|------|--------|
| General description | `"Describe this video in detail with timestamps"` |
| UI/UX analysis | `"Identify all UI elements, buttons, and screen transitions with timestamps"` |
| Text extraction | `"Extract all text visible on screen throughout the video with timestamps"` |
| Action sequence | `"List every action performed in chronological order with timestamps"` |
| Bug detection | `"Identify visual glitches, errors, or unexpected behaviors in this recording"` |
| Accessibility | `"Analyze for accessibility issues: contrast, touch targets, missing labels"` |

## Supported Formats

`mp4`, `mpeg`, `mov`, `avi`, `flv`, `mpg`, `webm`, `wmv`, `3gpp`

## Limits

- Inline data: <100MB (auto-selected by script)
- File API upload: up to 2GB (free) / 20GB (paid)
- YouTube: public videos only, free tier max 8h/day
- Context window: ~1 hour at default resolution, ~3 hours at low resolution

## References

For advanced configuration (custom FPS, clipping, caching, token costs):

- [references/api-reference.md](references/api-reference.md) - Full API details, token math, prompting patterns
