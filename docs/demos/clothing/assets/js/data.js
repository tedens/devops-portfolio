/* BRINDLE: catalogue data.

   Everything here is invented. There are no image files anywhere on this site:
   each product is drawn from one flat silhouette per style, tinted at runtime
   from its colourway's HSL triple (see BR.garmentHTML). */

window.BR = window.BR || {};

/* --- Silhouettes ---------------------------------------------------------
   Drawn on a 200 × 250 grid. Classes do the colouring so a single drawing
   serves every colourway.
     .g-fab   main fabric        .g-dark  shading and seams
     .g-light highlights         .g-line  stitch and fold lines            */

BR.SILHOUETTES = {
  tee: '\
<path class="g-fab" d="M82 44 62 49 26 73 18 101 45 113 58 97v107h84V97l13 16 27-12-8-28-36-24-20-5c-4 13-32 13-36 0z"/>\
<path class="g-neck" d="M85 45c4 11 26 11 30 0"/>\
<path class="g-line" d="M58 97v107M142 97v107M45 113l13-16M155 113l-13-16"/>\
<path class="g-line" d="M64 200h72"/>',

  longsleeve: '\
<path class="g-fab" d="M82 44 62 49 30 72 16 154l28 8 18-62v142h76V102l18 62 28-8-14-82-32-23-20-5c-4 13-32 13-36 0z"/>\
<path class="g-neck" d="M85 45c4 11 26 11 30 0"/>\
<path class="g-dark" d="M18 153l25 7 2-10-25-7zM182 153l-25 7-2-10 25-7z"/>\
<path class="g-line" d="M62 102v142M138 102v142M68 238h64"/>',

  shirt: '\
<path class="g-fab" d="M84 46 62 52 28 75 20 104l26 12 14-17v122h80V102l14 15 26-12-8-29-34-23-22-6-18 16z"/>\
<path class="g-dark" d="m84 46 18 16 18-16-8-3-10 9-10-9z"/>\
<path class="g-dark" d="M96 62h12v159H96z" opacity=".45"/>\
<path class="g-line" d="M60 100v122M140 100v122M46 116l14-17M154 116l-14-15"/>\
<circle class="g-light" cx="102" cy="96" r="2.6"/>\
<circle class="g-light" cx="102" cy="128" r="2.6"/>\
<circle class="g-light" cx="102" cy="160" r="2.6"/>\
<circle class="g-light" cx="102" cy="192" r="2.6"/>',

  knit: '\
<path class="g-fab" d="M80 46 58 52 26 76 12 156l28 9 18-58v112h84V107l18 58 28-9-14-80-32-24-22-6c-4 13-36 13-40 0z"/>\
<path class="g-dark" d="M58 205h84v14H58zM14 155l25 8 2-11-25-8zM186 155l-25 8-2-11 25-8z"/>\
<path class="g-neck" d="M84 48c4 11 28 11 32 0"/>\
<path class="g-line" d="M72 84v119M84 76v127M96 72v131M108 72v131M120 76v127M132 84v119" opacity=".4"/>',

  jacket: '\
<path class="g-fab" d="M80 44 58 50 24 74l-8 78 28 8 14-52v128h88V108l14 52 28-8-8-78-34-24-22-6-22 14z"/>\
<path class="g-dark" d="m80 44 22 14 22-14-10-3-12 9-12-9z"/>\
<path class="g-dark" d="M70 152h32v34H70zM118 152h32v34h-32z"/>\
<path class="g-line" d="M102 58v178M62 108v128M142 108v128"/>\
<circle class="g-light" cx="102" cy="92" r="3"/>\
<circle class="g-light" cx="102" cy="126" r="3"/>\
<circle class="g-light" cx="102" cy="196" r="3"/>',

  coat: '\
<path class="g-fab" d="M78 40 56 47 22 72l-8 88 26 8 14-58v136h96V110l14 58 26-8-8-88-34-25-22-7-24 16z"/>\
<path class="g-dark" d="m78 40 24 16 24-16-12-3-12 10-12-10z"/>\
<path class="g-dark" d="M78 40 60 50 70 96 102 56zM126 40 144 50 134 96 102 56z"/>\
<path class="g-line" d="M102 56v190M58 112v134M146 112v134"/><path class="g-dark" d="M68 166h30v7H68zM106 166h30v7h-30z"/>\
<circle class="g-light" cx="102" cy="104" r="3.2"/>\
<circle class="g-light" cx="102" cy="142" r="3.2"/>',

  trousers: '\
<path class="g-fab" d="M56 40h92v22H56z"/>\
<path class="g-fab" d="M56 62h92l-8 176h-32l-6-118-6 118H64z"/>\
<path class="g-dark" d="M56 40h92v8H56z"/>\
<path class="g-line" d="M102 62v58M64 238h32M108 238h32"/>\
<path class="g-line" d="M78 70v164M126 70v164" opacity=".5"/>',

  shorts: '\
<path class="g-fab" d="M56 40h92v20H56z"/>\
<path class="g-fab" d="M56 60h92l-7 92h-30l-5-58-5 58H63z"/>\
<path class="g-dark" d="M56 40h92v8H56z"/>\
<path class="g-line" d="M102 60v40M63 152h30M111 152h30"/>',

  dress: '\
<path class="g-fab" d="M76 36c2 16 12 24 26 24s24-8 26-24l10 5-4 26 12 10-16 161H74L58 77l12-10-4-26z"/>\
<path class="g-dark" d="M76 36c2 16 12 24 26 24s24-8 26-24l-8-2c-3 11-9 16-18 16s-15-5-18-16z"/>\
<path class="g-line" d="M70 67 66 41M134 67l4-26M86 90h32"/>\
',

  tote: '\
<path class="g-fab" d="M40 84h124l-10 140H50z"/>\
<path class="g-dark" d="M40 84h124v10H40z"/>\
<path class="g-line" d="M74 84V58a28 28 0 0 1 56 0v26" stroke-width="4"/>\
<path class="g-line" d="M64 118h76" opacity=".45"/>'
};

