#!/bin/bash
# Ensure @google/genai SDK is available for video analysis scripts.
# Run before any analyze-video.mjs invocation.

set -e

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$SKILL_DIR/node_modules/@google" ]; then
  echo "Installing @google/genai SDK..."
  cd "$SKILL_DIR"
  npm init -y --silent 2>/dev/null || true
  npm install @google/genai --silent
  echo "@google/genai installed successfully."
else
  echo "@google/genai already installed."
fi
