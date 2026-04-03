#!/usr/bin/env python3
"""Generate SVG vector graphics using Gemini text models."""

import argparse
import os
import re
import sys

def check_api_key():
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("Error: Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.", file=sys.stderr)
        print("Get a key at: https://aistudio.google.com/apikey", file=sys.stderr)
        sys.exit(1)
    return key

def build_system_prompt(viewbox, colors, style):
    parts = [
        "Generate only valid SVG XML code. No markdown fences, no explanation, no surrounding text.",
        "The SVG must be self-contained, scalable, and use vector paths only (no embedded raster images).",
        f'Use viewBox="{viewbox}".',
        "Group related elements with <g> tags using descriptive id attributes.",
        "Use clean, minimal path data. Prefer simple shapes (<rect>, <circle>, <ellipse>, <line>, <polygon>) over complex paths when possible.",
    ]
    if colors:
        parts.append(f"Color scheme: {colors}.")
    if style:
        style_hints = {
            "flat": "Use flat design: solid fills, no gradients, no shadows, no 3D effects.",
            "line-art": "Use line-art style: strokes only, no fills, uniform stroke width.",
            "gradient": "Use gradient fills for depth. Include <defs> with <linearGradient> or <radialGradient>.",
            "isometric": "Use isometric perspective with consistent 30-degree angles.",
        }
        parts.append(style_hints.get(style, f"Visual style: {style}."))
    return " ".join(parts)

def clean_svg(text):
    """Strip markdown fences and whitespace, extract SVG content."""
    # Remove markdown code fences
    text = re.sub(r"^```(?:svg|xml)?\s*\n?", "", text.strip())
    text = re.sub(r"\n?```\s*$", "", text.strip())
    text = text.strip()

    # Try to extract just the SVG if there's surrounding text
    match = re.search(r"(<\?xml.*?)?(<svg[\s\S]*</svg>)", text, re.DOTALL)
    if match:
        xml_decl = match.group(1) or ""
        svg_body = match.group(2)
        text = (xml_decl + svg_body).strip()

    return text

def validate_svg(text):
    """Basic validation that output looks like SVG."""
    if not (text.startswith("<svg") or text.startswith("<?xml")):
        return False
    if "</svg>" not in text:
        return False
    return True

def main():
    parser = argparse.ArgumentParser(description="Generate SVG graphics using Gemini")
    parser.add_argument("prompt", help="Description of the SVG to generate")
    parser.add_argument("-o", "--output", required=True, help="Output .svg file path")
    parser.add_argument("--model", default="gemini-2.5-flash", help="Gemini text model (default: gemini-2.5-flash)")
    parser.add_argument("--viewbox", default="0 0 100 100", help='SVG viewBox (default: "0 0 100 100")')
    parser.add_argument("--colors", help='Color hint: "monochrome", "brand #hex", "vibrant", "pastel"')
    parser.add_argument("--style", choices=["flat", "line-art", "gradient", "isometric"], help="Visual style")

    args = parser.parse_args()

    if not args.output.endswith(".svg"):
        print("Error: Output file must end with .svg", file=sys.stderr)
        sys.exit(1)

    check_api_key()

    from google import genai
    from google.genai import types

    client = genai.Client()
    system_prompt = build_system_prompt(args.viewbox, args.colors, args.style)

    try:
        response = client.models.generate_content(
            model=args.model,
            contents=args.prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
                max_output_tokens=8192,
            ),
        )
    except Exception as e:
        print(f"Error: Gemini API call failed: {e}", file=sys.stderr)
        sys.exit(1)

    if not response.text:
        print("Error: Gemini returned no text output.", file=sys.stderr)
        sys.exit(1)

    svg = clean_svg(response.text)

    if not validate_svg(svg):
        print("Warning: Output may not be valid SVG. Saving anyway.", file=sys.stderr)
        print(f"First 200 chars: {svg[:200]}", file=sys.stderr)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w") as f:
        f.write(svg)

    size = os.path.getsize(args.output)
    print(f"Saved {args.output} ({size} bytes)")

if __name__ == "__main__":
    main()
