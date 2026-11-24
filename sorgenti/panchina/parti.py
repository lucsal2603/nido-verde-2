# Panchina gigante: ricalca il fotogramma pulito dell'illustrazione in curve (potrace).
# La panchina dietro le gambe viene ricostruita; le gambe sono pezzi separati:
# cosce ferme, stinco+scarpa sinistro e destro che ruotano attorno al ginocchio.
# uso: python3 parti.py originale.webp cartella  -> cartella/parti.json
import sys, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import potrace
SRC, OUT = sys.argv[1], sys.argv[2]
im = Image.open(SRC); im.seek(0)
a = np.array(im.convert('RGBA')).astype(int)
H, W = a.shape[:2]
PAL = {'verde': (76, 193, 111), 'blu': (1, 113, 206), 'verde_sc': (1, 108, 57), 'azzurro': (62, 188, 241),
       'pant_sc': (25, 33, 78), 'arancio': (225, 98, 36), 'blu_sc': (1, 89, 154), 'pant': (58, 64, 119),
       'bianco': (237, 243, 231)}
NOMI = list(PAL); C = np.array([PAL[k] for k in NOMI])
lab = (((a[..., None, :3] - C[None, None]) ** 2).sum(-1)).argmin(-1)
lab[a[..., 3] < 128] = -1
I = {k: i for i, k in enumerate(NOMI)}
yy, xx = np.mgrid[:H, :W]

# ---- gambe (fotogramma 0) ----
nav = np.isin(lab, [I['pant'], I['pant_sc']]) & (yy >= 212)
nav = ndimage.binary_opening(nav, iterations=1) | (nav & ndimage.binary_closing(nav, iterations=1))
def grandi(m, minimo=40):
    l, k = ndimage.label(m)
    if k == 0: return m
    s = ndimage.sum(m, l, range(1, k + 1))
    return np.isin(l, [i + 1 for i, v in enumerate(s) if v >= minimo])
TAGLIO = 247
lsx = nav & (yy >= TAGLIO - 6) & (((yy < 282) & (xx < 293)) | ((yy >= 282) & (xx < 308)))
ldx = nav & (yy >= TAGLIO - 6) & ~lsx
lsx = grandi(ndimage.binary_opening(lsx, iterations=2) | (lsx & (yy < 270)), 60)
ldx = grandi(ndimage.binary_opening(ldx, iterations=1), 60)
cos_ = nav & (yy < TAGLIO)
chiaro = lab == I['pant']

# ---- panchina dietro le gambe: ricostruita a mano (linee prese dall'illustrazione) ----
U = ndimage.binary_dilation(nav, iterations=3) & (yy >= 240)
mod = Image.new('L', (W, H), 255); d = ImageDraw.Draw(mod)
xa, xb = 200, 380
top = lambda x: 270.6 - .1 * (x - 250); bot = lambda x: 289.5 - .102 * (x - 252); gap = lambda x: 228 - .1 * (x - 350)
xl = lambda y: 274 + .28 * (y - 312); xm = lambda y: 299 + .25 * (y - 312); xr = lambda y: 313.5 + .25 * (y - 312)
d.polygon([(xa, 212), (xb, 212), (xb, top(xb)), (xa, top(xa))], fill=I['verde'])
d.polygon([(xa, gap(xa)), (xb, gap(xb)), (xb, gap(xb) + 3.6), (xa, gap(xa) + 3.6)], fill=I['verde_sc'])
y0, y1 = 276, 340
d.polygon([(xl(y0), y0), (xm(y0), y0), (xm(y1), y1), (xl(y1), y1)], fill=I['blu'])
d.polygon([(xm(y0), y0), (xr(y0), y0), (xr(y1), y1), (xm(y1), y1)], fill=I['azzurro'])
d.polygon([(xa, 276), (266, 276), (214.5, 320), (xa, 320)], fill=I['blu'])
d.polygon([(xa, top(xa)), (xb, top(xb)), (xb, bot(xb)), (xa, bot(xa))], fill=I['blu'])
d.polygon([(xa, top(xa)), (xb, top(xb)), (xb, top(xb) + 5.1), (xa, top(xa) + 5.2)], fill=I['blu_sc'])
mod = np.array(mod).astype(int); mod[mod == 255] = -1
fondo = lab.copy()
fondo[U] = mod[U]
# dietro le cosce (coperte dai poligoni nuovi): colore del vicino non-blu
dietro = ndimage.binary_dilation(nav, iterations=2) & (yy < 244)
_, (iy, ix) = ndimage.distance_transform_edt(dietro, return_indices=True)
fondo[dietro] = fondo[iy[dietro], ix[dietro]]

