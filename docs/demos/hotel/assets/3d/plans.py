# -*- coding: utf-8 -*-
"""Floor plans, drawn from the same spec.py the Blender model is built from.

Written as standalone SVG so Inkscape can check and normalise them. Only the
five XML built-in entities are used, and every colour is a hex fill, because
CSS colour syntax in a presentation attribute is not portable SVG.
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import spec

OUT = os.path.abspath(os.path.join(HERE, "..", "img", "plans"))
os.makedirs(OUT, exist_ok=True)

S = 100.0          # svg units per metre
WALL = 14          # wall thickness in svg units

INK      = "#1d2b25"
WALLC    = "#2c3d35"
FLOOR    = "#f7f4ee"
BATHTINT = "#e7eeea"
TERRACE  = "#ece5d8"
FURN     = "#cfd8d2"
FURNLINE = "#7d918a"
BEDC     = "#b9c7bf"
SOFTC    = "#dfe6e1"
GLASS    = "#6fa2b8"
COPPER   = "#a86136"
TEXT     = "#44554d"

LABEL = {
    "bed_king": "King bed", "bed_queen": "Queen", "bed_single": "Single",
    "nightstand": "", "desk": "Desk", "chair": "", "armchair": "Chair",
    "sofa2": "Sofa", "sofa3": "Sofa", "coffee_table": "", "tv_unit": "TV",
    "wardrobe": "Wardrobe", "bench": "Bench", "dining6": "Dining",
    "dining_chair": "", "sideboard": "", "console": "", "piano": "Piano",
    "bar": "Bar", "daybed": "Daybed", "lounger": "", "firepit": "Fire",
    "planter": "", "plant": "",
}
SOFT = {"plant", "planter", "rug"}


def footprint(item):
    kind, x, y, rot = item[0], item[1], item[2], item[3]
    if kind == "rug":
        w, d = item[4], item[5]
    else:
        w, d = spec.FURNITURE[kind]
    if rot % 180 == 90:
        w, d = d, w
    return kind, x - w / 2, y - d / 2, w, d


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def plan_svg(key):
    r = spec.ROOMS[key]
    w, d = r["w"], r["d"]
    terr = r["terrace"]
    td = terr["depth"] if terr else 0.0

    pad = 58
    total_d = d + td
    vbw = w * S + pad * 2
    vbh = total_d * S + pad * 2
    fs = max(15.0, vbw / 42.0)          # keeps label size steady across sizes
    ox, oy = pad, pad

    def X(mx):  return ox + mx * S
    # y is flipped so the window wall is at the top of the drawing, which is
    # how the renders are framed
    def Y(my):  return oy + (total_d - my) * S

    o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.0f %.0f" '
         'role="img" aria-label="%s">' % (vbw, vbh, esc(plan_alt(r)))]

    if terr:
        o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'
                 % (X(0), Y(d + td), w * S, td * S, TERRACE))
        for i in range(int(w * 4)):
            xx = X(0) + i * (w * S) / int(w * 4)
            o.append('<path d="M%.1f %.1f V%.1f" stroke="#dcd2c0" stroke-width="1.2"/>'
                     % (xx, Y(d + td), Y(d)))

    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'
             % (X(0), Y(d), w * S, d * S, FLOOR))

    bx0, by0, bx1, by1 = r["bath"]
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>'
             % (X(bx0), Y(by1), (bx1 - bx0) * S, (by1 - by0) * S, BATHTINT))

    # walls: solid on three sides, glazing drawn as a doubled line
    glazed = {"observatory-penthouse": ("far", "left", "right"),
              "corner-deluxe": ("far", "right")}.get(key, ("far",))

    def wall(x0, y0, x1, y1):
        o.append('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="%d" '
                 'stroke-linecap="square"/>' % (X(x0), Y(y0), X(x1), Y(y1), WALLC, WALL))

    def glazing(x0, y0, x1, y1):
        o.append('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="%d" '
                 'stroke-linecap="square"/>' % (X(x0), Y(y0), X(x1), Y(y1), "#c8d2cc", WALL))
        o.append('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="4"/>'
                 % (X(x0), Y(y0), X(x1), Y(y1), GLASS))

    (glazing if "far" in glazed else wall)(0, d, w, d)
    (glazing if "left" in glazed else wall)(0, 0, 0, d)
    (glazing if "right" in glazed else wall)(w, 0, w, d)

    # entrance wall, with the door opening
    door_w = 0.95
    bath_left = bx0 < 0.05
    # Put the door in the widest clear run of the entrance wall, so it never
    # opens into the wardrobe or the bed.
    blocked = [(bx0, bx1)] if by0 < 0.05 else []
    for it in r["items"]:
        k, ix0, iy0, iw_, id_ = footprint(it)
        if k != "rug" and iy0 < 0.75:
            blocked.append((ix0 - 0.15, ix0 + iw_ + 0.15))
    blocked.sort()
    spans, cursor = [], 0.0
    for a, b in blocked:
        if a > cursor:
            spans.append((cursor, min(a, w)))
        cursor = max(cursor, b)
    if cursor < w:
        spans.append((cursor, w))
    spans = [sp for sp in spans if sp[1] - sp[0] >= door_w + 0.2] or [(0.15, w - 0.15)]
    best = max(spans, key=lambda sp: sp[1] - sp[0])
    dx = (best[0] + best[1]) / 2
    dx = min(max(dx, door_w / 2 + 0.15), w - door_w / 2 - 0.15)
    wall(0, 0, max(0, dx - door_w / 2), 0)
    wall(min(w, dx + door_w / 2), 0, w, 0)
    hx, hy = X(dx - door_w / 2), Y(0)
    o.append('<path d="M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f" fill="none" '
             'stroke="%s" stroke-width="2.4" stroke-dasharray="8 6"/>'
             % (X(dx + door_w / 2), hy, door_w * S, door_w * S, hx, Y(door_w), COPPER))
    o.append('<path d="M%.1f %.1f V%.1f" stroke="%s" stroke-width="5" stroke-linecap="round"/>'
             % (hx, hy, Y(door_w), COPPER))

    # bathroom partition
    if bath_left:
        wall(bx1, by0, bx1, by1)
    else:
        wall(bx0, by0, bx0, by1)
    o.append('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="5"/>'
             % (X(bx0), Y(by1), X(bx1), Y(by1), GLASS))

    # bathroom fixtures, matching build_bathroom
    bw, bd = bx1 - bx0, by1 - by0
    inner = 0.28
    vx = bx0 + inner if bath_left else bx1 - inner
    fx = lambda cx, cy, fw, fd, fill=FURN: o.append(
        '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="4" fill="%s" '
        'stroke="%s" stroke-width="1.6"/>'
        % (X(cx - fw / 2), Y(cy + fd / 2), fw * S, fd * S, fill, FURNLINE))
    fx(vx, by0 + bd * 0.32, 0.52, min(1.5, bd * 0.55))
    sx = bx1 - 0.55 if bath_left else bx0 + 0.55
    fx(sx, by1 - 0.62, 1.00, 1.00, SOFTC)
    fx(bx1 - 0.30 if bath_left else bx0 + 0.30, by0 + 0.42, 0.38, 0.62)
    if bw * bd > 6.0:
        fx((bx0 + bx1) / 2, by0 + bd * 0.72, 1.72, 0.80, SOFTC)

    # furniture. Rugs underlay everything, and all labels go on last, so a
    # later rectangle can never paint over an earlier one's name.
    labels = []

    def put_label(cx, cy, text, iw, idp):
        if not text or iw * S < len(text) * fs * 0.62 or idp * S < fs * 1.7:
            return
        labels.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Figtree, '
                      'sans-serif" font-size="%.1f" font-weight="600" fill="%s">%s</text>'
                      % (cx, cy + fs * 0.35, fs, TEXT, esc(text)))

    for item in r["items"]:
        if item[0] != "rug":
            continue
        kind, x0, y0, iw, idp = footprint(item)
        o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#eeeae1" '
                 'stroke="#ddd6c9" stroke-width="1.5" stroke-dasharray="6 5"/>'
                 % (X(x0), Y(y0 + idp), iw * S, idp * S))

    for item in r["items"]:
        if item[0] == "rug":
            continue
        kind, x0, y0, iw, idp = footprint(item)
        fill = BEDC if kind.startswith("bed_") else (SOFTC if kind in SOFT else FURN)
        o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="4" fill="%s" '
                 'stroke="%s" stroke-width="1.8"/>'
                 % (X(x0), Y(y0 + idp), iw * S, idp * S, fill, FURNLINE))
        put_label(X(x0 + iw / 2), Y(y0 + idp / 2), LABEL.get(kind, ""), iw, idp)

    if terr:
        for item in terr["items"]:
            kind, x0, y0, iw, idp = footprint(item)
            o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="4" fill="%s" '
                     'stroke="%s" stroke-width="1.8"/>'
                     % (X(x0), Y(d + y0 + idp), iw * S, idp * S, SOFTC, "#b9ae98"))
            put_label(X(x0 + iw / 2), Y(d + y0 + idp / 2), LABEL.get(kind, ""), iw, idp)
        labels.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Figtree, '
                      'sans-serif" font-size="%.1f" font-weight="700" fill="#8a7a5c" '
                      'letter-spacing="2">TERRACE</text>'
                      % (X(w / 2), Y(d + td * 0.5) + fs * 0.35, fs * 1.05))

    lw, lh = fs * 6.4, fs * 1.7
    lcx, lcy = X((bx0 + bx1) / 2), Y(by1 - 0.30)
    labels.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="#ffffff" '
                  'fill-opacity="0.88"/>' % (lcx - lw / 2, lcy - lh / 2, lw, lh, lh / 2))
    labels.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Figtree, sans-serif" '
                  'font-size="%.1f" font-weight="700" fill="%s" letter-spacing="2">BATHROOM</text>'
                  % (lcx, lcy + fs * 0.32, fs * 0.86, "#6d8279"))
    o.extend(labels)

    # dimensions
    o.append('<path d="M%.1f %.1f H%.1f M%.1f %.1f v14 M%.1f %.1f v14" stroke="%s" '
             'stroke-width="2"/>' % (X(0), oy - 26, X(w), X(0), oy - 33, X(w), oy - 33, TEXT))
    o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#ffffff"/>'
             % (X(w / 2) - fs * 2.0, oy - 26 - fs * 0.8, fs * 4.0, fs * 1.6))
    o.append('<text x="%.1f" y="%.1f" text-anchor="middle" font-family="Figtree, sans-serif" '
             'font-size="%.1f" font-weight="700" fill="%s">%s m</text>'
             % (X(w / 2), oy - 26 + fs * 0.35, fs, TEXT, fmt(w)))
    o.append('<path d="M%.1f %.1f V%.1f M%.1f %.1f h14 M%.1f %.1f h14" stroke="%s" '
             'stroke-width="2"/>' % (ox - 26, Y(0), Y(d), ox - 33, Y(0), ox - 33, Y(d), TEXT))
    o.append('<g transform="translate(%.1f %.1f) rotate(-90)">'
             '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#ffffff"/>'
             '<text x="0" y="%.1f" text-anchor="middle" font-family="Figtree, sans-serif" '
             'font-size="%.1f" font-weight="700" fill="%s">%s m</text></g>'
             % (ox - 26, Y(d / 2), -fs * 2.0, -fs * 0.8, fs * 4.0, fs * 1.6, fs * 0.35, fs, TEXT, fmt(d)))

    o.append("</svg>")
    return "\n".join(o)


def fmt(v):
    return ("%.1f" % v).rstrip("0").rstrip(".")


def plan_alt(r):
    return ("Floor plan of the %s: %s metres by %s metres, %d square metres, with the "
            "bathroom by the entrance and full-height glazing along the far wall."
            % (r["name"], fmt(r["w"]), fmt(r["d"]), r["sqm"]))


if __name__ == "__main__":
    for key in spec.ORDER:
        p = os.path.join(OUT, key + ".svg")
        with open(p, "w") as f:
            f.write(plan_svg(key))
        print("wrote", os.path.basename(p), os.path.getsize(p), "bytes")
