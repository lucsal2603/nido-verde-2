# separa i pezzi del disegno e li ricalca in curve (potrace): un file json con le curve di ogni pezzo
import numpy as np, json, sys
from scipy import ndimage
import potrace
S=sys.argv[1]
lab=np.load(S+'/lab.npy')
names=['bianco','navy','skin','ora','ora2','ora3','pant','blu','blu2','tan','verde','acqua']
COL={'navy':'161D44','skin':'F8E5CB','ora':'E66624','ora2':'CF5823','ora3':'A63E1D','pant':'293364','blu':'1C5BA5','blu2':'113A75','tan':'D3BD9E','verde':'376C4E','acqua':'7CB5DD','crema':'F8E3C8','shaft':'141F40'}
H,W=lab.shape
yy,xx=np.mgrid[0:H,0:W]
def comp(name, box, L=None):
    m=(lab if L is None else L)==names.index(name); l,_=ndimage.label(m)
    x0,y0,x1,y1=box; ids=set(np.unique(l[y0:y1,x0:x1]))-{0}
    out=np.zeros_like(m)
    for i in ids:
        c=l==i; ys,xs=np.nonzero(c)
        if xs.min()>=x0-2 and xs.max()<=x1+2 and ys.min()>=y0-2 and ys.max()<=y1+2: out|=c
    return out
P={}
# pezzi che si muovono: sotto di loro "dipingo" lo sfondo, prendendo il colore che c'è a sinistra e a destra sulla stessa riga
mob = comp('navy',(686,410,835,680)) | comp('ora',(572,668,710,822)) | comp('skin',(790,355,858,428)) | comp('skin',(720,528,788,590)) | comp('ora2',(675,395,810,500))
oraM = comp('ora',(530,380,790,600)); mob |= oraM & (xx>650+(yy-500)*0.45) & (yy>492)
mob = ndimage.binary_dilation(mob, iterations=3)
lab_orig = lab.copy(); lab = lab.copy()
for y in range(H):
    row = mob[y]
    if not row.any(): continue
    xs = np.nonzero(row)[0]
    # gruppi contigui
    br = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
    for g in br:
        l = lab_orig[y, g[0]-5] if g[0] > 4 else 0; r = lab_orig[y, g[-1]+5] if g[-1]+5 < W else 0
        if l == r: lab[y, g] = l
        elif l and r: h = len(g)//2; lab[y, g[:h]] = l; lab[y, g[h:]] = r
        else: lab[y, g] = 0
# canoa
P['scafo_scuro']=('blu2', comp('blu2',(140,640,1410,780)))
P['scafo']=('blu', comp('blu',(120,500,1415,735)))
P['bordo']=('crema', comp('skin',(160,495,1385,655)))
P['interno']=('tan', comp('tan',(195,525,1350,632)))
P['sedili']=('verde', comp('verde',(385,565,1125,620)))
P['gambe']=('pant', comp('pant',(535,540,900,635)))
# persona
ora=comp('ora',(530,380,790,600),lab_orig)
busto_f=comp('ora',(530,380,790,600))
avamb=ora & (xx>650+(yy-500)*0.45) & (yy>492)
vic = lambda c, r: (xx-c[0])**2 + (yy-c[1])**2 < r*r
P['busto']=('ora', (busto_f & ~avamb) | (avamb & vic((662,528), 62)))   # sotto il gomito resta arancione, così l'avambraccio non si stacca
P['avambraccio']=('ora', avamb)
P['ombra']=('ora3', comp('ora3',(610,488,660,568)))
P['testa']=('skin', comp('skin',(630,285,750,410)))
P['capelli']=('navy', comp('navy',(550,245,735,395)))
P['braccio']=('ora2', comp('ora2',(675,395,810,500),lab_orig))
# pagaia e mani
P['asta']=('shaft', comp('navy',(686,410,835,680),lab_orig))
P['pala']=('ora', comp('ora',(572,668,710,822),lab_orig))
P['mano_su']=('skin', comp('skin',(790,355,858,428),lab_orig))
P['mano_giu']=('skin', comp('skin',(720,528,788,590),lab_orig))
# fondi pieni sotto gambe e busto: coprono qualunque fessurina interna
P['gambe_fondo']=('pant', ndimage.binary_erosion(ndimage.binary_fill_holes(P['gambe'][1]), iterations=5))
P['busto_fondo']=('ora', ndimage.binary_erosion(P['busto'][1] & ~ndimage.binary_dilation(P['ombra'][1],iterations=2), iterations=5))
# acqua
P['acqua_sx']=('acqua', comp('acqua',(55,705,442,802)))
P['acqua_pala']=('acqua', comp('acqua',(460,738,735,850)))
P['acqua_dx']=('acqua', comp('acqua',(1085,742,1422,800)))
P['acqua_dx2']=('acqua', comp('acqua',(1338,705,1484,758)))
def trace(mask, dil=1, liscio=1.1):
    """ricalco preciso: la forma si ingrandisce 4 volte e si ammorbidisce prima di potrace, poi le coordinate tornano alla scala vera"""
    K=4
    mask=ndimage.binary_dilation(mask,iterations=dil)
    big=ndimage.zoom(mask.astype(float),K,order=1)
    big=ndimage.gaussian_filter(big,K*liscio)>.5
    pl=potrace.Bitmap(~big).trace(turdsize=30*K*K,alphamax=1.2,opticurve=True,opttolerance=1.0)
    splines=[]
    for c in pl:
        segs=[]
        for s_ in c.segments:
            if s_.is_corner: segs.append(['L',[s_.c.x/K,s_.c.y/K],[s_.end_point.x/K,s_.end_point.y/K]])
            else: segs.append(['C',[s_.c1.x/K,s_.c1.y/K],[s_.c2.x/K,s_.c2.y/K],[s_.end_point.x/K,s_.end_point.y/K]])
        splines.append({'start':[c.start_point.x/K,c.start_point.y/K],'segs':segs})
    return splines
def grandi(m, minimo=250):
    l,k=ndimage.label(m); s=ndimage.sum(m,l,range(1,k+1))
    return np.isin(l, [i+1 for i,v in enumerate(s) if v>=minimo])
out={}
for k,(col,m) in P.items():
    m = grandi(m)   # via i puntini isolati (pixel di bordo scambiati di colore)
    print(k, int(m.sum()))
    if k in ('gambe','scafo','scafo_scuro','bordo','interno','busto'): m = ndimage.binary_closing(m, iterations=5) | m   # chiude le fessure lasciate dalla pagaia
    out[k]={'col':COL[col],'splines':trace(m, 3 if k in ('braccio','avambraccio','busto') else 1, 1.1 if k in ('asta','mano_su','mano_giu','sedili','pala') else 2.4)}
json.dump(out,open(S+'/parti.json','w'))
