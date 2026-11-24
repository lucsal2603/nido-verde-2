import numpy as np, json, sys
from PIL import Image
from scipy import ndimage
import potrace
S=sys.argv[1]
ra=np.array(Image.open(S+'/f0.png').convert('RGBA')).astype(int); im=ra[...,:3]; al=ra[...,3]
PAL={'ora':'E6591E','navy':'0B143C','pant':'1E2965','pant2':'2E3A7C','blu':'093CC8','skin':'F1E8D9'}
cols=np.array([[int(v[i:i+2],16) for i in (0,2,4)] for v in PAL.values()]); names=list(PAL)
lab=((im[:,:,None,:]-cols[None,None])**2).sum(-1).argmin(-1); lab[al<128]=-1
H,W=lab.shape; yy,xx=np.mgrid[0:H,0:W]
def m(n): return lab==names.index(n)
def biggest(mask):
    l,k=ndimage.label(mask); 
    if k==0: return mask
    s=ndimage.sum(mask,l,range(1,k+1)); return l==(np.argmax(s)+1)
P={}
P['busto']=('ora', biggest(m('ora')))
P['capelli']=('navy', biggest(m('navy') & (yy<150)))
P['sella']=('navy', m('navy') & (yy>325) & (yy<372) & (xx<215))
P['mano']=('skin', biggest(m('skin')))
P['bacino']=('pant', (m('pant')|m('pant2')) & (yy<342) & (xx<300))
def trace(mask, dil=1, liscio=2.0):
    K=4
    mask=ndimage.binary_dilation(mask,iterations=dil)
    big=ndimage.gaussian_filter(ndimage.zoom(mask.astype(float),K,order=1),K*liscio)>.5
    pl=potrace.Bitmap(~big).trace(turdsize=30*K*K,alphamax=1.2,opticurve=True,opttolerance=1.0)
    out=[]
    for c in pl:
        segs=[]
        for s_ in c.segments:
            if s_.is_corner: segs.append(['L',[s_.c.x/K,s_.c.y/K],[s_.end_point.x/K,s_.end_point.y/K]])
            else: segs.append(['C',[s_.c1.x/K,s_.c1.y/K],[s_.c2.x/K,s_.c2.y/K],[s_.end_point.x/K,s_.end_point.y/K]])
        out.append({'start':[c.start_point.x/K,c.start_point.y/K],'segs':segs})
    return out
json.dump({k:{'col':PAL[c],'splines':trace(v)} for k,(c,v) in P.items()}, open(S+'/parti.json','w'))
for k,(c,v) in P.items(): print(k,int(v.sum()))
