#!/usr/bin/env python3
"""
Video Proposal Analyzer

Reads a collection-index.json, analyzes clip metadata, and generates
video proposals with clip selections for different video concepts.

Works with ANY video collection — derives titles, themes, and proposals
from the actual metadata rather than hardcoding specific locations.

Usage:
    python analyze_and_propose.py <collection_index_path> [--output <output_path>] [--name <collection_name>]

Output:
    A JSON file with collection analysis, video proposals, and editing tasks.
"""

import json
import os
import sys
import argparse
from collections import Counter, defaultdict
from datetime import datetime


# --- Category definitions ---
# Each category has a list of trigger tags and metadata for proposal generation.
CATEGORY_DEFS = {
    "scenic_landscape": {
        "tags": [
            "mountains", "mountain", "landscape", "viewpoint", "overlook",
            "elevated", "sky", "clouds", "panorama", "valley", "peak",
            "sunset", "sunrise", "horizon", "cliff", "canyon", "lake",
            "river", "waterfall", "ocean", "beach", "desert", "hills",
        ],
        "proposal": {
            "format_name": "Cinematic mood piece",
            "duration_target": "30-60 seconds",
            "style": "Slow, cinematic with speed ramps and atmospheric shots",
            "clip_count": 8,
            "music": "Ambient/ethereal instrumental",
            "text_overlays": ["Minimal - location names only"],
        },
    },
    "driving_road": {
        "tags": [
            "road", "car", "driving", "navigation", "truck", "traffic",
            "motorcycle", "motorcycles", "motorbike", "highway", "bridge",
            "tunnel", "intersection", "parking", "vehicle", "bus", "train",
        ],
        "proposal": {
            "format_name": "POV driving montage",
            "duration_target": "15-30 seconds",
            "style": "POV driving montage with speed ramping",
            "clip_count": 6,
            "music": "Upbeat travel track or trending audio",
            "text_overlays": ["Route name overlay", "Distance/km markers"],
        },
    },
    "family_people": {
        "tags": [
            "child", "family", "family_time", "people", "man", "woman",
            "friends", "group", "couple", "baby", "kids", "elderly",
            "portrait", "selfie", "gathering", "party", "celebration",
        ],
        "proposal": {
            "format_name": "People & moments story",
            "duration_target": "30-60 seconds",
            "style": "Warm, personal with mix of scenic and personal moments",
            "clip_count": 8,
            "music": "Warm acoustic track",
            "text_overlays": ["Personal captions", "Location tags"],
        },
    },
    "cultural_village": {
        "tags": [
            "village", "traditional", "architecture", "cultural", "buildings",
            "stone_walls", "wooden_houses", "street", "temple", "shrine",
            "market", "shop", "monument", "historic", "heritage", "museum",
            "church", "pagoda", "mosque", "ruins",
        ],
        "proposal": {
            "format_name": "Culture & places showcase",
            "duration_target": "30-60 seconds",
            "style": "Exploratory pacing with detail close-ups",
            "clip_count": 8,
            "music": "Local/traditional inspired music",
            "text_overlays": ["Place names", "Historical context"],
        },
    },
    "nature_flora": {
        "tags": [
            "nature", "greenery", "vegetation", "flora", "cherry_blossoms",
            "trees", "forest", "foliage", "spring", "flowers", "garden",
            "park", "jungle", "meadow", "field", "grass", "moss",
            "autumn", "leaves", "bloom",
        ],
        "proposal": {
            "format_name": "Nature showcase",
            "duration_target": "15-30 seconds",
            "style": "Gentle, slow cuts focusing on natural beauty",
            "clip_count": 6,
            "music": "Soft piano or nature ASMR",
            "text_overlays": ["Nature captions", "Season tag"],
        },
    },
    "atmospheric_mood": {
        "tags": [
            "fog", "foggy", "mist", "mystery", "mystic", "overcast",
            "rainy", "storm", "snow", "night", "dark", "shadow",
            "silhouette", "golden_hour", "blue_hour", "dramatic_sky",
        ],
        "proposal": {
            "format_name": "Atmospheric mood piece",
            "duration_target": "30-60 seconds",
            "style": "Slow, moody with atmospheric transitions",
            "clip_count": 8,
            "music": "Ambient/ethereal instrumental",
            "text_overlays": ["Minimal - mood text only"],
        },
    },
    "food_lifestyle": {
        "tags": [
            "food", "indoor", "cozy", "rustic", "restaurant", "cafe",
            "cooking", "meal", "drink", "coffee", "tea", "market_food",
            "street_food", "kitchen", "dining",
        ],
        "proposal": {
            "format_name": "Food & lifestyle reel",
            "duration_target": "15-30 seconds",
            "style": "Close-up details with warm color grading",
            "clip_count": 6,
            "music": "Lo-fi or cozy acoustic",
            "text_overlays": ["Dish/place names", "Rating or reaction"],
        },
    },
    "camping_outdoor": {
        "tags": [
            "camping", "tent", "outdoors", "outdoor_adventure", "hiking",
            "trail", "backpack", "campfire", "sleeping_bag", "trek",
            "climbing", "kayak", "surfing", "diving", "fishing",
            "swimming", "cycling", "skiing",
        ],
        "proposal": {
            "format_name": "Adventure reel",
            "duration_target": "15-30 seconds",
            "style": "Adventure vibe with quick cuts",
            "clip_count": 6,
            "music": "Energetic adventure/indie track",
            "text_overlays": ["Activity labels", "Location pin"],
        },
    },
    "water_scenes": {
        "tags": [
            "water", "sea", "ocean", "beach", "river", "lake", "waterfall",
            "rain", "waves", "coast", "pier", "boat", "ship", "fishing",
            "swimming", "snorkeling", "surfing",
        ],
        "proposal": {
            "format_name": "Water & coast montage",
            "duration_target": "15-30 seconds",
            "style": "Flowing transitions, blue tones",
            "clip_count": 6,
            "music": "Chill wave or ambient water sounds",
            "text_overlays": ["Location names"],
        },
    },
    "urban_city": {
        "tags": [
            "city", "urban", "skyline", "downtown", "skyscraper", "metro",
            "subway", "neon", "nightlife", "bar", "club", "rooftop",
            "graffiti", "street_art", "crowd", "busy",
        ],
        "proposal": {
            "format_name": "Urban energy montage",
            "duration_target": "15-30 seconds",
            "style": "Fast cuts, beat-synced, energetic",
            "clip_count": 6,
            "music": "Electronic or hip-hop beat",
            "text_overlays": ["City/district names"],
        },
    },
}

