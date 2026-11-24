# Ridisegna le gambe della ragazza sulla panchina gigante: ricostruisce la panchina
# dietro le gambe e disegna due gambe pulite che dondolano alternate.
# uso: python3 gambe.py originale.webp uscita.webp uscita-fermo.webp
import sys, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

SRC, OUT, FERMO = sys.argv[1:4]
Z = 4                      # supercampionamento
BX0, BY0, BX1, BY1 = 200, 212, 380, 330   # zona ricostruita

im = Image.open(SRC)
frames = []
for i in range(im.n_frames):
    im.seek(i); frames.append(np.array(im.convert('RGBA')))
N = len(frames)

# colori presi dall'originale
def med(lbl_fn):
    a = frames[0][..., :3].reshape(-1, 3).astype(int)
    m = lbl_fn(a)
    return tuple(int(v) for v in np.median(a[m], 0))
near = lambda c, t=30: (lambda a: (((a - np.array(c)) ** 2).sum(1) < t * t))
VERDE = med(near((74, 194, 108)))
VERDE_SC = med(near((0, 106, 52)))
BLU = med(near((0, 112, 204), 18))
BLU_SC = med(near((0, 80, 156), 18))
AZZ = med(near((58, 186, 238)))
PANT = med(near((58, 64, 124), 20))
PANT_SC = med(near((26, 34, 78), 16))
SCARPA_SUOLA = tuple(max(0, int(v * .7)) for v in PANT_SC)
ARANCIO = (226, 98, 36); PELLE = (240, 240, 225)

# maschera: tutto ciò che è stato pantalone in qualunque fotogramma
C = np.array([(58, 64, 124), (26, 34, 78)])
U = np.zeros(frames[0].shape[:2], bool)
for f in frames:
    d = ((f[..., None, :3].astype(int) - C[None, None]) ** 2).sum(-1).min(-1)
    U |= (d < 40 ** 2) & (f[..., 3] > 128)
U[:212] = False; U[:, :BX0] = False; U[:, BX1:] = False; U[BY1:] = False
U = ndimage.binary_dilation(U, iterations=2)

def P(pts):  # coordinate 1x -> tela 4x locale
    return [((x - BX0) * Z, (y - BY0) * Z) for x, y in pts]

def tela():
    return Image.new('RGBA', ((BX1 - BX0) * Z, (BY1 - BY0) * Z), (0, 0, 0, 0))

def riduci(img):
    a = np.array(img).astype(float)
    al = a[..., 3:4] / 255
    pm = np.concatenate([a[..., :3] * al, al], -1)
    h, w = pm.shape[0] // Z, pm.shape[1] // Z
    pm = pm.reshape(h, Z, w, Z, 4).mean((1, 3))
    out = np.zeros((h, w, 4))
    al = pm[..., 3:4]
    out[..., :3] = np.where(al > 0, pm[..., :3] / np.maximum(al, 1e-6), 0)
    out[..., 3] = al[..., 0] * 255
    return np.clip(out + .5, 0, 255).astype(np.uint8)

# ---------- panchina dietro le gambe ----------
def panchina():
    t = tela(); d = ImageDraw.Draw(t)
    xa, xb = BX0, BX1
    top = lambda x: 270.6 - .1 * (x - 250)
    bot = lambda x: 289.5 - .102 * (x - 252)
    gap = lambda x: 228 - .1 * (x - 350)
    # seduta verde con fessura tra le doghe
    d.polygon(P([(xa, BY0), (xb, BY0), (xb, top(xb) + .3), (xa, top(xa) + .3)]), fill=VERDE)
    d.polygon(P([(xa, gap(xa)), (xb, gap(xb)), (xb, gap(xb) + 3.6), (xa, gap(xa) + 3.6)]), fill=VERDE_SC)
    # gamba della panchina (faccia scura + faccia chiara)
    xl = lambda y: 274 + .28 * (y - 312)
    xm = lambda y: 299 + .25 * (y - 312)
    xr = lambda y: 313.5 + .25 * (y - 312)
    y0, y1 = 262, BY1 + 2
    d.polygon(P([(xl(y0), y0), (xm(y0), y0), (xm(y1), y1), (xl(y1), y1)]), fill=BLU)
    d.polygon(P([(xm(y0), y0), (xr(y0), y0), (xr(y1), y1), (xm(y1), y1)]), fill=AZZ)
    # traverso sinistro
    d.polygon(P([(xa, 276), (266, 276), (214.5, 320), (xa, 320)]), fill=BLU)
    # trave blu sotto la seduta, con ombra
    d.polygon(P([(xa, top(xa)), (xb, top(xb)), (xb, bot(xb)), (xa, bot(xa))]), fill=BLU)
    d.polygon(P([(xa, top(xa)), (xb, top(xb)), (xb, top(xb) + 5.1), (xa, top(xa) + 5.2)]), fill=BLU_SC)
    return riduci(t)

