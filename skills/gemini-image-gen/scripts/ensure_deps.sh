#!/usr/bin/env bash
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Check for google-genai SDK
if python3 -c "from google import genai" 2>/dev/null; then
    echo "[ok] google-genai is installed"
else
    echo "[install] Installing google-genai..."
    pip3 install google-genai
    echo "[ok] google-genai installed"
fi

# Check for API key
if [ -n "${GEMINI_API_KEY:-}" ] || [ -n "${GOOGLE_API_KEY:-}" ]; then
    echo "[ok] API key found"
else
    echo "[warn] No GEMINI_API_KEY or GOOGLE_API_KEY environment variable set."
    echo "       Get a key at: https://aistudio.google.com/apikey"
    echo "       Then: export GEMINI_API_KEY='your-key-here'"
fi
