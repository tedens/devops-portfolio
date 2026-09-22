/* JUNIPER LANE: salon data.

   Everything invented. No image files: the stylist portraits are generated
   from a single SVG bust with per-person tones and one of four hair shapes. */

window.SL = window.SL || {};

/* --- Pricing tiers -------------------------------------------------------
   Salons price the same service differently by who does it. Base prices below
   are the Stylist tier; the others are derived so the two can't drift.      */

SL.TIERS = [
  { key: "stylist",  name: "Stylist",  mult: 1 },
  { key: "senior",   name: "Senior",   mult: 1.25 },
  { key: "director", name: "Director", mult: 1.5 }
];

SL.tierPrice = function (base, tierKey) {
  var tier = SL.TIERS.filter(function (t) { return t.key === tierKey; })[0] || SL.TIERS[0];
  return Math.round(base * tier.mult / 500) * 500; /* nearest $5 */
};

/* --- Services ------------------------------------------------------------
   duration is in minutes and drives the booking grid: a 180-minute balayage
   only offers start times with a clear 180-minute run before closing.       */

SL.GROUPS = [
  {
    id: "cut",
    name: "Cut & finish",
    blurb: "Every cut starts with a consultation and ends with a finish you can repeat at home.",
    services: [
      { id: "cut-finish", name: "Cut & finish", desc: "Consultation, shampoo, cut and blow-dry.", dur: 45, price: 5500 },
      { id: "restyle", name: "Restyle", desc: "A longer appointment for a real change of shape, with a proper consultation first.", dur: 75, price: 8500 },
      { id: "dry-cut", name: "Dry cut", desc: "For curls and for anyone who'd rather skip the basin. No wash, no blow-dry.", dur: 30, price: 4500 },
      { id: "fringe", name: "Fringe trim", desc: "Free between appointments if we cut it. Otherwise, this.", dur: 15, price: 1500 },
      { id: "blow-dry", name: "Blow-dry", desc: "Wash and finish, smooth or with movement. Say which when you arrive.", dur: 45, price: 4000 },
      { id: "occasion", name: "Occasion styling", desc: "Up-dos and set styling for weddings and the rest of it. Trial appointments available.", dur: 60, price: 7500 }
    ]
  },
  {
    id: "colour",
    name: "Colour",
    blurb: "Every colour service needs a patch test at least 48 hours beforehand. It takes two minutes and we'll book it with you.",
    services: [
      { id: "root-tint", name: "Root tint", desc: "Regrowth only, to your existing colour.", dur: 90, price: 7000, patch: true },
      { id: "full-tint", name: "Full head tint", desc: "Root to ends, single process.", dur: 120, price: 9500, patch: true },
      { id: "half-foils", name: "Half head foils", desc: "Top section and around the face. Where the light actually hits.", dur: 150, price: 13500, patch: true },
      { id: "full-foils", name: "Full head foils", desc: "Through the whole head, including underneath.", dur: 180, price: 17500, patch: true },
      { id: "balayage", name: "Balayage", desc: "Hand-painted, grown-out softly on purpose. Includes a toner and finish.", dur: 180, price: 19500, patch: true },
      { id: "toner", name: "Toner or gloss", desc: "Shifts the tone without lifting. Good for brass, good for shine.", dur: 45, price: 4500, patch: true },
      { id: "correction", name: "Colour correction consult", desc: "Free, 30 minutes, no obligation. We'll tell you honestly what it takes and what it costs.", dur: 30, price: 0, patch: false, consult: true }
    ]
  },
  {
    id: "treatments",
    name: "Treatments",
    blurb: "Added to another appointment, or booked on their own.",
    services: [
      { id: "bond", name: "Bond repair", desc: "Rebuilds the bonds that bleaching breaks. Worth it on anything lightened.", dur: 30, price: 3500 },
      { id: "conditioning", name: "Deep conditioning", desc: "Twenty minutes under heat. Noticeable for about three weeks.", dur: 20, price: 2500 },
      { id: "scalp", name: "Scalp treatment", desc: "Exfoliation and massage. For flaking, tightness, or just because.", dur: 30, price: 3800 },
      { id: "keratin", name: "Keratin smoothing", desc: "Cuts drying time roughly in half for three to four months. Lasts longer on coarser hair.", dur: 150, price: 21000 }
    ]
  },
  {
    id: "brows",
    name: "Brows & lashes",
    blurb: "Tints need a patch test too, same 48 hours.",
    services: [
      { id: "brow-shape", name: "Brow shape", desc: "Wax, thread or tweeze. We'll ask which you prefer.", dur: 20, price: 2200 },
      { id: "brow-tint", name: "Brow tint", desc: "Two shades of choice, blended.", dur: 15, price: 1800, patch: true },
      { id: "lash-lift", name: "Lash lift", desc: "Six to eight weeks of curl without extensions.", dur: 60, price: 6500, patch: true },
      { id: "lash-tint", name: "Lash tint", desc: "Usually booked with a lift.", dur: 20, price: 2000, patch: true }
    ]
  }
];

