# Escursionista fermo nella posa del riferimento: si muove solo la mano destra,
# che lascia il bastoncino e va alla fronte "a visiera", come chi guarda lontano.
# uso: python3 immobile.py seg.npz fondo.npy cartella_uscita
import sys, math, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SEG, FONDO, OUTD = sys.argv[1:4]
d = np.load(SEG); C, lab, fig = d['C'], d['lab'], d['fig']
H, W = lab.shape
S = 2
pal = np.vstack([np.clip(C, 0, 255), [[0, 0, 0]]]).astype(np.uint8)
def col(rgb): return tuple(int(v) for v in C[int(((C - np.array(rgb)) ** 2).sum(1).argmin())])
NAVY = col((13, 32, 53)); MANICA_L = col((214, 103, 20)); PELLE = col((252, 200, 147))

fa = np.load(FONDO)
fondo = np.zeros(fa.shape + (4,), np.uint8); m = fa >= 0
fondo[m, :3] = pal[fa[m]]; fondo[m, 3] = 255
fondo = Image.fromarray(fondo)

# figura ferma: tutto tranne avambraccio destro, mano destra e il suo bastoncino
yy, xx = np.mgrid[:H, :W]
def seg_dist(a, b):
    a = np.array(a, float); b = np.array(b, float); dd = b - a
    t = np.clip(((xx - a[0]) * dd[0] + (yy - a[1]) * dd[1]) / (dd @ dd), 0, 1)
    return np.hypot(xx - a[0] - t * dd[0], yy - a[1] - t * dd[1])
POLO_A, POLO_B = (742, 395), (862, 830)
polo_f = seg_dist(POLO_A, POLO_B) < 15
mano_f = ((xx - 760) / 46) ** 2 + ((yy - 455) / 44) ** 2 < 1
avam_f = (xx > 662) & (yy > 415) & (yy < 520)
ferma = fig & (lab >= 0) & ~polo_f & ~mano_f & ~avam_f
cc, n = ndimage.label(ferma)
sz = ndimage.sum(ferma, cc, range(1, n + 1))
ferma = np.isin(cc, 1 + np.where(sz > 400)[0])
lb = lab.copy(); lb[~ferma] = -1
best = np.full((H * S, W * S), -1e9, np.float32); arg = np.full((H * S, W * S), -1, np.int16)
for c in range(-1, len(C)):
    mm = lb == c
    if not mm.any(): continue
    g = ndimage.zoom(ndimage.gaussian_filter(mm.astype(np.float32), 2.2), S, order=1)
    u = g > best; best[u] = g[u]; arg[u] = c
fi = np.zeros((H * S, W * S, 4), np.uint8); mb = arg >= 0
fi[mb, :3] = pal[arg[mb]]; fi[mb, 3] = 255
figura = Image.fromarray(fi)

def P(pts): return [(x * S, y * S) for x, y in pts]
def rot(v, a): c, s = math.cos(a), math.sin(a); return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
def smooth(t): t = min(max(t, 0), 1); return t * t * (3 - 2 * t)
def capsula(dr, a, b, w0, w1, fill):
    ang = math.atan2(b[1] - a[1], b[0] - a[0]); nn = (-math.sin(ang), math.cos(ang))
    pts = [(a[0] + nn[0] * w0 / 2, a[1] + nn[1] * w0 / 2), (b[0] + nn[0] * w1 / 2, b[1] + nn[1] * w1 / 2),
           (b[0] - nn[0] * w1 / 2, b[1] - nn[1] * w1 / 2), (a[0] - nn[0] * w0 / 2, a[1] - nn[1] * w0 / 2)]
    dr.polygon(P(pts), fill=fill)
    for c, w in ((a, w0), (b, w1)):
        dr.ellipse([((c[0] - w / 2) * S, (c[1] - w / 2) * S), ((c[0] + w / 2) * S, (c[1] + w / 2) * S)], fill=fill)
def ellisse(dr, c, rx, ry, ang, fill, n=56):
    dr.polygon(P([add(c, rot((rx * math.cos(2 * math.pi * i / n), ry * math.sin(2 * math.pi * i / n)), ang)) for i in range(n)]), fill=fill)

# pose: mano sul bastoncino -> mano alla fronte
EL0, MA0 = (655, 478), (760, 455)
EL1, MA1 = (772, 392), (708, 250)
SPALLA = (640, 445)
def smoother(t): t = min(max(t, 0), 1); return t * t * t * (t * (t * 6 - 15) + 10)
def bez(p0, c, p1, t): return ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1])
CM, CE = (812, 330), (760, 440)      # punti di controllo: la mano esce in avanti e sale ad arco, il gomito la segue
def posa(e):
    # e: 0 = sul bastoncino, 1 = a visiera (già addolcito)
    el = bez(EL0, CE, EL1, e)
    ma = bez(MA0, CM, MA1, e)
    rx, ry = 33, 37                     # la mano resta sempre lo stesso cerchio
    ang = math.radians(-15)
    return el, ma, rx, ry, ang

N = 104                     # ~4,4 secondi: ferma, alza piano, guarda lontano, riabbassa piano
SU0, SU1, GIU0, GIU1 = .08, .36, .72, .97
def e_di(i):
    t = i / N
    if t < SU0: return 0
    if t < SU1:                       # salita con un piccolo assestamento finale
        u = (t - SU0) / (SU1 - SU0)
        return smoother(u) + .035 * math.sin(math.pi * smoother(u)) * u
    if t < GIU0: return 1
    if t < GIU1: return 1 - smoother((t - GIU0) / (GIU1 - GIU0))
    return 0

def fotogramma(i):
    e = e_di(i)
    el, ma, rx, ry, ang = posa(e)
    t = i / N
    if SU1 - .06 <= t < GIU0 + .04:   # mentre guarda la mano scruta piano l'orizzonte (entra e esce dolcemente)
        w = smooth((t - (SU1 - .06)) / .1) * (1 - smooth((t - (GIU0 - .06)) / .1))
        ph = 2 * math.pi * (t - (SU1 - .06)) / (GIU0 - SU1 + .1)
        ma = (ma[0] + 4 * w * math.sin(ph), ma[1] - 2.5 * w * math.sin(2 * ph))
        ang += math.radians(3) * w * math.sin(ph)
    davanti = ma[1] < 395                # appena la mano supera la spalla passa davanti al viso
    img = fondo.copy()
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
    capsula(dr, POLO_A, POLO_B, 18, 18, NAVY)
    capsula(dr, POLO_A, add(POLO_A, (12, 45)), 23, 23, NAVY)
    capsula(dr, SPALLA, el, 62, 56, MANICA_L)
    capsula(dr, el, ma, 54, 46, MANICA_L)
    if not davanti: ellisse(dr, ma, rx, ry, ang, PELLE)
    img.alpha_composite(lay)
    img.alpha_composite(figura)
    if davanti:
        lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
        capsula(dr, lerp(el, ma, .35), ma, 50, 44, MANICA_L)
        ellisse(dr, ma, rx, ry, ang, PELLE)
        img.alpha_composite(lay)
    return img

os.makedirs(OUTD, exist_ok=True)
sel = os.environ.get('SEL')
for i in ([int(x) for x in sel.split(',')] if sel else range(N)):
    fotogramma(i).save(f'{OUTD}/f{i:03d}.png')
print('ok')
