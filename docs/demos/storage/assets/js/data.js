/* GANTRY SELF STORAGE: the facility, in data.
   Everything the site knows lives here: the size ladder, the unit types the
   building actually contains, the reference objects the measuring tool packs,
   and the pricing rules. No images, no backend. */

window.ST = window.ST || {};

(function () {
  "use strict";

  /* ---- Primitives -------------------------------------------------------- */

  /* FNV-1a. Availability has to look plausible and stay put while someone
     clicks around, so it is derived from a hash of the inputs rather than
     Math.random(), which reshuffles on every render and reads as broken. */
  ST.hash = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  };

  ST.money = function (cents) {
    var neg = cents < 0;
    var v = Math.abs(Math.round(cents));
    var s = (v % 100 === 0)
      ? String(v / 100)
      : (v / 100).toFixed(2);
    s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "−$" : "$") + s;
  };

  ST.parseIso = function (iso) {
    var p = String(iso).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  };
  ST.toIso = function (d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  };
  ST.addDays = function (d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  };
  ST.daysInMonth = function (y, m) { return new Date(y, m + 1, 0).getDate(); };
  ST.today = function () { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  ST.stamp = function () { return ST.toIso(ST.today()); };

  ST.fmtDate = function (iso, opts) {
    return ST.parseIso(iso).toLocaleDateString("en-US",
      opts || { weekday: "short", month: "short", day: "numeric" });
  };
  ST.fmtMonth = function (iso) {
    return ST.parseIso(iso).toLocaleDateString("en-US", { month: "long" });
  };

  /* localStorage, wrapped so a private window or blocked storage can never
     throw its way into a render. */
  ST.store = {
    get: function (k, fallback) {
      try {
        var raw = window.localStorage.getItem("gantry:" + k);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem("gantry:" + k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    }
  };

  /* ---- The size ladder ---------------------------------------------------
     Rates are the base monthly for an indoor, ground-floor, non-climate unit.
     Everything else is a multiplier, so a price can never drift between the
     size guide, the listing and the reservation. */

  ST.SIZES = [
    { id: "5x5",   w: 5,  d: 5,  base: 4500,  name: "5 × 5",  nick: "Locker",
      like: "A large closet",
      blurb: "Seasonal boxes, files, a bike, sports kit. The smallest thing we rent." },
    { id: "5x10",  w: 5,  d: 10, base: 7200,  name: "5 × 10", nick: "Studio",
      like: "A garden shed",
      blurb: "A studio flat's worth, or the contents of one room plus boxes." },
    { id: "5x15",  w: 5,  d: 15, base: 9600,  name: "5 × 15", nick: "One-bed",
      like: "A long single garage bay",
      blurb: "A one-bedroom flat, or a room of furniture with space to reach the back." },
    { id: "10x10", w: 10, d: 10, base: 12800, name: "10 × 10", nick: "Two-bed",
      like: "Half a single garage",
      blurb: "The most-rented size here. A two-bedroom flat, or a full house move minus the big furniture." },
    { id: "10x15", w: 10, d: 15, base: 17600, name: "10 × 15", nick: "Three-bed",
      like: "A single garage",
      blurb: "A three-bedroom house, appliances included, with a walkway down the middle." },
    { id: "10x20", w: 10, d: 20, base: 22400, name: "10 × 20", nick: "Four-bed / car",
      like: "A long single garage",
      blurb: "A four-bedroom house, or a car stored dry with boxes stacked around it." },
    { id: "10x30", w: 10, d: 30, base: 31000, name: "10 × 30", nick: "Business",
      like: "A double garage",
      blurb: "Trade stock, a shop fit-out, a van plus racking. Our largest." }
  ];

  ST.sizeById = function (id) {
    for (var i = 0; i < ST.SIZES.length; i++) if (ST.SIZES[i].id === id) return ST.SIZES[i];
    return null;
  };
  ST.sqft = function (size) { return size.w * size.d; };

  /* The opening, not the room. A 5 ft wide unit has a 3 ft swing door, and
     nothing wider than that gets in however much floor is going spare. */
  ST.doorWidthFor = function (size) { return size.w >= 10 ? 8 : 3; };

  /* ---- Access types ------------------------------------------------------ */

  ST.ACCESS = {
    ground:   { name: "Indoor, ground floor", short: "Ground floor", mult: 1.00,
                blurb: "Trolley straight from the loading bay, no lift, no steps." },
    upper:    { name: "Indoor, upper floor",  short: "Upper floor",  mult: 0.88,
                blurb: "Goods lift from the bay. Cheaper because it is one more stage to carry." },
    driveup:  { name: "Drive-up",             short: "Drive-up",     mult: 1.10,
                blurb: "Park at the roller door and unload straight in. No corridors at all." }
  };

  ST.CLIMATE_MULT = 1.22;

  /* Door width decides what can physically get in, which is not the same
     question as whether it fits once it is inside. */
  function doorFor(size, access) {
    if (access === "driveup") return { type: "Roller", w: 8, h: 8 };
    if (size.w >= 10)         return { type: "Roller", w: 8, h: 7 };
    return { type: "Swing", w: 3, h: 6.8 };
  }

  /* ---- The building ------------------------------------------------------
     Unit types, not individual units: a renter picks a type and we allocate a
     unit from it. `total` is how many the building has; `slack` is roughly the
     share that turns over, which sets how many tend to be free. */

  var TYPE_DEFS = [
    ["5x5",   "ground",  true,  40, 0.16],
    ["5x5",   "upper",   true,  56, 0.22],
    ["5x10",  "ground",  true,  48, 0.11],
    ["5x10",  "upper",   true,  60, 0.20],
    ["5x10",  "ground",  false, 24, 0.17],
    ["5x15",  "upper",   true,  28, 0.21],
    ["5x15",  "ground",  false, 16, 0.14],
    ["10x10", "ground",  true,  44, 0.09],
    ["10x10", "upper",   true,  38, 0.18],
    ["10x10", "driveup", false, 30, 0.13],
    ["10x15", "ground",  true,  26, 0.12],
    ["10x15", "driveup", false, 22, 0.19],
    ["10x20", "ground",  true,  14, 0.15],
    ["10x20", "driveup", false, 20, 0.24],
    ["10x30", "driveup", false, 10, 0.28]
  ];

  ST.TYPES = TYPE_DEFS.map(function (def) {
    var size = ST.sizeById(def[0]);
    var access = def[1], climate = def[2];
    var mult = ST.ACCESS[access].mult * (climate ? ST.CLIMATE_MULT : 1);
    /* Round to the nearest dollar so no price ever shows stray cents. */
    var rate = Math.round(size.base * mult / 100) * 100;
    return {
      id: size.id + "-" + access + (climate ? "-c" : ""),
      sizeId: size.id,
      size: size,
      access: access,
      climate: climate,
      ceiling: access === "driveup" ? 9 : 8,
      door: doorFor(size, access),
      total: def[3],
      slack: def[4],
      rate: rate,
      name: size.name + " " + (climate ? "climate-controlled" : "standard") +
            ", " + ST.ACCESS[access].short.toLowerCase()
    };
  });

  ST.typeById = function (id) {
    for (var i = 0; i < ST.TYPES.length; i++) if (ST.TYPES[i].id === id) return ST.TYPES[i];
    return null;
  };
  /* Where it physically is, matching the site plan on the facility page. */
  ST.buildingFor = function (type) {
    if (type.access === "driveup") {
      return (type.size.w >= 10 && type.size.d >= 20) ? "Row D, drive-up" : "Row C, drive-up";
    }
    if (type.access === "upper") return "Building A, upper floor";
    if (!type.climate) return "Building B, end bay";
    return type.size.w >= 10 ? "Building A, ground floor" : "Building B, ground floor";
  };

  ST.typesForSize = function (sizeId) {
    return ST.TYPES.filter(function (t) { return t.sizeId === sizeId; });
  };

  /* ---- Inventory ---------------------------------------------------------
     Seeded on the type and today's date, so the count is stable for a whole
     day of clicking but the facility is not frozen forever. A reservation made
     in this browser is subtracted, because a listing that ignores what you
     just did looks broken. */

  ST.held = function () { return ST.store.get("held", {}) || {}; };

  ST.hold = function (typeId) {
    var h = ST.held();
    h[typeId] = (h[typeId] || 0) + 1;
    ST.store.set("held", h);
  };

  ST.remaining = function (type) {
    var cap = Math.max(1, Math.round(type.total * type.slack));
    var h = ST.hash("inv|" + type.id + "|" + ST.stamp());
    var free = h % (cap + 1);
    free -= (ST.held()[type.id] || 0);
    return Math.max(0, free);
  };

  ST.availClass = function (n) { return n === 0 ? "none" : (n <= 2 ? "low" : ""); };
  ST.availLabel = function (n) {
    if (n === 0) return "None left";
    if (n === 1) return "1 left";
    if (n <= 2) return n + " left";
    return n + " available";
  };

  /* The whole-facility figure on the homepage, and the count behind each
     size chip on the listing. */
  ST.countFree = function (filterFn) {
    return ST.TYPES.reduce(function (n, t) {
      return n + (filterFn && !filterFn(t) ? 0 : ST.remaining(t));
    }, 0);
  };

  /* ---- Pricing -----------------------------------------------------------
     Longer terms buy a lower rate, not a prepayment. Nothing here asks for
     money up front beyond the first (part) month, because that is how the
     honest version of this business works and it keeps the "today" figure
     small enough to be believable. */

  ST.TERMS = [
    { id: "monthly", name: "Month to month", months: 1,  discount: 0,
      note: "Leave whenever you like, with 10 days' notice." },
    { id: "six",     name: "6 months",       months: 6,  discount: 0.08,
      note: "Still billed monthly. The rate is locked for six months." },
    { id: "year",    name: "12 months",      months: 12, discount: 0.15,
      note: "Still billed monthly. The rate is locked for a year." }
  ];
  ST.termById = function (id) {
    for (var i = 0; i < ST.TERMS.length; i++) if (ST.TERMS[i].id === id) return ST.TERMS[i];
    return ST.TERMS[0];
  };

  ST.PROTECTION = [
    { id: "own", name: "My own policy",  cover: 0,     monthly: 0,
      note: "Bring proof of homeowner's or renter's cover on move-in day." },
    { id: "p2",  name: "$2,000 cover",   cover: 2000,  monthly: 1100, note: "Boxes, clothes, garden kit." },
    { id: "p5",  name: "$5,000 cover",   cover: 5000,  monthly: 1900, note: "A flat's worth of furniture." },
    { id: "p10", name: "$10,000 cover",  cover: 10000, monthly: 2900, note: "A house move, or business stock." }
  ];
  ST.protectionById = function (id) {
    for (var i = 0; i < ST.PROTECTION.length; i++) if (ST.PROTECTION[i].id === id) return ST.PROTECTION[i];
    return ST.PROTECTION[2];
  };

  ST.FEES = { admin: 2400, lock: 1600 };

  ST.rentFor = function (type, termId) {
    var term = ST.termById(termId);
    return Math.round(type.rate * (1 - term.discount) / 100) * 100;
  };

  /* First month is charged from the move-in day to the end of that month.
     Move in on the 22nd of a 30-day month and you pay 9/30ths, not a month. */
  ST.prorate = function (monthlyCents, dateIso) {
    var d = ST.parseIso(dateIso);
    var days = ST.daysInMonth(d.getFullYear(), d.getMonth());
    var charged = days - d.getDate() + 1;
    return { days: days, charged: charged, cents: Math.round(monthlyCents * charged / days) };
  };

  ST.quote = function (type, termId, dateIso, opts) {
    opts = opts || {};
    var prot = ST.protectionById(opts.protection || "p5");
    var rent = ST.rentFor(type, termId);
    var proRent = ST.prorate(rent, dateIso);
    var proProt = ST.prorate(prot.monthly, dateIso);
    var lock = opts.lock ? ST.FEES.lock : 0;

    var today = proRent.cents + proProt.cents + ST.FEES.admin + lock;
    var monthly = rent + prot.monthly;
    var next = ST.parseIso(dateIso);
    next = new Date(next.getFullYear(), next.getMonth() + 1, 1);

    return {
      rent: rent,
      fullRate: type.rate,
      saved: type.rate - rent,
      protection: prot,
      proRent: proRent,
      proProt: proProt,
      admin: ST.FEES.admin,
      lock: lock,
      today: today,
      monthly: monthly,
      firstFullIso: ST.toIso(next)
    };
  };

  /* ---- Reference objects -------------------------------------------------
     Footprints in feet, as the thing is actually stored: a mattress on its
     edge, a dining table with the legs off. `stack` is how many of that item
     can sit on top of each other before it stops being sensible. */

  ST.GROUPS = [
    { id: "boxes",    name: "Boxes",                colour: "#f0a868", dark: "#c07322" },
    { id: "living",   name: "Living room",          colour: "#7f9df2", dark: "#4763c4" },
    { id: "bedroom",  name: "Bedroom",              colour: "#a48df0", dark: "#6d51c9" },
    { id: "kitchen",  name: "Kitchen & appliances", colour: "#48bfa6", dark: "#1a8a74" },
    { id: "garage",   name: "Garage & garden",      colour: "#e8895a", dark: "#b7562a" },
    { id: "business", name: "Business",             colour: "#8ea4bc", dark: "#5a7189" },
    { id: "vehicle",  name: "Vehicles",             colour: "#e0685f", dark: "#ab3a32" }
  ];
  ST.groupById = function (id) {
    for (var i = 0; i < ST.GROUPS.length; i++) if (ST.GROUPS[i].id === id) return ST.GROUPS[i];
    return ST.GROUPS[0];
  };

  /* `h` is the stored height, `stack` the point at which a pile stops being
     sensible, `top` whether the thing has a rigid flat top you can put boxes
     on, and `fill` marks the boxes and totes that go in the gaps last. */

  ST.ITEMS = [
    { id: "box-s",     g: "boxes",    name: "Small box",             w: 1.5,  d: 1.5, h: 1.5, stack: 5, top: 1, fill: 1, note: "Stacks 5 high" },
    { id: "box-l",     g: "boxes",    name: "Large box",             w: 2,    d: 1.5, h: 1.5, stack: 4, top: 1, fill: 1, note: "Stacks 4 high" },
    { id: "tote",      g: "boxes",    name: "Plastic tote",          w: 2,    d: 1.5, h: 1.25, stack: 6, top: 1, fill: 1, note: "Stacks 6 high" },
    { id: "box-ward",  g: "boxes",    name: "Wardrobe box",          w: 2,    d: 2,   h: 3.5, stack: 2, top: 1, note: "Hanging clothes. Too tall to lift onto anything" },

    { id: "sofa3",     g: "living",   name: "Sofa, 3-seat",          w: 3,    d: 3,   h: 7,   stack: 1, note: "Upended, feet to the wall" },
    { id: "sofa2",     g: "living",   name: "Sofa, 2-seat",          w: 3,    d: 2.5, h: 5.5, stack: 1, note: "Upended, feet to the wall" },
    { id: "armchair",  g: "living",   name: "Armchair",              w: 3,    d: 3,   h: 3,   stack: 2, note: "Stacks 2 high, seat to seat" },
    { id: "coffee",    g: "living",   name: "Coffee table",          w: 4,    d: 2,   h: 1.5, stack: 2, top: 1 },
    { id: "bookcase",  g: "living",   name: "Bookcase",              w: 3,    d: 1.5, h: 6,   stack: 1, top: 1, note: "Upright against a wall" },
    { id: "tv",        g: "living",   name: "TV, boxed",             w: 4.5,  d: 1,   h: 3,   stack: 1, note: "On edge, never flat" },
    { id: "rug",       g: "living",   name: "Rug, rolled",           w: 1.5,  d: 1.5, h: 6,   stack: 1, note: "Standing on end" },

    { id: "mattress-q", g: "bedroom", name: "Mattress, double",      w: 6.5,  d: 1,   h: 4.8, stack: 1, note: "On its edge" },
    { id: "mattress-s", g: "bedroom", name: "Mattress, single",      w: 6.5,  d: 0.8, h: 3.2, stack: 1, note: "On its edge" },
    { id: "bedframe",  g: "bedroom",  name: "Bed frame, apart",      w: 6.5,  d: 1,   h: 0.8, stack: 4, top: 1, note: "Slats and sides bundled flat" },
    { id: "wardrobe",  g: "bedroom",  name: "Wardrobe",              w: 4,    d: 2,   h: 6,   stack: 1, top: 1 },
    { id: "drawers",   g: "bedroom",  name: "Chest of drawers",      w: 3,    d: 1.5, h: 3,   stack: 2, top: 1 },
    { id: "cot",       g: "bedroom",  name: "Cot, dismantled",       w: 4.5,  d: 1,   h: 0.8, stack: 3, top: 1 },

    { id: "fridge",    g: "kitchen",  name: "Fridge-freezer",        w: 2.5,  d: 2.5, h: 5.5, stack: 1, top: 1, note: "Defrosted, door taped ajar" },
    { id: "washer",    g: "kitchen",  name: "Washer or dryer",       w: 2.5,  d: 2.5, h: 3,   stack: 2, top: 1, note: "Drained. Stacks 2 high" },
    { id: "cooker",    g: "kitchen",  name: "Cooker",                w: 2.5,  d: 2.5, h: 3,   stack: 1, top: 1 },
    { id: "dining",    g: "kitchen",  name: "Dining table",          w: 6,    d: 1,   h: 3,   stack: 2, note: "Legs off, on its side" },
    { id: "chair",     g: "kitchen",  name: "Dining chair",          w: 1.5,  d: 1.5, h: 1.6, stack: 4, note: "Stacks 4 high" },

    { id: "bike",      g: "garage",   name: "Bicycle",               w: 5.5,  d: 2,   h: 3.5, stack: 1 },
    { id: "mower",     g: "garage",   name: "Lawn mower",            w: 2.5,  d: 2,   h: 3,   stack: 1, top: 1, note: "Fuel drained" },
    { id: "tools",     g: "garage",   name: "Garden tools, bundled", w: 2,    d: 1,   h: 1,   stack: 3, top: 1 },
    { id: "bbq",       g: "garage",   name: "Barbecue",              w: 4,    d: 2,   h: 3.5, stack: 1, note: "Gas bottle stays at home" },
    { id: "ladder",    g: "garage",   name: "Ladder",                w: 8,    d: 1,   h: 0.4, stack: 6, top: 1, note: "Flat along a wall" },
    { id: "kayak",     g: "garage",   name: "Kayak",                 w: 12,   d: 2.5, h: 1.2, stack: 2 },

    { id: "pallet",    g: "business", name: "Pallet of stock",       w: 4,    d: 3.5, h: 4,   stack: 2, top: 1 },
    { id: "filing",    g: "business", name: "Filing cabinet",        w: 1.5,  d: 2,   h: 4.3, stack: 2, top: 1 },
    { id: "desk",      g: "business", name: "Desk",                  w: 5,    d: 2.5, h: 0.6, stack: 4, top: 1, note: "Legs off, stacked flat" },
    { id: "rack",      g: "business", name: "Shelving bay, flat",    w: 6,    d: 1,   h: 0.4, stack: 6, top: 1 },

    { id: "moto",      g: "vehicle",  name: "Motorcycle",            w: 7,    d: 3,   h: 4,   stack: 1, driveup: 1, clear: 1.5, note: "Plus room to get round it" },
    { id: "car",       g: "vehicle",  name: "Car, compact",          w: 15,   d: 6,   h: 4.8, stack: 1, driveup: 1, clear: 1.5, note: "Plus 18 in all round to open a door" },
    { id: "car-l",     g: "vehicle",  name: "Car, estate or SUV",    w: 16.5, d: 6.5, h: 5.5, stack: 1, driveup: 1, clear: 1.5, note: "Plus 18 in all round to open a door" }
  ];

  ST.itemById = function (id) {
    for (var i = 0; i < ST.ITEMS.length; i++) if (ST.ITEMS[i].id === id) return ST.ITEMS[i];
    return null;
  };
  ST.itemsInGroup = function (g) { return ST.ITEMS.filter(function (i) { return i.g === g; }); };

  /* ---- Presets -----------------------------------------------------------
     Plausible loads, so the tool's recommendation can be checked against what
     a storage manager would actually tell you over the counter. */

  ST.PRESETS = [
    { id: "overflow", name: "Just the boxes", hint: "A loft or a spare room, cleared",
      items: { "box-l": 8, "box-s": 6, "tote": 4 } },
    { id: "studio", name: "Studio flat", hint: "One room of furniture",
      items: { "sofa2": 1, "mattress-q": 1, "bedframe": 1, "drawers": 1, "tv": 1,
               "box-l": 10, "box-s": 8, "box-ward": 1, "chair": 2 } },
    { id: "onebed", name: "One-bedroom flat", hint: "A full flat, appliances staying",
      items: { "sofa3": 1, "armchair": 1, "mattress-q": 1, "bedframe": 1, "wardrobe": 1,
               "drawers": 1, "bookcase": 2, "dining": 1, "chair": 4, "tv": 1, "coffee": 1,
               "box-l": 14, "box-s": 10, "box-ward": 2, "rug": 1 } },
    { id: "twobed", name: "Two-bedroom house", hint: "Everything, appliances included",
      items: { "sofa3": 1, "sofa2": 1, "armchair": 1, "mattress-q": 1, "mattress-s": 1,
               "bedframe": 2, "wardrobe": 2, "drawers": 2, "bookcase": 2, "dining": 1,
               "chair": 6, "tv": 2, "coffee": 1, "washer": 1, "fridge": 1,
               "box-l": 20, "box-s": 16, "box-ward": 3, "rug": 2 } },
    { id: "fourbed", name: "Four-bedroom house", hint: "A whole family move",
      items: { "sofa3": 1, "sofa2": 1, "armchair": 2, "mattress-q": 2, "mattress-s": 2,
               "bedframe": 4, "wardrobe": 2, "drawers": 3, "bookcase": 3, "dining": 1,
               "chair": 8, "tv": 2, "coffee": 2, "washer": 1, "fridge": 1, "cooker": 1,
               "cot": 1, "box-l": 34, "box-s": 28, "box-ward": 4, "rug": 3, "bike": 1 } },
    { id: "garage", name: "Garage clear-out", hint: "Bikes, mower, the kayak",
      items: { "bike": 2, "mower": 1, "tools": 3, "bbq": 1, "ladder": 1, "kayak": 1,
               "box-l": 8, "tote": 8 } },
    { id: "business", name: "Business stock & files", hint: "Pallets, racking, records",
      items: { "pallet": 4, "filing": 4, "desk": 2, "rack": 4, "box-l": 16, "tote": 10 } },
    { id: "car", name: "A car, stored dry", hint: "Plus the things around it",
      items: { "car": 1, "box-l": 6, "tote": 4, "bike": 1 } }
  ];

  /* ---- Packing -----------------------------------------------------------
     Two phases, because that is how a unit actually gets loaded.

     Phase one lays out the bulk. Furniture, appliances, vehicles. Using
     first-fit decreasing height, the standard strip-packing heuristic: the
     deepest things go across the back wall first, then you fill forward. It
     is not optimal, and nothing you can do by hand is. Being honestly
     imperfect is the point: a tool that assumes perfect tessellation tells
     people a 10 x 10 holds a house, and then they turn up with a van.

     Phase two puts the boxes away. Most of them never touch the floor. They
     go on top of anything with a rigid flat top, which is the single biggest
     thing that separates a well-packed unit from a badly packed one. Whatever
     is left over stacks in columns on the floor, and those columns are what
     the plan draws.

     Ceiling is assumed to be 8 ft, which is what the indoor units are. */

  ST.CEILING = 8;
  var AIR = 0.82;   /* you cannot pack airspace above furniture perfectly */
  var COL = 0.9;    /* nor a box column right up to the roof */
  var CRUMB = 0.45; /* free strips thinner than this are not worth tracking */

  /* MAXRECTS with best-short-side-fit. Keeps a list of maximal free
     rectangles, places each piece in the one that leaves the tidiest
     remainder, then re-splits. It beats shelf packing by a wide margin on a
     mixed load, which matters: a shelf packer gave up at about half the floor
     used and sent everybody a size up. */
  function Packer(W, D) {
    this.W = W; this.D = D;
    this.free = [{ x: 0, y: 0, w: W, h: D }];
    this.placed = [];
  }

  Packer.prototype.fit = function (fw, fd) {
    var best = null;
    for (var i = 0; i < this.free.length; i++) {
      var r = this.free[i];
      var forms = [[fw, fd], [fd, fw]];
      for (var k = 0; k < forms.length; k++) {
        var w = forms[k][0], h = forms[k][1];
        if (w > r.w + 1e-9 || h > r.h + 1e-9) continue;
        var lw = r.w - w, lh = r.h - h;
        var ss = Math.min(lw, lh), ls = Math.max(lw, lh);
        /* Tie-break towards the back of the unit, then the left wall, so the
           same load always draws the same plan. */
        if (!best || ss < best.ss - 1e-9 ||
            (ss < best.ss + 1e-9 && (ls < best.ls - 1e-9 ||
              (ls < best.ls + 1e-9 && (r.y < best.y - 1e-9 ||
                (r.y < best.y + 1e-9 && r.x < best.x - 1e-9)))))) {
          best = { x: r.x, y: r.y, w: w, h: h, ss: ss, ls: ls };
        }
      }
    }
    return best;
  };

  Packer.prototype.place = function (fw, fd, meta) {
    var b = this.fit(fw, fd);
    if (!b) return null;
    var next = [];
    this.free.forEach(function (r) {
      var apart = b.x >= r.x + r.w - 1e-9 || b.x + b.w <= r.x + 1e-9 ||
                  b.y >= r.y + r.h - 1e-9 || b.y + b.h <= r.y + 1e-9;
      if (apart) { next.push(r); return; }
      if (b.x > r.x + 1e-9) next.push({ x: r.x, y: r.y, w: b.x - r.x, h: r.h });
      if (b.x + b.w < r.x + r.w - 1e-9) next.push({ x: b.x + b.w, y: r.y, w: r.x + r.w - b.x - b.w, h: r.h });
      if (b.y > r.y + 1e-9) next.push({ x: r.x, y: r.y, w: r.w, h: b.y - r.y });
      if (b.y + b.h < r.y + r.h - 1e-9) next.push({ x: r.x, y: b.y + b.h, w: r.w, h: r.y + r.h - b.y - b.h });
    });
    /* Drop slivers, then anything wholly inside another rectangle. */
    next = next.filter(function (r) { return r.w > CRUMB && r.h > CRUMB; });
    this.free = next.filter(function (r, i) {
      return !next.some(function (o, j) {
        return i !== j && r.x >= o.x - 1e-9 && r.y >= o.y - 1e-9 &&
               r.x + r.w <= o.x + o.w + 1e-9 && r.y + r.h <= o.y + o.h + 1e-9 &&
               (r.w < o.w - 1e-9 || r.h < o.h - 1e-9 || j < i);
      });
    });
    var p = { x: b.x, y: b.y, w: b.w, d: b.h };
    for (var k in meta) p[k] = meta[k];
    this.placed.push(p);
    return p;
  };

  ST.pack = function (counts, size, opts) {
    opts = opts || {};
    var stacking = opts.stacking !== false;
    var walkway = opts.walkway === true;
    var ceiling = opts.ceiling || ST.CEILING;

    var W = size.w, D = size.d;
    var walk = walkway ? (W >= 8 ? 2 : 1.2) : 0;
    var usable = W - walk;
    var doorW = opts.doorW || ST.doorWidthFor(size);

    var foots = [];
    var wanted = 0, needsDriveUp = false, widest = 0;
    var boxVol = 0, boxCount = 0, rep = null;
    var blocked = [];

    Object.keys(counts).forEach(function (id) {
      var item = ST.itemById(id);
      var qty = counts[id] | 0;
      if (!item || qty <= 0) return;
      wanted += qty;
      if (item.driveup) needsDriveUp = true;
      widest = Math.max(widest, Math.min(item.w, item.d));

      /* Through the door before anything else. */
      if (Math.min(item.w, item.d) > doorW + 1e-9) {
        blocked.push({ item: item, qty: qty });
        return;
      }

      if (item.fill && stacking) {
        /* Held back for phase two. */
        boxVol += qty * item.w * item.d * item.h;
        boxCount += qty;
        if (!rep || item.w * item.d > rep.w * rep.d) rep = item;
        return;
      }
      var perHeight = Math.max(1, Math.floor(ceiling / item.h));
      var per = stacking ? Math.min(item.stack, perHeight) : 1;
      var piles = Math.ceil(qty / per);
      var pad = item.clear || 0;
      for (var i = 0; i < piles; i++) {
        foots.push({ item: item, high: Math.min(per, qty - i * per),
                     fw: item.w + pad, fd: item.d + pad, pad: pad });
      }
    });

    /* Biggest first. MAXRECTS is much better at slotting small things into
       the gaps than at finding room for a sofa at the end. */
    foots.sort(function (a, b) {
      return (b.fw * b.fd - a.fw * a.fd) ||
             (Math.max(b.fw, b.fd) - Math.max(a.fw, a.fd)) ||
             (a.item.id < b.item.id ? -1 : 1);
    });

    var pk = new Packer(usable, D);
    var over = [];
    foots.forEach(function (f) {
      var p = pk.place(f.fw, f.fd, { item: f.item, high: f.high, kind: "bulk", pad: f.pad });
      if (!p) over.push(f);
    });

    /* Phase two: the boxes. Most never touch the floor. */
    var overhead = 0, columns = 0;
    if (boxVol > 0 && rep) {
      var air = 0;
      pk.placed.forEach(function (p) {
        if (!p.item.top) return;
        var head = ceiling - p.high * p.item.h;
        if (head > 1.4) air += p.w * p.d * head * AIR;
      });
      var stored = Math.min(boxVol, air);
      overhead = Math.round(boxCount * (stored / boxVol));
      var left = boxVol - stored;
      if (left > 0.01) {
        var colVol = rep.w * rep.d * ceiling * COL;
        columns = Math.ceil(left / colVol);
        var high = Math.max(1, Math.floor(ceiling / rep.h));
        for (var c = 0; c < columns; c++) {
          var p = pk.place(rep.w, rep.d, { item: rep, high: high, kind: "boxes", pad: 0 });
          if (!p) over.push({ item: rep, high: high, fw: rep.w, fd: rep.d });
        }
      }
    }

    var placed = pk.placed;
    var usedArea = placed.reduce(function (n, p) { return n + p.w * p.d; }, 0);
    var depthUsed = placed.reduce(function (n, p) { return Math.max(n, p.y + p.d); }, 0);

    return {
      size: size, W: W, D: D, walk: walk, usable: usable, ceiling: ceiling,
      placed: placed, over: over, blocked: blocked, doorW: doorW,
      items: wanted,
      fits: over.length === 0 && blocked.length === 0 && wanted > 0,
      empty: wanted === 0,
      usedArea: usedArea,
      area: W * D,
      fill: usable * D ? usedArea / (usable * D) : 0,
      depthUsed: depthUsed,
      widest: widest,
      needsDriveUp: needsDriveUp,
      boxes: boxCount,
      overhead: overhead,
      columns: columns
    };
  };

  /* Smallest size on the ladder that takes the whole load. */
  ST.recommend = function (counts, opts) {
    for (var i = 0; i < ST.SIZES.length; i++) {
      var r = ST.pack(counts, ST.SIZES[i], opts);
      if (r.fits) return { size: ST.SIZES[i], result: r };
    }
    return null;
  };
})();
