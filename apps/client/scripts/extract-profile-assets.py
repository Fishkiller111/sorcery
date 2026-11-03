#!/usr/bin/env python3
"""Extract profile UI components from large slice sheets."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "images" / "ui" / "profile"
OUT = ROOT / "assets" / "images" / "ui"


def load_rgb(path: Path) -> Image.Image:
    return Image.open(path).convert("RGB")


def _background_mask(rgb: np.ndarray) -> np.ndarray:
    """Key out checkerboard, black, and light matte fringes."""
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    is_checker = (np.abs(r - g) < 10) & (np.abs(g - b) < 10) & (mx > 198)
    is_dark_checker = (np.abs(r - g) < 12) & (np.abs(g - b) < 12) & (mx >= 24) & (mx < 150)
    is_black = mx < 32
    is_white_fringe = (mx > 165) & (chroma < 42)
    is_light_matte = (chroma < 22) & (mx > 85) & (mx < 252)
    is_content_red = (r > g + 10) & (r > b + 10) & (r > 40)
    return (is_checker | is_dark_checker | is_black | is_white_fringe | is_light_matte) & ~is_content_red


def _erode_alpha(alpha: np.ndarray, passes: int = 1) -> np.ndarray:
    """Shrink opaque region by 1px per pass to remove halos."""
    a = alpha.copy()
    for _ in range(passes):
        h, w = a.shape
        core = a.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                shifted = np.zeros_like(a)
                y0 = max(0, dy)
                y1 = min(h, h + dy)
                x0 = max(0, dx)
                x1 = min(w, w + dx)
                sy0 = max(0, -dy)
                sy1 = sy0 + (y1 - y0)
                sx0 = max(0, -dx)
                sx1 = sx0 + (x1 - x0)
                shifted[y0:y1, x0:x1] = a[sy0:sy1, sx0:sx1]
                core = np.minimum(core, shifted)
        a = core
    return a


def _defringe_rgba(arr: np.ndarray) -> np.ndarray:
    """Remove bright pixels on semi-transparent edge pixels."""
    rgb = arr[:, :, :3].astype(np.float32)
    a = arr[:, :, 3].astype(np.float32)
    mx = rgb.max(axis=2)
    edge = (a > 8) & (a < 245) & (mx > 140)
    arr[edge, 3] = np.minimum(arr[edge, 3], (mx[edge] * 0.35).astype(np.uint8))
    return arr


def to_rgba(im: Image.Image, *, erode: int = 1) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3]
    bg = _background_mask(rgb)
    arr[bg, 3] = 0
    if erode > 0:
        opaque = arr[:, :, 3] > 0
        if opaque.any():
            arr[:, :, 3] = _erode_alpha(arr[:, :, 3], passes=erode)
    arr = _defringe_rgba(arr)
    arr[arr[:, :, 3] < 12, 3] = 0
    return Image.fromarray(arr)


def crop_transparent(
    im: Image.Image,
    box: tuple[int, int, int, int],
    *,
    pad: int = 2,
    erode: int = 1,
) -> Image.Image:
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return to_rgba(im.crop((x0, y0, x1, y1)), erode=erode)


def trim_transparent(im: Image.Image, pad: int = 2) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    opaque = arr[:, :, 3] > 12
    if not opaque.any():
        return im
    ys, xs = np.where(opaque)
    h, w = arr.shape[:2]
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(w, int(xs.max()) + 1 + pad)
    y1 = min(h, int(ys.max()) + 1 + pad)
    return im.crop((x0, y0, x1, y1))


def save_png(im: Image.Image, rel: str, *, trim: bool = False) -> None:
    if trim:
        im = trim_transparent(im)
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print(f"  ✓ {rel} ({im.size[0]}×{im.size[1]})")


def extract_header() -> None:
    print("[profile/header]")
    im = load_rgb(SRC / "头部.jpg")
    save_png(crop_transparent(im, (19, 442, 840, 496), erode=1), "profile/header_divider.png")
    save_png(crop_transparent(im, (45, 555, 345, 1132), erode=1), "profile/header_ribbon.png")


def extract_identity() -> None:
    print("[profile/identity]")
    im = load_rgb(SRC / "用户身份区.jpg")
    save_png(crop_transparent(im, (207, 543, 656, 1004), erode=2), "profile/avatar_ring.png")
    save_png(crop_transparent(im, (288, 1044, 561, 1387), erode=2), "profile/avatar_silhouette.png")
    save_png(crop_transparent(im, (65, 1460, 789, 1680), erode=1), "profile/emblem_cccp_wings.png")


def extract_dual_cards() -> None:
    print("[profile/cards]")
    im = load_rgb(SRC / "双卡片.jpg")
    save_png(crop_transparent(im, (65, 512, 778, 894), erode=1), "profile/card_info_bg.png")
    save_png(crop_transparent(im, (319, 930, 529, 1104), erode=2), "profile/icon_crown.png")
    save_png(crop_transparent(im, (212, 1152, 624, 1236), erode=1), "profile/ribbon_member.png")
    save_png(crop_transparent(im, (256, 1296, 576, 1376), erode=1), "profile/stars_rating.png")
    save_png(crop_transparent(im, (368, 1419, 480, 1520), erode=2), "profile/icon_star_red.png")
    save_png(crop_transparent(im, (320, 1552, 528, 1745), erode=2), "profile/icon_points_star.png")


def extract_settings() -> None:
    print("[profile/settings]")
    im = load_rgb(SRC / "setting.jpeg")
    save_png(crop_transparent(im, (68, 620, 797, 851), erode=1), "profile/button_settings_bg.png")
    save_png(crop_transparent(im, (154, 906, 342, 1259), erode=1), "profile/button_settings_cap.png")
    save_png(crop_transparent(im, (342, 906, 631, 1259), erode=2), "profile/icon_chevron.png")
    save_png(crop_transparent(im, (322, 1334, 546, 1563), erode=2), "profile/icon_settings_gear.png")


def extract_stats_card_bg() -> None:
    print("[profile/stats-card-bg]")
    jpg = SRC / "card_info_bg.jpg"
    if not jpg.exists():
        print("  skip — card_info_bg.jpg not found")
        return
    save_png(trim_transparent(to_rgba(load_rgb(jpg), erode=0)), "profile/card_stats_bg.png")


def extract_stats() -> None:
    print("[profile/stats]")
    im = load_rgb(SRC / "Stats 统计卡.jpg")
    save_png(crop_transparent(im, (85, 505, 475, 535), erode=0), "profile/stats_row_divider.png")
    save_png(crop_transparent(im, (300, 880, 560, 980), erode=1), "profile/stats_divider.png")
    # stats_row_divider.png includes baked row art — use a code-drawn line in UI instead.
    save_png(crop_transparent(im, (310, 1080, 545, 1320), erode=2), "profile/icon_scene_reel.png", trim=True)
    save_png(crop_transparent(im, (350, 1395, 490, 1620), erode=2), "profile/icon_achievement_medal.png", trim=True)


def update_manifest() -> None:
    files = sorted(
        str(p.relative_to(OUT)).replace("\\", "/")
        for p in OUT.rglob("*")
        if p.is_file() and p.name != ".manifest.json"
    )
    (OUT / ".manifest.json").write_text(json.dumps(files, indent=2), encoding="utf-8")
    print(f"\nDone — {len(files)} assets")


def main() -> None:
    extract_header()
    extract_identity()
    extract_dual_cards()
    extract_settings()
    extract_stats_card_bg()
    extract_stats()
    update_manifest()


if __name__ == "__main__":
    main()
