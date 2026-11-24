import numpy as np, sys
from PIL import Image
from scipy import ndimage
ra=np.array(Image.open(sys.argv[1]).convert('RGBA')).astype(int); im=ra[...,:3]; alpha=ra[...,3]
PAL={'bianco':'FFFFFF','navy':'161D44','skin':'F8E5CB','ora':'E66624','ora2':'CF5823','ora3':'A63E1D','pant':'293364','blu':'1C5BA5','blu2':'113A75','tan':'D3BD9E','verde':'376C4E','acqua':'7CB5DD'}
cols=np.array([[int(v[i:i+2],16) for i in (0,2,4)] for v in PAL.values()])
d=((im[:,:,None,:]-cols[None,None])**2).sum(-1)
lab=d.argmin(-1); lab[alpha<128]=0
np.save(sys.argv[2],lab)
names=list(PAL)
for k,n in enumerate(names):
    if n=='bianco': continue
    m=lab==k; l,c=ndimage.label(m); objs=ndimage.find_objects(l)
    for j,o in enumerate(objs):
        a=(l[o]==j+1).sum()
        if a>300: print(n, j+1, a, 'x',o[1].start,o[1].stop,'y',o[0].start,o[0].stop)
