#!/usr/bin/env python3
"""公式キャラクター素材から、ページ用の軽量画像と OGP を作る。

使い方:
  python3 scripts/build_assets.py
  python3 scripts/build_assets.py /path/to/hub_assets.zip

探す場所:
  - 引数の zip
  - /agent/uploads/ の zip と png
  - source/ 以下の png
"""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ROOT / "source"
UPLOADS = Path("/agent/uploads")

CHIBI_FILES = {
    "chibi_wave": "chibi-wave.webp",
    "chibi_point_right": "chibi-point-right.webp",
    "chibi_point_left": "chibi-point-left.webp",
    "chibi_think": "chibi-think.webp",
    "chibi_wink_mic": "chibi-wink.webp",
}

WALK_CELL = (180, 220)
OG_SIZE = (1200, 630)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = (
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
        if bold
        else "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
    )
    if Path(path).exists():
        for index in range(6):
            try:
                face = ImageFont.truetype(path, size, index=index)
            except Exception:
                continue
            name = " ".join(face.getname())
            if "JP" in name or index == 0:
                return face
    fallback = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
    if Path(fallback).exists():
        return ImageFont.truetype(fallback, size)
    return ImageFont.load_default()


def trim(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    box = image.getbbox()
    if box:
        image = image.crop(box)
    return image


def fit(image: Image.Image, max_w: int, max_h: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    return image


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=80, method=6)
    print(f"  {path.relative_to(ROOT)}  {path.stat().st_size // 1024}KB  {image.size[0]}x{image.size[1]}")


def collect_files() -> dict[str, Image.Image]:
    found: dict[str, Image.Image] = {}

    def add(path: Path) -> None:
        if path.suffix.lower() not in {".png", ".webp", ".jpg", ".jpeg"}:
            return
        key = path.stem.lower()
        try:
            found[key] = Image.open(path).convert("RGBA")
        except Exception as err:
            print(f"skip {path}: {err}")

    zip_candidates: list[Path] = []
    if len(sys.argv) > 1:
        zip_candidates.append(Path(sys.argv[1]))
    if UPLOADS.exists():
        zip_candidates.extend(sorted(UPLOADS.glob("*.zip")))
        for path in UPLOADS.rglob("*"):
            if path.is_file():
                add(path)
    if SOURCE.exists():
        zip_candidates.extend(sorted(SOURCE.glob("*.zip")))
        for path in SOURCE.rglob("*"):
            if path.is_file():
                add(path)

    for zip_path in zip_candidates:
        if not zip_path.is_file():
            continue
        print(f"zip {zip_path}")
        with zipfile.ZipFile(zip_path) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                name = Path(info.filename)
                if name.is_absolute() or ".." in name.parts:
                    continue
                if name.suffix.lower() not in {".png", ".webp"}:
                    continue
                with archive.open(info) as handle:
                    found[name.stem.lower()] = Image.open(io.BytesIO(handle.read())).convert("RGBA")
    return found


def pick(files: dict[str, Image.Image], *names: str) -> Image.Image | None:
    for name in names:
        key = name.lower()
        if key in files:
            return files[key]
    # Hashed uploads such as sora_icon_2bf8.png still match sora_icon.
    for name in names:
        prefix = name.lower() + "_"
        for key, image in files.items():
            if key.startswith(prefix):
                return image
    return None


def mostly_opaque(image: Image.Image) -> bool:
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    opaque = sum(histogram[250:])
    return opaque > image.width * image.height * 0.9


def cover(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    resized = image.resize(
        (max(1, int(image.width * scale)), max(1, int(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def circle_icon(source: Image.Image | None) -> Image.Image:
    size = 512
    canvas = Image.new("RGBA", (size, size), (215, 236, 255, 255))
    if source is None:
        draw = ImageDraw.Draw(canvas)
        face = font(210, bold=True)
        text = "ソラ"
        box = draw.textbbox((0, 0), text, font=face)
        draw.text(
            ((size - (box[2] - box[0])) / 2, (size - (box[3] - box[1])) / 2 - 16),
            text,
            font=face,
            fill=(26, 68, 143, 255),
        )
    elif mostly_opaque(source):
        canvas.paste(cover(source.convert("RGBA"), size, size), (0, 0))
    else:
        art = trim(source)
        if art.height > art.width * 1.15:
            art = trim(art.crop((0, 0, art.width, int(art.height * 0.62))))
        art = fit(art, 470, 470)
        canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((1, 1, size - 2, size - 2), fill=255)
    canvas.putalpha(mask)
    return canvas


def walk_sprite(files: dict[str, Image.Image]) -> Image.Image | None:
    frames = []
    for index in range(1, 5):
        frame = pick(files, f"chibi_walk_right_{index}")
        if frame is None:
            return None
        frames.append(trim(frame))
    cell_w, cell_h = WALK_CELL
    sprite = Image.new("RGBA", (cell_w * 4, cell_h), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        frame = fit(frame, cell_w - 12, cell_h - 8)
        x = index * cell_w + (cell_w - frame.width) // 2
        y = cell_h - frame.height
        sprite.paste(frame, (x, y), frame)
    return sprite


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def og_background() -> Image.Image:
    width, height = OG_SIZE
    image = Image.new("RGB", OG_SIZE)
    pixels = image.load()
    c1 = (247, 251, 255)
    c2 = (166, 206, 255)
    c3 = (47, 111, 224)
    for y in range(height):
        for x in range(width):
            t = min(1.0, (x / width) * 0.55 + (y / height) * 0.55)
            pixels[x, y] = lerp(c1, c2, t / 0.62) if t < 0.62 else lerp(c2, c3, (t - 0.62) / 0.38)
    return image.convert("RGBA")


def draw_crystals(base: Image.Image) -> None:
    draw = ImageDraw.Draw(base)
    specs = [(150, 90, 18), (250, 430, 10), (430, 70, 8), (90, 300, 12)]
    for cx, cy, r in specs:
        draw.regular_polygon((cx, cy, r), 4, rotation=45, outline=(255, 255, 255, 210), width=2)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        trial = current + char
        if draw.textlength(trial, font=face) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def build_og(portrait: Image.Image | None, icon: Image.Image) -> Image.Image:
    canvas = og_background()
    draw_crystals(canvas)
    if portrait is not None:
        art = fit(trim(portrait), 640, 620)
        canvas.paste(art, (OG_SIZE[0] - art.width - 16, OG_SIZE[1] - art.height), art)
    veil = Image.new("RGBA", OG_SIZE, (0, 0, 0, 0))
    veil_px = veil.load()
    for x in range(820):
        alpha = 232 if x < 560 else int(232 * (1 - (x - 560) / 260))
        for y in range(OG_SIZE[1]):
            veil_px[x, y] = (247, 251, 255, alpha)
    canvas = Image.alpha_composite(canvas, veil)

    draw = ImageDraw.Draw(canvas)
    badge_font = font(28, bold=True)
    title_font = font(58, bold=True)
    sub_font = font(36, bold=True)
    bio_font = font(26, bold=False)

    icon_small = icon.resize((96, 96), Image.Resampling.LANCZOS)
    canvas.paste(icon_small, (64, 78), icon_small)

    draw.text((180, 96), "AI NEWS", font=badge_font, fill=(47, 111, 224, 255))
    title = "白井ソラのAIニュース"
    sub = "お得ツール＆紹介ガジェットまとめ"
    y = 210
    for line in wrap_text(draw, title, title_font, 620):
        draw.text((64, y), line, font=title_font, fill=(22, 50, 84, 255))
        y += 74
    y += 8
    for line in wrap_text(draw, sub, sub_font, 640):
        draw.text((64, y), line, font=sub_font, fill=(26, 68, 143, 255))
        y += 50
    y += 18
    bio = "最新AIニュースとガジェットを、ソラがわかりやすくお届け！"
    for line in wrap_text(draw, bio, bio_font, 640):
        draw.text((64, y), line, font=bio_font, fill=(70, 96, 120, 255))
        y += 38
    return canvas.convert("RGB")


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    files = collect_files()
    print(f"found {len(files)} source images")

    icon_src = pick(files, "sora_icon", "sora_icon_74c9", "icon")
    portrait = pick(files, "sora_full", "sora_full_eafb", "portrait")
    icon = circle_icon(icon_src if icon_src is not None else portrait)
    icon_png = ASSETS / "icon.png"
    icon.save(icon_png, "PNG", optimize=True)
    print(f"  assets/icon.png  {icon_png.stat().st_size // 1024}KB")
    save_webp(icon.resize((256, 256), Image.Resampling.LANCZOS), ASSETS / "icon.webp")

    if portrait is not None:
        save_webp(fit(trim(portrait), 720, 1000), ASSETS / "portrait.webp")
    else:
        print("  portrait not found — hero stays on the sky background")

    for stem, filename in CHIBI_FILES.items():
        image = pick(files, stem)
        if image is None:
            print(f"  missing {stem}")
            continue
        save_webp(fit(trim(image), 360, 420), ASSETS / filename)

    sprite = walk_sprite(files)
    if sprite is not None:
        save_webp(sprite, ASSETS / "chibi-walk-right.webp")
    else:
        print("  walk cycle not found")

    og = build_og(portrait, icon)
    og_path = ASSETS / "ogp.png"
    og.save(og_path, "PNG", optimize=True)
    print(f"  assets/ogp.png  {og_path.stat().st_size // 1024}KB  {og.size[0]}x{og.size[1]}")


if __name__ == "__main__":
    main()