/* Second, simpler view used for the "back" gallery shot. */
BR.BACKS = {
  tee: '<path class="g-fab" d="M82 44 62 49 26 73 18 101 45 113 58 97v107h84V97l13 16 27-12-8-28-36-24-20-5c-4 8-32 8-36 0z"/><path class="g-line" d="M58 97v107M142 97v107M64 200h72M102 44v14"/>',
  longsleeve: '<path class="g-fab" d="M82 44 62 49 30 72 16 154l28 8 18-62v142h76V102l18 62 28-8-14-82-32-23-20-5c-4 8-32 8-36 0z"/><path class="g-line" d="M62 102v142M138 102v142M102 44v16"/>',
  shirt: '<path class="g-fab" d="M84 46 62 52 28 75 20 104l26 12 14-17v122h80V102l14 15 26-12-8-29-34-23-22-6-18 8z"/><path class="g-line" d="M60 100v122M140 100v122M66 84h72M102 84v138"/>',
  knit: '<path class="g-fab" d="M80 46 58 52 26 76 12 156l28 9 18-58v112h84V107l18 58 28-9-14-80-32-24-22-6c-4 8-36 8-40 0z"/><path class="g-dark" d="M58 205h84v14H58z"/><path class="g-line" d="M96 68v140M108 68v140"/>',
  jacket: '<path class="g-fab" d="M80 44 58 50 24 74l-8 78 28 8 14-52v128h88V108l14 52 28-8-8-78-34-24-22-6-22 8z"/><path class="g-line" d="M56 108v128M164 108v128M60 76h84"/>',
  coat: '<path class="g-fab" d="M78 40 56 47 22 72l-8 88 26 8 14-58v136h96V110l14 58 26-8-8-88-34-25-22-7-24 8z"/><path class="g-line" d="M54 110v136M150 110v136M102 60v186"/>',
  trousers: '<path class="g-fab" d="M56 40h92v22H56z"/><path class="g-fab" d="M56 62h92l-8 176h-32l-6-118-6 118H64z"/><path class="g-dark" d="M68 74h26v22H68zM110 74h26v22h-26z"/><path class="g-line" d="M102 62v58"/>',
  shorts: '<path class="g-fab" d="M56 40h92v20H56z"/><path class="g-fab" d="M56 60h92l-7 92h-30l-5-58-5 58H63z"/><path class="g-dark" d="M68 72h26v20H68zM110 72h26v20h-26z"/>',
  dress: '<path class="g-fab" d="M76 36c2 16 12 24 26 24s24-8 26-24l10 5-4 26 12 10-16 161H74L58 77l12-10-4-26z"/><path class="g-line" d="M70 67 66 41M134 67l4-26"/>',
  tote: '<path class="g-fab" d="M40 84h124l-10 140H50z"/><path class="g-dark" d="M40 84h124v10H40z"/><path class="g-line" d="M74 84V58a28 28 0 0 1 56 0v26" stroke-width="4"/>'
};

