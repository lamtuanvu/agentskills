#!/bin/bash
# Ensure agent-device CLI is installed globally.
# Run this script before using any agent-device commands.

set -e

if command -v agent-device &>/dev/null; then
  echo "agent-device is already installed: $(agent-device --version 2>/dev/null || echo 'version unknown')"
  exit 0
fi

echo "agent-device not found. Installing globally via npm..."

if ! command -v npm &>/dev/null; then
  echo "ERROR: npm is not installed. Install Node.js 18+ first."
  exit 1
fi

npm install -g agent-device
echo "agent-device installed successfully: $(agent-device --version 2>/dev/null || echo 'done')"
