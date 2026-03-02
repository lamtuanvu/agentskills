#!/usr/bin/env node
/**
 * Analyze a video file or YouTube URL using the Gemini API.
 *
 * Usage:
 *   node analyze-video.mjs <video-path-or-youtube-url> [prompt] [options]
 *
 * Options:
 *   --model <model>       Gemini model to use (default: gemini-2.5-flash)
 *   --fps <number>        Custom frame rate for sampling (default: 1)
 *   --start <seconds>     Start offset for clipping (YouTube/uploaded videos)
 *   --end <seconds>       End offset for clipping (YouTube/uploaded videos)
 *   --json                Output raw JSON response
 *
 * Environment:
 *   GEMINI_API_KEY        Required. Gemini API key.
 *
 * Examples:
 *   node analyze-video.mjs ./demo.mp4 "Describe what happens in this video"
 *   node analyze-video.mjs ./demo.mp4 "List all UI elements visible" --fps 5
 *   node analyze-video.mjs "https://youtube.com/watch?v=abc123" "Summarize this"
 *   node analyze-video.mjs ./long-video.mp4 "What happens?" --start 60 --end 120
 */

import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { readFileSync, statSync } from "fs";
import { basename, resolve } from "path";

// --- Argument parsing ---
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node analyze-video.mjs <video-path-or-url> [prompt] [options]");
  console.error("  Options: --model <model> --fps <n> --start <s> --end <s> --json");
  process.exit(1);
}

function getFlag(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  const val = args[idx + 1];
  args.splice(idx, 2);
  return val;
}

function hasFlag(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return false;
  args.splice(idx, 1);
  return true;
}

const model = getFlag("model", "gemini-2.5-flash");
const fps = getFlag("fps", null);
const startOffset = getFlag("start", null);
const endOffset = getFlag("end", null);
const jsonOutput = hasFlag("json");

const input = args[0];
const prompt = args[1] || "Describe this video in detail. Include key events, visual elements, text on screen, and timestamps for important moments.";

// --- Helpers ---
const YOUTUBE_RE = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/;
const MIME_MAP = {
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mov": "video/mov",
  ".avi": "video/avi",
  ".flv": "video/x-flv",
  ".mpg": "video/mpg",
  ".webm": "video/webm",
  ".wmv": "video/wmv",
  ".3gpp": "video/3gpp",
  ".3gp": "video/3gpp",
};

function getMimeType(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return MIME_MAP[ext] || "video/mp4";
}

function isYouTubeUrl(str) {
  return YOUTUBE_RE.test(str);
}

// --- Main ---
async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: GEMINI_API_KEY environment variable is required.");
    console.error("Get one at: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let parts = [];

  if (isYouTubeUrl(input)) {
    // YouTube URL input
    const videoPart = { fileData: { fileUri: input } };
    if (startOffset || endOffset) {
      videoPart.videoMetadata = {};
      if (startOffset) videoPart.videoMetadata.startOffset = `${startOffset}s`;
      if (endOffset) videoPart.videoMetadata.endOffset = `${endOffset}s`;
    }
    parts.push(videoPart);
    console.error(`Analyzing YouTube video: ${input}`);
  } else {
    // Local file input
    const filePath = resolve(input);
    const stat = statSync(filePath);
    const mimeType = getMimeType(filePath);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

    if (stat.size > 100 * 1024 * 1024) {
      // Large file: use File API upload
      console.error(`Uploading ${basename(filePath)} (${sizeMB}MB) via File API...`);
      const uploaded = await ai.files.upload({
        file: filePath,
        config: { mimeType },
      });

      // Poll until file is ready
      let file = uploaded;
      while (file.state === "PROCESSING") {
        console.error("Processing...");
        await new Promise((r) => setTimeout(r, 3000));
        file = await ai.files.get({ name: file.name });
      }
      if (file.state === "FAILED") {
        console.error("ERROR: File processing failed.");
        process.exit(1);
      }

      const part = createPartFromUri(file.uri, file.mimeType);
      if (fps) part.videoMetadata = { fps: Number(fps) };
      if (startOffset || endOffset) {
        part.videoMetadata = part.videoMetadata || {};
        if (startOffset) part.videoMetadata.startOffset = `${startOffset}s`;
        if (endOffset) part.videoMetadata.endOffset = `${endOffset}s`;
      }
      parts.push(part);
      console.error(`Upload complete. Analyzing...`);
    } else {
      // Small file: use inline data
      console.error(`Analyzing ${basename(filePath)} (${sizeMB}MB) inline...`);
      const videoBytes = readFileSync(filePath);
      const part = {
        inlineData: {
          data: videoBytes.toString("base64"),
          mimeType,
        },
      };
      if (fps) part.videoMetadata = { fps: Number(fps) };
      parts.push(part);
    }
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
  });

  if (jsonOutput) {
    console.log(JSON.stringify(response, null, 2));
  } else {
    console.log(response.text);
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message || err);
  process.exit(1);
});
