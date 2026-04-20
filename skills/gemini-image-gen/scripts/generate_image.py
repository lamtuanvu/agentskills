#!/usr/bin/env python3
"""Generate PNG raster images using Gemini image models."""

import argparse
import base64
import os
import sys

VALID_ASPECT_RATIOS = [
    "1:1", "1:4", "1:8", "2:3", "3:2", "3:4",
    "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9",
]
VALID_SIZES = ["1K", "2K", "4K"]

def check_api_key():
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("Error: Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.", file=sys.stderr)
        print("Get a key at: https://aistudio.google.com/apikey", file=sys.stderr)
        sys.exit(1)
    return key

def main():
    parser = argparse.ArgumentParser(description="Generate PNG images using Gemini")
    parser.add_argument("prompt", help="Description of the image to generate")
    parser.add_argument("-o", "--output", required=True, help="Output .png file path")
    parser.add_argument("--model", default="gemini-3-pro-image-preview",
                        help="Gemini image model (default: gemini-3-pro-image-preview)")
    parser.add_argument("--aspect-ratio", default="1:1", choices=VALID_ASPECT_RATIOS,
                        help="Aspect ratio (default: 1:1)")
    parser.add_argument("--size", default="2K", choices=VALID_SIZES,
                        help="Resolution (default: 2K)")
    parser.add_argument("--reference", help="Path to reference image for style guidance")

    args = parser.parse_args()

    if not args.output.endswith(".png"):
        print("Error: Output file must end with .png", file=sys.stderr)
        sys.exit(1)

    check_api_key()

    from google import genai
    from google.genai import types

    client = genai.Client()

    # Build content parts
    contents = []
    if args.reference:
        if not os.path.exists(args.reference):
            print(f"Error: Reference image not found: {args.reference}", file=sys.stderr)
            sys.exit(1)
        with open(args.reference, "rb") as f:
            ref_data = f.read()
        ext = os.path.splitext(args.reference)[1].lower()
        mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
        mime = mime_map.get(ext, "image/png")
        contents.append(types.Part(inline_data=types.Blob(mime_type=mime, data=base64.b64encode(ref_data).decode())))
        contents.append(types.Part(text=args.prompt))
    else:
        contents = args.prompt

    config = types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio=args.aspect_ratio,
            image_size=args.size,
        ),
    )

    try:
        response = client.models.generate_content(
            model=args.model,
            contents=contents,
            config=config,
        )
    except Exception as e:
        print(f"Error: Gemini API call failed: {e}", file=sys.stderr)
        sys.exit(1)

    # Find and save the image part
    saved = False
    for part in response.parts:
        if part.text is not None:
            print(f"Model note: {part.text}", file=sys.stderr)
        elif part.inline_data is not None:
            os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
            image = part.as_image()
            image.save(args.output)
            saved = True
            break

    if not saved:
        print("Error: No image in response. The prompt may have been blocked by content policy.", file=sys.stderr)
        sys.exit(1)

    size = os.path.getsize(args.output)
    print(f"Saved {args.output} ({size} bytes)")

if __name__ == "__main__":
    main()
