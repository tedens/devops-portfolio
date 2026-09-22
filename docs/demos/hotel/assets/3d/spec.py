# -*- coding: utf-8 -*-
"""THE LUMEN: room geometry, in metres.

One source of truth for both the Blender model and the SVG floor plan, so a
plan can never disagree with the render it sits next to.

Room coordinates: (0,0) is the inside corner by the entrance on the left.
x runs across the room's width, y runs from the entrance wall (y=0, removed
for the camera) to the window wall (y=depth). Items are placed by the centre
of their footprint; rot is degrees anticlockwise about Z.
"""

# name: (width_x, depth_y) footprint in metres at rot 0
FURNITURE = {
    "bed_king":     (1.95, 2.15),
    "bed_queen":    (1.62, 2.05),
    "bed_single":   (1.00, 2.00),
    "nightstand":   (0.48, 0.42),
    "desk":         (1.30, 0.58),
    "chair":        (0.50, 0.52),
    "armchair":     (0.84, 0.82),
    "sofa2":        (1.75, 0.88),
    "sofa3":        (2.35, 0.92),
    "coffee_table": (1.05, 0.58),
    "tv_unit":      (1.70, 0.42),
    "wardrobe":     (1.25, 0.62),
    "bench":        (1.10, 0.44),
    "dining6":      (1.90, 0.98),
    "dining_chair": (0.48, 0.50),
    "sideboard":    (1.60, 0.45),
    "piano":        (1.48, 1.42),
    "bar":          (1.85, 0.58),
    "daybed":       (2.05, 0.95),
    "lounger":      (0.72, 1.95),
    "firepit":      (0.95, 0.95),
    "planter":      (0.55, 0.55),
    "plant":        (0.50, 0.50),
    "rug":          (1.00, 1.00),   # scaled per placement
    "console":      (1.20, 0.38),
    "stair":        (1.20, 3.00),
}

# Fixtures the bathroom builder places itself
BATH_FIXTURES = ("vanity", "wc", "shower", "tub")


def R(name, short, w, d, ceiling, sqm, beds, max_adults, max_children,
      count, rate, view, bath, items, terrace=None, blurb="", highlights=()):
    return dict(name=name, short=short, w=w, d=d, ceiling=ceiling, sqm=sqm,
                beds=beds, max_adults=max_adults, max_children=max_children,
                count=count, rate=rate, view=view, bath=bath, items=items,
                terrace=terrace, blurb=blurb, highlights=list(highlights))


ROOMS = {}

# ---------------------------------------------------------------- Harbour King
ROOMS["harbour-king"] = R(
    "Harbour King", "King", 4.2, 6.0, 2.9, 25, "1 king", 2, 1, 48, 28900,
    "Harbour, from the sixth floor up",
    (2.30, 0.0, 4.20, 2.30),
    [
        ("bed_king",   1.10, 3.75,  90),
        ("nightstand", 0.30, 2.40,   0),
        ("nightstand", 0.30, 5.10,   0),
        ("tv_unit",    3.95, 3.75, 270),
        ("desk",       3.45, 5.55,   0),
        ("chair",      3.45, 4.95,   0),
        ("armchair",   1.15, 5.45,   0),
        ("wardrobe",   0.36, 0.95,  90),
        ("bench",      1.55, 1.55,   0),
        ("plant",      3.80, 5.62,   0),
        ("rug",        2.05, 3.75,   0, 2.70, 2.60),
    ],
    blurb="The room the hotel is built around. A king bed against a panelled "
          "wall, a proper desk at the window, and the harbour from the sixth "
          "floor up.",
    highlights=("Harbour or quarter view", "Rainfall shower", "Nespresso and a kettle",
                "Blackout blinds", "Desk with two sockets and USB-C"),
)

