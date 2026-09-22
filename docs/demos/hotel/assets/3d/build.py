# -*- coding: utf-8 -*-
"""THE LUMEN: builds each room type in Blender from spec.py and renders it.

    blender --background --python build.py -- <room-id> [wide|detail|plan|all]

Everything is boxes and cylinders: no external assets, no HDRI, no textures.
The room reads because of the light, not because of detail.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spec

OUT = os.path.join(HERE, "renders")
os.makedirs(OUT, exist_ok=True)

# --------------------------------------------------------------- materials

MATS = {}

def mat(name, rgb, rough=0.6, metal=0.0, emit=None, emit_w=0.0, alpha=1.0, trans=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    def setv(k, v):
        if k in b.inputs:
            b.inputs[k].default_value = v
    setv("Base Color", (*rgb, 1.0))
    setv("Roughness", rough)
    setv("Metallic", metal)
    setv("Alpha", alpha)
    setv("Transmission Weight", trans)
    if emit:
        setv("Emission Color", (*emit, 1.0))
        setv("Emission Strength", emit_w)
    if alpha < 1.0:
        m.blend_method = 'BLEND'
    MATS[name] = m
    return m


def palette():
    mat("oak",      (0.23, 0.15, 0.085), 0.40)
    mat("wall",     (0.60, 0.575, 0.535), 0.88)
    mat("panel",    (0.09, 0.16, 0.13), 0.58)
    mat("ceiling",  (0.80, 0.79, 0.77), 0.92)
    mat("linen",    (0.80, 0.78, 0.73), 0.80)
    mat("duvet",    (0.89, 0.875, 0.845), 0.85)
    mat("throw",    (0.30, 0.38, 0.33), 0.85)
    mat("walnut",   (0.13, 0.082, 0.05), 0.38)
    mat("brass",    (0.76, 0.58, 0.24), 0.22, metal=1.0)
    mat("dark",     (0.07, 0.08, 0.07), 0.35)
    mat("marble",   (0.74, 0.72, 0.68), 0.18)
    mat("rugwool",  (0.21, 0.26, 0.23), 0.92)
    mat("rugpale",  (0.46, 0.42, 0.36), 0.92)
    mat("uphol",    (0.30, 0.27, 0.22), 0.80)
    mat("uphol2",   (0.17, 0.23, 0.21), 0.78)
    mat("leaf",     (0.16, 0.34, 0.18), 0.70)
    mat("pot",      (0.55, 0.32, 0.20), 0.55)
    mat("screen",   (0.02, 0.02, 0.02), 0.20)
    mat("glass",    (1.0, 1.0, 1.0), 0.02, alpha=1.0, trans=1.0)
    mat("steel",    (0.62, 0.63, 0.64), 0.30, metal=1.0)
    mat("stone",    (0.42, 0.40, 0.37), 0.80)
    mat("deck",     (0.38, 0.28, 0.19), 0.70)
    mat("flame",    (1.0, 0.52, 0.16), 0.5, emit=(1.0, 0.45, 0.12), emit_w=14.0)
    mat("bulb",     (1.0, 0.93, 0.80), 0.4, emit=(1.0, 0.86, 0.66), emit_w=26.0)


# ------------------------------------------------------------------ meshes

def box(name, size, loc, material, parent_col=None):
    sx, sy, sz = size
    x, y, z = loc
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.scale = (sx, sy, sz)
    ob.location = (x, y, z)
    ob.data.materials.append(material)
    bpy.context.collection.objects.link(ob)
    return ob


def cyl(name, r, h, loc, material, verts=24):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts,
                          radius1=r, radius2=r, depth=h)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.data.materials.append(material)
    bpy.context.collection.objects.link(ob)
    return ob


def sphere(name, r, loc, material):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=r)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.data.materials.append(material)
    bpy.context.collection.objects.link(ob)
    return ob


def shade_smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


# --------------------------------------------------------------- furniture
# Each builder returns boxes in local space: footprint centred on (0,0),
# z = 0 at the floor. The caller rotates and moves them.

def B(cx, cy, cz, sx, sy, sz, m):
    return ("box", cx, cy, cz, sx, sy, sz, m)

def C(cx, cy, cz, r, h, m):
    return ("cyl", cx, cy, cz, r, h, m)

def S(cx, cy, cz, r, m):
    return ("sph", cx, cy, cz, r, m)


def f_bed(w, d, king=True):
    h = 0.30
    out = [
        B(0, 0, h / 2, w, d, h, "walnut"),                       # base
        B(0, 0, h + 0.13, w - 0.06, d - 0.06, 0.26, "linen"),    # mattress
        B(0, -0.10, h + 0.29, w - 0.04, d * 0.62, 0.06, "duvet"),  # duvet
        B(0, -d / 2 + 0.34, h + 0.33, w - 0.10, 0.44, 0.05, "throw"),  # throw
        B(0, d / 2 + 0.05, 0.62, w + 0.22, 0.10, 1.24, "panel"),  # headboard
    ]
    px = 0.30 if king else 0.26
    pw = (w - 0.30) / 2
    out += [
        B(-pw / 2 - 0.05, d / 2 - px, h + 0.36, pw, 0.34, 0.14, "duvet"),
        B(+pw / 2 + 0.05, d / 2 - px, h + 0.36, pw, 0.34, 0.14, "duvet"),
    ]
    return out


def f_nightstand():
    return [B(0, 0, 0.24, 0.48, 0.42, 0.48, "walnut"),
            C(0, 0, 0.53, 0.05, 0.10, "brass"),
            C(0, 0, 0.70, 0.11, 0.24, "bulb")]


def f_desk():
    return [B(0, 0, 0.74, 1.30, 0.58, 0.04, "walnut"),
            B(-0.60, 0, 0.37, 0.05, 0.54, 0.74, "walnut"),
            B(0.60, 0, 0.37, 0.05, 0.54, 0.74, "walnut"),
            B(0.34, 0.06, 0.78, 0.34, 0.24, 0.02, "dark")]


def f_chair():
    return [B(0, 0, 0.45, 0.50, 0.52, 0.06, "uphol"),
            B(0, 0.23, 0.70, 0.46, 0.05, 0.44, "walnut"),
            B(-0.21, -0.22, 0.22, 0.04, 0.04, 0.44, "walnut"),
            B(0.21, -0.22, 0.22, 0.04, 0.04, 0.44, "walnut"),
            B(-0.21, 0.22, 0.22, 0.04, 0.04, 0.44, "walnut"),
            B(0.21, 0.22, 0.22, 0.04, 0.04, 0.44, "walnut")]


def f_armchair():
    return [B(0, 0, 0.20, 0.84, 0.82, 0.30, "uphol2"),
            B(0, 0, 0.40, 0.62, 0.66, 0.14, "uphol2"),
            B(0, 0.36, 0.52, 0.84, 0.12, 0.64, "uphol2"),
            B(-0.38, -0.02, 0.44, 0.08, 0.72, 0.18, "uphol2"),
            B(0.38, -0.02, 0.44, 0.08, 0.72, 0.18, "uphol2")]


def f_sofa(w):
    return [B(0, 0, 0.19, w, 0.90, 0.28, "uphol2"),
            B(0, -0.04, 0.38, w - 0.22, 0.74, 0.14, "uphol2"),
            B(0, 0.39, 0.52, w, 0.12, 0.62, "uphol2"),
            B(-w / 2 + 0.06, -0.02, 0.44, 0.12, 0.80, 0.22, "uphol2"),
            B(w / 2 - 0.06, -0.02, 0.44, 0.12, 0.80, 0.22, "uphol2"),
            B(-w / 2 + 0.34, 0.24, 0.52, 0.34, 0.14, 0.30, "throw"),
            B(w / 2 - 0.34, 0.24, 0.52, 0.34, 0.14, 0.30, "throw")]


def f_coffee():
    return [B(0, 0, 0.38, 1.05, 0.58, 0.04, "marble"),
            B(0, 0, 0.18, 0.86, 0.42, 0.36, "walnut"),
            B(0.18, 0, 0.42, 0.22, 0.16, 0.04, "brass")]


def f_tv_unit():
    return [B(0, 0, 0.24, 1.70, 0.42, 0.48, "walnut"),
            B(0, 0.16, 1.28, 1.42, 0.05, 0.80, "screen")]


def f_wardrobe():
    return [B(0, 0, 1.10, 1.25, 0.62, 2.20, "walnut"),
            B(-0.16, -0.32, 1.10, 0.03, 0.03, 0.30, "brass"),
            B(0.16, -0.32, 1.10, 0.03, 0.03, 0.30, "brass")]


def f_bench():
    return [B(0, 0, 0.44, 1.10, 0.44, 0.06, "uphol"),
            B(-0.48, 0, 0.21, 0.05, 0.40, 0.42, "walnut"),
            B(0.48, 0, 0.21, 0.05, 0.40, 0.42, "walnut")]


def f_dining(w=1.90, d=0.98):
    return [B(0, 0, 0.75, w, d, 0.05, "walnut"),
            B(-w / 2 + 0.18, 0, 0.37, 0.08, d - 0.18, 0.74, "walnut"),
            B(w / 2 - 0.18, 0, 0.37, 0.08, d - 0.18, 0.74, "walnut"),
            C(0, 0, 0.83, 0.10, 0.11, "brass")]


def f_sideboard():
    return [B(0, 0, 0.36, 1.60, 0.45, 0.72, "walnut"),
            B(0, -0.23, 0.36, 1.50, 0.02, 0.60, "panel")]


def f_console():
    return [B(0, 0, 0.78, 1.20, 0.38, 0.04, "marble"),
            B(-0.52, 0, 0.39, 0.05, 0.34, 0.78, "brass"),
            B(0.52, 0, 0.39, 0.05, 0.34, 0.78, "brass")]


def f_piano():
    out = [B(0, 0.10, 0.82, 1.42, 1.18, 0.20, "dark"),
           B(0, -0.52, 0.80, 1.46, 0.30, 0.16, "dark"),
           B(0, -0.60, 0.72, 1.20, 0.12, 0.04, "linen"),
           B(0, 0.22, 1.00, 1.30, 0.94, 0.03, "dark")]
    for dx, dy in ((-0.60, -0.42), (0.60, -0.42), (0, 0.56)):
        out.append(B(dx, dy, 0.36, 0.09, 0.09, 0.72, "dark"))
    out.append(B(-0.10, 0.10, 1.26, 1.20, 0.90, 0.03, "dark"))
    return out


def f_bar():
    return [B(0, 0, 0.55, 1.85, 0.58, 1.10, "walnut"),
            B(0, 0, 1.12, 1.95, 0.64, 0.05, "marble"),
            C(-0.50, 0, 1.22, 0.05, 0.16, "glass"),
            C(-0.28, 0, 1.22, 0.05, 0.16, "glass"),
            C(0.34, 0, 1.28, 0.07, 0.28, "brass")]


def f_daybed():
    return [B(0, 0, 0.16, 2.05, 0.95, 0.32, "deck"),
            B(0, 0, 0.36, 1.92, 0.86, 0.12, "linen"),
            B(0, 0.38, 0.52, 1.92, 0.14, 0.24, "linen"),
            B(-0.62, 0.26, 0.52, 0.40, 0.16, 0.20, "throw")]


def f_lounger():
    return [B(0, -0.20, 0.30, 0.72, 1.50, 0.10, "linen"),
            B(0, 0.62, 0.52, 0.72, 0.12, 0.52, "linen"),
            B(-0.30, -0.20, 0.14, 0.06, 1.40, 0.28, "deck"),
            B(0.30, -0.20, 0.14, 0.06, 1.40, 0.28, "deck")]


def f_firepit():
    return [C(0, 0, 0.18, 0.48, 0.36, "stone"),
            C(0, 0, 0.38, 0.40, 0.06, "dark"),
            C(0, 0, 0.46, 0.22, 0.14, "flame")]


def f_planter():
    out = [B(0, 0, 0.30, 0.55, 0.55, 0.60, "pot")]
    for dx, dy, dz, r in ((0, 0, 0.86, 0.26), (-0.14, 0.10, 0.74, 0.18),
                          (0.15, -0.08, 0.78, 0.17)):
        out.append(S(dx, dy, dz, r, "leaf"))
    return out


def f_plant():
    out = [C(0, 0, 0.19, 0.24, 0.38, "pot")]
    for dx, dy, dz, r in ((0, 0, 0.74, 0.30), (-0.16, 0.10, 0.58, 0.20),
                          (0.17, -0.09, 0.62, 0.19)):
        out.append(S(dx, dy, dz, r, "leaf"))
    return out


BUILDERS = {
    "bed_king":     lambda: f_bed(1.95, 2.15, True),
    "bed_queen":    lambda: f_bed(1.62, 2.05, False),
    "bed_single":   lambda: f_bed(1.00, 2.00, False),
    "nightstand":   f_nightstand,
    "desk":         f_desk,
    "chair":        f_chair,
    "armchair":     f_armchair,
    "sofa2":        lambda: f_sofa(1.75),
    "sofa3":        lambda: f_sofa(2.35),
    "coffee_table": f_coffee,
    "tv_unit":      f_tv_unit,
    "wardrobe":     f_wardrobe,
    "bench":        f_bench,
    "dining6":      f_dining,
    "dining_chair": f_chair,
    "sideboard":    f_sideboard,
    "console":      f_console,
    "piano":        f_piano,
    "bar":          f_bar,
    "daybed":       f_daybed,
    "lounger":      f_lounger,
    "firepit":      f_firepit,
    "planter":      f_planter,
    "plant":        f_plant,
}


def emit(parts, x, y, rot, tag):
    """Rotate a local part list by rot (0/90/180/270) and place it at x,y."""
    th = math.radians(rot)
    ct, st = round(math.cos(th)), round(math.sin(th))
    for i, p in enumerate(parts):
        kind = p[0]
        lx, ly, lz = p[1], p[2], p[3]
        wx, wy = lx * ct - ly * st, lx * st + ly * ct
        name = f"{tag}_{i}"
        if kind == "box":
            sx, sy, sz, m = p[4], p[5], p[6], p[7]
            if rot % 180 == 90:
                sx, sy = sy, sx
            box(name, (sx, sy, sz), (x + wx, y + wy, lz), MATS[m])
        elif kind == "cyl":
            r, h, m = p[4], p[5], p[6]
            o = cyl(name, r, h, (x + wx, y + wy, lz), MATS[m])
            shade_smooth(o)
        else:
            r, m = p[4], p[5]
            o = sphere(name, r, (x + wx, y + wy, lz), MATS[m])
            shade_smooth(o)


# ------------------------------------------------------------- room shell

GLAZING = {
    "observatory-penthouse": ("far", "left", "right"),
    "corner-deluxe": ("far", "right"),
}

WALL_T = 0.12


def glass_wall(name, x0, y0, x1, y1, h, mullions=3):
    """A glazed wall between two points, with slim mullions."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    horiz = abs(x1 - x0) > abs(y1 - y0)
    span = abs(x1 - x0) if horiz else abs(y1 - y0)
    sx, sy = (span, 0.04) if horiz else (0.04, span)
    box(name + "_glass", (sx, sy, h), (cx, cy, h / 2), MATS["glass"])
    box(name + "_sill", (sx + 0.1 if horiz else 0.14, 0.14 if horiz else sy + 0.1, 0.10),
        (cx, cy, 0.05), MATS["dark"])
    box(name + "_head", (sx + 0.1 if horiz else 0.14, 0.14 if horiz else sy + 0.1, 0.10),
        (cx, cy, h - 0.05), MATS["dark"])
    for i in range(1, mullions + 1):
        t = i / (mullions + 1)
        mx = x0 + (x1 - x0) * t
        my = y0 + (y1 - y0) * t
        box(f"{name}_mull{i}", (0.07, 0.07, h), (mx, my, h / 2), MATS["dark"])


