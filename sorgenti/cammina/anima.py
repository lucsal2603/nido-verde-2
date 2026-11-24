# Escursionista con i bastoncini: sfondo ricostruito + busto dal riferimento,
# gambe, avambracci, mani e bastoncini disegnati e animati (camminata sul posto, in salita).
# uso: python3 anima.py seg.npz fondo.npy cartella_uscita
import sys, math, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SEG, FONDO, OUTD = sys.argv[1:4]
d = np.load(SEG); C, lab, busto = d['C'], d['lab'], d['busto']
H, W = lab.shape
S = 2                                   # tela a 2x del riferimento
pal = np.vstack([np.clip(C, 0, 255), [[0, 0, 0]]]).astype(np.uint8)
def cl(rgb): return int(((C - np.array(rgb)) ** 2).sum(1).argmin())
def col(rgb): return tuple(int(v) for v in C[cl(rgb)])

PANT = col((24, 40, 81)); PANT_L = tuple(int(v * .78) for v in PANT)
SCARPA = col((13, 32, 53)); MAGLIA = col((248, 118, 13)); MANICA_L = col((214, 103, 20))
PELLE = col((252, 200, 147)); CREMA = col((252, 226, 188)); NAVY = SCARPA

# ---------- sfondo ----------
fa = np.load(FONDO)
fondo = np.zeros(fa.shape + (4,), np.uint8)
m = fa >= 0
fondo[m, :3] = pal[fa[m]]; fondo[m, 3] = 255
fondo = Image.fromarray(fondo)

# ---------- busto (testa, maglia, zaino) ----------
_cc, _n = ndimage.label(busto)
busto = _cc == (np.argmax(ndimage.sum(busto, _cc, range(1, _n + 1))) + 1)
lb = lab.copy(); lb[~busto] = -1
# la mano vicina tolta lascia una tacca nella manica: la riempio con la maglia vicina
yy, xx = np.mgrid[:H, :W]
buco = (((xx - 640) / 40) ** 2 + ((yy - 560) / 48) ** 2 < 1) & ~busto
dentro = ndimage.binary_fill_holes(ndimage.binary_closing(busto, iterations=8))
fill = buco & dentro
if fill.any():
    _, (iy, ix) = ndimage.distance_transform_edt(lb < 0, return_indices=True)
    lb[fill] = lb[iy[fill], ix[fill]]
best = np.full((H * S, W * S), -1e9, np.float32); arg = np.full((H * S, W * S), -1, np.int16)
for c in range(-1, len(C)):
    mm = (lb == c)
    if not mm.any(): continue
    g = ndimage.zoom(ndimage.gaussian_filter(mm.astype(np.float32), 2.2), S, order=1)
    u = g > best; best[u] = g[u]; arg[u] = c
bu = np.zeros((H * S, W * S, 4), np.uint8)
mb = arg >= 0
bu[mb, :3] = pal[arg[mb]]; bu[mb, 3] = 255
ys, xs = np.where(mb); bx0, by0 = xs.min(), ys.min()
busto_img = Image.fromarray(bu[by0:ys.max() + 1, bx0:xs.max() + 1])

# ---------- geometria ----------
def g(x): return 958 - .25 * (x - 390)          # terreno sotto i piedi
SLOPE = math.atan(-.25)
def rot(v, a): c, s = math.cos(a), math.sin(a); return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
def smooth(t): t = min(max(t, 0), 1); return t * t * (3 - 2 * t)

XF, XB, ST = 785, 400, .6
CAV = 32                                        # caviglia sopra la suola
TOE = (112, CAV)

def piede(p):
    p %= 1
    def appoggio(p):
        x = XF - (XF - XB) * (p / ST)
        A = (x, g(x) - CAV / math.cos(SLOPE))
        phi = SLOPE
        if p > .48:
            r = -math.radians(16) * smooth((p - .48) / (ST - .48))
            T = add(A, rot(TOE, phi))
            A = add(T, rot(sub(A, T), r)); phi += r
        return A, phi
    if p < ST: return appoggio(p)
    s = (p - ST) / (1 - ST); e = smooth(s)
    A0, f0 = appoggio(ST - 1e-6); A1, f1 = appoggio(0)
    A = lerp(A0, A1, e); A = (A[0], A[1] - 42 * math.sin(math.pi * s) ** 1.2)
    phi = f0 + (f1 - f0) * e - math.radians(9) * math.sin(math.pi * s) * s
    return A, phi

L1, L2 = 165, 162
def ginocchio(Hp, A):
    dx, dy = A[0] - Hp[0], A[1] - Hp[1]
    dd = math.hypot(dx, dy)
    if dd > L1 + L2 - 2:
        k = (L1 + L2 - 2) / dd; A = (Hp[0] + dx * k, Hp[1] + dy * k); dd = L1 + L2 - 2
    a = math.atan2(dy, dx)
    b = math.acos((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd))
    k1 = (Hp[0] + L1 * math.cos(a - b), Hp[1] + L1 * math.sin(a - b))
    k2 = (Hp[0] + L1 * math.cos(a + b), Hp[1] + L1 * math.sin(a + b))
    return (k1 if k1[0] > k2[0] else k2), A