# Build flat tag lookup from definitions
TAG_TO_CATEGORY = {}
for cat_name, cat_def in CATEGORY_DEFS.items():
    for tag in cat_def["tags"]:
        if tag not in TAG_TO_CATEGORY:
            TAG_TO_CATEGORY[tag] = cat_name

# Minimum clips needed for a category to generate a proposal
MIN_CLIPS_FOR_PROPOSAL = 3


def load_collection(path):
    with open(path) as f:
        return json.load(f)


def categorize_clips(videos):
    """Categorize clips by content type based on tags and descriptions."""
    categories = defaultdict(list)

    for v in videos:
        all_tags = []
        best_desc = ""
        mood = "neutral"
        motion = "unknown"

        for scene in v.get("scenes", []):
            all_tags.extend(scene.get("tags", []))
            if scene.get("description"):
                best_desc = scene["description"]
            if scene.get("mood"):
                mood = scene["mood"]
            if scene.get("motion"):
                motion = scene["motion"]

        # Score based on duration, description quality, mood
        duration = v.get("duration_seconds", 0)
        quality_score = 1
        if duration >= 3:
            quality_score += 1
        if duration >= 8:
            quality_score += 1
        if mood in ("calm", "epic", "dramatic", "serene"):
            quality_score += 1
        if len(best_desc) > 40:
            quality_score += 1
        quality_score = min(quality_score, 5)

        clip_info = {
            "video_id": v["video_id"],
            "file": v.get("source_file", ""),
            "duration": duration,
            "description": best_desc,
            "tags": all_tags,
            "mood": mood,
            "motion": motion,
            "quality_score": quality_score,
            "resolution": v.get("resolution", ""),
            "has_speech": v.get("audio", {}).get("has_speech", False),
            "language": v.get("audio", {}).get("language", ""),
        }

        assigned = False
        for tag in all_tags:
            if tag in TAG_TO_CATEGORY:
                cat = TAG_TO_CATEGORY[tag]
                categories[cat].append(clip_info)
                assigned = True
                break

        if not assigned:
            categories["uncategorized"].append(clip_info)

    # Sort each category by quality score descending
    for cat in categories:
        categories[cat].sort(key=lambda x: (-x["quality_score"], -x["duration"]))

    return dict(categories)


