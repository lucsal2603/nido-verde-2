# Blender: la canoa ricalcata dal disegno, animata con un colpo di pagaia in loop
import bpy, json, math, sys
S = sys.argv[sys.argv.index('--')+1]; MODE = sys.argv[sys.argv.index('--')+2]   # 'fermo' o 'anim'
P = json.load(open(S + '/parti.json'))
U = 0.01  # 1 pixel = 0.01 unità
def B(x, y): return (x*U, -y*U, 0)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'    # nessuna GPU qui: Cycles su CPU, materiali a emissione = colori piatti esatti
sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
sc.cycles.max_bounces = 0; sc.render.filter_size = 1.2
sc.view_settings.view_transform = 'Standard'
sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1536, 1024, (50 if MODE == 'anim' else 100)
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 15.36; cam.location = (7.68, -5.12, 10)
def srgb(h):
    c = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    return [x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in c] + [1]
ORDINE = ['acqua_dx2','scafo_scuro','scafo','bordo','interno','sedili','gambe','busto','ombra','avambraccio','testa','capelli','braccio','asta','pala','mano_giu','mano_su','acqua_sx','acqua_pala','acqua_dx']
OBJ = {}
for z, nome in enumerate(ORDINE):
    p = P[nome]
    cu = bpy.data.curves.new(nome, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.resolution_u = 24
    for sp in p['splines']:
        pts = []   # (co, handle_left, handle_right)
        cur = sp['start']
        for s in sp['segs']:
            if s[0] == 'L':
                pts.append([cur, None, None]); pts.append([s[1], None, None]); cur = s[2]
            else:
                pts.append([cur, None, s[1]]); nxt = [s[3], s[2], None]; pts.append(nxt); cur = s[3]
        # unisci punti consecutivi uguali (fine di un segmento = inizio del successivo)
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
            bp.co = B(*co)
            bp.handle_left_type = bp.handle_right_type = 'FREE'
            bp.handle_left = B(*(hl if hl else co)); bp.handle_right = B(*(hr if hr else co))
    ob = bpy.data.objects.new(nome, cu); sc.collection.objects.link(ob)
    ob.location.z = z * 0.01
    m = bpy.data.materials.new(nome); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = srgb(p['col']); em.inputs['Strength'].default_value = 1.0
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface']); cu.materials.append(m)
    OBJ[nome] = ob

# braccia: ognuna appesa a un empty nel punto d'attacco, girato lungo il braccio; l'empty si allunga solo in quel verso
import mathutils
ARTI = {}
for n, base, mano in [('braccio', (690, 412), (824, 392)), ('avambraccio', (662, 528), (754, 558))]:
    e = bpy.data.objects.new('osso_' + n, None); sc.collection.objects.link(e)
    ang = math.atan2(-(mano[1]-base[1]), mano[0]-base[0])
    e.location = (base[0]*U, -base[1]*U, 0); e.rotation_euler = (0, 0, ang)
    bpy.context.view_layer.update()
    ob = OBJ[n]; ob.parent = e; ob.matrix_parent_inverse = e.matrix_world.inverted()
    ARTI[n] = (e, ang)
# ── animazione: tutto in coordinate del disegno (pixel, y verso il basso) ──
def rot(p, c, a):  # ruota p attorno a c di a gradi (orari sullo schermo)
    r = math.radians(a); x, y = p[0]-c[0], p[1]-c[1]
    return (c[0] + x*math.cos(r) - y*math.sin(r), c[1] + x*math.sin(r) + y*math.cos(r))
def metti(ob, frame, c, a, t=(0, 0), s=1.0, ancora=None):
    """trasformazione: scala s attorno ad 'ancora', ruota di a attorno a c, poi trasla di t (pixel)"""
    # in Blender l'oggetto ha origine nel punto (0,0) del disegno: calcolo dove finisce l'origine
    a_b = -a   # y verso l'alto in Blender: le rotazioni si invertono
    o = (0.0, 0.0)
    if ancora: o = (ancora[0] - ancora[0]*s, ancora[1] - ancora[1]*s)
    o = rot(o, c, a)
    ob.location = (( o[0] + t[0])*U, -(o[1] + t[1])*U, ob.location.z)
    ob.rotation_euler = (0, 0, math.radians(a_b)); ob.scale = (s, s, 1)
    ob.keyframe_insert('location', frame=frame); ob.keyframe_insert('rotation_euler', frame=frame); ob.keyframe_insert('scale', frame=frame)

N = 48
ease = lambda u: u*u*(3-2*u)
MANO_SU, MANO_GIU = (824, 392), (754, 558)
SPALLA, GOMITO, ANCA = (690, 412), (662, 528), (630, 600)
CANOA = ['scafo_scuro','scafo','bordo','interno','sedili','gambe']
PERSONA = ['busto','ombra','testa','capelli']
for f in range(N if MODE == 'anim' else 1):
    u = f / N
    # colpo di pagaia: 0-0.62 la pala tira indietro in acqua, 0.62-1 si alza e torna avanti
    if u < .62:
        k = ease(u/.62); dx = 34 - 78*k; dy = 0; a = -7 + 13*k
    else:
        k = ease((u-.62)/.38); dx = -44 + 78*k; dy = -58*math.sin(math.pi*k); a = 6 - 13*k
    bob = 4.5*math.sin(2*math.pi*u*2); tilt = 0.9*math.sin(2*math.pi*u*2 + .7) - .6*math.sin(2*math.pi*u)
    lean = 2.6*math.sin(2*math.pi*u - .4)          # il busto accompagna il colpo
    CB = (770, 640)                                # la canoa ondeggia attorno al suo centro
    def canoa(p): q = rot(p, CB, tilt); return (q[0], q[1] + bob)
    for n in CANOA: metti(OBJ[n], f, CB, tilt, (0, bob))
    # busto e testa: oscillano attorno all'anca, sopra la canoa
    anca = canoa(ANCA)
    for n in PERSONA: metti(OBJ[n], f, ANCA, tilt + lean, (anca[0]-ANCA[0], anca[1]-ANCA[1]))
    corpo = lambda p: (lambda q: (q[0] + anca[0]-ANCA[0], q[1] + anca[1]-ANCA[1]))(rot(p, ANCA, tilt + lean))
    # pagaia e mani: ruota attorno alla mano alta, poi trasla
    pc = canoa(MANO_SU); tp = (pc[0]-MANO_SU[0] + dx*.45, pc[1]-MANO_SU[1] + dy*.55)
    for n in ['asta', 'pala']: metti(OBJ[n], f, MANO_SU, tilt + a, (tp[0] + 0, tp[1] + 0))
    def pag(p): q = rot(p, MANO_SU, tilt + a); return (q[0] + tp[0], q[1] + tp[1])
    ms, mg = pag(MANO_SU), pag(MANO_GIU)
    # la mano bassa scorre lungo l'asta: la sposto un po' in giù durante il colpo
    metti(OBJ['mano_su'], f, MANO_SU, 0, (ms[0]-MANO_SU[0], ms[1]-MANO_SU[1]))
    metti(OBJ['mano_giu'], f, MANO_GIU, 0, (mg[0]-MANO_GIU[0], mg[1]-MANO_GIU[1]))
    # braccio alto: dalla spalla alla mano alta; avambraccio: dal gomito alla mano bassa
    for n, base, mano0, mano in [('braccio', SPALLA, MANO_SU, ms), ('avambraccio', GOMITO, MANO_GIU, mg)]:
        b = corpo(base)
        a0 = math.degrees(math.atan2(mano0[1]-base[1], mano0[0]-base[0])); a1 = math.degrees(math.atan2(mano[1]-b[1], mano[0]-b[0]))
        s = math.hypot(mano[0]-b[0], mano[1]-b[1]) / math.hypot(mano0[0]-base[0], mano0[1]-base[1])
        e, ang = ARTI[n]
        e.location = (b[0]*U, -b[1]*U, 0); e.rotation_euler = (0, 0, ang - math.radians(a1 - a0)); e.scale = (s, 1, 1)
        for prop in ('location', 'rotation_euler', 'scale'): e.keyframe_insert(prop, frame=f)
    # acqua: le onde scorrono e respirano; l'increspatura attorno alla pala segue la pala
    for n, ph, amp in [('acqua_sx', 0, 9), ('acqua_dx', 1.7, 9), ('acqua_dx2', 3.1, 7)]:
        metti(OBJ[n], f, (0, 0), 0, (-amp*math.sin(2*math.pi*u + ph) - 6, 2*math.sin(2*math.pi*u*2 + ph)))
    inacqua = 1 - min(1, max(0, (-dy) / 25))
    pa = pag((640, 790))
    metti(OBJ['acqua_pala'], f, (600, 795), 0, (pa[0]-640, 0), 0.55 + 0.45*inacqua, (600, 795))
sc.frame_start, sc.frame_end = 0, (N-1 if MODE == 'anim' else 0)
for ob in bpy.data.objects:
    if ob.animation_data and ob.animation_data.action:
        for fc in ob.animation_data.action.fcurves if hasattr(ob.animation_data.action, 'fcurves') else []:
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.filepath = S + ('/bl_' if MODE == 'anim' else '/bl_fermo_')
bpy.ops.render.render(animation=True)
bpy.ops.wm.save_as_mainfile(filepath=S + '/canoa.blend')