# ---------- disegno ----------
def P(pts): return [(x * S, y * S) for x, y in pts]
def capsula(d, a, b, w0, w1, fill, tondo_a=True, tondo_b=True):
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); n = (-math.sin(ang), math.cos(ang))
    pts = [(a[0] + n[0] * w0 / 2, a[1] + n[1] * w0 / 2), (b[0] + n[0] * w1 / 2, b[1] + n[1] * w1 / 2),
           (b[0] - n[0] * w1 / 2, b[1] - n[1] * w1 / 2), (a[0] - n[0] * w0 / 2, a[1] - n[1] * w0 / 2)]
    d.polygon(P(pts), fill=fill)
    for c, w, t in ((a, w0, tondo_a), (b, w1, tondo_b)):
        if t: d.ellipse([((c[0] - w / 2) * S, (c[1] - w / 2) * S), ((c[0] + w / 2) * S, (c[1] + w / 2) * S)], fill=fill)

def ellisse(d, c, rx, ry, ang, fill, n=48):
    pts = [add(c, rot((rx * math.cos(2 * math.pi * i / n), ry * math.sin(2 * math.pi * i / n)), ang)) for i in range(n)]
    d.polygon(P(pts), fill=fill)

SCARPA_PTS = [(-46, -2), (-40, -22), (-18, -30), (30, -30), (64, -18), (100, -4), (122, 8), (130, 22), (126, 33),
              (110, 36), (-40, 36), (-48, 28)]
def scarpa(d, A, phi):
    d.polygon(P([add(A, rot(p, phi)) for p in SCARPA_PTS]), fill=SCARPA)

def gamba(d, Hp, A, phi, colore):
    K, A2 = ginocchio(Hp, A)
    scarpa(d, A2, phi)
    capsula(d, K, add(A2, rot((4, -6), phi)), 98, 86, colore, tondo_b=False)
    # orlo dritto sopra la scarpa
    capsula(d, Hp, K, 118, 100, colore)

def bastone(d, mano, punta, crema):
    u = sub(punta, mano); Lh = math.hypot(*u); u = (u[0] / Lh, u[1] / Lh)
    top = (mano[0] - u[0] * 58, mano[1] - u[1] * 58)
    if crema:
        mid = (mano[0] + u[0] * Lh * .59, mano[1] + u[1] * Lh * .59)
        capsula(d, mano, mid, 17, 17, CREMA, tondo_a=False, tondo_b=False)
        capsula(d, mid, punta, 17, 17, NAVY, tondo_a=False)
    else:
        capsula(d, mano, punta, 18, 18, NAVY, tondo_a=False)
    capsula(d, top, mano, 23, 23, NAVY)

def polo(q, Hb, Lp, gq):
    q %= 1
    STP = .5
    if q < STP:
        s = q / STP
        hx = Hb[0] + 35 - 70 * s
        tx = Hb[0] + 85 - 210 * s; ty = gq(tx)
    else:
        s = (q - STP) / (1 - STP); e = smooth(s)
        hx = Hb[0] - 35 + 70 * e
        tx = Hb[0] - 125 + 210 * e; ty = gq(tx) - 46 * math.sin(math.pi * s)
    dx = hx - tx
    hy = ty - math.sqrt(max(Lp * Lp - dx * dx, 1))
    return (hx, hy), (tx, ty)

HIP_N, HIP_F = (535, 652), (628, 645)
EL_N, EL_F = (598, 548), (655, 478)
HB_N, HB_F = (645, 565), (760, 455)
LP_N, LP_F = 415, 379.5
gN = lambda x: 965 - .1 * (x - 540)
gF = lambda x: g(x) - 12

def fotogramma(t, fermo=False):
    img = fondo.copy()
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    bob = -24 * math.cos(4 * math.pi * (t - .25)) + 10
    ob = lambda p: (p[0], p[1] + bob)
    pA, pB = t + .55, t + .05
    qN, qF = t + .52, t + .02
    # braccio lontano + bastone lontano
    mF, tF = polo(qF, ob(HB_F), LP_F, gF)
    capsula(d, ob(EL_F), mF, 56, 50, MANICA_L)
    bastone(d, mF, tF, False)
    ellisse(d, mF, 33, 37, math.radians(-15), PELLE)
    # gamba lontana, bacino, gamba vicina
    A, phi = piede(pB); gamba(d, ob(HIP_F), A, phi, PANT_L)
    d.polygon(P([ob(p) for p in [(472, 582), (660, 582), (668, 640), (640, 700), (548, 708), (505, 668)]]), fill=PANT)
    A, phi = piede(pA); gamba(d, ob(HIP_N), A, phi, PANT)
    # avambraccio vicino (esce dalla manica)
    mN, tN = polo(qN, ob(HB_N), LP_N, gN)
    capsula(d, ob(EL_N), mN, 60, 54, MAGLIA)
    img.alpha_composite(lay)
    img.alpha_composite(busto_img, (int(bx0), int(round(by0 + bob * S))))
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    bastone(d, mN, tN, True)
    ellisse(d, mN, 31, 38, math.radians(-10), PELLE)
    img.alpha_composite(lay)
    return img

os.makedirs(OUTD, exist_ok=True)
N = 48
sel = os.environ.get('SEL')
idx = [int(k) for k in sel.split(',')] if sel else range(N)
for i in idx:
    fotogramma(i / N).save(f'{OUTD}/f{i:03d}.png')
print('ok')
