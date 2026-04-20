#!/usr/bin/env python3
"""
Install a VectCut API draft into CapCut's local projects directory.

Handles:
  1. Copying the server's draft folder (with converted assets) into CapCut
  2. Patching video paths in draft_info.json to point to copied assets
  3. Registering the draft in CapCut's root_meta_info.json

Usage:
    python install_to_capcut.py <draft_id> <draft_name>

Requires:
  - VectCut API server draft at /Users/vulam/VectCutAPI/<draft_id>/
  - CapCut installed at /Users/vulam/Movies/CapCut/
"""

import json
import os
import shutil
import sys
import time
import uuid
import argparse

VECTCUT_DIR = "/Users/vulam/VectCutAPI"
CAPCUT_DRAFTS = "/Users/vulam/Movies/CapCut/User Data/Projects/com.lveditor.draft"


def install_to_capcut(draft_id, draft_name):
    """Copy server draft into CapCut and fix media paths."""
    server_draft = os.path.join(VECTCUT_DIR, draft_id)
    capcut_draft = os.path.join(CAPCUT_DRAFTS, draft_name)

    if not os.path.isdir(server_draft):
        print(f"  ERROR: Server draft not found at {server_draft}")
        return False

    if os.path.exists(capcut_draft):
        shutil.rmtree(capcut_draft)

    shutil.copytree(server_draft, capcut_draft)
    print(f"  Copied to: {capcut_draft}")

    # Patch video paths
    draft_info_path = os.path.join(capcut_draft, "draft_info.json")
    with open(draft_info_path) as f:
        data = json.load(f)

    videos = data.get("materials", {}).get("videos", [])
    assets_dir = os.path.join(capcut_draft, "assets", "video")
    for v in videos:
        filename = v.get("material_name", "")
        if filename:
            v["path"] = os.path.join(assets_dir, filename)

    with open(draft_info_path, "w") as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"  Patched {len(videos)} video paths")

    # Update draft_meta_info.json
    meta_path = os.path.join(capcut_draft, "draft_meta_info.json")
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            meta = json.load(f)
        meta["draft_fold_path"] = capcut_draft
        meta["draft_name"] = draft_name
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)

    # Register in root_meta_info.json
    root_meta_path = os.path.join(CAPCUT_DRAFTS, "root_meta_info.json")
    with open(root_meta_path) as f:
        root = json.load(f)

    drafts = root.get("all_draft_store", [])
    drafts = [d for d in drafts if d.get("draft_fold_path") != capcut_draft]

    now = int(time.time())
    drafts.append({
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": "",
        "draft_fold_path": capcut_draft,
        "draft_id": str(uuid.uuid4()).upper(),
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_invisible": False,
        "draft_is_web_article_video": False,
        "draft_json_file": draft_info_path,
        "draft_name": draft_name,
        "draft_new_version": "",
        "draft_root_path": CAPCUT_DRAFTS,
        "draft_timeline_materials_size": os.path.getsize(draft_info_path),
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": now,
        "tm_draft_modified": now,
        "tm_draft_removed": 0,
        "tm_duration": data.get("duration", 0),
    })

    root["all_draft_store"] = drafts
    with open(root_meta_path, "w") as f:
        json.dump(root, f, ensure_ascii=False)
    print(f"  Registered in CapCut ({len(drafts)} total drafts)")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Install VectCut draft into CapCut")
    parser.add_argument("draft_id", help="VectCut draft ID (e.g. dfd_cat_...)")
    parser.add_argument("draft_name", help="Name for the draft in CapCut")
    args = parser.parse_args()
    install_to_capcut(args.draft_id, args.draft_name)
