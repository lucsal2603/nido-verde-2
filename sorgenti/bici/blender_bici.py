# Blender: la ciclista. Parte alta ricalcata dal disegno, bici e gambe costruite qui:
# a ogni fotogramma i pedali girano e le gambe si piegano (cinematica inversa) così i piedi stanno esattamente sui pedali.
import bpy, json, math, sys
S = sys.argv[sys.argv.index('--')+1]; MODE = sys.argv[sys.argv.index('--')+2]
P = json.load(open(S + '/parti.json'))
U = 0.01
def B(x, y): return (x*U, -y*U, 0)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False; sc.cycles.max_bounces = 0
sc.render.filter_size = 1.2; sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 608, 640, 200
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 6.40; cam.location = (3.04, -3.20, 10)
def srgb(h):
    c = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    return [x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in c] + [1]
MAT = {}
def mat(col):
    if col in MAT: return MAT[col]
    m = bpy.data.materials.new(col); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = srgb(col)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface']); MAT[col] = m; return m
Z = [0]
def oggetto(nome, col, splines=None, poligoni=None, origine=(0, 0)):
    """crea una curva 2D piena; le coordinate sono in pixel, relative a 'origine' (che diventa il perno dell'oggetto)"""
    cu = bpy.data.curves.new(nome, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.resolution_u = 20
    ox, oy = origine
    for sp in (splines or []):
        pts = []; cur = sp['start']
        for s in sp['segs']:
            if s[0] == 'L': pts.append([cur, None, None]); pts.append([s[1], None, None]); cur = s[2]
            else: pts.append([cur, None, s[1]]); pts.append([s[3], s[2], None]); cur = s[3]
        fused = []
        for q in pts:
            if fused and abs(fused[-1][0][0]-q[0][0]) < 1e-6 and abs(fused[-1][0][1]-q[0][1]) < 1e-6:
                if q[1] is not None: fused[-1][1] = q[1]
                if q[2] is not None: fused[-1][2] = q[2]
            else: fused.append(q)
        if len(fused) > 1 and abs(fused[0][0][0]-fused[-1][0][0]) < 1e-6 and abs(fused[0][0][1]-fused[-1][0][1]) < 1e-6:
            last = fused.pop()
            if last[1] is not None: fused[0][1] = last[1]
        bs = cu.splines.new('BEZIER'); bs.bezier_points.add(len(fused)-1); bs.use_cyclic_u = True
        for bp, (co, hl, hr) in zip(bs.bezier_points, fused):
            bp.handle_left_type = bp.handle_right_type = 'FREE'
            bp.co = B(co[0]-ox, co[1]-oy); h1 = hl or co; h2 = hr or co
            bp.handle_left = B(h1[0]-ox, h1[1]-oy); bp.handle_right = B(h2[0]-ox, h2[1]-oy)
    for poly in (poligoni or []):
        ps = cu.splines.new('POLY'); ps.points.add(len(poly)-1); ps.use_cyclic_u = True
        for p, (x, y) in zip(ps.points, poly): p.co = ((x-ox)*U, -(y-oy)*U, 0, 1)
    ob = bpy.data.objects.new(nome, cu); sc.collection.objects.link(ob)
    ob.location = (ox*U, -oy*U, Z[0]*0.01); Z[0] += 1
    cu.materials.append(mat(col)); return ob
# ── forme di base ──
def cerchio(c, r, n=72): return [(c[0] + r*math.cos(2*math.pi*k/n), c[1] + r*math.sin(2*math.pi*k/n)) for k in range(n)]
def capsula(a, b, w0, w1=None, n=14):
    """tubo con le estremità tonde, da a a b, larghezza w0 in a e w1 in b"""
    w1 = w0 if w1 is None else w1
    ang = math.atan2(b[1]-a[1], b[0]-a[0]); pts = []
    for k in range(n+1):
        t = ang - math.pi/2 + math.pi*k/n; pts.append((b[0] + w1/2*math.cos(t), b[1] + w1/2*math.sin(t)))
    for k in range(n+1):
        t = ang + math.pi/2 + math.pi*k/n; pts.append((a[0] + w0/2*math.cos(t), a[1] + w0/2*math.sin(t)))
    return pts
def liscia(pts, n=10):
    """contorno chiuso morbido (Catmull-Rom) che passa per i punti dati"""
    out = []; m = len(pts)
    for i in range(m):
        p0, p1, p2, p3 = pts[i-1], pts[i], pts[(i+1) % m], pts[(i+2) % m]
        for k in range(n):
            t = k / n; t2 = t*t; t3 = t2*t
            out.append(tuple(.5*((2*p1[j]) + (-p0[j]+p2[j])*t + (2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2 + (-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3) for j in (0, 1)))
    return out
BLU, NAVY, PANT, PANT2, SCARPA = '093CC8', '0B143C', '1E2965', '2E3A7C', '0B143C'
R_HUB, F_HUB, BB = (118, 520), (490, 520), (316, 504)
SEAT_T, HEAD_T, HEAD_B = (208, 376), (440, 352), (452, 398)
CRANK = 46; HIP = (244, 326); L1, L2 = 134, 124
# ── ordine di disegno: dietro → davanti ──
gamba_l = {}; gamba_n = {}
def gamba(nome, col):
    # coscia e stinco come oggetti con perno all'anca e al ginocchio, la scarpa con perno alla caviglia
    c = oggetto(nome+'_coscia', col, poligoni=[capsula((0, 0), (L1, 0), 80, 70)], origine=(0, 0))
    s = oggetto(nome+'_stinco', col, poligoni=[capsula((0, 0), (L2, 0), 68, 58)], origine=(0, 0))
    p = oggetto(nome+'_scarpa', SCARPA, poligoni=[[(-30, -20), (32, -18), (50, -8), (54, 5), (49, 14), (-30, 14), (-34, -3)]], origine=(0, 0))
    return {'coscia': c, 'stinco': s, 'scarpa': p}
pedivella_l = oggetto('pedivella_lontana', '07309E', poligoni=[capsula((0, 0), (CRANK, 0), 11, 9)], origine=(0, 0))
pedale_l = oggetto('pedale_lontano', NAVY, poligoni=[capsula((-14, 0), (14, 0), 8)], origine=(0, 0))
gamba_l = gamba('lontana', PANT2)
ruote = []
for hub in (R_HUB, F_HUB):
    oggetto('cerchione', BLU, poligoni=[cerchio(hub, 106), cerchio(hub, 92)[::-1]])
    for k in range(3):   # ogni raggio è un pezzo a sé (sovrapposti nella stessa curva si bucherebbero)
        a = k*math.pi/3
        ruote.append((oggetto('raggio', BLU, poligoni=[capsula((hub[0]-94*math.cos(a), hub[1]-94*math.sin(a)), (hub[0]+94*math.cos(a), hub[1]+94*math.sin(a)), 6)], origine=hub), hub, math.degrees(a)))
    oggetto('mozzo_ruota', BLU, poligoni=[cerchio(hub, 18)])
for i, (a, b, w) in enumerate([(R_HUB, BB, 13), (R_HUB, SEAT_T, 12), (BB, SEAT_T, 15), (BB, HEAD_B, 17), (SEAT_T, HEAD_T, 15), (HEAD_T, HEAD_B, 18),
                               (HEAD_B, F_HUB, 14), ((196, 350), SEAT_T, 12), (HEAD_T, (432, 318), 12), ((418, 318), (450, 312), 12)]):
    oggetto('telaio%d' % i, BLU, poligoni=[capsula(a, b, w)])
oggetto('corona', '07309E', poligoni=[cerchio(BB, 24)])
oggetto('mozzo', BLU, poligoni=[cerchio(BB, 11)])
oggetto('sella', NAVY, splines=P['sella']['splines'])
bacino = oggetto('bacino', PANT, splines=P['bacino']['splines'])
# sedere tondo seduto sulla sella, come nel disegno di prima
sedere = oggetto('sedere', PANT, poligoni=[liscia([(160, 300), (215, 296), (262, 312), (270, 340), (240, 356), (196, 358), (166, 348), (156, 326)], 10)])
PELLE = P['mano']['col']
collo = oggetto('collo', PELLE, poligoni=[liscia([(300, 118), (331, 122), (329, 146), (301, 146)], 6)])
busto = oggetto('busto', P['busto']['col'], splines=P['busto']['splines'])
capelli = oggetto('capelli', P['capelli']['col'], splines=P['capelli']['splines'])
# viso di profilo, come gli altri omini: pelle davanti, capelli sopra e dietro con la frangia
viso = oggetto('viso', PELLE, poligoni=[liscia([(312, 62), (345, 60), (360, 78), (360, 102), (348, 122), (322, 131), (302, 120), (298, 88)], 10)])
frangia = oggetto('frangia', P['capelli']['col'], poligoni=[liscia([(296, 48), (330, 40), (358, 48), (366, 62), (348, 64),
                                                                   (326, 70), (311, 84), (304, 102), (295, 84)], 10)])
pedivella_n = oggetto('pedivella_vicina', BLU, poligoni=[capsula((0, 0), (CRANK, 0), 12, 10)], origine=(0, 0))
pedale_n = oggetto('pedale_vicino', NAVY, poligoni=[capsula((-15, 0), (15, 0), 9)], origine=(0, 0))
gamba_n = gamba('vicina', PANT)
mano = oggetto('mano', P['mano']['col'], splines=P['mano']['splines'])
gamba_n['coscia'].location.z = busto.location.z - 0.005   # la maglia copre l'attacco della gamba
# ── animazione ──
def poni(ob, f, pos, ang):
    ob.location = (pos[0]*U, -pos[1]*U, ob.location.z); ob.rotation_euler = (0, 0, -math.radians(ang))
    ob.keyframe_insert('location', frame=f); ob.keyframe_insert('rotation_euler', frame=f)
def ik(h, p):
    """ginocchio: davanti (a destra) rispetto alla linea anca-piede"""
    dx, dy = p[0]-h[0], p[1]-h[1]; d = min(math.hypot(dx, dy), L1+L2-0.5)
    a = math.atan2(dy, dx); c = math.acos(max(-1, min(1, (L1*L1 + d*d - L2*L2) / (2*L1*d))))
    k = a - c   # gira verso l'alto/avanti
    return (h[0] + L1*math.cos(k), h[1] + L1*math.sin(k))
N = 40
for f in range(N if MODE == 'anim' else 1):
    u = f / N; th = 2*math.pi*u   # un giro completo di pedali per ciclo
    for r, hub, a0 in ruote: poni(r, f, hub, math.degrees(th))   # un giro intero per ciclo: il loop non si vede
    bob = 1.6*math.sin(2*th)
    for ob in (busto, capelli, bacino, sedere, mano, collo, viso, frangia): poni(ob, f, (0, bob*(0.4 if ob is mano else 1)), 0)
    hip = (HIP[0], HIP[1] + bob)
    for side, crank, pedale, g in ((0, pedivella_n, pedale_n, gamba_n), (math.pi, pedivella_l, pedale_l, gamba_l)):
        a = th + side
        ped = (BB[0] + CRANK*math.cos(a), BB[1] + CRANK*math.sin(a))
        poni(crank, f, BB, math.degrees(a)); poni(pedale, f, ped, 0)
        ank = (ped[0] - 4, ped[1] - 14)        # la caviglia sta appena sopra il pedale: il piede appoggia sul pedale
        kn = ik(hip, ank)
        poni(g['coscia'], f, hip, math.degrees(math.atan2(kn[1]-hip[1], kn[0]-hip[0])))
        poni(g['stinco'], f, kn, math.degrees(math.atan2(ank[1]-kn[1], ank[0]-kn[0])))
        # la scarpa resta quasi orizzontale, con la punta che scende un poco quando spinge in basso
        poni(g['scarpa'], f, ank, 8*math.sin(a) + 4)
sc.frame_start, sc.frame_end = 0, (N-1 if MODE == 'anim' else 0)
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.filepath = S + ('/bl_' if MODE == 'anim' else '/bl_fermo_')
bpy.ops.render.render(animation=True)
bpy.ops.wm.save_as_mainfile(filepath=S + '/bici.blend')
