---
name: gemini-image-gen
description: "Generates high-quality images using Google's Gemini API. Supports SVG vector graphics (icons, logos, illustrations, UI elements) via text models and PNG raster images via image generation models. This skill should be used when generating visual assets, creating vector resources for projects, producing icons or logos, or creating image content with AI."
argument-hint: "a flat-style settings gear icon"
---

# Gemini Image Generation

Generate SVG vector graphics and PNG raster images using Google's Gemini API.

## Prerequisites

1. Set `GEMINI_API_KEY` environment variable (get a key at https://aistudio.google.com/apikey)
2. Install dependencies: `bash scripts/ensure_deps.sh`

Full setup details in [references/api_reference.md](references/api_reference.md).

## Decision Map

| Need | Flow | Script |
|------|------|--------|
| Scalable vector graphic (icon, logo, diagram, UI element) | **SVG** | `generate_svg.py` |
| Photo-realistic or complex raster image | **PNG** | `generate_image.py` |
| Edit/refine an existing image | **PNG** with `--reference` | `generate_image.py` |
| Multiple variants | Run script multiple times with prompt variations | Either |
| Unsure | Default to **SVG** for project resources | `generate_svg.py` |

## SVG Generation (Primary)

Use Gemini text models to generate SVG XML code directly. Best for project assets.

### Basic

```bash
python3 scripts/generate_svg.py "a minimalist settings gear icon, flat style" \
  -o assets/icons/settings.svg
```

### With Style and Color Options

```bash
python3 scripts/generate_svg.py "a cloud upload icon" \
  -o assets/icons/upload.svg \
  --style line-art \
  --colors "monochrome #333333" \
  --viewbox "0 0 24 24"
```

### Options

| Flag | Default | Values |
|------|---------|--------|
| `--model` | `gemini-2.5-flash` | Any Gemini text model |
| `--viewbox` | `0 0 100 100` | Any valid SVG viewBox |
| `--colors` | None | `"monochrome"`, `"brand #hex"`, `"vibrant"`, `"pastel"` |
| `--style` | None | `flat`, `line-art`, `gradient`, `isometric` |

### Using Prompt Templates

Refer to [assets/svg_prompt_templates.md](assets/svg_prompt_templates.md) for categorized prompt skeletons. Copy a template, fill in the placeholders, and pass as the prompt argument. Categories: icons, logos, illustrations, UI elements, diagrams, badges.

## PNG Generation

Use Gemini image models for raster output when vector is not suitable.

### Basic

```bash
python3 scripts/generate_image.py "a mountain landscape at golden hour" \
  -o assets/images/hero.png
```

### With Full Options

```bash
python3 scripts/generate_image.py "product mockup of a phone showing the app dashboard" \
  -o assets/images/mockup.png \
  --model gemini-3-pro-image-preview \
  --aspect-ratio 16:9 \
  --size 2K
```

### With Reference Image

```bash
python3 scripts/generate_image.py "same composition but with a dark theme" \
  -o assets/images/dark-mockup.png \
  --reference assets/images/mockup.png
```

### Options

| Flag | Default | Values |
|------|---------|--------|
| `--model` | `gemini-3-pro-image-preview` | `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview` |
| `--aspect-ratio` | `1:1` | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `16:9`, `9:16`, `21:9`, etc. |
| `--size` | `2K` | `1K`, `2K`, `4K` |
| `--reference` | None | Path to a reference image |

## Model Selection

| Model | Type | Best For | Speed |
|-------|------|----------|-------|
| `gemini-2.5-flash` | Text/SVG | Vector graphics, SVG code | Fast |
| `gemini-2.5-flash-image` | Image/PNG | Quick raster images | Fast |
| `gemini-3-pro-image-preview` | Image/PNG | High-quality raster, pro assets | Slower |
| `gemini-3.1-flash-image-preview` | Image/PNG | Batch/high-volume generation | Fast |

## Prompt Tips

- Be specific about style, colors, and composition rather than vague
- For icons: specify viewBox matching intended use (24x24 for toolbar, 512x512 for app)
- For SVG: request "no text elements" unless text is needed, to avoid font dependencies
- For PNG: use photography terms (lighting, angle, depth of field) for realistic results
- Prefix with "flat style" or "line-art" to control visual approach

Advanced prompt strategies in [references/svg_prompting_guide.md](references/svg_prompting_guide.md).

## Guardrails

- For SVG output: verify the file contains valid `<svg>` tags before considering complete
- For PNG output: confirm file was written and is non-zero bytes
- API rate limits: ~15 RPM on free tier. Space rapid successive calls
- Content policy: Gemini rejects certain prompts. If blocked, rephrase without restricted terms
- Save outputs to the project directory, not temporary locations

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using an image model for SVG | Image models output PNG only. Use `generate_svg.py` with a text model |
| No API key set | Run `bash scripts/ensure_deps.sh` to check, or set `GEMINI_API_KEY` |
| Vague SVG prompts | Add style, color, viewBox, and element constraints. Use a template |
| SVG has `<text>` with missing fonts | Add "convert text to paths" or "no text elements" to prompt |

## References

Consult when blocked or need detailed information:

- [references/api_reference.md](references/api_reference.md) -- Full API parameters, models, rate limits, setup guide, code examples
- [references/svg_prompting_guide.md](references/svg_prompting_guide.md) -- Advanced SVG prompt strategies, style vocabulary, pitfalls
- [assets/svg_prompt_templates.md](assets/svg_prompt_templates.md) -- Reusable prompt skeletons for icons, logos, illustrations, UI elements, diagrams, badges
