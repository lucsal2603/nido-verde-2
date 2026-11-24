# Ricostruisce il paesaggio dietro la figura e lo pulisce (bordi netti, niente puntinato).
import sys, numpy as np
from PIL import Image
from scipy import ndimage
SEG, OUT = sys.argv[1], sys.argv[2]
d = np.load(SEG); C, lab, fig = d['C'], d['lab'].copy(), d['fig']
H, W = lab.shape
# le chiazze piccole di classi vicine (sfumature) vengono assorbite dal vicino
# riempimento dietro la figura: vicino più prossimo, più "orizzontale" (seguendo le fasce)
inv = fig.copy()
ANG = -13   # le fasce del terreno salgono verso destra: riempio lungo quella direzione
pad = 400
L = np.pad(lab + 1, pad, constant_values=0); I = np.pad(inv, pad)
Lr = ndimage.rotate(L, ANG, order=0, reshape=False, cval=0)
Ir = ndimage.rotate(I.astype(np.uint8), ANG, order=0, reshape=False, cval=0) > 0
_, (iy, ix) = ndimage.distance_transform_edt(Ir, sampling=(3, 1), return_indices=True)
Lr = Lr[iy, ix]
Lb = ndimage.rotate(Lr, -ANG, order=0, reshape=False, cval=0)[pad:-pad, pad:-pad] - 1
lab[inv] = Lb[inv]
# semplifica la zona in basso a sinistra (collina sfumata nel riferimento -> tinte piatte)
def cl(rgb): return int(((C - np.array(rgb)) ** 2).sum(1).argmin())
yy, xx = np.mgrid[:H, :W]
zona = (ndimage.binary_dilation(inv, iterations=70) | (xx < 560)) & (yy > 640)
for src, dst in (((148, 164, 48), (166, 177, 49)), ((182, 189, 54), (166, 177, 49)),
                 ((75, 105, 37), (90, 119, 40)), ((101, 128, 38), (90, 119, 40))):
    lab[zona & (lab == cl(src))] = cl(dst)
# fascia di terreno chiaro in primo piano: bordo liscio come nel riferimento
G, M = cl((194, 198, 59)), cl((166, 177, 49))
curva = np.interp(xx, [0, 100, 300, 500, 700, 850, 1000], [985, 972, 950, 925, 893, 868, 855])
z2 = zona & (xx < 960) & np.isin(lab, [G, M])
lab[z2 & (yy > curva)] = G
lab[z2 & (yy <= curva)] = M
# pulizia: per ogni classe maschera sfumata, poi argmax (a 2x)
K = len(C) + 1
S = 2
dentro = ndimage.gaussian_filter(zona.astype(np.float32), 6)
best = np.full((H * S, W * S), -1e9, np.float32); arg = np.zeros((H * S, W * S), np.int16)
for c in range(-1, len(C)):
    m = (lab == c).astype(np.float32)
    if m.sum() == 0: continue
    m = ndimage.gaussian_filter(m, 3.2) * (1 - dentro) + ndimage.gaussian_filter(m, 14) * dentro
    m = ndimage.zoom(m, S, order=1)
    upd = m > best; best[upd] = m[upd]; arg[upd] = c
# isolotti piccoli -> assorbiti dal vicino
pic = np.zeros(arg.shape, bool)
for c in np.unique(arg):
    cc, n = ndimage.label(arg == c)
    if n == 0: continue
    sz = ndimage.sum(np.ones_like(cc), cc, index=np.arange(1, n + 1))
    small = np.where(sz < 2500)[0] + 1
    pic |= np.isin(cc, small)
_, (iy, ix) = ndimage.distance_transform_edt(pic, return_indices=True)
arg = arg[iy, ix]
np.save(OUT, arg)
pal = np.vstack([np.clip(C, 0, 255), [[255, 255, 255]]]).astype(np.uint8)
Image.fromarray(pal[arg]).resize((768, 512), Image.LANCZOS).save(OUT.replace('.npy', '.png'))
