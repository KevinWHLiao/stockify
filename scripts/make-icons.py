import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "assets"


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, width: int, height: int, pixels) -> None:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixels(x, y))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def blend(color, alpha):
    return (color[0], color[1], color[2], max(0, min(255, int(alpha))))


def rounded_rect(x, y, size, radius):
    if radius <= x < size - radius and radius <= y < size - radius:
        return True
    corners = (
        (radius, radius),
        (size - radius - 1, radius),
        (radius, size - radius - 1),
        (size - radius - 1, size - radius - 1),
    )
    for cx, cy in corners:
        if (x - cx) ** 2 + (y - cy) ** 2 <= radius**2:
            return x < size and y < size
    if x < radius and radius <= y < size - radius:
        return False
    if y < radius and radius <= x < size - radius:
        return False
    return False


def chart(x, y, size, color):
    bars = (
        (0.30, 0.62, 0.40, 0.74),
        (0.44, 0.48, 0.54, 0.74),
        (0.58, 0.32, 0.68, 0.74),
    )
    for left, top, right, bottom in bars:
        if left * size <= x <= right * size and top * size <= y <= bottom * size:
            return color
    cx, cy, r = 0.63 * size, 0.30 * size, 0.045 * size
    if (x - cx) ** 2 + (y - cy) ** 2 <= r**2:
        return (225, 37, 27, 255)
    return None


def icon_pixel(x, y, size):
    radius = int(size * 0.22)
    if not rounded_rect(x, y, size, radius):
        return (0, 0, 0, 0)
    mark = chart(x, y, size, (255, 255, 255, 255))
    if mark:
        return mark
    return (47, 107, 255, 255)


def foreground_pixel(x, y, size):
    return chart(x, y, size, (255, 255, 255, 255)) or (0, 0, 0, 0)


def background_pixel(_x, _y, _size):
    return (47, 107, 255, 255)


def mono_pixel(x, y, size):
    return chart(x, y, size, (255, 255, 255, 255)) or (0, 0, 0, 0)


def save(name, size, painter):
    write_png(ROOT / name, size, size, lambda x, y: painter(x, y, size))


save("icon.png", 512, icon_pixel)
save("android-icon-foreground.png", 512, foreground_pixel)
save("android-icon-background.png", 64, background_pixel)
save("android-icon-monochrome.png", 512, mono_pixel)
save("splash-icon.png", 512, icon_pixel)
save("favicon.png", 48, icon_pixel)
print("icons written")