def build_bathroom(r):
    """A glazed corner: two solid walls, one glass screen, fixtures inside."""
    x0, y0, x1, y1 = r["bath"]
    h = r["ceiling"]
    w, d = x1 - x0, y1 - y0
    on_left = x0 < 0.05
    box("bath_floor", (w, d, 0.02), ((x0 + x1) / 2, (y0 + y1) / 2, 0.01), MATS["marble"])
    # The wall shared with the room, and the screen facing the entrance
    if on_left:
        box("bath_w1", (WALL_T, d, h), (x1, (y0 + y1) / 2, h / 2), MATS["wall"])
    else:
        box("bath_w1", (WALL_T, d, h), (x0, (y0 + y1) / 2, h / 2), MATS["wall"])
    box("bath_w2", (w, 0.05, h), ((x0 + x1) / 2, y1, h / 2), MATS["glass"])
    box("bath_w2f", (w, 0.08, 0.10), ((x0 + x1) / 2, y1, h - 0.05), MATS["dark"])

    inner = 0.28
    # vanity along the outer wall
    vx = x0 + inner if on_left else x1 - inner
    box("vanity", (0.52, min(1.5, d * 0.55), 0.20), (vx, y0 + d * 0.32, 0.78), MATS["marble"])
    box("vanity_u", (0.46, min(1.4, d * 0.5), 0.66), (vx, y0 + d * 0.32, 0.35), MATS["walnut"])
    box("mirror", (0.03, min(1.3, d * 0.46), 1.00), (x0 + 0.03 if on_left else x1 - 0.03,
                                                     y0 + d * 0.32, 1.62), MATS["glass"])
    c = cyl("tap", 0.02, 0.24, (vx - 0.16 if on_left else vx + 0.16, y0 + d * 0.32, 1.00), MATS["brass"])
    shade_smooth(c)
    # shower at the far end
    sx_ = x1 - 0.55 if on_left else x0 + 0.55
    box("shower_tray", (1.00, 1.00, 0.04), (sx_, y1 - 0.62, 0.02), MATS["stone"])
    box("shower_glass", (0.04, 1.00, 2.10), (sx_ - 0.5 if on_left else sx_ + 0.5, y1 - 0.62, 1.05), MATS["glass"])
    c = cyl("shower_head", 0.11, 0.03, (sx_, y1 - 0.62, 2.14), MATS["brass"]); shade_smooth(c)
    # wc
    box("wc", (0.38, 0.62, 0.42), (x1 - 0.30 if on_left else x0 + 0.30, y0 + 0.42, 0.21), MATS["marble"])
    box("wc_b", (0.20, 0.16, 0.36), (x1 - 0.30 if on_left else x0 + 0.30, y0 + 0.16, 0.44), MATS["marble"])
    # a freestanding bath in the bigger rooms
    if w * d > 6.0:
        box("tub", (1.72, 0.80, 0.52), ((x0 + x1) / 2, y0 + d * 0.72, 0.28), MATS["marble"])
        box("tub_in", (1.52, 0.62, 0.40), ((x0 + x1) / 2, y0 + d * 0.72, 0.36), MATS["linen"])


