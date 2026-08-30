"""Write a multi-resolution .ico from PNG sizes (Pillow often stores only one frame)."""
from __future__ import annotations

import struct
from pathlib import Path

from PIL import Image

REPO = Path(r"C:\Users\Dane\Cursor Projects\simple roster plus\srp")
SIZES = (16, 32, 48, 64)


def png_bytes(im: Image.Image, size: int) -> bytes:
    from io import BytesIO

    buf = BytesIO()
    im.resize((size, size), Image.Resampling.LANCZOS).save(buf, format="PNG")
    return buf.getvalue()


def write_ico(path: Path, images: list[tuple[int, bytes]]) -> None:
    # ICONDIR + ICONDIRENTRY*n + PNG payloads
    count = len(images)
    offset = 6 + 16 * count
    entries = []
    payloads = []
    for size, data in images:
        w = 0 if size >= 256 else size
        h = 0 if size >= 256 else size
        entries.append(struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(data), offset))
        payloads.append(data)
        offset += len(data)

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as f:
        f.write(struct.pack("<HHH", 0, 1, count))
        for entry in entries:
            f.write(entry)
        for data in payloads:
            f.write(data)
    print("wrote", path, "bytes", path.stat().st_size, "sizes", [s for s, _ in images])


def main() -> None:
    icon = Image.open(REPO / "public" / "brand" / "srp-icon.png").convert("RGBA")
    images = [(s, png_bytes(icon, s)) for s in SIZES]
    for dest in (
        REPO / "public" / "favicon.ico",
        REPO / "landing-page" / "favicon.ico",
        REPO / "landing-page" / "brand" / "favicon.ico",
    ):
        write_ico(dest, images)


if __name__ == "__main__":
    main()
