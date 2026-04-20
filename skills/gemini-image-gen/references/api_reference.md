# Gemini Image Generation API Reference

## Setup

### Get an API Key

1. Visit https://aistudio.google.com/apikey
2. Click "Create API key" and select a Google Cloud project (or create one)
3. Copy the key

### Set the Environment Variable

```bash
# Add to ~/.zshrc or ~/.bashrc
export GEMINI_API_KEY='your-key-here'
```

The `google-genai` SDK checks `GEMINI_API_KEY` first, then falls back to `GOOGLE_API_KEY`.

### Install the SDK

```bash
pip3 install google-genai
```

Note: The older `google-generativeai` package is deprecated. Use `google-genai`.

---

## Models

| Model | Type | Best For | Notes |
|-------|------|----------|-------|
| `gemini-2.5-flash` | Text | SVG code generation | Fast, good at structured output |
| `gemini-2.5-flash-image` | Image | Quick raster images | Fast, general purpose |
| `gemini-3-pro-image-preview` | Image | High-quality raster | Pro quality, slower |
| `gemini-3.1-flash-image-preview` | Image | High-volume generation | Speed optimized |

### SVG Generation (text models)

Text models generate SVG as XML code in the response text. Use `gemini-2.5-flash` for best code quality.

### PNG Generation (image models)

Image models return PNG as base64-encoded `inline_data` parts. Configure with `ImageConfig`.

---

## Image Config Parameters

### Aspect Ratios

`1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9`

### Resolutions (image_size)

| Value | Approximate Output |
|-------|--------------------|
| `1K` | ~1024px on longest side |
| `2K` | ~2048px on longest side |
| `4K` | ~4096px on longest side |

### Response Modalities

For image generation, set `response_modalities=["TEXT", "IMAGE"]`.

---

## Python SDK Usage

### SVG (text model)

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Generate an SVG icon of a gear",
    config=types.GenerateContentConfig(
        system_instruction="Output only valid SVG XML. No markdown fences.",
        temperature=0.7,
        max_output_tokens=8192,
    ),
)

svg_code = response.text
```

### PNG (image model)

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="A mountain landscape at sunset",
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K",
        ),
    ),
)

for part in response.parts:
    if part.inline_data is not None:
        part.as_image().save("output.png")
```

### With Reference Image

```python
import base64
from google import genai
from google.genai import types

client = genai.Client()

with open("reference.png", "rb") as f:
    ref_data = f.read()

contents = [
    types.Part(inline_data=types.Blob(
        mime_type="image/png",
        data=base64.b64encode(ref_data).decode()
    )),
    types.Part(text="Generate a similar style image but with blue tones"),
]

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=contents,
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(image_size="2K"),
    ),
)
```

---

## Rate Limits

| Tier | Image Models (RPM) | Text Models (RPM) |
|------|--------------------|--------------------|
| Free | ~15 | ~15 |
| Pay-as-you-go | Higher (varies) | Higher (varies) |

RPM = Requests Per Minute. Image generation requests are more expensive than text.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `PERMISSION_DENIED` | Invalid or missing API key | Check `GEMINI_API_KEY` is set correctly |
| `RESOURCE_EXHAUSTED` | Rate limit exceeded | Wait and retry, or upgrade tier |
| `INVALID_ARGUMENT` | Bad aspect ratio or size | Check supported values above |
| `SAFETY` block | Content policy violation | Rephrase the prompt |
| Empty response | Prompt too vague or blocked | Add more detail to the prompt |

---

## Notes

- All generated PNG images include an invisible SynthID watermark
- Image models support up to 14 reference images (model-dependent)
- Google Search grounding available for factual image requests via `tools=[types.Tool(google_search=types.GoogleSearch())]`
- Batch API available for high-volume generation with delayed turnaround (up to 24h)
