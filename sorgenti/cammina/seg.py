# Segmenta il riferimento: fondo (colline, casa, sole...) ricostruito dietro la figura,
# e strato "busto" (testa, maglia, zaino) che si muove rigido.
import sys, numpy as np
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2
REF, OUT = sys.argv[1], sys.argv[2]
im = np.array(Image.open(REF)).astype(float)
H, W = im.shape[:2]
al = im[..., 3]; fg = al > 128
px = im[fg][:, :3]
rs = np.random.RandomState(0)
C, _ = kmeans2(px[rs.choice(len(px), 80000, replace=False)], 18, minit='++', seed=1)
C = C[np.argsort(C.sum(1))]
lab = np.full((H, W), -1)
lab[fg] = (((im[fg][:, None, :3] - C[None]) ** 2).sum(-1)).argmin(1)
yy, xx = np.mgrid[:H, :W]

def cl(rgb): return int(((C - np.array(rgb)) ** 2).sum(1).argmin())
NAVY, NAVY2 = cl((13, 32, 53)), cl((24, 40, 81))
ORA = [cl((212, 100, 18)), cl((232, 116, 18)), cl((251, 118, 13))]
SKIN, CREAM = cl((252, 200, 147)), cl((251, 228, 193))
CHIARI = [SKIN, CREAM, cl((250, 235, 211)), cl((250, 198, 113))]

# figura = colori della figura a sinistra della casa + tutto ciò che sta in alto a sinistra
figc = np.isin(lab, [NAVY, NAVY2] + CHIARI + ORA)
fig = fg & ((figc & (xx < 900)) | ((yy < 600) & (xx < 690)))
fig = ndimage.binary_closing(fig, iterations=2) & fg | fig
# esclude il cespuglio a sinistra / colline eventualmente prese
figd = ndimage.binary_dilation(fig, iterations=3)

# --- busto: tutto sopra la vita, senza bastoni, mani e avambraccio lontano
def seg_dist(p, a, b):
    a = np.array(a, float); b = np.array(b, float); d = b - a
    t = np.clip(((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d @ d), 0, 1)
    return np.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1])
P = (xx, yy)
polo_n = seg_dist(P, (657, 500), (538, 968)) < 15
polo_f = seg_dist(P, (742, 395), (862, 830)) < 15
mano_n = ((xx - 648) / 44) ** 2 + ((yy - 567) / 50) ** 2 < 1
mano_f = ((xx - 760) / 46) ** 2 + ((yy - 455) / 44) ** 2 < 1
avam_f = (xx > 662) & (yy > 415) & (yy < 520)
busto = fig & (yy < 600) & ~polo_n & ~polo_f & ~mano_n & ~mano_f & ~avam_f
# la mano vicina è disegnata a parte: la toglie anche se cade sotto
busto &= ~np.isin(lab, CHIARI) | (yy < 400)   # pelle in alto = viso/collo
np.savez_compressed(OUT, C=C, lab=lab, fig=figd, busto=busto)
# --- anteprima
pal = np.clip(C, 0, 255).astype(np.uint8)
o = np.full((H, W, 3), 255, np.uint8); o[fg] = pal[lab[fg]]
o2 = o.copy(); o2[figd] = (o2[figd] * .3 + np.array([255, 0, 255]) * .7).astype(np.uint8)
o2[busto] = (o[busto] * .4 + np.array([0, 255, 255]) * .6).astype(np.uint8)
Image.fromarray(o2).resize((768, 512)).save(OUT.replace('.npz', '_seg.png'))
print(C.astype(int).tolist())
