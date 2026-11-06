#!/usr/bin/env python3
"""Regenerates every app icon and store graphic from the EraVenda mark (gold handle + three white bars on emerald).
The mark's geometry was measured from the website favicon (192px design grid), then redrawn at high resolution.
Run:  python3 scripts/make-icons.py      (needs Pillow and numpy)
Replace this script's output with designer artwork whenever you have it; keep the file names and sizes.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

GOLD, WHITE = (245, 158, 11), (255, 255, 255)
TL, BR = np.array([14, 114, 101]), np.array([11, 96, 63])  # gradient corners sampled from the favicon
SS = 4  # supersampling factor for smooth edges

def gradient(w, h):
    y, x = np.mgrid[0:h, 0:w]
    t = ((x / max(w - 1, 1)) + (y / max(h - 1, 1))) / 2
    rgb = (TL[None, None, :] * (1 - t[..., None]) + BR[None, None, :] * t[..., None]).astype(np.uint8)
    return Image.fromarray(rgb, "RGB").convert("RGBA")

def mark(size, scale, offset=(0, 0), bars=WHITE, arc=GOLD):
    """Transparent RGBA image `size` square with the mark centred. `scale` = fraction of the 192 design grid."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = big / 192 * scale
    # centre the mark's bounding box (x 56..135, y 41..141 in design units) on the canvas
    cx, cy = (56 + 135) / 2, (41 + 141) / 2
    ox = big / 2 - cx * k + offset[0] * SS
    oy = big / 2 - cy * k + offset[1] * SS
    P = lambda x, y: (ox + x * k, oy + y * k)
    for y0, y1, x0, x1 in [(80, 93, 56, 135), (104, 118, 56, 114), (128, 141, 56, 135)]:
        a, b = P(x0, y0), P(x1, y1)
        d.rounded_rectangle([a, b], radius=(b[1] - a[1]) / 2, fill=bars)
    # handle: upper half of an ellipse, 9 units thick, round ends
    a, b = P(65, 41), P(126, 102)
    d.arc([a, b], start=180, end=360, fill=arc, width=int(9 * k))
    r = 4.5 * k
    for ex in (65 + 4.5, 126 - 4.5):
        px, py = P(ex, 71.5)
        d.ellipse([px - r, py - r, px + r, py + r], fill=arc)
    return img.resize((size, size), Image.LANCZOS)

def save(img, path):
    img.save(path, optimize=True)
    print("wrote", path, img.size)

# iOS / generic icon: full bleed, NO transparency (Apple rejects alpha), the OS rounds the corners.
icon = gradient(1024, 1024)
icon.alpha_composite(mark(1024, 1.0))
save(icon.convert("RGB"), "assets/icon.png")

# Android adaptive icon: foreground sits inside the central ~66% "safe zone"; background is the solid colour in app.json.
save(mark(1024, 0.78), "assets/adaptive-icon.png")
# Android 13+ themed icon: single-colour silhouette, the OS tints it.
mono = mark(1024, 0.78, bars=(0, 0, 0, 255), arc=(0, 0, 0, 255))
save(mono, "assets/adaptive-icon-monochrome.png")

# Android status-bar notification icon: white shape on transparent, 96px.
save(mark(96, 0.95, bars=WHITE, arc=WHITE), "assets/notification-icon.png")

# In-app header logo: the mark in brand colours (emerald bars + gold handle) on transparent, for the white top bar.
save(mark(256, 1.15, bars=(15, 92, 63)), "assets/logo-mark.png")

# Splash: mark on transparent, shown over the emerald background colour.
save(mark(1024, 0.9), "assets/splash-icon.png")

# Google Play: 512 icon and 1024x500 feature graphic.
play = gradient(512, 512)
play.alpha_composite(mark(512, 1.0))
save(play.convert("RGB"), "store-assets/play-icon-512.png")

fg = gradient(1024, 500)
fg.alpha_composite(mark(500, 0.95), (60, 0))
draw = ImageDraw.Draw(fg)
TEXT_X, MAX_X = 450, 1024 - 50  # text column, keeps a 50px right margin
def fit(path, text, size):
    """Largest font (<= size) whose rendered text stays inside the column."""
    while size > 12:
        font = ImageFont.truetype(path, size)
        if draw.textlength(text, font=font) <= MAX_X - TEXT_X:
            return font
        size -= 2
    return font
try:
    big = fit("/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf", "EraVenda", 92)
    small = fit("/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf", "Buy and sell with local vendors", 36)
except OSError:
    big = small = ImageFont.load_default()
draw.text((TEXT_X, 170), "EraVenda", font=big, fill=WHITE)
draw.text((TEXT_X + 4, 285), "Buy and sell with local vendors", font=small, fill=(231, 242, 236))
save(fg.convert("RGB"), "store-assets/play-feature-graphic-1024x500.png")
