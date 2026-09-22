# -*- coding: utf-8 -*-
"""Catch furniture inside walls, inside the bathroom, or inside each other,
before spending render time finding out."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spec

SOFT = {"rug", "plant", "planter"}   # may sit under or beside things


def rect(item, room):
    kind, x, y, rot = item[0], item[1], item[2], item[3]
    if kind == "rug":
        w, d = item[4], item[5]
    else:
        w, d = spec.FURNITURE[kind]
    if rot % 180 == 90:
        w, d = d, w
    return kind, (x - w / 2, y - d / 2, x + w / 2, y + d / 2)


def overlap(a, b, tol=0.02):
    return (a[0] < b[2] - tol and b[0] < a[2] - tol and
            a[1] < b[3] - tol and b[1] < a[3] - tol)


bad = 0
for key in spec.ORDER:
    r = spec.ROOMS[key]
    rects = [rect(i, r) for i in r["items"]]
    issues = []
    for kind, bb in rects:
        if bb[0] < -0.02 or bb[1] < -0.02 or bb[2] > r["w"] + 0.02 or bb[3] > r["d"] + 0.02:
            issues.append(f"{kind} outside room: {tuple(round(v,2) for v in bb)}")
    bx0, by0, bx1, by1 = r["bath"]
    for kind, bb in rects:
        if kind in SOFT:
            continue
        if overlap(bb, (bx0, by0, bx1, by1), tol=0.05):
            issues.append(f"{kind} inside the bathroom block {tuple(round(v,2) for v in bb)}")
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            (k1, b1), (k2, b2) = rects[i], rects[j]
            if k1 in SOFT or k2 in SOFT:
                continue
            if overlap(b1, b2):
                issues.append(f"{k1} overlaps {k2}")
    if r["terrace"]:
        for it in r["terrace"]["items"]:
            k, bb = rect(it, r)
            if bb[0] < -0.02 or bb[2] > r["w"] + 0.02 or bb[1] < -0.02 or bb[3] > r["terrace"]["depth"] + 0.02:
                issues.append(f"terrace {k} outside terrace {tuple(round(v,2) for v in bb)}")
    ti = r["terrace"]["items"] if r["terrace"] else []
    trects = [rect(i, r) for i in ti]
    for i in range(len(trects)):
        for j in range(i + 1, len(trects)):
            (k1, b1), (k2, b2) = trects[i], trects[j]
            if k1 in SOFT or k2 in SOFT:
                continue
            if overlap(b1, b2):
                issues.append(f"terrace {k1} overlaps {k2}")

    print(f"{key:24s} {'OK' if not issues else str(len(issues)) + ' ISSUES'}")
    for m in issues:
        print("    -", m)
    bad += len(issues)
print("\ntotal issues:", bad)