/* --- Colourways ----------------------------------------------------------
   h, s, l feed the CSS custom properties on .garment.                      */

BR.COLOURS = {
  bone:     { name: "Bone",         h: 38,  s: 24, l: 90 },
  chalk:    { name: "Chalk",        h: 40,  s: 18, l: 94 },
  pearl:    { name: "Pearl",        h: 40,  s: 14, l: 92 },
  ecru:     { name: "Ecru",         h: 36,  s: 26, l: 87 },
  oat:      { name: "Oat",          h: 34,  s: 22, l: 80 },
  natural:  { name: "Natural",      h: 35,  s: 30, l: 76 },
  stone:    { name: "Stone",        h: 32,  s: 10, l: 72 },
  camel:    { name: "Camel",        h: 30,  s: 38, l: 62 },
  clay:     { name: "Clay",         h: 16,  s: 38, l: 55 },
  rust:     { name: "Rust",         h: 14,  s: 46, l: 44 },
  sage:     { name: "Sage",         h: 95,  s: 12, l: 58 },
  khaki:    { name: "Khaki",        h: 55,  s: 16, l: 52 },
  olive:    { name: "Olive",        h: 70,  s: 20, l: 40 },
  moss:     { name: "Moss",         h: 100, s: 16, l: 38 },
  sky:      { name: "Sky",          h: 205, s: 30, l: 76 },
  navy:     { name: "Navy",         h: 218, s: 30, l: 30 },
  indigo:   { name: "Indigo",       h: 224, s: 34, l: 34 },
  raw:      { name: "Raw Indigo",   h: 226, s: 38, l: 30 },
  washed:   { name: "Washed Black", h: 220, s: 6,  l: 26 },
  charcoal: { name: "Charcoal",     h: 30,  s: 5,  l: 28 },
  black:    { name: "Black",        h: 0,   s: 0,  l: 14 },
  ink:      { name: "Ink",          h: 225, s: 14, l: 20 }
};

BR.SIZE_SETS = {
  alpha: ["XS", "S", "M", "L", "XL"],
  waist: ["28", "30", "32", "34", "36"],
  one: ["One size"]
};

/* Measurement tables are generated from the mid size outwards, so a product
   only has to declare what it is at M (or 32). All values in centimetres. */
BR.MEASURE_SPECS = {
  tee:        { keys: ["Chest", "Body length", "Shoulder", "Sleeve"], base: [56, 70, 50, 22], step: [3, 2, 1.5, 1] },
  longsleeve: { keys: ["Chest", "Body length", "Shoulder", "Sleeve"], base: [55, 69, 47, 62], step: [3, 2, 1.5, 1.5] },
  shirt:      { keys: ["Chest", "Body length", "Shoulder", "Sleeve"], base: [58, 74, 48, 63], step: [3, 2, 1.5, 1.5] },
  knit:       { keys: ["Chest", "Body length", "Shoulder", "Sleeve"], base: [59, 68, 52, 60], step: [3.5, 2, 1.5, 1.5] },
  jacket:     { keys: ["Chest", "Body length", "Shoulder", "Sleeve"], base: [62, 72, 50, 63], step: [4, 2, 2, 1.5] },
  coat:       { keys: ["Chest", "Body length", "Shoulder", "Sleeve"], base: [64, 108, 52, 65], step: [4, 2, 2, 1.5] },
  trousers:   { keys: ["Waist", "Hip", "Inseam", "Leg opening"], base: [40, 54, 74, 24], step: [2.5, 2.5, 0, 0.5] },
  shorts:     { keys: ["Waist", "Hip", "Inseam", "Leg opening"], base: [40, 55, 18, 30], step: [2.5, 2.5, 0.5, 1] },
  dress:      { keys: ["Bust", "Waist", "Length", "Strap drop"], base: [46, 44, 118, 20], step: [2.5, 2.5, 2, 1] },
  tote:       { keys: ["Width", "Height", "Depth", "Handle drop"], base: [42, 38, 12, 26], step: [0, 0, 0, 0] }
};

/* --- Products ------------------------------------------------------------ */

