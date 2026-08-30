"""Export SRP logo masters into production PNG/ICO sizes with transparent backgrounds."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ASSETS = Path(r"C:\Users\Dane\.cursor\projects\c-Users-Dane-Cursor-Projects-simple-roster-plus-srp\assets")
REPO = Path(r"C:\Users\Dane\Cursor Projects\simple roster plus\srp")
OUT_BRAND = REPO / "public" / "brand"
OUT_LANDING = REPO / "landing-page" / "brand"
OUT_APP_ICON = REPO / "app"

ICON_SIZES = (16, 32, 48, 64, 128, 180, 192, 256, 512)
ICO_SIZES = ((16, 16), (32, 32), (48, 48))


def is_backdrop(r: int, g: int, b: int, a: int) -> bool:
    """Light gray / near-white page backdrop from generated masters."""
    if a < 8:
        return True
    # Near-white / light gray page
    if r > 210 and g > 210 and b > 210:
        return True
    # Soft gray (not green)
    if min(r, g, b) > 180 and abs(r - g) < 18 and abs(g - b) < 18 and abs(r - b) < 18:
        return True
    return False


def knock_out_backdrop(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_backdrop(r, g, b, a):
                px[x, y] = (0, 0, 0, 0)
    return im


def content_bbox(im: Image.Image, alpha_min: int = 12) -> tuple[int, int, int, int]:
    px = im.load()
    w, h = im.size
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] >= alpha_min:
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y
    if max_x < 0:
        raise SystemExit("No opaque content found")
    return min_x, min_y, max_x + 1, max_y + 1


def square_pad(im: Image.Image, pad_ratio: float = 0.04) -> Image.Image:
    bbox = content_bbox(im)
    cropped = im.crop(bbox)
    w, h = cropped.size
    side = max(w, h)
    pad = int(side * pad_ratio)
    canvas = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    ox = (canvas.size[0] - w) // 2
    oy = (canvas.size[1] - h) // 2
    canvas.paste(cropped, (ox, oy), cropped)
    return canvas


def tight_pad(im: Image.Image, pad_ratio: float = 0.03) -> Image.Image:
    bbox = content_bbox(im)
    cropped = im.crop(bbox)
    w, h = cropped.size
    pad_x = max(1, int(w * pad_ratio))
    pad_y = max(1, int(h * pad_ratio))
    canvas = Image.new("RGBA", (w + pad_x * 2, h + pad_y * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (pad_x, pad_y), cropped)
    return canvas


def save_resized(im: Image.Image, path: Path, size: tuple[int, int] | int) -> None:
    if isinstance(size, int):
        size = (size, size)
    out = im.resize(size, Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, optimize=True)
    print("wrote", path, out.size)


def main() -> None:
    for d in (OUT_BRAND, OUT_LANDING, OUT_APP_ICON):
        d.mkdir(parents=True, exist_ok=True)

    icon_src = Image.open(ASSETS / "srp-icon-master.png")
    lock_src = Image.open(ASSETS / "srp-logo-lockup-master.png")
    print("icon master", icon_src.size, "lockup master", lock_src.size)

    icon = square_pad(knock_out_backdrop(icon_src), pad_ratio=0.02)
    lockup = tight_pad(knock_out_backdrop(lock_src), pad_ratio=0.02)

    # Master transparent exports
    icon_master = OUT_BRAND / "srp-icon.png"
    lock_master = OUT_BRAND / "srp-logo-lockup.png"
    icon.save(icon_master, optimize=True)
    lockup.save(lock_master, optimize=True)
    print("wrote", icon_master, icon.size)
    print("wrote", lock_master, lockup.size)

    # Sized icons
    for s in ICON_SIZES:
        save_resized(icon, OUT_BRAND / f"srp-icon-{s}.png", s)
        save_resized(icon, OUT_LANDING / f"srp-icon-{s}.png", s)

    # High-res lockup widths
    for width in (640, 1280, 2048):
        ratio = width / lockup.size[0]
        height = max(1, int(lockup.size[1] * ratio))
        save_resized(lockup, OUT_BRAND / f"srp-logo-lockup-{width}.png", (width, height))
        save_resized(lockup, OUT_LANDING / f"srp-logo-lockup-{width}.png", (width, height))

    # Copy masters into landing brand folder
    icon.save(OUT_LANDING / "srp-icon.png", optimize=True)
    lockup.save(OUT_LANDING / "srp-logo-lockup.png", optimize=True)

    # favicon.ico (multi-size) for app public + landing
    ico_images = [icon.resize(sz, Image.Resampling.LANCZOS) for sz in ICO_SIZES]
    for dest in (
        REPO / "public" / "favicon.ico",
        OUT_LANDING / "favicon.ico",
        REPO / "landing-page" / "favicon.ico",
    ):
        dest.parent.mkdir(parents=True, exist_ok=True)
        ico_images[0].save(
            dest,
            format="ICO",
            sizes=[(im.width, im.height) for im in ico_images],
            append_images=ico_images[1:],
        )
        print("wrote", dest)

    # Next.js app router icons
    save_resized(icon, OUT_APP_ICON / "icon.png", 512)
    save_resized(icon, OUT_APP_ICON / "apple-icon.png", 180)

    # Also expose common public paths
    save_resized(icon, REPO / "public" / "icon-192.png", 192)
    save_resized(icon, REPO / "public" / "icon-512.png", 512)
    save_resized(icon, REPO / "public" / "apple-touch-icon.png", 180)

    print("done")


if __name__ == "__main__":
    main()