def identify_best_clips(categories):
    """Pick hero shots, openers, closers, and emotional moments."""
    all_clips = []
    for cat_clips in categories.values():
        all_clips.extend(cat_clips)

    by_quality = sorted(all_clips, key=lambda x: (-x["quality_score"], -x["duration"]))

    hero = [c for c in by_quality if c["quality_score"] >= 4][:10]

    # Openers: atmospheric or motion clips that hook attention
    opener_tags = {"fog", "foggy", "road", "driving", "mist", "rain", "night",
                   "silhouette", "golden_hour", "storm", "city", "neon"}
    openers = [c for c in by_quality
               if any(t in c["tags"] for t in opener_tags)
               and c["duration"] >= 3][:5]

    # Closers: wide/epic shots for ending
    closer_tags = {"viewpoint", "mountains", "elevated", "overlook", "sky",
                   "panorama", "sunset", "horizon", "peak", "ocean", "skyline"}
    closers = [c for c in by_quality
               if any(t in c["tags"] for t in closer_tags)
               and c["duration"] >= 3][:5]

    # Emotional: human/personal moments
    emotional_tags = {"child", "family", "family_time", "people", "village",
                      "celebration", "portrait", "friends", "couple", "elderly"}
    emotional = [c for c in by_quality
                 if any(t in c["tags"] for t in emotional_tags)
                 and c["duration"] >= 2][:5]

    return {
        "hero_shots": [{"video_id": c["video_id"], "file": c["file"],
                        "description": c["description"], "score": c["quality_score"]}
                       for c in hero],
        "opening_hooks": [{"video_id": c["video_id"], "file": c["file"],
                           "description": c["description"]} for c in openers],
        "closing_shots": [{"video_id": c["video_id"], "file": c["file"],
                           "description": c["description"]} for c in closers],
        "emotional_moments": [{"video_id": c["video_id"], "file": c["file"],
                               "description": c["description"]} for c in emotional],
    }


def derive_collection_name(collection):
    """Derive a human-readable name from collection metadata."""
    locations = collection.get("locations", [])
    if locations:
        return locations[0].split(",")[0].strip()
    folder = os.path.basename(collection.get("source_folder", ""))
    if folder:
        return folder.replace("-", " ").replace("_", " ").title()
    return "Video Collection"


def assess_collection(collection, categories):
    """Produce a high-level summary of the collection tone and style."""
    tag_freq = collection.get("tag_frequency", {})
    top_tags = sorted(tag_freq.items(), key=lambda x: -x[1])[:15]

    moods = Counter()
    motions = Counter()
    resolutions = Counter()
    for cat_clips in categories.values():
        for c in cat_clips:
            moods[c["mood"]] += 1
            motions[c["motion"]] += 1
            resolutions[c["resolution"]] += 1

    dominant_mood = moods.most_common(1)[0][0] if moods else "unknown"
    dominant_motion = motions.most_common(1)[0][0] if motions else "unknown"

    themes = [tag for tag, _ in top_tags[:8]]
    locations = collection.get("locations", [])

    # Derive style from resolution distribution
    total = sum(resolutions.values())
    vertical = sum(v for k, v in resolutions.items()
                   if k and int(k.split("x")[0]) < int(k.split("x")[1]))
    orientation = "vertical (9:16)" if vertical > total / 2 else "horizontal (16:9)"

    # Derive motion style
    motion_labels = {
        "static": "static/tripod", "handheld_static": "handheld",
        "slow_pan": "slow panning", "tracking": "tracking/follow",
        "fast_motion": "fast motion", "unknown": "mixed",
    }
    motion_desc = motion_labels.get(dominant_motion, dominant_motion)

    return {
        "total_clips": collection.get("total_videos", 0),
        "total_duration_minutes": collection.get("total_duration_minutes", 0),
        "locations": locations,
        "primary_themes": themes,
        "top_tags": dict(top_tags),
        "dominant_mood": dominant_mood,
        "dominant_motion": dominant_motion,
        "resolutions": dict(resolutions),
        "tone": f"Primarily {dominant_mood} mood with {motion_desc} camera work. "
                f"Key themes: {', '.join(themes[:4])}.",
        "style": f"Mostly {orientation} footage with {motion_desc} movement. "
                 f"{len(locations)} location(s) identified." if locations
                 else f"Mostly {orientation} footage with {motion_desc} movement.",
    }


def slugify(text):
    """Convert text to a URL/ID-friendly slug."""
    return text.lower().replace(" ", "-").replace("&", "and").replace("/", "-")