BR.PRODUCTS = [
  {
    id: "halden-tee",
    name: "Halden Boxy Tee",
    category: "Tops",
    collection: "Everyday",
    silhouette: "tee",
    sizeSet: "alpha",
    price: 4800,
    was: 0,
    badge: "New",
    fit: 2,
    fitLabel: "Boxy",
    colours: ["bone", "charcoal", "clay", "sage"],
    blurb: "A heavy cotton tee with a dropped shoulder and a hem that sits where you'd want it to.",
    description: "Cut from a 240gsm loopwheel jersey that takes about three washes to soften and then stops changing. The body is boxy without being wide. A straight line from armhole to hem, so it hangs off the shoulder rather than clinging at the waist. Ribbed neck taped across the back to stop it stretching out.",
    material: "100% organic cotton, 240gsm loopwheel jersey",
    weight: "240gsm",
    origin: "Knitted and sewn in Portugal",
    care: ["Machine wash cold, inside out", "Line dry. The jersey will shrink in a dryer", "Warm iron if you must", "Do not tumble dry"],
    fitNotes: "True to size for a boxy fit. If you want it closer to the body, size down one.",
    modelNote: "Model is 183 cm with a 96 cm chest, wearing M.",
    pairs: ["stratton-trouser", "crofter-jacket", "otter-tote"]
  },
  {
    id: "marle-longsleeve",
    name: "Marle Long-Sleeve",
    category: "Tops",
    collection: "Everyday",
    silhouette: "longsleeve",
    sizeSet: "alpha",
    price: 6200,
    was: 0,
    badge: "",
    fit: 3,
    fitLabel: "Regular",
    colours: ["bone", "navy", "charcoal"],
    blurb: "The long-sleeve that works under everything else in the wardrobe.",
    description: "Slightly finer than the Halden at 200gsm, so it layers under a shirt without bulk at the armhole. Set-in sleeves rather than dropped, which keeps the line clean under knitwear. Cuffs are ribbed and deliberately snug. They hold their shape through the winter.",
    material: "100% organic cotton, 200gsm jersey",
    weight: "200gsm",
    origin: "Knitted and sewn in Portugal",
    care: ["Machine wash cold, inside out", "Line dry", "Warm iron on reverse", "Do not bleach"],
    fitNotes: "True to size. Sleeves run long by design. They're meant to sit past the wrist bone.",
    modelNote: "Model is 178 cm with a 92 cm chest, wearing S.",
    pairs: ["ardle-crew", "pike-jean", "crofter-jacket"]
  },
  {
    id: "fenwick-shirt",
    name: "Fenwick Oxford Shirt",
    category: "Shirts",
    collection: "Everyday",
    silhouette: "shirt",
    sizeSet: "alpha",
    price: 11800,
    was: 0,
    badge: "Restocked",
    fit: 3,
    fitLabel: "Regular",
    colours: ["chalk", "sky", "olive"],
    blurb: "An unlined button-down in a proper Japanese oxford that gets better with age.",
    description: "Woven on shuttle looms in Okayama, which is slow and gives the cloth a soft irregularity you can feel. Collar is unfused and rolls on its own after a wash or two, no interlining to go crisp and then bubble. Single-needle side seams, a box pleat at the back, and a curved hem long enough to tuck.",
    material: "100% cotton, 140gsm Japanese oxford",
    weight: "140gsm",
    origin: "Cloth woven in Okayama, Japan · Sewn in Portugal",
    care: ["Machine wash warm", "Tumble dry low or line dry", "Iron while slightly damp", "Do not bleach"],
    fitNotes: "True to size with a little room through the body. Size up if you'll wear it over knitwear.",
    modelNote: "Model is 183 cm with a 96 cm chest, wearing M.",
    pairs: ["ardle-crew", "stratton-trouser", "ridge-overcoat"]
  },
  {
    id: "ardle-crew",
    name: "Ardle Lambswool Crew",
    category: "Knitwear",
    collection: "Winter",
    silhouette: "knit",
    sizeSet: "alpha",
    price: 16500,
    was: 21000,
    badge: "Sale",
    fit: 3,
    fitLabel: "Regular",
    colours: ["oat", "moss", "charcoal"],
    blurb: "Scottish lambswool, fully fashioned, with a neck that holds its shape.",
    description: "Knitted in the Scottish Borders on machines that shape each panel to size rather than cutting it from a sheet. More work, less waste, and no raw edges inside the seams. Five-gauge lambswool with a dense, slightly dry handle that blooms after the first wash. Ribbed neck, cuffs and hem worked at a tighter gauge so they stay put.",
    material: "100% Scottish lambswool, 5-gauge",
    weight: "440g at size M",
    origin: "Knitted in Hawick, Scotland",
    care: ["Hand wash cool or wool cycle", "Reshape and dry flat", "Do not tumble dry", "Store folded, never hung"],
    fitNotes: "Runs true with room for a shirt underneath. Between sizes? Take the smaller. It relaxes.",
    modelNote: "Model is 178 cm with a 92 cm chest, wearing M.",
    pairs: ["fenwick-shirt", "stratton-trouser", "ridge-overcoat"]
  },
  {
    id: "bramley-cardigan",
    name: "Bramley Ribbed Cardigan",
    category: "Knitwear",
    collection: "Winter",
    silhouette: "knit",
    sizeSet: "alpha",
    price: 18500,
    was: 0,
    badge: "",
    fit: 4,
    fitLabel: "Relaxed",
    colours: ["ecru", "rust", "ink"],
    blurb: "A deep-ribbed cardigan built to be worn instead of a jacket indoors.",
    description: "Three-gauge rib in a lambswool and alpaca blend, heavy enough to hold a straight line from shoulder to hem. Corozo buttons, which are cut from a nut and go slightly different shades. That's the material, not a fault. Patch pockets set low enough to actually put your hands in.",
    material: "70% lambswool, 30% alpaca, 3-gauge rib",
    weight: "720g at size M",
    origin: "Knitted in Hawick, Scotland",
    care: ["Hand wash cool", "Reshape and dry flat", "Do not tumble dry", "De-pill with a comb, not a razor"],
    fitNotes: "Relaxed by design. It's outerwear indoors. Take your normal size.",
    modelNote: "Model is 170 cm with an 88 cm chest, wearing S.",
    pairs: ["marle-longsleeve", "nell-slip-dress", "pike-jean"]
  },
  {
    id: "crofter-jacket",
    name: "Crofter Chore Jacket",
    category: "Outerwear",
    collection: "Everyday",
    silhouette: "jacket",
    sizeSet: "alpha",
    price: 24500,
    was: 0,
    badge: "New",
    fit: 4,
    fitLabel: "Relaxed",
    colours: ["indigo", "khaki", "black"],
    blurb: "Three pockets, a boxy cut, and a canvas that goes where you shove it.",
    description: "Ten-ounce cotton canvas, garment-washed once so it isn't board-stiff out of the bag but still has years of fading ahead of it. Two hip patch pockets and a chest pocket sized for a phone. Triple-stitched side seams, tack-reinforced at the pocket mouths, and a plain collar that sits flat under a coat.",
    material: "100% cotton, 10oz garment-washed canvas",
    weight: "10oz / 340gsm",
    origin: "Sewn in Portugal",
    care: ["Machine wash cold, separately for the first few washes", "Line dry", "Do not bleach", "Repairs covered for five years"],
    fitNotes: "Cut to layer over knitwear. If you'll only wear it over a tee, size down.",
    modelNote: "Model is 183 cm with a 96 cm chest, wearing M.",
    pairs: ["halden-tee", "pike-jean", "ardle-crew"]
  },
  {
    id: "ridge-overcoat",
    name: "Ridge Wool Overcoat",
    category: "Outerwear",
    collection: "Winter",
    silhouette: "coat",
    sizeSet: "alpha",
    price: 48000,
    was: 0,
    badge: "",
    fit: 3,
    fitLabel: "Regular",
    colours: ["camel", "charcoal"],
    blurb: "A single-breasted overcoat in a heavy Yorkshire melton, cut to sit below the knee.",
    description: "Melton from a mill in Huddersfield that has been making it since the 1830s. 750gsm, milled tight enough to shrug off drizzle without any coating. Half-canvassed front so the chest keeps its shape, Bemberg lining through the body, and a centre vent deep enough to sit down in. Horn buttons.",
    material: "Shell 90% wool, 10% cashmere · Lining 100% cupro",
    weight: "750gsm melton",
    origin: "Cloth woven in Huddersfield, England · Made in Portugal",
    care: ["Dry clean only", "Brush after wearing", "Hang on a wide shoulder hanger", "Store with cedar, not plastic"],
    fitNotes: "Cut to go over a jacket. Take your usual size. Sizing up loses the shoulder line.",
    modelNote: "Model is 183 cm with a 96 cm chest, wearing M.",
    pairs: ["ardle-crew", "fenwick-shirt", "stratton-trouser"]
  },
  {
    id: "stratton-trouser",
    name: "Stratton Wide Trouser",
    category: "Trousers",
    collection: "Everyday",
    silhouette: "trousers",
    sizeSet: "waist",
    price: 14500,
    was: 0,
    badge: "Bestseller",
    fit: 4,
    fitLabel: "Relaxed",
    colours: ["stone", "black", "olive"],
    blurb: "A wide, flat-fronted trouser in a cotton twill with just enough weight to drape.",
    description: "Cut straight from the hip with no taper, so the leg falls rather than tapers in. Flat front, no pleat, and a slightly higher rise than most. It sits on the waist rather than under it, which is what makes the wide leg read as deliberate. Side adjusters instead of belt loops.",
    material: "100% cotton, 11oz compact twill",
    weight: "11oz / 370gsm",
    origin: "Sewn in Portugal",
    care: ["Machine wash cold", "Line dry", "Warm iron", "Do not tumble dry"],
    fitNotes: "Take your usual waist. Unhemmed at 82 cm inseam. We'll hem free of charge, just ask at checkout.",
    modelNote: "Model is 183 cm, wearing 32 with a 74 cm inseam.",
    pairs: ["halden-tee", "fenwick-shirt", "ardle-crew"]
  },
  {
    id: "pike-jean",
    name: "Pike Selvedge Jean",
    category: "Trousers",
    collection: "Everyday",
    silhouette: "trousers",
    sizeSet: "waist",
    price: 16800,
    was: 0,
    badge: "",
    fit: 3,
    fitLabel: "Regular",
    colours: ["raw", "washed"],
    blurb: "Fourteen-ounce selvedge, cut straight, sold raw so the fades are yours.",
    description: "Woven on shuttle looms in Okayama at a pace that produces about thirty metres a day. Raw and unsanforised, so expect roughly 3 cm of shrink in the first wash. The sizing below is post-shrink. Chain-stitched hem, copper rivets, and a button fly. The washed colourway is the same denim put through one rinse.",
    material: "100% cotton, 14oz selvedge denim",
    weight: "14oz / 475gsm",
    origin: "Denim woven in Okayama, Japan · Sewn in Portugal",
    care: ["First wash: cold soak, no detergent", "Wash inside out, cold, infrequently", "Line dry", "Free repairs for life"],
    fitNotes: "Measurements are post-shrink. Take your usual waist; the raw pair will feel tight for a week.",
    modelNote: "Model is 178 cm, wearing 32.",
    pairs: ["halden-tee", "crofter-jacket", "marle-longsleeve"]
  },
  {
    id: "ferry-short",
    name: "Ferry Cotton Short",
    category: "Trousers",
    collection: "Summer",
    silhouette: "shorts",
    sizeSet: "waist",
    price: 8800,
    was: 11000,
    badge: "Sale",
    fit: 3,
    fitLabel: "Regular",
    colours: ["bone", "navy"],
    blurb: "A mid-length short in a washed poplin that dries in an afternoon.",
    description: "Cut with a 18 cm inseam, which lands just above the knee on most people. Long enough to be unremarkable, short enough to be a short. Elasticated back half of the waistband with a drawcord, flat at the front so it doesn't gather under a shirt.",
    material: "100% cotton, washed poplin",
    weight: "180gsm",
    origin: "Sewn in Portugal",
    care: ["Machine wash cold", "Tumble dry low", "Warm iron", "Do not bleach"],
    fitNotes: "Take your usual waist. The elastic gives about 4 cm.",
    modelNote: "Model is 178 cm, wearing 32.",
    pairs: ["halden-tee", "otter-tote", "fenwick-shirt"]
  },
  {
    id: "nell-slip-dress",
    name: "Nell Slip Dress",
    category: "Dresses",
    collection: "Summer",
    silhouette: "dress",
    sizeSet: "alpha",
    price: 19800,
    was: 0,
    badge: "New",
    fit: 2,
    fitLabel: "Close",
    colours: ["ink", "pearl", "clay"],
    blurb: "Bias-cut in a heavy cupro that moves like silk and washes like cotton.",
    description: "Cut on the bias, which is what makes it skim instead of cling, and also why it takes almost twice the cloth of a straight-cut dress. Cupro is regenerated from cotton linter, a by-product of the cotton industry, and unlike silk it goes in the machine. Adjustable straps, French seams throughout, no zip.",
    material: "100% cupro, 120gsm",
    weight: "120gsm",
    origin: "Sewn in Portugal",
    care: ["Machine wash cold on delicate, in a bag", "Line dry in shade", "Cool iron on reverse", "Do not wring"],
    fitNotes: "Close through the bust and hip. Bias cut means it gives. Size down if between sizes.",
    modelNote: "Model is 175 cm with an 86 cm bust, wearing S.",
    pairs: ["bramley-cardigan", "ridge-overcoat", "otter-tote"]
  },
  {
    id: "otter-tote",
    name: "Otter Canvas Tote",
    category: "Accessories",
    collection: "Summer",
    silhouette: "tote",
    sizeSet: "one",
    price: 7600,
    was: 0,
    badge: "",
    fit: 3,
    fitLabel: "One size",
    colours: ["natural", "black"],
    blurb: "An 18oz tote with a flat base, an inside pocket, and handles that don't dig in.",
    description: "Eighteen-ounce cotton canvas, unlined, with a boxed base so it stands up on its own when you put it down. Handles are 4 cm wide and bar-tacked at six points. The failure point on most totes is the handle join, so that's where the stitching is. One inside patch pocket for the things that fall to the bottom.",
    material: "100% cotton, 18oz canvas",
    weight: "18oz / 610gsm",
    origin: "Sewn in Portugal",
    care: ["Spot clean", "Machine wash cold if you must. It will soften", "Line dry", "Do not bleach"],
    fitNotes: "Holds a 15-inch laptop flat, plus a day's worth of everything else.",
    modelNote: "42 cm wide × 38 cm high × 12 cm deep.",
    pairs: ["halden-tee", "ferry-short", "crofter-jacket"]
  }
];