def build_room(key, ceiling=True):
    r = spec.ROOMS[key]
    w, d, h = r["w"], r["d"], r["ceiling"]
    glaz = GLAZING.get(key, ("far",))
    terr = r["terrace"]

    # floor, ceiling
    box("floor", (w + 0.3, d + 0.3, 0.08), (w / 2, d / 2, -0.04), MATS["oak"])
    if ceiling:
        box("ceil", (w + 0.3, d + 0.3, 0.10), (w / 2, d / 2, h + 0.05), MATS["ceiling"])

    # side walls
    if "left" in glaz:
        glass_wall("gl_left", 0, 0.25, 0, d - 0.1, h, mullions=max(2, int(d / 2.6)))
    else:
        box("wall_l", (WALL_T, d + 0.2, h), (-WALL_T / 2, d / 2, h / 2), MATS["wall"])
    if "right" in glaz:
        glass_wall("gl_right", w, 0.25, w, d - 0.1, h, mullions=max(2, int(d / 2.6)))
    else:
        box("wall_r", (WALL_T, d + 0.2, h), (w + WALL_T / 2, d / 2, h / 2), MATS["wall"])

    # far wall: full-height glazing
    glass_wall("gl_far", 0.1, d, w - 0.1, d, h, mullions=max(2, int(w / 2.4)))
    # slim piers so the glass reads as a wall
    box("pier_l", (0.18, WALL_T, h), (0.09, d, h / 2), MATS["wall"])
    box("pier_r", (0.18, WALL_T, h), (w - 0.09, d, h / 2), MATS["wall"])

    # the panelled wall behind the bed, in rooms where the bed is against x=0
    beds = [i for i in r["items"] if i[0].startswith("bed_")]
    if beds and beds[0][3] == 90:
        box("panel_wall", (0.04, d * 0.62, h), (0.03, d * 0.52, h / 2), MATS["panel"])
    elif beds:
        bx = beds[0][1]
        box("panel_wall", (min(w * 0.55, 3.4), 0.04, h), (bx, 0.03, h / 2), MATS["panel"])

    build_bathroom(r)

    for it in r["items"]:
        kind, x, y, rot = it[0], it[1], it[2], it[3]
        if kind == "rug":
            rw, rd = it[4], it[5]
            box("rug", (rw, rd, 0.016), (x, y, 0.008),
                MATS["rugwool"] if "penthouse" not in key else MATS["rugpale"])
            continue
        emit(BUILDERS[kind](), x, y, rot, kind)

    # terrace
    if terr:
        td = terr["depth"]
        box("deck", (w + 0.3, td, 0.08), (w / 2, d + td / 2, -0.04), MATS["deck"])
        glass_wall("balus", 0.1, d + td, w - 0.1, d + td, 1.15, mullions=int(w / 1.8))
        glass_wall("balus_l", 0, d + 0.1, 0, d + td, 1.15, mullions=2)
        glass_wall("balus_r", w, d + 0.1, w, d + td, 1.15, mullions=2)
        for it in terr["items"]:
            kind, x, y, rot = it[0], it[1], it[2], it[3]
            emit(BUILDERS[kind](), x, d + y, rot, "t_" + kind)

    return r