# ------------------------------------------------------------- Quarter Twin
ROOMS["quarter-twin"] = R(
    "Quarter Twin", "Twin", 4.6, 6.2, 2.9, 28, "2 queens", 4, 2, 36, 31900,
    "Over the Quarter rooftops",
    (2.70, 0.0, 4.60, 2.30),
    [
        ("bed_queen",  1.08, 3.05,  90),
        ("bed_queen",  1.08, 5.20,  90),
        ("nightstand", 0.32, 4.12,   0),
        ("tv_unit",    4.35, 4.20, 270),
        ("desk",       3.70, 5.85,   0),
        ("chair",      3.70, 5.25,   0),
        ("wardrobe",   0.38, 0.95,  90),
        ("bench",      1.60, 1.50,   0),
        ("plant",      4.20, 5.85,   0),
        ("rug",        2.60, 4.30,   0, 2.20, 3.60),
    ],
    blurb="Two queens rather than two doubles, which is the difference between "
          "a family fitting and a family managing. Same desk, same shower, "
          "more floor.",
    highlights=("Two queen beds", "Sleeps four adults", "Rooftop view",
                "Rainfall shower", "Second washbasin"),
)

# ------------------------------------------------------------ Corner Deluxe
ROOMS["corner-deluxe"] = R(
    "Corner Deluxe King", "Deluxe", 5.4, 6.6, 3.0, 36, "1 king + daybed", 3, 2, 22, 38900,
    "Two aspects: harbour and the old quarter",
    (3.40, 0.0, 5.40, 2.40),
    [
        ("bed_king",   1.15, 3.95,  90),
        ("nightstand", 0.32, 2.55,   0),
        ("nightstand", 0.32, 5.35,   0),
        ("tv_unit",    5.15, 3.95, 270),
        ("sofa2",      3.90, 5.90,   0),
        ("coffee_table", 3.90, 5.10,  0),
        ("armchair",   2.55, 5.55,  90),
        ("desk",       4.55, 3.10,  90),
        ("chair",      3.95, 3.10,  90),
        ("wardrobe",   0.40, 1.00,  90),
        ("bench",      1.70, 1.60,   0),
        ("plant",      5.05, 6.15,   0),
        ("rug",        2.20, 4.00,   0, 3.20, 3.00),
    ],
    blurb="A corner room, so two walls of glass: the harbour on one side and "
          "the old quarter on the other. The extra six square metres go into "
          "a sitting area you will actually use.",
    highlights=("Corner room, two aspects", "Separate sitting area", "Freestanding bath",
                "Walk-in shower", "Nespresso, kettle and a stocked minibar"),
)

# ------------------------------------------------------------- Junior Suite
ROOMS["junior-suite"] = R(
    "Junior Suite", "Suite", 5.8, 8.0, 3.0, 46, "1 king + sofa bed", 3, 2, 14, 48900,
    "Harbour, wide aspect",
    (3.70, 0.0, 5.80, 2.60),
    [
        ("bed_king",   1.20, 3.30,  90),
        ("nightstand", 0.34, 1.95,   0),
        ("nightstand", 0.34, 4.70,   0),
        ("tv_unit",    5.55, 3.65, 270),
        ("sofa3",      1.60, 6.55,   0),
        ("coffee_table", 1.60, 5.70,  0),
        ("armchair",   3.30, 6.30,  90),
        ("desk",       5.05, 6.60,  90),
        ("chair",      4.45, 6.60,  90),
        ("sideboard",  4.20, 7.75,   0),
        ("wardrobe",   0.42, 1.05,  90),
        ("bench",      1.80, 1.70,   0),
        ("plant",      5.45, 7.70,   0),
        ("rug",        1.90, 6.20,   0, 3.00, 2.40),
    ],
    blurb="A bedroom and a living room that happen to share a floor, divided "
          "by a low walnut screen rather than a door. Sofa converts, so it "
          "sleeps three without anyone drawing the short straw.",
    highlights=("Living area with a full sofa bed", "Freestanding bath and walk-in shower",
                "Dining-height desk", "Complimentary pressing of two garments",
                "Late checkout to 2pm, subject to availability"),
)