SL.SERVICES = SL.GROUPS.reduce(function (all, g) {
  return all.concat(g.services.map(function (s) {
    s.group = g.id;
    s.groupName = g.name;
    return s;
  }));
}, []);

SL.service = function (id) {
  return SL.SERVICES.filter(function (s) { return s.id === id; })[0] || null;
};

/* --- Stylists ------------------------------------------------------------
   `days` are weekday numbers (0 = Sunday). Availability in the booker is
   the intersection of the salon's opening hours and these.                 */

SL.STYLISTS = [
  {
    id: "nadia",
    name: "Nadia Reyes",
    level: "Director",
    tier: "director",
    years: 16,
    days: [2, 3, 4, 5, 6],
    specialisms: ["Curls", "Colour correction", "Restyles"],
    bio: "Nadia opened Juniper Lane in 2015 after twelve years working in Madrid and London. She takes most of the colour corrections, and she is the person to see if you've been told your hair 'won't do that'.",
    tones: { skin: "#c08b62", hair: "#2a1d1a", hairAlt: "#3a2723", top: "#2f2529" },
    hairStyle: 3
  },
  {
    id: "theo",
    name: "Theo Abara",
    level: "Senior Stylist",
    tier: "senior",
    years: 9,
    days: [1, 2, 4, 5, 6],
    specialisms: ["Precision cutting", "Short hair", "Barbering"],
    bio: "Theo cuts dry more often than not, which makes him unusually good with texture and with anything short. Trained in Lagos and Manchester. Fastest hands in the salon and somehow never rushes you.",
    tones: { skin: "#7d5336", hair: "#1c1513", hairAlt: "#2a201d", top: "#3a3034" },
    hairStyle: 4
  },
  {
    id: "orla",
    name: "Orla Byrne",
    level: "Senior Stylist",
    tier: "senior",
    years: 11,
    days: [1, 3, 4, 6],
    specialisms: ["Balayage", "Blondes", "Fine hair"],
    bio: "Orla does most of the balayage here and has strong opinions about toners. She'll talk you out of going lighter if your hair can't take it, which is the opposite of what people expect.",
    tones: { skin: "#e0b492", hair: "#8a5a2e", hairAlt: "#a06f3c", top: "#2f2529" },
    hairStyle: 2
  },
  {
    id: "jun",
    name: "Jun Park",
    level: "Stylist",
    tier: "stylist",
    years: 4,
    days: [2, 3, 5, 6],
    specialisms: ["Blow-dries", "Occasion styling", "Gloss & toner"],
    bio: "Jun joined from a salon in Seoul and finished training with us last year. Books up fastest for occasion styling, if you need something for a wedding, ask early.",
    tones: { skin: "#d9a97f", hair: "#221a18", hairAlt: "#33241f", top: "#3a3034" },
    hairStyle: 1
  }
];

SL.stylist = function (id) {
  return SL.STYLISTS.filter(function (s) { return s.id === id; })[0] || null;
};

/* --- Opening hours ------------------------------------------------------
   Minutes from midnight. Thursday runs late; closed Sunday and Monday.     */

SL.HOURS = {
  0: null,                /* Sun */
  1: null,                /* Mon */
  2: [9 * 60, 18 * 60],   /* Tue */
  3: [9 * 60, 18 * 60],
  4: [10 * 60, 20 * 60],  /* Thu. Late */
  5: [9 * 60, 18 * 60],
  6: [9 * 60, 17 * 60]    /* Sat */
};