# ------------------------------------------------------- world and lights

def build_world(seed=7):
    world = bpy.data.worlds.new("Lumen")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = 'MULTIPLE_SCATTERING'
    sky.sun_elevation = math.radians(16)
    sky.sun_rotation = math.radians(150)
    sky.altitude = 120
    bg.inputs["Strength"].default_value = 0.34
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(sky.outputs[0], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])

    # water and a distant skyline, so the window has something in it
    sea = box("sea", (900, 900, 0.2), (0, 260, -11), mat("sea", (0.02, 0.06, 0.08), 0.22))
    st = 1103515245
    v = seed
    def rnd():
        nonlocal v
        v = (v * st + 12345) % (2 ** 31)
        return v / (2 ** 31)
    sky_mat = mat("cityblock", (0.20, 0.23, 0.26), 0.55)
    for i in range(26):
        bw = 4 + rnd() * 10
        bh = 8 + rnd() * 34
        bx = -70 + rnd() * 150
        by = 42 + rnd() * 70
        box(f"city{i}", (bw, bw * 0.8, bh), (bx, by, -11 + bh / 2), sky_mat)


def build_lights(r, key):
    w, d, h = r["w"], r["d"], r["ceiling"]
    sun = bpy.data.lights.new("sun", 'SUN')
    sun.energy = 2.0
    sun.angle = math.radians(2.5)
    sun.color = (1.0, 0.94, 0.84)
    so = bpy.data.objects.new("sun", sun)
    so.rotation_euler = (math.radians(58), 0, math.radians(214))
    bpy.context.collection.objects.link(so)

    # sky bounce through the glazing
    sk = bpy.data.lights.new("skyfill", 'AREA')
    sk.energy = 52 * (w / 4.2)
    sk.size = max(w, 3.0)
    sk.size_y = h
    sk.shape = 'RECTANGLE'
    sk.color = (0.86, 0.92, 1.0)
    o = bpy.data.objects.new("skyfill", sk)
    o.location = (w / 2, d + (r["terrace"]["depth"] + 1.2 if r["terrace"] else 1.0), h * 0.55)
    o.rotation_euler = (math.radians(90), 0, math.radians(180))
    bpy.context.collection.objects.link(o)

    # the dollhouse cheat: a soft fill through the removed wall
    fl = bpy.data.lights.new("fill", 'AREA')
    fl.energy = 11 * (w / 4.2)
    fl.size = w * 1.4
    fl.size_y = h
    fl.shape = 'RECTANGLE'
    fl.color = (1.0, 0.96, 0.90)
    o = bpy.data.objects.new("fill", fl)
    o.location = (w / 2, -1.6, h * 0.62)
    o.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.collection.objects.link(o)

    # warm ceiling wash
    cw = bpy.data.lights.new("wash", 'AREA')
    cw.energy = 13 * (w * d / 25)
    cw.size = w * 0.7
    cw.size_y = d * 0.7
    cw.shape = 'RECTANGLE'
    cw.color = (1.0, 0.89, 0.76)
    o = bpy.data.objects.new("wash", cw)
    o.location = (w / 2, d / 2, h - 0.12)
    o.rotation_euler = (0, 0, 0)
    bpy.context.collection.objects.link(o)