# ----------------------------------------------------- Observatory Penthouse
ROOMS["observatory-penthouse"] = R(
    "Observatory Penthouse", "Penthouse", 11.0, 8.6, 3.6, 95, "1 king + 1 queen", 4, 2, 2, 125000,
    "180 degrees, harbour to headland",
    (0.0, 0.0, 2.60, 3.40),
    [
        ("bed_king",   4.15, 2.10,   0),
        ("nightstand", 2.95, 1.35,   0),
        ("nightstand", 5.35, 1.35,   0),
        ("bed_queen",  9.70, 2.05,  90),
        ("nightstand", 9.85, 3.45,   0),
        ("tv_unit",    4.15, 4.70, 180),
        ("sofa3",      3.20, 6.95,   0),
        ("armchair",   5.30, 6.70,  90),
        ("armchair",   1.35, 6.70, 270),
        ("coffee_table", 3.20, 6.00,  0),
        ("piano",      9.20, 7.20,   0),
        ("dining6",    7.00, 4.90,  90),
        ("dining_chair", 6.05, 4.10, 90),
        ("dining_chair", 6.05, 5.70, 90),
        ("dining_chair", 7.95, 4.10, 270),
        ("dining_chair", 7.95, 5.70, 270),
        ("bar",        10.55, 5.10,  90),
        ("plant",      10.55, 7.95,   0),
        ("plant",      0.45, 7.95,   0),
        ("rug",        3.20, 6.40,   0, 4.20, 3.20),
        ("rug",        4.15, 2.30,   0, 3.60, 3.40),
    ],
    blurb="The whole northern end of the eighteenth floor. Two bedrooms' worth "
          "of sleeping, a grand piano nobody expects, and glass on three sides. "
          "You can watch the harbour and the headland without standing up.",
    highlights=("Entire north end of the 18th floor", "Glass on three sides",
                "Grand piano and a stocked bar", "Dining for six",
                "Airport transfer and daily breakfast included",
                "Butler on call 7am–11pm"),
)

# -------------------------------------------------------- Terrace Penthouse
ROOMS["terrace-penthouse"] = R(
    "Terrace Penthouse", "Penthouse", 9.4, 8.0, 3.6, 75, "1 king + sofa bed", 4, 2, 1, 158000,
    "South terrace over the old quarter",
    (0.0, 0.0, 2.40, 3.20),
    [
        ("bed_king",   3.85, 1.95,   0),
        ("nightstand", 2.65, 1.25,   0),
        ("nightstand", 5.05, 1.25,   0),
        ("tv_unit",    3.85, 4.30, 180),
        ("sofa3",      3.00, 6.35,   0),
        ("armchair",   5.10, 6.10,  90),
        ("coffee_table", 3.00, 5.45,  0),
        ("dining6",    7.65, 5.75,  90),
        ("dining_chair", 6.70, 4.95, 90),
        ("dining_chair", 6.70, 6.55, 90),
        ("dining_chair", 8.60, 4.95, 270),
        ("dining_chair", 8.60, 6.55, 270),
        ("bar",        8.95, 2.60,  90),
        ("console",    0.45, 5.40,  90),
        ("plant",      0.50, 7.55,   0),
        ("rug",        3.00, 5.90,   0, 3.80, 3.00),
        ("rug",        3.85, 2.15,   0, 3.40, 3.20),
    ],
    terrace=dict(depth=4.6, items=[
        ("daybed",  2.10, 1.35,   0),
        ("lounger", 5.20, 1.60,   0),
        ("lounger", 6.20, 1.60,   0),
        ("firepit", 3.90, 3.30,   0),
        ("dining6", 7.90, 3.10,   0),
        ("planter", 0.45, 3.90,   0),
        ("planter", 1.45, 3.90,   0),
        ("planter", 8.95, 0.60,   0),
        ("planter", 8.95, 1.70,   0),
    ]),
    blurb="One of a kind, and the only room in the building with its own sky. "
          "Forty-three square metres of south-facing terrace with a fire pit and a "
          "table for eight, wrapped around a suite that would be generous "
          "without it.",
    highlights=("The only terrace suite in the building", "40 m² private terrace",
                "Fire pit and outdoor dining for eight", "Freestanding bath facing the glass",
                "Airport transfer and daily breakfast included",
                "Butler on call 7am–11pm"),
)

ORDER = ["harbour-king", "quarter-twin", "corner-deluxe", "junior-suite",
         "observatory-penthouse", "terrace-penthouse"]
