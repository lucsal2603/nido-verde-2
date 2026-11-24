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

# ---------- gambe ----------
def ruota(c, p, a):
    s, co = math.sin(a), math.cos(a)
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * co - y * s, c[1] + x * s + y * co)

def tibia(d, K, ang, lato_scuro, L=31, w=12.5, av=0.0):
    # av: 0 = gamba a piombo, 1 = piede tutto in avanti (scorcio)
    L = L * (1 - .2 * av)
    k = 1 + .1 * av
    # stinco: rettangolo dal ginocchio verso il basso, ruotato di ang
    loc = lambda x, y: ruota(K, (K[0] + x, K[1] + y), ang)
    d.polygon(P([loc(-w, -8), loc(w, -8), loc(w, L), loc(-w, L)]), fill=PANT)
    s = 5.5
    if lato_scuro < 0:
        d.polygon(P([loc(-w, -8), loc(-w + s, -8), loc(-w + s, L), loc(-w, L)]), fill=PANT_SC)
    else:
        d.polygon(P([loc(w - s, -8), loc(w, -8), loc(w, L), loc(w - s, L)]), fill=PANT_SC)
    # scarpa: punta verso chi guarda, un filo a destra
    h = 13.5 * k
    sc = [loc(-w + .5, L - 1), loc(w - .5, L - 1), loc(w + 3, L + 2.5), loc(w + 5.5, L + h * .55),
          loc(w + 5, L + h * .85), loc(w + 2.5, L + h), loc(-w + 2, L + h), loc(-w - .5, L + h * .8), loc(-w - .5, L + 3)]
    d.polygon(P(sc), fill=PANT_SC)
    d.polygon(P([loc(-w + 1.5, L + h - 2.2), loc(w + 4.6, L + h - 2.2), loc(w + 2.5, L + h), loc(-w + 2, L + h)]), fill=SCARPA_SUOLA)
    d.polygon(P([loc(-w + 4.5, L + 1.2), loc(w - 2.5, L + 1.2), loc(w + 2, L + 2.6 + 3 * k), loc(-w + 5.5, L + 2.6 + 3 * k)]), fill=PANT)
    # orlo sopra la scarpa
    d.polygon(P([loc(-w, L - 3), loc(w, L - 3), loc(w, L - .5), loc(-w, L - .5)]), fill=PANT_SC)

KL, KR = (268.5, 256), (298.5, 251.5)

def gambe(aL, aR, vL=0, vR=0):
    t = tela(); d = ImageDraw.Draw(t)
    tibia(d, KL, aL, -1, av=vL)
    tibia(d, KR, aR, +1, av=vR)
    # cosce (coprono l'attacco delle tibie)
    d.polygon(P([(233, 230), (238, 225), (242, 222), (256, 220.5), (268, 218.6), (282, 251.5), (255.5, 257.5), (233, 236)]), fill=PANT)
    d.polygon(P([(233, 230), (238, 225), (242, 222), (256, 251), (256.5, 258), (252, 262), (233, 238)]), fill=PANT_SC)
    d.polygon(P([(267, 218.4), (276, 217.5), (290, 218), (296, 219.5), (300, 221), (313.5, 251.5), (283.5, 252)]), fill=PANT)
    d.polygon(P([(296, 219.5), (300, 221), (306, 223), (312, 228), (316, 234), (320, 248), (318, 253), (312.5, 252)]), fill=PANT_SC)
    # piega tra le cosce
    d.polygon(P([(266.2, 218.6), (268.6, 218.4), (284, 252.5), (281.6, 252.8)]), fill=PANT_SC)
    # ginocchia arrotondate
    for K, ang in ((KL, aL), (KR, aR)):
        r = 12.3
        d.pieslice([((K[0] - r - BX0) * Z, (K[1] - r - BY0) * Z), ((K[0] + r - BX0) * Z, (K[1] + r - BY0) * Z)],
                   0, 180, fill=PANT)
    return riduci(t)

fondo = panchina()
out = []
for i, f in enumerate(frames):
    f = f.copy()
    reg = f[BY0:BY1, BX0:BX1]
    rgb = reg[..., :3].astype(int)
    tieni = ((((rgb - ARANCIO) ** 2).sum(-1) < 45 ** 2) | (((rgb - PELLE) ** 2).sum(-1) < 30 ** 2)) & (reg[..., 3] > 128)
    m = U[BY0:BY1, BX0:BX1] & ~tieni
    reg[m] = fondo[m]
    ph = 2 * math.pi * i / 48
    sL, sR = math.sin(ph), math.sin(ph + math.pi)
    # avanti/indietro: scorcio dello stinco + leggera rotazione verso l'esterno
    vL, vR = (1 - math.cos(ph)) / 2, (1 + math.cos(ph)) / 2
    aL = math.radians(4) * sL - math.radians(2)
    aR = math.radians(4) * sR + math.radians(2)
    g = Image.fromarray(gambe(aL, aR, vL, vR))
    base = Image.fromarray(f)
    base.alpha_composite(g, (BX0, BY0))
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
