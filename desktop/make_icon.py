"""Draws desktop/etherwake.ico: the starter ship from the game, nose to the right, on a dark tile.

Every size is drawn separately at 8x and scaled down, so small sizes stay sharp. Needs Pillow:
    python desktop/make_icon.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

# The palette from index.html
BG, PLATE, LINE = "#07080b", "#0f1218", "#2b323d"
ETHER, DEEP, INK, HULL = "#4fe3d0", "#1f9aa8", "#e6e8ea", "#3a4350"

# The starter ship in a 32-unit square: (column, row, block) with the core at (0, 0) and the nose to the right
SHIP = [(-1, -1, "eng"), (0, -1, "hull"), (-1, 0, "tank"), (0, 0, "core"), (1, 0, "hull"), (2, 0, "emit"),
        (-1, 1, "coll"), (0, 1, "hull")]
CELL, X0, Y0 = 6, 4, 7  # 4 x 3 blocks of 6 units, centred: 24 x 18 from (4, 7)
SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256]


def draw(size: int) -> Image.Image:
    k = size * 8 / 32
    img = Image.new("RGBA", (size * 8, size * 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    box = lambda x, y, w, h: [x * k, y * k, (x + w) * k - 1, (y + h) * k - 1]
    d.rounded_rectangle(box(0, 0, 32, 32), radius=6 * k, fill=PLATE, outline=LINE, width=max(1, round(k)))
    for c, r, kind in SHIP:
        x, y = X0 + (c + 1) * CELL, Y0 + (r + 1) * CELL
        s = CELL - 1  # a one-unit seam between blocks, as the hull lines read in the game
        if kind == "core":
            d.rectangle(box(x, y, s, s), fill=ETHER)
            d.rectangle(box(x + 1.5, y + 1.5, 2, 2), fill="#ffffff")
        elif kind == "tank":
            d.rectangle(box(x, y, s, s), fill=DEEP)
        elif kind == "emit":
            d.rectangle(box(x, y + 1, 3, 3), fill=ETHER)
            d.rectangle(box(x + 3, y + 0.5, 2, 4), fill=INK)
        elif kind == "coll":
            d.rectangle(box(x, y, s, s), fill=HULL)
            d.ellipse(box(x + 1, y + 1, 3, 3), outline=ETHER, width=max(1, round(k * 0.8)))
        elif kind == "eng":
            d.rectangle(box(x, y, s, s), fill=HULL)
            d.rectangle(box(x, y + 1, 1.2, 3), fill=INK)
        else:
            d.rectangle(box(x, y, s, s), fill=HULL)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    out = Path(__file__).with_name("etherwake.ico")
    images = [draw(s) for s in SIZES]
    images[-1].save(out, format="ICO", sizes=[(s, s) for s in SIZES], append_images=images[:-1])
    images[-1].save(out.with_name("icon-preview.png"))
    print(out, out.stat().st_size, "bytes")
