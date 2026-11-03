#!/usr/bin/env python3
"""Extract PC sidebar shell assets from the PC profile mock + slice sheet."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
PC_PROFILE = ROOT / "UI/pc/个人中心.jpg"
SLICE_SHEET = ROOT / "assets/images/ui/pc/BNDIIoje8NbOk_S8Yq7S8_pakdrUK8.jpg"
SIDEBAR_TEXTURE_SOURCE = ROOT / "assets/images/ui/shell/BsaUpjiXcPg8r8FHAu9W__7jJ1mat4.jpg"
OUT = ROOT / "assets/images/ui"

# Sidebar regions on UI/pc/个人中心.jpg (1584×992).
LOGO_EMBLEM_BOX = (88, 50, 188, 222)
FOOTER_BOX = (8, 758, 262, 898)
# Icon crops on UI/pc/个人中心.jpg — full icon column (excludes label text to the right).
PC_NAV_ICONS = {
    "shell/nav_home_pc.png": (8, 334, 92, 383),
    "shell/nav_modes_pc.png": (8, 460, 92, 512),
    "shell/nav_profile_pc.png": (8, 587, 92, 640),
}
ACTIVE_INDICATOR_BOX = (2, 587, 18, 640)
NAV_ICON_LEFT_STRIP = 14
NAV_ICON_CANVAS = (52, 52)


def _pc_content_mask(rgb: np.ndarray) -> np.ndarray:
    """Key dark page background while preserving weathered gold/red art."""
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    is_content_gold = (r > 42) & (g > 28) & (r >= g - 2) & (chroma > 2)
    is_content_red = (r > g + 8) & (r > 45)
    is_bg = (mx < 42) & (chroma < 18)
    return is_bg & ~(is_content_gold | is_content_red)


def _nav_icon_mask(rgb: np.ndarray) -> np.ndarray:
    """Key page bg while keeping weathered gold/red icon art."""
    return _pc_content_mask(rgb)


def _strip_nav_icon_chrome(arr: np.ndarray) -> np.ndarray:
    """Remove baked active bar and normalize active-state red icon pixels to gold."""
    out = arr.copy()
    out[:, :NAV_ICON_LEFT_STRIP, 3] = 0

    r = out[:, :, 0].astype(np.int16)
    g = out[:, :, 1].astype(np.int16)
    a = out[:, :, 3]
    is_red = (r > g + 8) & (r > 45) & (a > 12)
    out[is_red, 0] = 201
    out[is_red, 1] = 168
    out[is_red, 2] = 108
    return out


def _keep_largest_component(arr: np.ndarray) -> np.ndarray:
    """Drop stray matte specks — keep only the main icon silhouette."""
    mask = arr[:, :, 3] > 12
    if not mask.any():
        return arr

    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best: list[tuple[int, int]] = []

    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or seen[y0, x0]:
                continue
            stack = [(y0, x0)]
            seen[y0, x0] = True
            pts: list[tuple[int, int]] = []
            while stack:
                y, x = stack.pop()
                pts.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(pts) > len(best):
                best = pts

    cleaned = arr.copy()
    cleaned[:, :, 3] = 0
    for y, x in best:
        cleaned[y, x] = arr[y, x]
    return cleaned


def normalize_nav_icon_canvas(
    im: Image.Image,
    canvas: tuple[int, int] = NAV_ICON_CANVAS,
) -> Image.Image:
    """Fit icon into a shared square canvas so all nav icons render uniformly."""
    trimmed = trim_transparent(im, pad=0)
    if trimmed.width == 0 or trimmed.height == 0:
        return Image.new("RGBA", canvas, (0, 0, 0, 0))

    cw, ch = canvas
    scale = min(cw / trimmed.width, ch / trimmed.height) * 0.92
    nw = max(1, int(round(trimmed.width * scale)))
    nh = max(1, int(round(trimmed.height * scale)))
    resized = trimmed.resize((nw, nh), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    out.paste(resized, ((cw - nw) // 2, (ch - nh) // 2), resized)
    return out


def extract_nav_icon(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    icon = crop_transparent(im, box, mask_fn=_nav_icon_mask, erode=0)
    arr = np.array(icon.convert("RGBA"))
    arr = _strip_nav_icon_chrome(arr)
    arr = _keep_largest_component(arr)
    return normalize_nav_icon_canvas(Image.fromarray(arr))


def _active_indicator_mask(rgb: np.ndarray) -> np.ndarray:
    """Keep the weathered red sidebar active bar."""
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    is_red = (r > g + 10) & (r > 50)
    is_bg = (mx < 42) & (chroma < 18)
    return is_bg | ~is_red


def _slice_bg_mask(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn

    is_checker = (np.abs(r - g) < 10) & (np.abs(g - b) < 10) & (mx > 198)
    is_dark_checker = (np.abs(r - g) < 12) & (np.abs(g - b) < 12) & (mx >= 24) & (mx < 150)
    is_black = mx < 24
    is_white_fringe = (mx > 165) & (chroma < 42)
    is_light_matte = (chroma < 22) & (mx > 85) & (mx < 252)
    is_content_red = (r > g + 10) & (r > b + 10) & (r > 40)
    is_content_gold = (r > 42) & (g > 28) & (r >= g - 2) & (chroma > 2)
    bg = is_checker | is_dark_checker | is_black | is_white_fringe | is_light_matte
    return bg & ~(is_content_red | is_content_gold)


def to_rgba(im: Image.Image, *, mask_fn, erode: int = 0) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    bg = mask_fn(arr[:, :, :3])
    arr[bg, 3] = 0
    if erode > 0 and (arr[:, :, 3] > 0).any():
        alpha = arr[:, :, 3]
        for _ in range(erode):
            h, w = alpha.shape
            core = alpha.copy()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dy == 0 and dx == 0:
                        continue
                    shifted = np.zeros_like(alpha)
                    y0, y1 = max(0, dy), min(h, h + dy)
                    x0, x1 = max(0, dx), min(w, w + dx)
                    sy0, sy1 = max(0, -dy), max(0, -dy) + (y1 - y0)
                    sx0, sx1 = max(0, -dx), max(0, -dx) + (x1 - x0)
                    shifted[y0:y1, x0:x1] = alpha[sy0:sy1, sx0:sx1]
                    core = np.minimum(core, shifted)
            alpha = core
        arr[:, :, 3] = alpha
    arr[arr[:, :, 3] < 12, 3] = 0
    return Image.fromarray(arr)


def crop_transparent(
    im: Image.Image,
    box: tuple[int, int, int, int],
    *,
    mask_fn,
    pad: int = 2,
    erode: int = 0,
) -> Image.Image:
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return to_rgba(im.crop((x0, y0, x1, y1)), mask_fn=mask_fn, erode=erode)


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


def save_png(im: Image.Image, rel: str) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, optimize=True)
    print(f"  ✓ {rel} ({im.size[0]}×{im.size[1]})")


def _strip_edge_fringe(im: Image.Image, *, trim_px: int, out_w: int) -> Image.Image:
    """Remove bright side vignette columns and restore target width."""
    w, h = im.size
    if w <= trim_px * 2 + 4:
        return im
    trimmed = im.crop((trim_px, 0, w - trim_px, h))
    return trimmed.resize((out_w, h), Image.Resampling.LANCZOS)


def prepare_sidebar_bg() -> None:
    """Bake sidebar_bg.jpg from the authored texture strip."""
    print("[pc/sidebar-texture]")
    baked = OUT / "shell/sidebar_bg.jpg"

    if SIDEBAR_TEXTURE_SOURCE.exists():
        im = Image.open(SIDEBAR_TEXTURE_SOURCE).convert("RGB")
        w, h = im.size

        # Trim side vignette; sidebar uses cover and reads mostly from the center band.
        crop_w = int(w * 0.76)
        x0 = (w - crop_w) // 2
        im = im.crop((x0, 0, x0 + crop_w, h))

        # ~1.25× sidebar width (268) so cover resize keeps detail on desktop.
        out_w = 336
        out_h = max(1, int(h * out_w / crop_w))
        im = im.resize((out_w, out_h), Image.Resampling.LANCZOS)

        # Match the old near-black sidebar while keeping grain visible.
        im = ImageEnhance.Brightness(im).enhance(0.48)
        im = ImageEnhance.Contrast(im).enhance(1.08)
    elif baked.exists():
        im = Image.open(baked).convert("RGB")
        out_w = im.size[0]
    else:
        print("  skip — no sidebar texture source")
        return

    # Source art has thin light fringes on the long edges after crop/grade.
    im = _strip_edge_fringe(im, trim_px=6, out_w=out_w)

    baked.parent.mkdir(parents=True, exist_ok=True)
    im.save(baked, quality=90, optimize=True)
    print(f"  ✓ shell/sidebar_bg.jpg ({im.size[0]}×{im.size[1]})")


def update_manifest() -> None:
    files = sorted(
        str(p.relative_to(OUT)).replace("\\", "/")
        for p in OUT.rglob("*")
        if p.is_file() and p.name != ".manifest.json"
    )
    (OUT / ".manifest.json").write_text(json.dumps(files, indent=2), encoding="utf-8")
    print(f"\nDone — {len(files)} assets")


def main() -> None:
    if not PC_PROFILE.exists():
        print(f"Missing PC profile mock: {PC_PROFILE}", file=sys.stderr)
        sys.exit(1)

    print("[pc/shell]")
    im = Image.open(PC_PROFILE).convert("RGB")
    save_png(
        trim_transparent(crop_transparent(im, LOGO_EMBLEM_BOX, mask_fn=_pc_content_mask, erode=0)),
        "shell/sidebar_logo_emblem.png",
    )
    save_png(
        trim_transparent(crop_transparent(im, FOOTER_BOX, mask_fn=_pc_content_mask, erode=0)),
        "shell/sidebar_footer_motto.png",
    )
    for rel, box in PC_NAV_ICONS.items():
        save_png(extract_nav_icon(im, box), rel)
    save_png(
        trim_transparent(
            crop_transparent(im, ACTIVE_INDICATOR_BOX, mask_fn=_active_indicator_mask, erode=0),
        ),
        "shell/sidebar_active_indicator.png",
    )
    prepare_sidebar_bg()
    update_manifest()


if __name__ == "__main__":
    main()
