#!/usr/bin/env python3
"""Extract settings page UI assets from designer slice sheets."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "images" / "ui" / "setting"
OUT = ROOT / "assets" / "images" / "ui"

# Detected panel bounds in setting/select.png (768×1024).
SELECT_PANELS = [
    ("setting/toggle_standard.png", 133, 266),
    ("setting/toggle_mature.png", 351, 482),
    ("setting/toggle_frame.png", 570, 702),
]
SELECT_X = (80, 731)


def _key_black_rgba(arr: np.ndarray) -> np.ndarray:
    out = arr.copy()
    rgb = out[:, :, :3].astype(np.int16)
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    chroma = mx - mn
    bg = (mx < 14) & (chroma < 10)
    out[bg, 3] = 0
    return out


def _trim_rgba(arr: np.ndarray, pad: int = 2) -> np.ndarray:
    opaque = arr[:, :, 3] > 12
    if not opaque.any():
        return arr
    ys, xs = np.where(opaque)
    h, w = arr.shape[:2]
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(w, int(xs.max()) + 1 + pad)
    y1 = min(h, int(ys.max()) + 1 + pad)
    return arr[y0:y1, x0:x1]


def _normalize_canvas(tiles: list[np.ndarray]) -> list[np.ndarray]:
    max_w = max(t.shape[1] for t in tiles)
    max_h = max(t.shape[0] for t in tiles)
    out: list[np.ndarray] = []
    for tile in tiles:
        canvas = np.zeros((max_h, max_w, 4), dtype=np.uint8)
        ox = (max_w - tile.shape[1]) // 2
        oy = (max_h - tile.shape[0]) // 2
        canvas[oy : oy + tile.shape[0], ox : ox + tile.shape[1]] = tile
        out.append(canvas)
    return out


def extract_toggle_states() -> None:
    """Slice setting/select.png into standard / mature / frame toggles."""
    print("[setting/toggle]")
    sheet = SRC / "select.png"
    if not sheet.exists():
        print("  skip — select.png not found")
        return

    im = Image.open(sheet).convert("RGBA")
    x0, x1 = SELECT_X
    tiles: list[np.ndarray] = []
    rels: list[str] = []

    for rel, y0, y1 in SELECT_PANELS:
        crop = np.array(im.crop((x0, y0, x1, y1)))
        rgba = _trim_rgba(_key_black_rgba(crop))
        tiles.append(rgba)
        rels.append(rel)

    for rel, tile in zip(rels, _normalize_canvas(tiles)):
        path = OUT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(tile).save(path, optimize=True)
        print(f"  ✓ {rel} ({tile.shape[1]}×{tile.shape[0]})")


def update_manifest() -> None:
    files = sorted(
        str(p.relative_to(OUT)).replace("\\", "/")
        for p in OUT.rglob("*")
        if p.is_file() and p.name != ".manifest.json"
    )
    (OUT / ".manifest.json").write_text(json.dumps(files, indent=2), encoding="utf-8")
    print(f"\nDone — {len(files)} assets")


def main() -> None:
    extract_toggle_states()
    update_manifest()


if __name__ == "__main__":
    main()