SL.HOUR_LABELS = [
  ["Sunday", "Closed"], ["Monday", "Closed"], ["Tuesday", "9:00 – 6:00"],
  ["Wednesday", "9:00 – 6:00"], ["Thursday", "10:00 – 8:00"],
  ["Friday", "9:00 – 6:00"], ["Saturday", "9:00 – 5:00"]
];

/* --- Colour tones (for the colour section artwork) ----------------------- */

SL.TONES = [
  { name: "Ash blonde",    h: 42,  s: 24, l: 76 },
  { name: "Honey",         h: 36,  s: 52, l: 58 },
  { name: "Copper",        h: 20,  s: 62, l: 44 },
  { name: "Chestnut",      h: 18,  s: 38, l: 30 },
  { name: "Espresso",      h: 14,  s: 30, l: 18 },
  { name: "Cool brunette", h: 300, s: 6,  l: 24 }
];

/* --- Helpers ------------------------------------------------------------- */

SL.money = function (cents) {
  if (!cents) return "Free";
  return "$" + (cents / 100).toFixed(2).replace(/\.00$/, "");
};

SL.duration = function (mins) {
  if (mins < 60) return mins + " min";
  var h = Math.floor(mins / 60), m = mins % 60;
  return h + (m ? " hr " + m + " min" : h === 1 ? " hour" : " hours");
};

SL.minutesToLabel = function (m) {
  var h24 = Math.floor(m / 60), mm = m % 60;
  var suffix = h24 >= 12 ? "pm" : "am";
  var h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return h12 + ":" + String(mm).padStart(2, "0") + suffix;
};

/* Stylists who can take a given service. Directors and seniors do everything;
   the newest stylist doesn't take corrections or the big lightening jobs. */
SL.stylistsFor = function (serviceId) {
  var heavy = ["correction", "full-foils", "balayage", "keratin"];
  return SL.STYLISTS.filter(function (s) {
    if (s.tier === "stylist" && heavy.indexOf(serviceId) !== -1) return false;
    return true;
  });
};

/* Deterministic pseudo-bookings, so the grid looks like a real diary and
   never reshuffles under the visitor mid-session. */
