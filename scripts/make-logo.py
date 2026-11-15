"""Renders the still Ignis_0G logo: a blue sphere with light-blue ribbons and a fine surface grain.

It is a procedural render (3D noise for the ribbons and the grain, then diffuse, soft specular and rim lighting),
so there is no photo or outside asset behind it. js/logo-sphere.js draws the same look live in the browser for the
interactive version; this script makes the still used in the nav, as the favicon, and as the no-WebGL fallback.

Usage (from the repo root):  python scripts/make-logo.py     # writes img/logo.png
"""
import numpy as np
from PIL import Image

SEED = 7
SS = 768            # render size, downsampled for smooth edges
OUT = 256
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


def fbm(p, octaves=3):
    total, amp, freq, norm = 0.0, 0.5, 1.0, 0.0
    for _ in range(octaves):
        total = total + amp * noise3(p * freq)
        norm += amp
        amp *= 0.5
        freq *= 2.03
    return total / norm


def unit(v):
    v = np.array(v, dtype=np.float32)
    return v / np.linalg.norm(v)


def mix(a, b, t):
    return a * (1 - t[..., None]) + b * t[..., None]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def height(p):
    """Fine surface grain: a mid-scale mottling plus a very fine speckle."""
    return fbm(p * 9.0, 3) * 0.75 + noise3(p * 26.0) * 0.25


def render():
    h = SS
    ys, xs = np.mgrid[0:h, 0:h].astype(np.float32)
    x = (xs + 0.5) / h * 2 - 1
    y = -((ys + 0.5) / h * 2 - 1)
    R = 0.94
    r2 = (x * x + y * y) / (R * R)
    inside = r2 < 1
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    n = np.stack([x / R, y / R, z], -1)

    # Pattern coordinates: the sphere tipped forward a little, light fixed in the view.
    tilt = np.deg2rad(18)
    M = np.array([[1, 0, 0], [0, np.cos(-tilt), -np.sin(-tilt)], [0, np.sin(-tilt), np.cos(-tilt)]], dtype=np.float32)
    p = n @ M.T

    pp = p * 1.25 + 0.22 * np.array([1.0, 0.0, 0.27], dtype=np.float32)
    w = np.stack([fbm(pp + 3.1), fbm(pp + 7.7), fbm(pp + 11.3)], -1) - 0.5
    q = p * 1.4 + 1.9 * w
    f = fbm(q)
    f2 = fbm(q * 1.15 + 5.2)
    rib = np.clip(np.exp(-(((f - 0.5) / 0.055) ** 2)) + np.exp(-(((f2 - 0.47) / 0.034) ** 2)) * 0.6, 0, 1)

    # Surface grain: height field, its gradient bends the normal, and it breaks up the ribbons a little.
    e = 0.015
    h0 = height(p)
    g = np.stack([(height(p + np.array([e, 0, 0], dtype=np.float32)) - h0) / e,
                  (height(p + np.array([0, e, 0], dtype=np.float32)) - h0) / e,
                  (height(p + np.array([0, 0, e], dtype=np.float32)) - h0) / e], -1)
    gv = g @ M                                              # back to view space
    gv = gv - (gv * n).sum(-1, keepdims=True) * n
    n2 = n - 0.04 * gv
    n2 = n2 / np.linalg.norm(n2, axis=-1, keepdims=True)
    rib = rib * (0.82 + 0.36 * h0)

    dark = np.array([5, 14, 140], dtype=np.float32)
    mid = np.array([22, 62, 236], dtype=np.float32)
    bright = np.array([62, 128, 255], dtype=np.float32)
    base = mix(dark, mid, smoothstep(0.30, 0.70, f))
    base = mix(base, bright, smoothstep(0.55, 0.9, f2) * 0.5)
    violet = np.array([66, 24, 170], dtype=np.float32)
    ribbon_col = np.array([165, 208, 255], dtype=np.float32)

    L = unit([-0.5, 0.58, 0.64])
    V = np.array([0, 0, 1], dtype=np.float32)
    wrap = np.clip((n2 @ L + 0.3) / 1.3, 0, 1)
    lit = 0.16 + 1.0 * wrap ** 1.15

    col = base * lit[..., None]
    col += violet * ((1 - wrap) ** 1.6 * 0.42)[..., None]
    col = mix(col, ribbon_col * (0.5 + 0.62 * wrap)[..., None], rib * 0.8)
    col *= (0.88 + 0.24 * h0)[..., None]

    # Soft specular only: a satin sheen, not a glossy hot spot.
    ndh = np.clip(n2 @ unit(L + V), 0, 1)
    spec = ndh ** 60 * 0.30 + ndh ** 14 * 0.06
    col += np.array([255, 255, 255], dtype=np.float32) * spec[..., None]

    fres = (1 - z) ** 2.6
    rim = fres * np.clip(n @ unit([0.62, -0.5, 0.25]) * 0.9 + 0.35, 0, 1)
    col += np.array([70, 175, 255], dtype=np.float32) * (rim * 0.7)[..., None]
    col += np.array([40, 60, 200], dtype=np.float32) * (fres * 0.18)[..., None]

    col = np.clip(col, 0, 255)
    edge = np.clip((1 - np.sqrt(r2)) * (R * h / 2) / 1.2, 0, 1)
    alpha = (edge * inside * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([col.astype(np.uint8), alpha]))


if __name__ == '__main__':
    render().resize((OUT, OUT), Image.LANCZOS).save('img/logo.png', optimize=True)
    print('wrote img/logo.png')
