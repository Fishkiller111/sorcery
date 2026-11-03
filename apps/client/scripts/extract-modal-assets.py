#!/usr/bin/env python3
"""Extract general confirm modal assets from useful/新建项目 (4).png."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "images" / "ui" / "useful" / "新建项目 (4).png"
OUT = ROOT / "assets" / "images" / "ui" / "modal"
UI_ROOT = ROOT / "assets" / "images" / "ui"

# Fallback boxes from blob detection (alpha > 30, min area 800px).
FALLBACK_CUTS = {
    "confirm_modal_frame.png": (222, 67, 1282, 760),
    "confirm_btn_cancel.png": (228, 832, 722, 964),
    "confirm_btn_confirm.png": (795, 831, 1278, 965),
    "icon_globe.png": (1401, 68, 1644, 285),
    "icon_star.png": (1401, 315, 1644, 530),
    "icon_warning.png": (1401, 557, 1644, 762),
    "icon_trash.png": (1401, 788, 1644, 987),
}


def _find_blobs(alpha: np.ndarray, min_size: int = 800) -> list[tuple[int, int, int, int, int]]:
    h, w = alpha.shape
    visited = np.zeros_like(alpha, dtype=bool)
    blobs: list[tuple[int, int, int, int, int]] = []

    for y in range(h):
        for x in range(w):
            if not alpha[y, x] or visited[y, x]:
                continue
            stack = [(y, x)]
            minx = maxx = x
            miny = maxy = y
            count = 0
            visited[y, x] = True
            while stack:
                cy, cx = stack.pop()
                count += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))
            if count >= min_size:
                blobs.append((minx, miny, maxx + 1, maxy + 1, count))

    return sorted(blobs, key=lambda b: (b[1], b[0]))


def _detect_cuts(alpha: np.ndarray) -> dict[str, tuple[int, int, int, int]]:
    blobs = _find_blobs(alpha)
    if len(blobs) < 7:
        return FALLBACK_CUTS

    frame = blobs[0]
    icons = blobs[1:5]
    confirm_btn = blobs[5]
    cancel_btn = blobs[6]

    return {
        "confirm_modal_frame.png": frame[:4],
        "icon_globe.png": icons[0][:4],
        "icon_star.png": icons[1][:4],
        "icon_warning.png": icons[2][:4],
        "icon_trash.png": icons[3][:4],
        "confirm_btn_confirm.png": confirm_btn[:4],
        "confirm_btn_cancel.png": cancel_btn[:4],
    }


def extract_modal_assets() -> None:
    print("[modal/confirm]")
    if not SRC.exists():
        print(f"  skip — {SRC.name} not found")
        return

    im = Image.open(SRC).convert("RGBA")
    alpha = np.array(im)[:, :, 3] > 30
    cuts = _detect_cuts(alpha)

    OUT.mkdir(parents=True, exist_ok=True)
    for name, box in cuts.items():
        crop = im.crop(box)
        crop.save(OUT / name, optimize=True)
        print(f"  ✓ modal/{name} ({crop.size[0]}×{crop.size[1]}) @ {box}")


def update_manifest() -> None:
    files = sorted(
        str(p.relative_to(UI_ROOT)).replace("\\", "/")
        for p in UI_ROOT.rglob("*")
        if p.is_file() and p.name != ".manifest.json"
    )
    (UI_ROOT / ".manifest.json").write_text(json.dumps(files, indent=2), encoding="utf-8")
    print(f"\nDone — {len(files)} assets")


def main() -> None:
    extract_modal_assets()
    update_manifest()


if __name__ == "__main__":
    main()