/* --- Hero carousel -------------------------------------------------------
   Promoted slides. Each points at a real product so the price, colourway and
   link never drift from the catalogue.                                      */

BR.HERO = [
  {
    product: "crofter-jacket",
    colour: "indigo",
    eyebrow: "New in",
    headline: "The jacket you'll stop thinking about",
    lede: "Ten-ounce canvas, washed once, three pockets. Cut to go over knitwear without pulling at the shoulder.",
    cta: "Shop the Crofter"
  },
  {
    product: "ardle-crew",
    colour: "moss",
    eyebrow: "Winter weight · 21% off",
    headline: "Fully fashioned in the Borders",
    lede: "Each panel knitted to size instead of cut from a sheet. Less waste, no raw edges, a neck that holds.",
    cta: "Shop knitwear"
  },
  {
    product: "nell-slip-dress",
    colour: "ink",
    eyebrow: "New in",
    headline: "Bias-cut, and machine washable",
    lede: "Cupro moves like silk and takes a cold cycle. Twice the cloth of a straight-cut dress, for a reason.",
    cta: "Shop the Nell"
  },
  {
    product: "stratton-trouser",
    colour: "stone",
    eyebrow: "Bestseller",
    headline: "A wide leg that falls, not flaps",
    lede: "Straight from the hip, higher rise, side adjusters. Hemmed free to your inseam.",
    cta: "Shop trousers"
  }
];