def trace(mask, liscio=.7, dil=1):
    K = 4
    if dil: mask = ndimage.binary_dilation(mask, iterations=dil)
    big = ndimage.zoom(mask.astype(float), K, order=1)
    big = ndimage.gaussian_filter(big, K * liscio) > .5
    pl = potrace.Bitmap(~big).trace(turdsize=12 * K * K, alphamax=1.0, opticurve=True, opttolerance=.4)
    sp = []
    for c in pl:
        segs = []
        for s in c.segments:
            if s.is_corner: segs.append(['L', [s.c.x / K, s.c.y / K], [s.end_point.x / K, s.end_point.y / K]])
            else: segs.append(['C', [s.c1.x / K, s.c1.y / K], [s.c2.x / K, s.c2.y / K], [s.end_point.x / K, s.end_point.y / K]])
        sp.append({'start': [c.start_point.x / K, c.start_point.y / K], 'segs': segs})
    return sp
COLORE = dict(PAL, bianco=(240, 196, 156))   # mani e orecchio color pelle: in piccolo non sembrano puntini bianchi
hexc = lambda k: '%02X%02X%02X' % COLORE[k]
parti = []
# fondo: un pezzo per colore, in ordine (i successivi coprono le giunture dei precedenti)
ORD = ['blu', 'blu_sc', 'azzurro', 'verde', 'verde_sc', 'bianco', 'arancio', 'pant_sc', 'pant']
for k in ORD:
    m = grandi(fondo == I[k], 6)
    if k in ('pant', 'pant_sc'): m &= (yy < TAGLIO + 2) | ~nav
    parti.append({'nome': 'f_' + k, 'col': hexc(k), 'gruppo': 'fermo', 'splines': trace(m, .6, 1 if k not in ('bianco',) else 0)})
# gambe: sagoma scura + parti chiare sopra
# gambe: poligoni a spigoli netti misurati sull'illustrazione (fotogramma 0)
NS, NC = hexc('pant_sc'), hexc('pant')
GAMBE = [
    # stinco sinistro (perno nel ginocchio 276,247): sagoma scura con scarpa, faccia chiara davanti
    ('sx_scuro', NS, 'sx', [(258, 243), (292, 239), (293.5, 283), (305, 287), (306.5, 293), (303, 300.5), (279, 301.5), (267, 298.5), (262.5, 291), (260, 262)]),
    ('sx_chiaro', NC, 'sx', [(270, 239), (290.5, 236.5), (291, 281.5), (273, 284)]),
    # stinco destro (perno 306,246): scarpa che punta a destra
    ('dx_scuro', NS, 'dx', [(290.5, 236), (312, 233), (318, 248), (322.5, 261), (328, 270.5), (338, 277.5), (341, 283.5), (327, 289), (309, 293.5), (299, 291.5), (296.5, 276)]),
    ('dx_chiaro', NC, 'dx', [(297.5, 236), (310.5, 233.5), (316, 248), (321.5, 262), (325, 270), (311, 272), (302.5, 271), (299.5, 262)]),
    # cosce ferme
    ('cosce_chiaro', NC, 'cosce', [(238, 224.5), (251, 220.5), (292, 217.5), (302, 219.5), (309, 225.5), (312.5, 234), (298, 237), (283, 238.5), (268, 240), (250, 237), (240, 232)]),
    ('cosce_scuro_sx', NS, 'cosce', [(236.5, 229), (243, 229.5), (268, 239.5), (271, 247.5), (262, 248.5), (257, 246.5), (244, 241.5), (234, 242), (228, 244), (228.5, 240), (233.5, 234)]),
    ('cosce_scuro_dx', NS, 'cosce', [(308.5, 225), (313.5, 232), (318, 247.5), (312.5, 248), (310, 236)]),
]
for nome, colr, gr, poly in GAMBE:
    parti.append({'nome': nome, 'col': colr, 'gruppo': gr, 'poly': poly})
json.dump({'W': W, 'H': H, 'parti': parti}, open(OUT + '/parti.json', 'w'))
# anteprima delle maschere
pv = np.full((H, W, 3), 255, np.uint8)
for k in ORD:
    pv[fondo == I[k]] = PAL[k]
Image.fromarray(pv).save(OUT + '/fondo.png')
print('ok', len(parti))
