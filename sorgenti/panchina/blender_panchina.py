# Blender: la panchina gigante ricalcata in curve; le gambe dondolano rigide attorno alle ginocchia.
# uso: python3 blender_panchina.py cartella anim|fermo
import bpy, json, math, sys
S = sys.argv[1]; MODE = sys.argv[2]
D = json.load(open(S + '/parti.json')); W, H = D['W'], D['H']
U = 0.01
def B(x, y): return (x * U, -y * U, 0)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
sc.cycles.max_bounces = 0; sc.render.filter_size = 1.2
sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W * 2, H * 2, 100
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = W * U; cam.location = (W * U / 2, -H * U / 2, 10)
def srgb(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c] + [1]
GRUPPI = {}
for z, p in enumerate(D['parti']):
    cu = bpy.data.curves.new(p['nome'], 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.resolution_u = 24
    if 'poly' in p:
        ps = cu.splines.new('POLY'); ps.points.add(len(p['poly']) - 1); ps.use_cyclic_u = True
        for pt, (x, y) in zip(ps.points, p['poly']): pt.co = (x * U, -y * U, 0, 1)
    for sp in p.get('splines', []):
        pts = []; cur = sp['start']
        for s in sp['segs']:
            if s[0] == 'L': pts.append([cur, None, None]); pts.append([s[1], None, None]); cur = s[2]
            else: pts.append([cur, None, s[1]]); pts.append([s[3], s[2], None]); cur = s[3]
        fused = []
        for q in pts:
            if fused and abs(fused[-1][0][0] - q[0][0]) < 1e-6 and abs(fused[-1][0][1] - q[0][1]) < 1e-6:
                if q[1] is not None: fused[-1][1] = q[1]
                if q[2] is not None: fused[-1][2] = q[2]
            else: fused.append(q)
        if len(fused) > 1 and abs(fused[0][0][0] - fused[-1][0][0]) < 1e-6 and abs(fused[0][0][1] - fused[-1][0][1]) < 1e-6:
            last = fused.pop()
            if last[1] is not None: fused[0][1] = last[1]
        bs = cu.splines.new('BEZIER'); bs.bezier_points.add(len(fused) - 1); bs.use_cyclic_u = True
        for bp, (co, hl, hr) in zip(bs.bezier_points, fused):
            bp.co = B(*co); bp.handle_left_type = bp.handle_right_type = 'FREE'
            bp.handle_left = B(*(hl if hl else co)); bp.handle_right = B(*(hr if hr else co))
    ob = bpy.data.objects.new(p['nome'], cu); sc.collection.objects.link(ob)
    ob.location.z = z * .01
    m = bpy.data.materials.new(p['nome']); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = srgb(p['col'])
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface']); cu.materials.append(m)
    GRUPPI.setdefault(p['gruppo'], []).append(ob)
# ordine: stinchi sotto le cosce
for ob in GRUPPI['sx'] + GRUPPI['dx']: ob.location.z -= 0.0   # (già prima delle cosce nella lista)
# ginocchia: ogni stinco è figlio di un perno nel ginocchio
KN = {'sx': (276, 248), 'dx': (306, 246)}
PERNI = {}
for g, k in KN.items():
    e = bpy.data.objects.new('ginocchio_' + g, None); sc.collection.objects.link(e)
    e.location = (k[0] * U, -k[1] * U, 0); bpy.context.view_layer.update()
    for ob in GRUPPI[g]: ob.parent = e; ob.matrix_parent_inverse = e.matrix_world.inverted()
    PERNI[g] = e
N = 48
# stesso dondolio dell'illustrazione (periodo 48), relativo alla posa del disegno
dxl = lambda k: 2.25 * math.cos(2 * math.pi * (k - 45) / N)
dxr = lambda k: 5.0 * math.cos(2 * math.pi * (k - 14) / N)
for f in range(N if MODE == 'anim' else 1):
    for g, dx in (('sx', dxl), ('dx', dxr)):
        a = (dx(f) - dx(0)) / 32          # radianti; in Blender (y in su) il verso è già quello giusto
        e = PERNI[g]; e.rotation_euler = (0, 0, a); e.keyframe_insert('rotation_euler', frame=f)
sc.frame_start, sc.frame_end = 0, (N - 1 if MODE == 'anim' else 0)
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.render.filepath = S + ('/bl_' if MODE == 'anim' else '/bl_fermo_')
bpy.ops.render.render(animation=True)
bpy.ops.wm.save_as_mainfile(filepath=S + '/panchina.blend')