def generate_proposals(summary, categories, best_clips, collection_name):
    """Generate video proposals dynamically based on what categories have enough clips."""
    proposals = []
    active_categories = {
        cat: clips for cat, clips in categories.items()
        if cat != "uncategorized" and len(clips) >= MIN_CLIPS_FOR_PROPOSAL
    }

    locations = summary.get("locations", [])
    location_label = locations[0].split(",")[0].strip() if locations else collection_name

    # --- Always propose: Trip highlight reel (mixes best clips across categories) ---
    highlight_clips = []
    # Pick top 1-2 from each active category for variety
    for cat in sorted(active_categories.keys()):
        highlight_clips.extend(active_categories[cat][:2])
    # Sort by quality and take best 6
    highlight_clips.sort(key=lambda x: (-x["quality_score"], -x["duration"]))
    highlight_clips = highlight_clips[:6]

    if len(highlight_clips) >= 3:
        proposals.append({
            "id": slugify(f"{collection_name} highlight"),
            "title": f"{collection_name} Highlight",
            "format": "TikTok/Reels (9:16)",
            "duration_target": "15-30 seconds",
            "style": "Fast-paced montage with dissolve transitions",
            "description": f"Quick summary reel mixing the best clips across all categories from {location_label}.",
            "suggested_clips": [c["video_id"] for c in highlight_clips],
            "text_overlays": [
                f"Title: {collection_name}",
                "End card: location + date",
            ],
            "music": "Trending ambient/cinematic track",
            "status": "proposed",
        })

    # --- Generate one proposal per active category ---
    for cat_name, clips in sorted(active_categories.items()):
        cat_def = CATEGORY_DEFS.get(cat_name, {})
        proposal_meta = cat_def.get("proposal", {})
        format_name = proposal_meta.get("format_name", cat_name.replace("_", " ").title())
        clip_count = proposal_meta.get("clip_count", 6)

        selected = clips[:clip_count]
        proposal_id = slugify(f"{collection_name} {cat_name}")

        proposals.append({
            "id": proposal_id,
            "title": f"{collection_name} — {format_name}",
            "format": "TikTok/Reels (9:16)",
            "duration_target": proposal_meta.get("duration_target", "15-30 seconds"),
            "style": proposal_meta.get("style", "Mixed pacing"),
            "description": f"{format_name} using {len(selected)} clips from the {cat_name.replace('_', ' ')} category.",
            "suggested_clips": [c["video_id"] for c in selected],
            "text_overlays": proposal_meta.get("text_overlays", ["Location name"]),
            "music": proposal_meta.get("music", "Trending track"),
            "status": "proposed",
        })

    return proposals


def main():
    parser = argparse.ArgumentParser(description="Analyze video collection and generate proposals")
    parser.add_argument("collection_path", help="Path to collection-index.json")
    parser.add_argument("--output", "-o", default=None,
                        help="Output path for proposals JSON (default: same dir as input)")
    parser.add_argument("--name", "-n", default=None,
                        help="Collection name for titles (default: derived from metadata)")
    args = parser.parse_args()

    if not os.path.exists(args.collection_path):
        print(f"ERROR: Collection file not found: {args.collection_path}")
        sys.exit(1)

    output_path = args.output or os.path.join(
        os.path.dirname(args.collection_path), "video-proposals.json"
    )

    print(f"Loading collection: {args.collection_path}")
    collection = load_collection(args.collection_path)
    videos = collection.get("videos", [])
    print(f"  Found {len(videos)} clips")

    collection_name = args.name or derive_collection_name(collection)
    print(f"  Collection name: {collection_name}")

    print("Categorizing clips...")
    categories = categorize_clips(videos)
    for cat, clips in sorted(categories.items()):
        print(f"  {cat}: {len(clips)} clips")

    print("Identifying best clips...")
    best_clips = identify_best_clips(categories)

    print("Assessing collection...")
    summary = assess_collection(collection, categories)

    print("Generating video proposals...")
    proposals = generate_proposals(summary, categories, best_clips, collection_name)

    result = {
        "generated_at": datetime.now().isoformat(),
        "collection_name": collection_name,
        "collection_path": os.path.abspath(args.collection_path),
        "collection_summary": summary,
        "clip_categories": {cat: clips[:10] for cat, clips in categories.items()},
        "best_clips": best_clips,
        "video_proposals": proposals,
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\nProposals saved to: {output_path}")
    print(f"  {len(proposals)} video proposals generated")
    print(f"  Categories: {', '.join(categories.keys())}")
    return result


if __name__ == "__main__":
    main()