/* --- Collections --------------------------------------------------------- */

BR.COLLECTIONS = [
  { id: "Everyday", name: "Everyday", blurb: "The pieces we make every season, because they sell every season.", hue: 34, sat: 20, light: 84 },
  { id: "Winter", name: "Winter weight", blurb: "Melton, lambswool and alpaca. Made in Scotland and Yorkshire.", hue: 215, sat: 14, light: 72 },
  { id: "Summer", name: "Summer weight", blurb: "Poplin, linen blends, and anything that dries in an afternoon.", hue: 42, sat: 30, light: 86 }
];

/* --- Helpers ------------------------------------------------------------- */

BR.money = function (cents) {
  return "$" + (cents / 100).toFixed(2).replace(/\.00$/, "");
};

BR.byId = function (id) {
  return BR.PRODUCTS.filter(function (p) { return p.id === id; })[0] || null;
};

BR.colour = function (key) {
  return BR.COLOURS[key] || { name: key, h: 0, s: 0, l: 60 };
};

BR.sizesOf = function (product) {
  return BR.SIZE_SETS[product.sizeSet] || BR.SIZE_SETS.alpha;
};

/* Deterministic pseudo-stock, so the demo shows sold-out variants without
   shuffling under the visitor mid-session. */
BR.stock = function (productId, colourKey, size) {
  var s = productId + "|" + colourKey + "|" + size;
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  var n = h % 100;
  if (n < 9) return 0;        /* sold out */
  if (n < 22) return 1 + (n % 3); /* low */
  return 6 + (n % 14);
};