# ---------- gambe: prese tali e quali dal fotogramma pulito dell'illustrazione ----------
# cosce ferme; ciascuno stinco+scarpa è un pezzo rigido che oscilla attorno al ginocchio
# (stesso dondolio dell'originale, ma senza pezzi che si duplicano)
f0 = frames[0][..., :3].astype(int)
dN = ((f0 - np.array(PANT)) ** 2).sum(-1); dn = ((f0 - np.array(PANT_SC)) ** 2).sum(-1)
nav0 = (np.minimum(dN, dn) < 40 ** 2) & (frames[0][..., 3] > 128)
nav0 = ndimage.binary_opening(nav0, iterations=1) | ndimage.binary_closing(nav0, iterations=1) & nav0
yy, xx = np.mgrid[:nav0.shape[0], :nav0.shape[1]]
nav0 &= (yy >= 212)
chiaro = dN < dn
TAGLIO = 247
sx = nav0 & (yy >= TAGLIO - 6) & (((yy < 282) & (xx < 293)) | ((yy >= 282) & (xx < 308)))
dx_ = nav0 & (yy >= TAGLIO - 6) & ~sx
coscia = nav0 & (yy >= 243) & (yy < TAGLIO + 2)   # sopra resta l'originale, intatto

def grandi(m, n=40):
    lb, k = ndimage.label(m)
    if k == 0: return m
    sz = ndimage.sum(m, lb, range(1, k + 1))
    return np.isin(lb, 1 + np.where(sz >= n)[0])

sx, dx_ = grandi(ndimage.binary_opening(sx, iterations=2) | (sx & (yy < 270))), grandi(ndimage.binary_opening(dx_, iterations=1))

def sprite(mask):
    # maschera e due toni ingranditi 4x e lisciati: bordi netti come le altre animazioni
    reg = (slice(BY0, BY1), slice(BX0, BX1))
    m = mask[reg].astype(np.float32); c = (mask & chiaro)[reg].astype(np.float32)
    M = ndimage.gaussian_filter(ndimage.zoom(m, Z, order=1), Z * .9)
    Cc = ndimage.gaussian_filter(ndimage.zoom(c, Z, order=1), Z * .9)
    a = np.clip((M - .5) * 4 + .5, 0, 1)
    luce = (Cc > M * .5)
    rgb = np.where(luce[..., None], np.array(PANT), np.array(PANT_SC))
    out = np.zeros(M.shape + (4,), np.uint8); out[..., :3] = rgb; out[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(out)

SPR_SX, SPR_DX, SPR_CO = sprite(sx), sprite(dx_), sprite(coscia)
KL, KR = (276, 248), (306, 246)

def gambe(aL, aR):
    t = tela()
    for spr, K, a in ((SPR_SX, KL, aL), (SPR_DX, KR, aR)):
        r = spr.rotate(math.degrees(-a), resample=Image.BICUBIC, center=((K[0] - BX0) * Z, (K[1] - BY0) * Z))
        t.alpha_composite(r)
    t.alpha_composite(SPR_CO)
    return riduci(t)

def angoli(i):
    # stesso dondolio dell'originale (periodo 48), relativo alla posa del fotogramma 0
    dxl = lambda k: 2.25 * math.cos(2 * math.pi * (k - 45) / 48)
    dxr = lambda k: 5.0 * math.cos(2 * math.pi * (k - 14) / 48)
    return -(dxl(i) - dxl(0)) / 32, -(dxr(i) - dxr(0)) / 32

fondo = panchina()
# cosce del fotogramma pulito sopra a tutto, fino all'altezza delle ginocchia
_s = np.zeros_like(frames[0])
_m = ndimage.binary_dilation(nav0, iterations=1) & (yy < 248) & (yy >= 212) & (xx > 225) & (xx < 330)
_s[_m] = frames[0][_m]
SOPRA = Image.fromarray(_s)
out = []
for i, f in enumerate(frames):
    f = f.copy()
    reg = f[BY0:BY1, BX0:BX1]
    rgb = reg[..., :3].astype(int)
    tieni = ((((rgb - ARANCIO) ** 2).sum(-1) < 45 ** 2) | (((rgb - PELLE) ** 2).sum(-1) < 30 ** 2)) & (reg[..., 3] > 128)
    nav_i = ((((rgb - PANT) ** 2).sum(-1) < 60 ** 2) | (((rgb - PANT_SC) ** 2).sum(-1) < 60 ** 2))
    m = U[BY0:BY1, BX0:BX1] & ~tieni & (np.arange(BY0, BY1)[:, None] >= 244)
    reg[m] = fondo[m]
    ph = 2 * math.pi * i / 48
    g = Image.fromarray(gambe(*angoli(i)))
    base = Image.fromarray(f)
    base.alpha_composite(g, (BX0, BY0))
    base.alpha_composite(SOPRA)
    out.append(base)

out[0].save(OUT, save_all=True, append_images=out[1:], duration=42, loop=0, quality=90, method=4)
fermo = Image.fromarray(frames[0]).copy()
# fermo: gambe a riposo
f = frames[0].copy(); reg = f[BY0:BY1, BX0:BX1]
rgb = reg[..., :3].astype(int)
tieni = ((((rgb - ARANCIO) ** 2).sum(-1) < 45 ** 2) | (((rgb - PELLE) ** 2).sum(-1) < 30 ** 2)) & (reg[..., 3] > 128)
m = U[BY0:BY1, BX0:BX1] & ~tieni; reg[m] = fondo[m]
b = Image.fromarray(f); b.alpha_composite(Image.fromarray(gambe(0, 0)), (BX0, BY0))
b.save(FERMO, quality=90, method=4)
print('ok', N, VERDE, BLU, AZZ, PANT, PANT_SC)