def item_rects(r):
    """Footprints of everything solid, for keeping the camera out of the furniture."""
    out = []
    for it in r["items"]:
        kind, x, y, rot = it[0], it[1], it[2], it[3]
        if kind in ("rug",):
            continue
        w_, d_ = spec.FURNITURE[kind]
        if rot % 180 == 90:
            w_, d_ = d_, w_
        out.append((x - w_ / 2, y - d_ / 2, x + w_ / 2, y + d_ / 2))
    out.append(tuple(r["bath"]))
    return out


def clear_spot(r, candidates, pad=0.42):
    """First candidate that isn't standing in the furniture."""
    rects = item_rects(r)
    for cx, cy in candidates:
        if cx < 0.35 or cy < 0.3 or cx > r["w"] - 0.35 or cy > r["d"] - 0.3:
            continue
        if all(cx < x0 - pad or cx > x1 + pad or cy < y0 - pad or cy > y1 + pad
               for x0, y0, x1, y1 in rects):
            return cx, cy
    return candidates[0]


def add_camera(r, shot):
    w, d, h = r["w"], r["d"], r["ceiling"]
    tgt = bpy.data.objects.new("target", None)
    bpy.context.collection.objects.link(tgt)

    if shot == "hero":
        # Where an interior photographer actually stands. Two cases, because
        # the beds face different ways.
        lens = 30.0
        bx0, by0, bx1, by1 = r["bath"]
        bed = [i for i in r["items"] if i[0].startswith("bed_")][0]
        bw, bd = spec.FURNITURE[bed[0]]
        if bed[3] % 180 == 90:
            bw, bd = bd, bw
        bcx = bed[1]

        if bed[3] % 180 == 90:
            # Headboard on a side wall, glass at the far end: shoot from past
            # the bathroom, across the bed, towards the window.
            if bcx < w / 2:
                cx = min(w - 0.45, bcx + bw / 2 + (w - bcx - bw / 2) * 0.62)
            else:
                cx = max(0.45, (bcx - bw / 2) * 0.38)
            loc = (cx, max(by1, 0.5) + 0.55, 1.58)
            tgt.location = (bcx + (w / 2 - bcx) * 0.25, d * 0.80, 1.02)
        else:
            # Penthouse: the bed is against the entrance wall, so stand in a
            # clear corner at the front and shoot down the room at the glass,
            # which is what anyone is paying for.
            lens = 26.0
            far = bx0 < 0.05          # bathroom hugs the left wall
            xs = [0.86, 0.74, 0.94, 0.62] if far else [0.14, 0.26, 0.06, 0.38]
            cands = [(w * fx, d * fy) for fy in (0.14, 0.24, 0.34) for fx in xs]
            cx, cy = clear_spot(r, cands)
            loc = (cx, cy, 1.62)
            tgt.location = (w * (0.40 if far else 0.60), d * 0.92, 1.12)

    elif shot == "dollhouse":
        lens = 38.0
        span = max(w, d)
        loc = (w / 2 + span * 0.42, -span * 0.80, span * 1.18 + 1.0)
        tgt.location = (w / 2, d * 0.48, 0.55)
    else:  # plan
        lens = 50.0
        loc = (w / 2, d / 2, 22.0)
        tgt.location = (w / 2, d / 2, 0)

    cam = bpy.data.cameras.new("cam")
    cam.lens = lens
    if shot == "plan":
        cam.type = 'ORTHO'
        cam.ortho_scale = max(w, d) * 1.08
    co = bpy.data.objects.new("cam", cam)
    co.location = loc
    bpy.context.collection.objects.link(co)
    c = co.constraints.new('TRACK_TO')
    c.target = tgt
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'
    bpy.context.scene.camera = co
    return co


def render(key, shot, samples=128):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 8
    sc.cycles.transmission_bounces = 6
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.exposure = -1.45
    sc.view_settings.look = 'AgX - Base Contrast'
    if shot == "hero":
        sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    elif shot == "dollhouse":
        sc.render.resolution_x, sc.render.resolution_y = 1400, 1050
    else:
        sc.render.resolution_x, sc.render.resolution_y = 1100, 1100
        sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = os.path.join(OUT, f"{key}-{shot}.png")
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    key = argv[0] if argv else "harbour-king"
    shots = argv[1].split(",") if len(argv) > 1 else ["hero"]
    samples = int(argv[2]) if len(argv) > 2 else 128
    if shots == ["all"]:
        shots = ["hero", "dollhouse"]

    for shot in shots:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        MATS.clear()
        palette()
        r = build_room(key, ceiling=(shot != "dollhouse"))
        if shot != "plan":
            build_world()
        build_lights(r, key)
        add_camera(r, shot)
        import time
        t = time.time()
        render(key, shot, samples)
        print(f"RENDERED {key} {shot} in {time.time()-t:.0f}s")


main()