function hash(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

/* A stylist's existing bookings for a day, as contiguous blocks.

   Modelling each 15-minute slot as independently busy looks fine for short
   services and makes long ones effectively unbookable. Twelve consecutive
   free blocks at even a modest per-block busy rate is vanishingly rare. Real
   diaries are a handful of long appointments with gaps between them, so that
   is what this walks out. */
SL.busyBlocks = function (stylistId, dateIso) {
  var parts = dateIso.split("-");
  var date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  var hours = SL.HOURS[date.getDay()];
  if (!hours) return [];

  var LENGTHS = [45, 60, 90, 120, 150];
  var blocks = [];
  var cursor = hours[0];
  var i = 0;

  while (cursor < hours[1] && i < 40) {
    var h = hash(stylistId + "|" + dateIso + "|" + i);

    if (h % 100 < 48) {
      var len = LENGTHS[(h >>> 7) % LENGTHS.length];
      var end = Math.min(hours[1], cursor + len);
      blocks.push([cursor, end]);
      cursor = end + 15 * (1 + ((h >>> 11) % 3));   /* 15–45 min turnaround */
    } else {
      cursor += 15 * (2 + ((h >>> 5) % 8));          /* 30–135 min free */
    }
    i++;
  }
  return blocks;
};

/* Start times where the whole service fits before closing and doesn't run
   into anything already in the book. */
SL.slotsFor = function (stylistId, dateIso, durationMins) {
  var parts = dateIso.split("-");
  var date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  var hours = SL.HOURS[date.getDay()];
  if (!hours) return [];

  var stylist = SL.stylist(stylistId);
  if (stylist && stylist.days.indexOf(date.getDay()) === -1) return [];

  var blocks = SL.busyBlocks(stylistId, dateIso);
  var out = [];

  for (var start = hours[0]; start + durationMins <= hours[1]; start += 15) {
    var end = start + durationMins;
    var clash = blocks.some(function (b) { return start < b[1] && end > b[0]; });
    if (!clash) out.push(start);
  }
  return out;
};

/* --- Portraits -----------------------------------------------------------
   One bust, four hair shapes, per-person tones. Drawn on a 200 × 250 grid. */

var HAIR = {
  /* ABSOLUTE coordinates throughout. Earlier versions chained relative curves
     whose deltas didn't sum back to the start point, so each subpath closed
     18-48px left of where it began and left a wedge of hair floating beside
     the head.

     Each shape is a C-shaped band: down the outside, in, up the inside to the
     hairline, across the fringe, then back down the other inside edge. The
     face shows through the aperture that leaves. The head sits at x 62-138
     with its crown at y 68, so the outer edge stays inside x 54-150. */

  /* 1: short bob */
  1: function (t) {
    /* One band down to jaw length rather than a band plus two side pieces –
       the separate pieces read as blocky slabs beside the face. */
    return '<path d="M54 158C50 84 72 48 102 48C132 48 154 84 150 158' +
      'L130 158C134 116 132 98 124 88C113 99 91 99 80 88C72 98 70 116 74 158Z" fill="' + t.hair + '"/>' +
      '<path d="M54 158C51 130 52 104 58 86c3 26 2 50 0 72z" fill="' + t.hairAlt + '" opacity=".5"/>';
  },

  /* 2: long, centre-parted */
  2: function (t) {
    return '<path d="M48 200C40 116 60 44 102 44C144 44 164 116 156 200' +
      'L134 196C141 136 138 104 130 90C117 103 87 103 74 90C66 104 63 136 70 196Z" fill="' + t.hair + '"/>' +
      '<path d="M102 44C95 64 93 78 95 92L102 90L109 92C111 78 109 64 102 44Z" fill="' +
      t.hairAlt + '" opacity=".5"/>';
  },

  /* 3: pulled back with volume */
  3: function (t) {
    return '<path d="M58 126C53 84 74 48 102 48C130 48 151 84 146 126' +
      'L128 124C132 104 128 94 121 86C111 97 93 97 83 86C76 95 72 104 76 124Z" fill="' + t.hair + '"/>' +
      '<path d="M142 94c13 9 19 24 15 41-5-4-11-6-17-6 2-12 0-24-5-35z" fill="' + t.hair + '"/>' +
      '<ellipse cx="152" cy="128" rx="13" ry="16" fill="' + t.hairAlt + '"/>';
  },

  /* 4: close crop */
  4: function (t) {
    return '<path d="M62 110C58 74 80 52 100 52C120 52 142 74 138 110' +
      'L126 108C128 94 124 87 119 82C108 92 92 92 81 82C76 87 72 94 74 108Z" fill="' + t.hair + '"/>';
  }
};




SL.portrait = function (person, opts) {
  opts = opts || {};
  var t = person.tones;
  var hair = (HAIR[person.hairStyle] || HAIR[1])(t);

  return '<svg viewBox="0 0 200 250" role="img" aria-label="Portrait illustration of ' +
    person.name + '" preserveAspectRatio="xMidYMid slice">' +
    '<rect width="200" height="250" fill="' + (opts.bg || "#352b2d") + '"/>' +
    '<circle cx="100" cy="112" r="74" fill="#c8a165" fill-opacity=".1"/>' +
    /* shoulders */
    '<path d="M18 250c6-48 38-74 82-74s76 26 82 74z" fill="' + t.top + '"/>' +
    /* neck */
    '<path d="M84 162h32v30a16 16 0 0 1-32 0z" fill="' + t.skin + '"/>' +
    '<path d="M84 162h32v12a40 40 0 0 1-32 0z" fill="#000000" fill-opacity=".18"/>' +
    /* head */
    '<path d="M62 106a38 38 0 0 1 76 0v26a38 38 0 0 1-76 0z" fill="' + t.skin + '"/>' +
    hair +
    /* features */
    '<circle cx="86" cy="118" r="3.4" fill="#211815"/>' +
    '<circle cx="114" cy="118" r="3.4" fill="#211815"/>' +
    '<path d="M92 138q8 7 16 0" stroke="#211815" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    "</svg>";
};
