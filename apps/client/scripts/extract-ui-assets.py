#!/usr/bin/env python3
"""Extract UI assets from prepared cut sheets into assets/images/ui/."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CUT = ROOT / "assets" / "cut"
UI = ROOT / "UI"
OUT = ROOT / "assets" / "images" / "ui"


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def content_mask(arr: np.ndarray, threshold: int = 35) -> np.ndarray:
    rgb = arr[:, :, :3].astype(np.int16)
    alpha = arr[:, :, 3]
    return (rgb.max(axis=2) > threshold) & (alpha > 10)


def bbox_from_mask(mask: np.ndarray, pad: int = 2) -> tuple[int, int, int, int] | None:
    if not mask.any():
        return None
    ys, xs = np.where(mask)
    h, w = mask.shape
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(w, int(xs.max()) + 1 + pad)
    y1 = min(h, int(ys.max()) + 1 + pad)
    return x0, y0, x1, y1


def crop_box(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    return im.crop(box)


def crop_region(im: Image.Image, box: tuple[int, int, int, int], *, transparent_bg: bool = True) -> Image.Image:
    x0, y0, x1, y1 = box
    cropped = im.crop((x0, y0, x1, y1))
    if not transparent_bg:
        return cropped.convert("RGB")

    arr = np.array(cropped)
    mask = content_mask(arr)
    rgba = arr.copy()
    rgba[~mask, 3] = 0
    return Image.fromarray(rgba, "RGBA")


def row_slices(mask: np.ndarray, min_gap: int = 12) -> list[tuple[int, int]]:
    h, w = mask.shape
    occ = mask.sum(axis=1) / w
    bounds = [0]
    in_gap = False
    gap_start = 0
    for y, ratio in enumerate(occ):
        if ratio < 0.01:
            if not in_gap:
                gap_start = y
                in_gap = True
        elif in_gap:
            if y - gap_start >= min_gap:
                bounds.append((gap_start + y) // 2)
            in_gap = False
    bounds.append(h)
    slices: list[tuple[int, int]] = []
    for i in range(len(bounds) - 1):
        y0, y1 = bounds[i], bounds[i + 1]
        if mask[y0:y1].any():
            slices.append((y0, y1))
    return slices


def slice_bbox(mask: np.ndarray, y0: int, y1: int, pad: int = 2) -> tuple[int, int, int, int]:
    sub = mask[y0:y1]
    xs = np.where(sub.any(axis=0))[0]
    x0 = max(0, int(xs[0]) - pad)
    x1 = min(mask.shape[1], int(xs[-1]) + 1 + pad)
    return x0, y0, x1, y1


def trim_transparent(im: Image.Image, pad: int = 2) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    mask = content_mask(arr)
    box = bbox_from_mask(mask, pad=pad)
    if not box:
        return im
    return im.crop(box)


def save_png(im: Image.Image, rel_path: str, *, trim: bool = False) -> None:
    if trim:
        im = trim_transparent(im)
    path = OUT / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im.save(path, optimize=True)
    print(f"  ✓ {rel_path} ({im.size[0]}×{im.size[1]})")


def save_jpg(im: Image.Image, rel_path: str, quality: int = 92) -> None:
    path = OUT / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(path, quality=quality, optimize=True)
    print(f"  ✓ {rel_path} ({rgb.size[0]}×{rgb.size[1]})")


def extract_home_mobile() -> None:
    print("[mobile/home]")
    im = load_rgba(CUT / "mobile/home/home.jpg")
    mask = content_mask(np.array(im))
    slices = row_slices(mask)

    # Slice 0 = empty dossier card (paper + colored tab). Keep full width including tab.
    card_box = slice_bbox(mask, *slices[0], pad=4)
    card = trim_transparent(crop_region(im, card_box), pad=4)
    save_png(card, "home/card_dossier_bg.png", trim=True)

    # Navy tab variant for dossier 02
    arr = np.array(card)
    rgb = arr[:, :, :3].astype(np.int16)
    red_tab = (rgb[:, :, 0] > 110) & (rgb[:, :, 1] < 95) & (rgb[:, :, 2] < 95) & (arr[:, :, 3] > 0)
    navy = arr.copy()
    navy[red_tab, 0] = 61
    navy[red_tab, 1] = 74
    navy[red_tab, 2] = 98
    save_png(Image.fromarray(navy, "RGBA"), "home/card_dossier_navy.png", trim=True)

    icon_names = [
        "home/icon_film_reel.png",
        "home/icon_chat_bubble.png",
        "home/emblem_star_laurel.png",
        "home/section_divider_star.png",
    ]
    for idx, (y0, y1) in enumerate(slices[1 : 1 + len(icon_names)]):
        box = slice_bbox(mask, y0, y1, pad=4)
        save_png(crop_region(im, box), icon_names[idx], trim=True)


def extract_choosemode_mobile() -> None:
    print("[mobile/choosemode]")
    im = load_rgba(CUT / "mobile/choosemode/choosemode.jpg")
    arr = np.array(im)
    mask = content_mask(arr)
    slices = row_slices(mask)

    save_png(crop_region(im, slice_bbox(mask, *slices[0], pad=4)), "mode-select/header_dossier_bg.png")
    save_png(crop_region(im, slice_bbox(mask, *slices[1], pad=4)), "mode-select/toggle_frame.png")

    y0, y1 = slices[2]
    sub = mask[y0:y1]
    xs = np.where(sub.any(axis=0))[0]
    mid = (xs[0] + xs[-1]) // 2
    left = bbox_from_mask(sub[:, :mid], pad=4) or (0, 0, mid, y1 - y0)
    right = bbox_from_mask(sub[:, mid:], pad=4) or (0, 0, sub.shape[1], y1 - y0)
    lx0, ly0, lx1, ly1 = left
    rx0, ry0, rx1, ry1 = right
    save_png(crop_region(im, (lx0, y0 + ly0, lx1, y0 + ly1)), "mode-select/toggle_knob_left.png")
    save_png(crop_region(im, (mid + rx0, y0 + ry0, mid + rx1, y0 + ry1)), "mode-select/toggle_knob_right.png")

    save_png(crop_region(im, slice_bbox(mask, *slices[3], pad=4)), "mode-select/card_story_bg.png")
    save_png(crop_region(im, slice_bbox(mask, *slices[4], pad=4)), "mode-select/card_freechat_bg.png")

    y0, y1 = slices[5]
    row = mask[y0:y1]
    columns: list[tuple[int, int]] = []
    in_col = False
    start = 0
    h, w = row.shape
    for x in range(w):
        active = row[:, max(0, x - 1) : min(w, x + 2)].any()
        if active and not in_col:
            start = x
            in_col = True
        elif not active and in_col:
            if x - start > 40:
                columns.append((start, x))
            in_col = False
    if in_col and w - start > 40:
        columns.append((start, w))

    icon_names = [
        "mode-select/icon_story_film.png",
        "mode-select/icon_freechat_bubble.png",
        "mode-select/seal_confirmed_large.png",
        "mode-select/seal_standby_large.png",
    ]
    for (x0, x1), name in zip(columns[:4], icon_names):
        sub_mask = row[:, x0:x1]
        local = bbox_from_mask(sub_mask, pad=6)
        if not local:
            continue
        lx0, ly0, lx1, ly1 = local
        box = (x0 + lx0, y0 + ly0, x0 + lx1, y0 + ly1)
        save_png(crop_region(im, box), name, trim=True)

    save_png(crop_region(im, slice_bbox(mask, *slices[6], pad=4)), "mode-select/button_enter_red.png")
    save_png(crop_region(im, slice_bbox(mask, *slices[7], pad=4)), "mode-select/decoration_bottom_stain.png")


def extract_prologue_mobile() -> None:
    print("[mobile/prologue]")
    im = load_rgba(CUT / "mobile/modeselect/modeselect.png")
    arr = np.array(im)
    mask = content_mask(arr)

    atmosphere_box = (0, 40, im.width, 930)
    save_jpg(crop_region(im, atmosphere_box, transparent_bg=False), "prologue/bg_prologue_atmosphere.jpg")

    title_box = slice_bbox(mask, 990, 1120, pad=8)
    save_png(crop_region(im, title_box), "prologue/title_mask.png")

    textbox_box = (48, 1140, im.width - 48, 1510)
    save_png(crop_region(im, textbox_box), "prologue/textbox_prologue.png")

    button_box = (48, 1590, im.width - 48, 1710)
    save_png(crop_region(im, button_box), "prologue/button_enter_gold.png")


def extract_pc_from_cut() -> None:
    print("[pc/cut]")
    home = load_rgba(CUT / "pc/home.png")

    save_png(crop_region(home, (392, 758, 486, 872)), "nav/nav_home.png", trim=True)

    choose = load_rgba(CUT / "pc/choosemode.png")

    save_png(crop_region(choose, (118, 59, 220, 339)), "shell/sidebar_active_indicator.png", trim=True)
    save_png(crop_region(choose, (74, 407, 264, 614)), "nav/nav_modes.png", trim=True)
    save_png(crop_region(choose, (74, 677, 264, 885)), "nav/nav_profile.png", trim=True)
    # sidebar_bg.jpg: texture-only via `pnpm extract-pc-shell` (do not bake full sidebar from PC mock).


def extract_home_dossier_extras() -> None:
    """Ministry stamp for home dossier cards — from UI/mobile/首页.jpg coordinates."""
    print("[mobile/home dossier extras]")
    im = load_rgba(UI / "mobile/首页.jpg")
    save_png(crop_region(im, (658, 592, 780, 662)), "home/seal_ministry.png", trim=True)


def extract_prologue_branding() -> None:
    """Prologue-specific assets from UI/mobile/序幕画面.jpg."""
    print("[mobile/prologue branding]")
    im = load_rgba(UI / "mobile/序幕画面.jpg")

    save_png(crop_region(im, (276, 1080, 586, 1116)), "prologue/divider_star.png", trim=True)
    save_png(crop_region(im, (326, 786, 540, 872)), "prologue/emblem_cccp_textbox.png", trim=True)
    save_png(crop_region(im, (55, 92, 810, 120)), "prologue/prologue_header_divider.png", trim=True)
    save_png(crop_region(im, (82, 748, 782, 792)), "prologue/textbox_redaction_bar.png", trim=True)

    divider = Image.open(OUT / "prologue/divider_star.png").convert("RGBA")
    dw, dh = divider.size
    cx, cy = dw // 2, dh // 2
    star = divider.crop((max(0, cx - 14), max(0, cy - 14), min(dw, cx + 14), min(dh, cy + 14)))
    save_png(star, "common/emblem_star_simple.png")


def extract_home_branding() -> None:
    """Brand assets from UI/mobile/首页.jpg (not on cut sheet)."""
    print("[mobile/home branding]")
    im = load_rgba(UI / "mobile/首页.jpg")

    save_png(crop_region(im, (42, 36, 138, 185)), "brand/red_ribbon_top.png", trim=True)
    save_png(crop_region(im, (115, 92, 250, 212)), "brand/emblem_hammer_sickle.png", trim=True)
    save_png(crop_region(im, (68, 272, 782, 512)), "brand/logo_soulthread.png", trim=True)


def write_manifest() -> None:
    files = sorted(
        str(p.relative_to(OUT)).replace("\\", "/")
        for p in OUT.rglob("*")
        if p.is_file() and p.name != ".manifest.json"
    )
    (OUT / ".manifest.json").write_text(json.dumps(files, indent=2), encoding="utf-8")
    print(f"\nDone — {len(files)} assets in {OUT}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    extract_home_mobile()
    extract_home_branding()
    extract_home_dossier_extras()
    extract_choosemode_mobile()
    extract_prologue_mobile()
    extract_prologue_branding()
    extract_pc_from_cut()
    write_manifest()


if __name__ == "__main__":
    main()