BR.inStockSizes = function (product, colourKey) {
  return BR.sizesOf(product).filter(function (size) {
    return BR.stock(product.id, colourKey, size) > 0;
  });
};

/* Measurement table for a product, in cm or inches. */
BR.measurements = function (product, unit) {
  var spec = BR.MEASURE_SPECS[product.silhouette];
  var sizes = BR.sizesOf(product);
  var mid = Math.floor(sizes.length / 2);

  return {
    keys: spec.keys,
    rows: sizes.map(function (size, i) {
      var offset = i - mid;
      return {
        size: size,
        values: spec.base.map(function (base, k) {
          var cm = base + offset * spec.step[k];
          return unit === "in"
            ? (cm / 2.54).toFixed(1)
            : (Math.round(cm * 2) / 2).toString();
        })
      };
    })
  };
};

/* Upsell: the stylist's picks first, then anything else from the same
   collection, then whatever's left. Never the product you're looking at. */
BR.similar = function (product, limit) {
  var out = [];
  var seen = { };
  seen[product.id] = true;

  function push(p) {
    if (!p || seen[p.id] || out.length >= (limit || 4)) return;
    seen[p.id] = true;
    out.push(p);
  }

  (product.pairs || []).forEach(function (id) { push(BR.byId(id)); });
  BR.PRODUCTS.forEach(function (p) { if (p.collection === product.collection) push(p); });
  BR.PRODUCTS.forEach(function (p) { if (p.category === product.category) push(p); });
  BR.PRODUCTS.forEach(push);

  return out;
};

