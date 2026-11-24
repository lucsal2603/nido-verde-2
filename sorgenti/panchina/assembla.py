# Ritaglia e riduce i fotogrammi (alfa premoltiplicata: niente bordi scuri) e crea il webp animato.
import sys, numpy as np
from PIL import Image
D, OUT, FERMO = sys.argv[1:4]
import glob
fr = [Image.open(p) for p in sorted(glob.glob(f'{D}/f*.png'))]
bb = None
for f in fr:
    b = f.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
bb = (0, 0) + fr[0].size
w, h = 640, 473
def riduci(f):
    a = np.array(f.crop(bb)).astype(np.float32)
    al = a[..., 3:] / 255
    pm = np.concatenate([a[..., :3] * al, a[..., 3:]], -1)
    ch = [Image.fromarray(pm[..., k]).resize((w, h), Image.LANCZOS) for k in range(4)]
    r = np.stack([np.array(c) for c in ch], -1)
    A = np.clip(r[..., 3], 0, 255)
    rgb = np.where(A[..., None] > 0, r[..., :3] / np.maximum(A[..., None] / 255, 1e-3), 0)
    o = np.dstack([np.clip(rgb, 0, 255), A]).round().astype(np.uint8)
    return Image.fromarray(o)
out = [riduci(f) for f in fr]
out[0].save(OUT, save_all=True, append_images=out[1:], duration=42, loop=0, quality=88, method=4)
out[0].save(FERMO, quality=90, method=4)
print(w, h)
