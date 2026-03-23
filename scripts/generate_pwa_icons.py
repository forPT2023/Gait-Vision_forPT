#!/usr/bin/env python3
import struct
import zlib
from pathlib import Path

BG = (10, 14, 26, 255)
CARD = (37, 99, 235, 255)
ACCENT = (96, 165, 250, 255)
CYAN = (34, 211, 238, 255)
WHITE = (255, 255, 255, 255)
GREEN = (16, 185, 129, 255)


def blank(size, color):
    return [[list(color) for _ in range(size)] for _ in range(size)]


def set_px(img, x, y, color):
    if 0 <= y < len(img) and 0 <= x < len(img[0]):
        img[y][x] = list(color)


def fill_rect(img, x0, y0, x1, y1, color):
    for y in range(max(0, y0), min(len(img), y1)):
        for x in range(max(0, x0), min(len(img[0]), x1)):
            img[y][x] = list(color)


def fill_circle(img, cx, cy, r, color):
    r2 = r * r
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r2:
                set_px(img, x, y, color)


def draw_line(img, x0, y0, x1, y1, thickness, color):
    dx = x1 - x0
    dy = y1 - y0
    steps = max(abs(dx), abs(dy), 1)
    for i in range(steps + 1):
        x = round(x0 + dx * i / steps)
        y = round(y0 + dy * i / steps)
        fill_circle(img, x, y, thickness, color)


def draw_icon(size):
    img = blank(size, BG)
    pad = int(size * 0.08)
    fill_rect(img, pad, pad, size - pad, size - pad, CARD)
    fill_rect(img, pad + int(size * 0.02), pad + int(size * 0.02), size - pad - int(size * 0.02), size - pad - int(size * 0.02), ACCENT)

    center_x = size // 2
    head_y = int(size * 0.28)
    torso_top = int(size * 0.39)
    torso_bottom = int(size * 0.58)
    hip_y = int(size * 0.60)
    left_foot_x = int(size * 0.34)
    right_foot_x = int(size * 0.66)
    foot_y = int(size * 0.80)

    fill_circle(img, center_x, head_y, int(size * 0.07), WHITE)
    draw_line(img, center_x, torso_top, center_x, torso_bottom, max(2, size // 64), WHITE)
    draw_line(img, center_x, int(size * 0.44), int(size * 0.34), int(size * 0.52), max(2, size // 70), CYAN)
    draw_line(img, center_x, int(size * 0.44), int(size * 0.66), int(size * 0.50), max(2, size // 70), CYAN)
    draw_line(img, center_x, hip_y, left_foot_x, foot_y, max(2, size // 60), WHITE)
    draw_line(img, center_x, hip_y, right_foot_x, int(size * 0.73), max(2, size // 60), GREEN)
    draw_line(img, right_foot_x, int(size * 0.73), int(size * 0.77), foot_y, max(2, size // 70), GREEN)

    wave_y = int(size * 0.86)
    draw_line(img, int(size * 0.22), wave_y, int(size * 0.42), wave_y - int(size * 0.05), max(1, size // 90), CYAN)
    draw_line(img, int(size * 0.42), wave_y - int(size * 0.05), int(size * 0.58), wave_y + int(size * 0.03), max(1, size // 90), CYAN)
    draw_line(img, int(size * 0.58), wave_y + int(size * 0.03), int(size * 0.78), wave_y - int(size * 0.02), max(1, size // 90), CYAN)

    return img


def png_bytes(img):
    height = len(img)
    width = len(img[0])
    raw = bytearray()
    for row in img:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    compressed = zlib.compress(bytes(raw), 9)

    def chunk(chunk_type, data):
        return (
            struct.pack('!I', len(data)) +
            chunk_type +
            data +
            struct.pack('!I', zlib.crc32(chunk_type + data) & 0xffffffff)
        )

    ihdr = struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return b''.join([
        b'\x89PNG\r\n\x1a\n',
        chunk(b'IHDR', ihdr),
        chunk(b'IDAT', compressed),
        chunk(b'IEND', b'')
    ])


def write_png(path, size):
    path.write_bytes(png_bytes(draw_icon(size)))


def write_svg(path):
    path.write_text("""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>
  <rect width='512' height='512' rx='64' fill='#0a0e1a'/>
  <rect x='48' y='48' width='416' height='416' rx='56' fill='#2563eb'/>
  <rect x='60' y='60' width='392' height='392' rx='48' fill='#60a5fa'/>
  <circle cx='256' cy='144' r='36' fill='white'/>
  <path d='M256 196 L256 298' stroke='white' stroke-width='20' stroke-linecap='round'/>
  <path d='M256 224 L176 272' stroke='#22d3ee' stroke-width='18' stroke-linecap='round'/>
  <path d='M256 224 L336 260' stroke='#22d3ee' stroke-width='18' stroke-linecap='round'/>
  <path d='M256 308 L176 410' stroke='white' stroke-width='20' stroke-linecap='round'/>
  <path d='M256 308 L336 368 L392 410' stroke='#10b981' stroke-width='20' stroke-linecap='round' stroke-linejoin='round'/>
  <path d='M112 438 C168 438 188 402 224 404 C264 406 284 448 340 438 C374 432 394 420 400 420' fill='none' stroke='#22d3ee' stroke-width='12' stroke-linecap='round'/>
</svg>
""")


def main():
    out = Path('icons')
    out.mkdir(parents=True, exist_ok=True)
    for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png'), (64, 'favicon-64.png')]:
        write_png(out / name, size)
    write_svg(out / 'icon.svg')


if __name__ == '__main__':
    main()