/* --- Garment rendering --------------------------------------------------- */

BR.garmentStyle = function (colourKey) {
  var c = BR.colour(colourKey);

  /* The studio backdrop shifts the other way from the garment so a bone tee
     and a black coat both read against it. Pale cloth also needs a deeper
     shade colour, or the seams and the silhouette edge disappear. */
  var bgL = c.l > 58 ? 86 : 93;
  var darkL = Math.max(4, c.l - (c.l > 70 ? 16 : 9));

  return "--h:" + c.h + ";--s:" + c.s + "%;--l:" + c.l + "%;" +
    "--fab:hsl(" + c.h + " " + c.s + "% " + c.l + "%);" +
    "--fab-dark:hsl(" + c.h + " " + c.s + "% " + darkL + "%);" +
    "--fab-light:hsl(" + c.h + " " + Math.max(0, c.s - 4) + "% " + Math.min(98, c.l + 9) + "%);" +
    "--bg:hsl(36 18% " + bgL + "%)";
};

BR.garmentHTML = function (product, colourKey, opts) {
  opts = opts || {};
  var art = (opts.view === "back" ? BR.BACKS : BR.SILHOUETTES)[product.silhouette] ||
    BR.SILHOUETTES.tee;

  var flag = "";
  if (opts.flag && product.badge) {
    flag = '<span class="garment__flag' + (product.badge === "Sale" ? " garment__flag--clay" : "") +
      '">' + product.badge + "</span>";
  }

  return '<div class="garment ' + (opts.className || "") + '" style="' +
    BR.garmentStyle(colourKey) + '">' + flag +
    '<svg viewBox="0 0 200 250" role="img" aria-label="' + product.name + " in " +
    BR.colour(colourKey).name + '">' + art + "</svg></div>";
};

/* Fabric close-up, same colourway, no silhouette. */
BR.weaveHTML = function (colourKey, className) {
  return '<div class="weave ' + (className || "") + '" style="' +
    BR.garmentStyle(colourKey) + '" role="img" aria-label="Fabric close-up in ' +
    BR.colour(colourKey).name + '"></div>';
};

/* Silhouette with measurement guides drawn over it. */
BR.measureHTML = function (product, colourKey, className) {
  var art = BR.SILHOUETTES[product.silhouette] || BR.SILHOUETTES.tee;
  var overlay =
    '<path class="measure-line" d="M18 118h164"/>' +
    '<path class="measure-cap" d="M18 110v16M182 110v16"/>' +
    '<text class="measure-text" x="100" y="112" text-anchor="middle">A</text>' +
    '<path class="measure-line" d="M192 44v190"/>' +
    '<path class="measure-cap" d="M184 44h16M184 234h16"/>' +
    '<text class="measure-text" x="188" y="140" text-anchor="middle" transform="rotate(-90 188 140)">B</text>';

  return '<div class="garment garment--measure ' + (className || "") + '" style="' +
    BR.garmentStyle(colourKey) + '">' +
    '<svg viewBox="0 0 200 250" role="img" aria-label="Measurement guide for ' +
    product.name + '">' + art + overlay + "</svg></div>";
};
