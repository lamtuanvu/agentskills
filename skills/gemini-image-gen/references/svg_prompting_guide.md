# SVG Prompting Guide

Strategies for generating high-quality SVG code with Gemini text models.

## System Prompt Construction

The `generate_svg.py` script uses a system prompt with these constraints:

1. **Output-only**: "Generate only valid SVG XML code. No markdown fences, no explanation."
2. **Vector-only**: "Use vector paths only, no embedded raster images."
3. **ViewBox**: Explicit viewBox specification for scalability.
4. **Semantic grouping**: "Group related elements with `<g>` tags using descriptive id attributes."
5. **Simplicity**: "Prefer simple shapes over complex paths when possible."

Each constraint prevents a specific failure mode. Removing any one leads to degraded output.

## Specificity Hierarchy

More specific prompts produce better SVGs. Progression from vague to precise:

| Level | Example | Quality |
|-------|---------|---------|
| Vague | "a house" | Unpredictable |
| Basic | "a simple house icon, flat style" | Acceptable |
| Detailed | "a minimalist house icon with a triangular roof, rectangular door, and one square window, flat design, 2px stroke, no fill" | Good |
| Expert | "a 24x24 toolbar icon of a house: equilateral triangle roof, rectangle body, centered door, single window top-left, uniform 2px rounded stroke, currentColor, no fills" | Excellent |

## Style Vocabulary

Map these terms to SVG output characteristics:

| Style Term | SVG Characteristics |
|------------|-------------------|
| `flat` | Solid fills, no gradients, no shadows, no 3D effects, bold colors |
| `line-art` | Stroke-only paths, no fills, uniform stroke-width, clean geometry |
| `gradient` | `<linearGradient>` or `<radialGradient>` in `<defs>`, smooth color transitions |
| `isometric` | Consistent 30-degree transforms, parallelogram shapes, pseudo-3D |
| `hand-drawn` | Slightly irregular paths, organic curves, imperfect geometry |
| `geometric` | Pure mathematical shapes, symmetry, regular polygons |
| `minimal` | Fewest possible elements, high negative space, essential forms only |
| `duotone` | Exactly two colors plus transparency, layered tonal shapes |

## Color Specification

| Approach | Prompt Phrasing | Result |
|----------|----------------|--------|
| Named palette | "Use a warm sunset palette: coral, amber, gold" | Model picks matching hex values |
| Exact hex | "Primary: #2563EB, secondary: #F59E0B" | Precise brand colors |
| Monochrome | "Monochrome using only #333333 and white" | Clean two-tone output |
| Brand hint | "Match the Stripe brand blue" | Approximation (verify hex) |
| currentColor | "Use currentColor for all strokes" | Inherits from parent CSS |

For brand colors, always specify exact hex values rather than relying on the model's approximation.

## Complexity Management

| Complexity | Prompt Guidance | Typical Element Count |
|------------|----------------|----------------------|
| Simple (icons) | "Minimal paths, abstract representation" | 3-10 elements |
| Medium (logos) | "Clean geometry, limited detail" | 10-30 elements |
| Detailed (illustrations) | "Include scene details, layered composition" | 30-100 elements |
| Complex (diagrams) | "Structured layout with labels and connectors" | 50-200+ elements |

For complex SVGs, consider breaking the request into components and composing them.

## Common Pitfalls

### Text in SVGs
- Gemini often uses `<text>` elements which require the font to be available
- For icon/logo use: ask for "no text elements" or "convert text to paths"
- For diagrams where text is needed: specify font-family as a common system font (Arial, sans-serif)

### Overly Complex Paths
- Long `d` attributes in `<path>` elements are error-prone
- Ask for "simple shapes where possible" to reduce path complexity
- For curved elements: "use quadratic bezier curves, not cubic" reduces points

### ViewBox Mismatch
- Always specify viewBox in the prompt to match intended use
- Icon use: `0 0 24 24` or `0 0 100 100`
- Logo/illustration: `0 0 400 200` or similar to match aspect ratio

### Filter Effects
- `<filter>` elements (blur, shadow) may not render consistently across viewers
- For maximum compatibility: "No filter effects, shadows, or blur"

### ClipPath Complexity
- Nested `<clipPath>` and `<mask>` elements increase file size and rendering cost
- For simple shapes: prefer path intersection over clipping

## Iteration Strategies

1. **Refine via prompt, not code**: For major changes, modify the prompt and regenerate rather than hand-editing the SVG
2. **Incremental specificity**: Start with a basic prompt, then add constraints based on what the model gets wrong
3. **Style locking**: Once a style works well, save the exact prompt wording and reuse it as a prefix for similar assets
4. **Component composition**: For complex scenes, generate individual elements separately and combine them
