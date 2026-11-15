"""Renders the Ignis-0G logo: a glossy blue sphere with light-blue ribbons, like a flame ball in microgravity.

It is a procedural render (3D noise for the ribbons, then diffuse, specular and rim lighting), so there is no
photo or outside asset behind it. The ribbon pattern rotates around the sphere while the light stays put, so the
animation loops with no jump.

Usage (from the repo root):
  python scripts/make-logo.py still   # one frame to img/logo.png
  python scripts/make-logo.py all     # still, plus img/logo-96.webp and img/logo-256.webp animations
"""
import sys
import numpy as np
from PIL import Image

SEED = 7
SS = 512            # render size, downsampled for smooth edges
OUT = 256           # final size of the large version
FRAMES = 48
rng = np.random.default_rng(SEED)
LATTICE = rng.random((64, 64, 64)).astype(np.float32)


def smooth(t):
    return t * t * (3 - 2 * t)


def noise3(p):
    """Trilinear value noise, p has shape (..., 3), result in 0..1."""
    i = np.floor(p).astype(np.int64)
    f = (p - i).astype(np.float32)
    u = smooth(f)
    x0, y0, z0 = i[..., 0] & 63, i[..., 1] & 63, i[..., 2] & 63
    x1, y1, z1 = (x0 + 1) & 63, (y0 + 1) & 63, (z0 + 1) & 63
    ux, uy, uz = u[..., 0], u[..., 1], u[..., 2]
    L = LATTICE
    c00 = L[x0, y0, z0] * (1 - ux) + L[x1, y0, z0] * ux
    c10 = L[x0, y1, z0] * (1 - ux) + L[x1, y1, z0] * ux
    c01 = L[x0, y0, z1] * (1 - ux) + L[x1, y0, z1] * ux
    c11 = L[x0, y1, z1] * (1 - ux) + L[x1, y1, z1] * ux
    return (c00 * (1 - uy) + c10 * uy) * (1 - uz) + (c01 * (1 - uy) + c11 * uy) * uz


def fbm(p, octaves=4):
    total, amp, freq, norm = 0.0, 0.5, 1.0, 0.0
    for _ in range(octaves):
        total = total + amp * noise3(p * freq)
        norm += amp
        amp *= 0.5
        freq *= 2.03
    return total / norm


def norm(v):
    v = np.array(v, dtype=np.float32)
    return v / np.linalg.norm(v)


def mix(a, b, t):
    return a * (1 - t[..., None]) + b * t[..., None]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def render(theta):
    h = SS
    ys, xs = np.mgrid[0:h, 0:h].astype(np.float32)
    x = (xs + 0.5) / h * 2 - 1
    y = -((ys + 0.5) / h * 2 - 1)           # up is positive
    R = 0.94
    r2 = (x * x + y * y) / (R * R)
    inside = r2 < 1
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    n = np.stack([x / R, y / R, z], -1)

    # Rotate the surface pattern around a slightly tilted axis. The light stays fixed.
    c, s = np.cos(theta), np.sin(theta)
    ry = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=np.float32)
    tilt = np.deg2rad(18)
    rx = np.array([[1, 0, 0], [0, np.cos(tilt), -np.sin(tilt)], [0, np.sin(tilt), np.cos(tilt)]], dtype=np.float32)
    p = (n @ ry.T) @ rx.T

    # Domain-warped noise makes the flowing ribbons. The small circular drift lets them shift and still loop.
    drift = 0.22 * np.array([np.cos(theta), np.sin(theta), np.cos(theta + 1.3)], dtype=np.float32)
    pp = p * 1.25 + drift
    w = np.stack([fbm(pp + 3.1, 3), fbm(pp + 7.7, 3), fbm(pp + 11.3, 3)], -1) - 0.5
    q = p * 1.4 + 1.9 * w
    f = fbm(q, 3)
    f2 = fbm(q * 1.1 + 5.2, 3)

    rib1 = np.exp(-(((f - 0.5) / 0.055) ** 2))
    rib2 = np.exp(-(((f2 - 0.47) / 0.034) ** 2)) * 0.6
    rib = np.clip(rib1 + rib2, 0, 1)

    # Base colour: deep blue with a violet cast in the shade.
    dark = np.array([5, 14, 140], dtype=np.float32)
    mid = np.array([22, 62, 236], dtype=np.float32)
    bright = np.array([62, 128, 255], dtype=np.float32)
    t = smoothstep(0.30, 0.70, f)
    base = mix(dark, mid, t)
    base = mix(base, bright, smoothstep(0.55, 0.9, f2) * 0.5)
    violet = np.array([66, 24, 170], dtype=np.float32)
    ribbon_col = np.array([165, 208, 255], dtype=np.float32)

    L = norm([-0.5, 0.58, 0.64])
    V = np.array([0, 0, 1], dtype=np.float32)
    ndl = n @ L
    wrap = np.clip((ndl + 0.3) / 1.3, 0, 1)
    lit = 0.16 + 1.0 * wrap ** 1.15

    col = base * lit[..., None]
    col += violet * ((1 - wrap) ** 1.6 * 0.42)[..., None]
    col = mix(col, ribbon_col * (0.5 + 0.62 * wrap)[..., None], rib * 0.82)

    # Specular: a tight highlight and a soft broad one.
    H = norm(L + V)
    ndh = np.clip(n @ H, 0, 1)
    spec = ndh ** 110 * 1.0 + ndh ** 22 * 0.2
    col += np.array([255, 255, 255], dtype=np.float32) * spec[..., None]

    # Rim light from the lower right, cool cyan, strongest at the edge.
    fres = (1 - z) ** 2.6
    rim_dir = norm([0.62, -0.5, 0.25])
    rim = fres * np.clip(n @ rim_dir * 0.9 + 0.35, 0, 1)
    col += np.array([70, 175, 255], dtype=np.float32) * (rim * 0.95)[..., None]
    col += np.array([40, 60, 200], dtype=np.float32) * (fres * 0.22)[..., None]

    col = np.clip(col, 0, 255)
    edge = np.clip((1 - np.sqrt(r2)) * (R * h / 2) / 1.2, 0, 1)   # soft 1.2 px edge
    alpha = (edge * inside * 255).astype(np.uint8)
    rgba = np.dstack([col.astype(np.uint8), alpha])
    return Image.fromarray(rgba)


def down(im, size):
    return im.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'still'
    if mode == 'still':
        down(render(0.0), OUT).save('img/logo.png', optimize=True)
        print('wrote img/logo.png')
    else:
        frames = [render(2 * np.pi * k / FRAMES) for k in range(FRAMES)]
        down(frames[0], OUT).save('img/logo.png', optimize=True)
        for size in (OUT, 96):
            ims = [down(f, size) for f in frames]
            ims[0].save(f'img/logo-{size}.webp', save_all=True, append_images=ims[1:], duration=50, loop=0,
                        quality=82 if size == OUT else 88, method=6, minimize_size=False)
            print('wrote', f'img/logo-{size}.webp')
