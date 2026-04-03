# SVG Prompt Templates

Reusable prompt skeletons organized by category. Replace `{placeholders}` with specifics.

---

## Icons

### Toolbar Icon (24x24)

> Generate an SVG toolbar icon for {action}. ViewBox 0 0 24 24. Line-art style with uniform 2px rounded stroke, currentColor, no fills. Minimal paths, abstract representation. No text elements.

Variables: `{action}` - e.g., "settings gear", "search magnifying glass", "home house"

Example:
> Generate an SVG toolbar icon for a download arrow pointing down into a tray. ViewBox 0 0 24 24. Line-art style with uniform 2px rounded stroke, currentColor, no fills. Minimal paths, abstract representation. No text elements.

### App Icon (512x512)

> Generate an SVG app icon for {app_concept}. ViewBox 0 0 512 512. {style} style. Use {color_scheme}. Include rounded-rectangle background with rx="80". Center the main symbol. No text elements.

Variables: `{app_concept}`, `{style}` (flat/gradient), `{color_scheme}`

Example:
> Generate an SVG app icon for a weather forecast app. ViewBox 0 0 512 512. Gradient style. Use a sky-blue to deep-blue gradient background with a white sun and cloud symbol. Include rounded-rectangle background with rx="80". Center the main symbol. No text elements.

### Status Icon

> Generate an SVG status indicator icon for {status}. ViewBox 0 0 16 16. Flat style. Use {color} as primary. Simple geometric shape, immediately recognizable at small sizes.

Variables: `{status}` (success/error/warning/info), `{color}` (green/red/amber/blue)

---

## Logos

### Lettermark

> Generate an SVG lettermark logo using the letter(s) "{letters}". ViewBox 0 0 200 200. {style} style. Colors: {colors}. Convert all text to paths for portability. Bold, modern typography. Negative space design.

Variables: `{letters}`, `{style}`, `{colors}`

Example:
> Generate an SVG lettermark logo using the letter "V". ViewBox 0 0 200 200. Geometric style. Colors: #2563EB primary, white negative space. Convert all text to paths for portability. Bold, modern typography. Negative space design.

### Icon-Logo (Symbol Only)

> Generate an SVG symbol logo representing {concept}. ViewBox 0 0 200 200. {style} style. Colors: {colors}. Abstract, memorable, works at 16px and 512px. No text. Maximum 15 path elements.

Variables: `{concept}`, `{style}`, `{colors}`

### Combination Mark

> Generate an SVG combination logo: symbol on left, wordmark "{name}" on right. ViewBox 0 0 400 120. Flat style. Colors: {colors}. Convert text to paths. Clean sans-serif letterforms. Symbol should work independently when cropped.

Variables: `{name}`, `{colors}`

---

## Illustrations

### Hero Illustration

> Generate an SVG hero illustration depicting {scene}. ViewBox 0 0 800 500. {style} style. Color palette: {colors}. Layered composition with foreground, midground, background. Moderate detail level. No text elements.

Variables: `{scene}`, `{style}`, `{colors}`

Example:
> Generate an SVG hero illustration depicting a person working at a desk with floating data visualizations around them. ViewBox 0 0 800 500. Flat style. Color palette: indigo, violet, soft blue, white. Layered composition with foreground, midground, background. Moderate detail level. No text elements.

### Empty State Illustration

> Generate an SVG empty-state illustration for {context}. ViewBox 0 0 300 300. Minimal flat style with soft pastel colors. Convey {emotion} through simple shapes and composition. Centered composition. Under 20 elements total.

Variables: `{context}` (e.g., "no search results", "empty inbox"), `{emotion}` (e.g., "calm encouragement", "gentle humor")

### Spot Illustration

> Generate a small SVG spot illustration of {subject}. ViewBox 0 0 120 120. {style} style. Colors: {colors}. Simple, decorative, used inline with text. Under 10 elements.

Variables: `{subject}`, `{style}`, `{colors}`

---

## UI Elements

### Loading Spinner

> Generate an SVG loading spinner animation. ViewBox 0 0 40 40. Use {color} for the active arc, light gray for the track. Include `<animateTransform>` for smooth 360-degree rotation. Stroke-based, no fills. Stroke-width 4, stroke-linecap round.

Variables: `{color}`

### Avatar Placeholder

> Generate an SVG avatar placeholder. ViewBox 0 0 80 80. Circular clip, {background_color} fill. Generic person silhouette in {foreground_color}. Minimal geometry.

Variables: `{background_color}`, `{foreground_color}`

### Button Icon Set

> Generate {count} SVG button icons in a consistent style for: {actions}. Each in its own `<g>` with id="{action-name}". ViewBox 0 0 {width} 24 where width = count * 32. Flat style, currentColor, 2px stroke, no fills.

Variables: `{count}`, `{actions}`, `{width}`

---

## Diagrams

### Flowchart

> Generate an SVG flowchart showing: {steps}. ViewBox 0 0 600 {height}. Use rounded rectangles for steps, diamonds for decisions, arrows for flow. Colors: {palette}. Include text labels in Arial. Top-to-bottom layout.

Variables: `{steps}` (list), `{height}`, `{palette}`

### Architecture Diagram

> Generate an SVG architecture diagram showing: {components}. ViewBox 0 0 800 500. Box-and-arrow style. Group by layer: {layers}. Use {colors} to distinguish layers. Include labeled arrows for connections. Arial 12px for labels.

Variables: `{components}`, `{layers}`, `{colors}`

### Timeline

> Generate an SVG horizontal timeline with {count} milestones: {items}. ViewBox 0 0 {width} 150. Flat style. Central horizontal line with circular markers. Labels above/below alternating. Colors: {colors}.

Variables: `{count}`, `{items}`, `{width}`, `{colors}`

---

## Badges

### Status Badge

> Generate an SVG status badge reading "{label}: {value}". ViewBox 0 0 {width} 20. Shields.io style: left half dark gray with label, right half {color} with value. Rounded corners rx=3. Arial 11px white text, convert to paths.

Variables: `{label}`, `{value}`, `{width}`, `{color}`

Example:
> Generate an SVG status badge reading "build: passing". ViewBox 0 0 90 20. Shields.io style: left half #555 with "build", right half #4c1 with "passing". Rounded corners rx=3. Arial 11px white text, convert to paths.

### Achievement Badge

> Generate an SVG achievement badge for "{achievement}". ViewBox 0 0 120 120. Circular medal design with {color_scheme}. Include a central symbol representing {symbol}. Ribbon or laurel border. No text (symbol only).

Variables: `{achievement}`, `{color_scheme}`, `{symbol}`
