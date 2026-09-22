/* HOLLIS ELECTRICAL: job, coverage and availability data.

   Everything invented. No image files: the job illustrations are inline SVG
   drawn in absolute coordinates (relative chains drift on close) and coloured
   with fill + fill-opacity (rgba() in a presentation attribute isn't portable
   SVG and renders black outside a browser). */

window.TR = window.TR || {};

/* --- Coverage ------------------------------------------------------------
   The inversion that shapes this whole site: we travel to you, so YOUR
   address decides whether we can come and on which days. Core ZIPs get the
   full week; fringe ZIPs only get the days a van is already out that way. */

TR.ZONES = {
  core: {
    name: "Core area",
    zips: ["44118", "44120", "44122", "44106", "44112"],
    days: [1, 2, 3, 4, 5],          /* Mon–Fri */
    evenings: true,
    blurb: "Every weekday, plus evening slots and Saturday mornings for emergencies."
  },
  fringe: {
    name: "Fringe area",
    zips: ["44124", "44128", "44130", "44143", "44146"],
    days: [2, 4],                    /* Tue & Thu. The days a van is out that way */
    evenings: false,
    blurb: "Tuesdays and Thursdays, when a van is already out that way. No call-out charge either way."
  }
};

TR.zoneFor = function (zip) {
  zip = String(zip || "").trim().slice(0, 5);
  if (!/^\d{5}$/.test(zip)) return null;
  if (TR.ZONES.core.zips.indexOf(zip) !== -1) return "core";
  if (TR.ZONES.fringe.zips.indexOf(zip) !== -1) return "fringe";
  return "outside";
};

/* --- Arrival windows -----------------------------------------------------
   Trades give windows, not times. A job consumes whole windows: a socket is
   one, a consumer unit is a full day (both windows, same day), a rewire is
   two consecutive working days. */

TR.WINDOWS = [
  { id: "am", name: "Morning", from: 8 * 60, to: 12 * 60, label: "8:00am – 12:00pm" },
  { id: "pm", name: "Afternoon", from: 12 * 60, to: 17 * 60, label: "12:00pm – 5:00pm" },
  { id: "eve", name: "Evening", from: 17 * 60, to: 20 * 60, label: "5:00pm – 8:00pm",
    surcharge: 4500, note: "Out-of-hours rate", coreOnly: true }
];

TR.VANS_PER_WINDOW = 3;

/* --- Services ------------------------------------------------------------
   mode 'fixed' . Price is the price, book the work directly
   mode 'survey'. We come and look first, free, then quote in writing
   windows      . How many arrival windows the job consumes                */

TR.GROUPS = [
  {
    id: "faults",
    name: "Repairs & faults",
    blurb: "Something's stopped working. Most of these are done in one visit.",
    services: [
      { id: "fault-find", name: "Fault finding", desc: "Tracing an intermittent or dead circuit. First hour included; we'll call before going over.", mode: "fixed", price: 9500, windows: 1, emergency: true, tags: ["First hour included"] },
      { id: "tripping", name: "Circuit keeps tripping", desc: "RCD or breaker tripping repeatedly. Usually a failing appliance or damp somewhere.", mode: "fixed", price: 9500, windows: 1, emergency: true, tags: ["Same-day where we can"] },
      { id: "socket-repair", name: "Socket or switch repair", desc: "Dead, loose, scorched or broken. Replaced like for like.", mode: "fixed", price: 8500, windows: 1, tags: [] },
      { id: "lighting-fix", name: "Lighting not working", desc: "Single fitting or a whole circuit. Includes replacing failed transformers.", mode: "fixed", price: 8500, windows: 1, tags: [] }
    ]
  },
  {
    id: "install",
    name: "Installations",
    blurb: "New work. Anything notifiable is certified and registered for you.",
    services: [
      { id: "extra-sockets", name: "Add sockets", desc: "Spurred or on a new circuit, depending on what's there. Price is per socket, chased and made good.", mode: "fixed", price: 12000, windows: 1, tags: ["Per socket"] },
      { id: "outdoor", name: "Outdoor sockets & lighting", desc: "Weatherproof to IP65, on their own RCBO. Includes the trench if it's under 5 metres.", mode: "fixed", price: 18000, windows: 1, tags: ["IP65 rated"] },
      { id: "lighting-install", name: "Downlights or new lighting", desc: "Layout, fittings and dimming. Priced on what's above the ceiling, which is why we look first.", mode: "survey", price: 0, windows: 2, tags: ["Survey first"] },
      { id: "consumer-unit", name: "Consumer unit replacement", desc: "Full 18th-edition board with RCBOs, SPD and a full test of every circuit. Power off for most of the day.", mode: "fixed", price: 68000, windows: 2, tags: ["Notifiable", "Full day", "Certificate issued"] },
      { id: "rewire", name: "Full or partial rewire", desc: "Two days minimum for a partial, a week for most three-bed houses. Always surveyed first.", mode: "survey", price: 0, windows: 4, tags: ["Notifiable", "Survey first", "2+ days"] }
    ]
  },
  {
    id: "ev",
    name: "EV charging",
    blurb: "Approved installer for four manufacturers. Load assessment included.",
    services: [
      { id: "ev-survey", name: "EV charger survey", desc: "We check the supply, the earthing arrangement and the cable run, then quote in writing. Free, about 30 minutes.", mode: "survey", price: 0, windows: 1, tags: ["Free", "30 minutes"] },
      { id: "ev-install", name: "EV charger installation", desc: "7.4kW unit, up to 10m of cable, dedicated RCBO and load management where the supply needs it.", mode: "fixed", price: 89900, windows: 2, tags: ["Notifiable", "Full day", "DNO notified"] }
    ]
  },
  {
    id: "safety",
    name: "Safety & certification",
    blurb: "The paperwork landlords, buyers and insurers ask for.",
    services: [
      { id: "eicr", name: "EICR condition report", desc: "Every circuit tested and a coded report. Required every five years for rented property.", mode: "fixed", price: 18000, windows: 2, tags: ["Certificate issued", "Landlords"] },
      { id: "smoke-alarms", name: "Interlinked smoke & heat alarms", desc: "Mains-wired and interlinked to current standards. Price is for a typical three-bed.", mode: "fixed", price: 24000, windows: 1, tags: ["From price"] },
      { id: "pat", name: "Appliance testing (PAT)", desc: "Per item, minimum charge applies. Labelled and scheduled.", mode: "fixed", price: 6000, windows: 1, tags: ["Minimum charge"] }
    ]
  }
];

TR.SERVICES = TR.GROUPS.reduce(function (all, g) {
  return all.concat(g.services.map(function (s) { s.group = g.id; s.groupName = g.name; return s; }));
}, []);

TR.service = function (id) {
  return TR.SERVICES.filter(function (s) { return s.id === id; })[0] || null;
};

/* --- Quote calculator ----------------------------------------------------
   Returns a RANGE with the factors shown, because a single number would be a
   lie before anyone has seen the property. */

TR.QUOTE_JOBS = [
  { id: "consumer-unit", name: "Consumer unit replacement", low: 58000, high: 78000 },
  { id: "rewire-partial", name: "Partial rewire", low: 220000, high: 340000 },
  { id: "rewire-full", name: "Full rewire", low: 420000, high: 680000 },
  { id: "ev", name: "EV charger install", low: 79900, high: 119900 },
  { id: "lighting", name: "Downlights, one room", low: 38000, high: 62000 },
  { id: "sockets", name: "Additional sockets (4)", low: 38000, high: 56000 },
  { id: "eicr", name: "EICR condition report", low: 16000, high: 28000 },
  { id: "outdoor", name: "Outdoor power & lighting", low: 26000, high: 48000 }
];

TR.QUOTE_FACTORS = {
  size: {
    label: "Property size",
    options: [
      { id: "flat", name: "Flat or 1–2 bed", mult: 1 },
      { id: "three", name: "3 bed", mult: 1.15 },
      { id: "large", name: "4+ bed", mult: 1.35 },
      { id: "commercial", name: "Commercial unit", mult: 1.6 }
    ]
  },
  age: {
    label: "Roughly when was it built",
    options: [
      { id: "new", name: "2000 or later", mult: 1 },
      { id: "mid", name: "1970 – 2000", mult: 1.1 },
      { id: "old", name: "Before 1970", mult: 1.28 }
    ]
  },
  access: {
    label: "Access",
    options: [
      { id: "easy", name: "Straightforward", mult: 1 },
      { id: "awkward", name: "Loft, cellar or boarded floors", mult: 1.18 },
      { id: "scaffold", name: "Needs scaffold or a tower", mult: 1.3 }
    ]
  },
  urgency: {
    label: "When do you need it",
    options: [
      { id: "flexible", name: "Whenever suits", mult: 1 },
      { id: "soon", name: "Within two weeks", mult: 1.08 },
      { id: "urgent", name: "Within 48 hours", mult: 1.25 }
    ]
  }
};

TR.quote = function (jobId, picks) {
  var job = TR.QUOTE_JOBS.filter(function (j) { return j.id === jobId; })[0];
  if (!job) return null;

  var mult = 1;
  var factors = [];

  Object.keys(TR.QUOTE_FACTORS).forEach(function (key) {
    var group = TR.QUOTE_FACTORS[key];
    var chosen = group.options.filter(function (o) { return o.id === picks[key]; })[0] || group.options[0];
    mult *= chosen.mult;
    factors.push({
      label: group.label,
      value: chosen.name,
      pct: Math.round((chosen.mult - 1) * 100)
    });
  });

  return {
    job: job,
    low: Math.round(job.low * mult / 1000) * 1000,
    high: Math.round(job.high * mult / 1000) * 1000,
    factors: factors
  };
};

/* --- Availability --------------------------------------------------------
   Deterministic, so a slot that looks free stays free while someone clicks
   around. Each window has TR.VANS_PER_WINDOW vans; the hash decides how many
   are already committed. */

function hash(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h;
}

TR.vansFree = function (dateIso, windowId) {
  return Math.max(0, TR.VANS_PER_WINDOW - (hash(dateIso + "|" + windowId) % (TR.VANS_PER_WINDOW + 1)));
};

TR.isWorkingDay = function (zone, dateIso) {
  var p = dateIso.split("-");
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  var cfg = TR.ZONES[zone];
  return !!cfg && cfg.days.indexOf(d.getDay()) !== -1;
};

/* Windows bookable on a given day, for a job of `need` windows.
   need 1 -> any single free window
   need 2 -> both AM and PM free on the same day (a full day on site)
   need 4 -> a full day here AND a full day on the next working day     */
TR.windowsFor = function (zone, dateIso, need) {
  if (!TR.isWorkingDay(zone, dateIso)) return [];

  var coreOnly = zone !== "core";
  var usable = TR.WINDOWS.filter(function (w) { return !(w.coreOnly && coreOnly); });

  var free = usable.filter(function (w) { return TR.vansFree(dateIso, w.id) > 0; });

  if (need === 1) return free;

  var hasAM = free.some(function (w) { return w.id === "am"; });
  var hasPM = free.some(function (w) { return w.id === "pm"; });
  if (!hasAM || !hasPM) return [];

  if (need >= 4 && !TR.nextWorkingDayFree(zone, dateIso)) return [];

  /* A whole-day job is offered as one choice, not two. */
  return [{ id: "day", name: "Full day", label: "8:00am – 5:00pm", wholeDay: true }];
};

TR.nextWorkingDayFree = function (zone, dateIso) {
  var p = dateIso.split("-");
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  for (var i = 1; i <= 7; i++) {
    d.setDate(d.getDate() + 1);
    var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
    if (!TR.isWorkingDay(zone, iso)) continue;
    return TR.vansFree(iso, "am") > 0 && TR.vansFree(iso, "pm") > 0;
  }
  return false;
};

TR.money = function (cents) {
  if (!cents) return "Free";
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

TR.windowSpan = function (need) {
  if (need >= 4) return "Two working days";
  if (need === 2) return "One full day";
  return "One arrival window";
};

/* --- Recent jobs --------------------------------------------------------- */

TR.JOBS = [
  { id: "cu", title: "Consumer unit, 1930s semi", area: "Shaker Heights", days: "1 day", art: "board",
    note: "Rewireable fuses and no RCD protection. New 18th-edition board with individual RCBOs, plus two circuits repaired where the insulation had gone brittle." },
  { id: "ev", title: "EV charger, terraced house", area: "Cleveland Heights", days: "1 day", art: "ev",
    note: "Supply was already close to capacity, so the charger went in with load management rather than upgrading the incomer. Saved the owner about $1,400." },
  { id: "lights", title: "Kitchen downlights", area: "University Heights", days: "1 day", art: "lights",
    note: "Twelve fire-rated fittings on two dimmable circuits. Joists ran the wrong way, which is exactly the sort of thing the survey is for." },
  { id: "eicr", title: "EICR, rental portfolio", area: "Lyndhurst", days: "4 days", art: "report",
    note: "Eleven flats across two buildings. Six C2s found and fixed in the same visit, reports issued the same week." },
  { id: "rewire", title: "Partial rewire", area: "Shaker Heights", days: "3 days", art: "rewire",
    note: "Ground floor only. Upstairs had been done in 2016. Kept the family in the house throughout by working one floor at a time." },
  { id: "alarms", title: "Interlinked alarms", area: "South Euclid", days: "Half day", art: "alarm",
    note: "Mains-wired and interlinked across three floors for a landlord bringing a property up to standard before letting." }
];

/* Technical-drawing style illustrations, absolute coordinates throughout. */
TR.JOB_ART = {
  board: '<rect x="46" y="34" width="108" height="82" fill="#e2e5e8" stroke="#14161a" stroke-width="2.5"/>' +
    '<rect x="54" y="46" width="92" height="26" fill="#ffffff" stroke="#14161a" stroke-width="2"/>' +
    '<g fill="#ffd21e" stroke="#14161a" stroke-width="1.6">' +
    '<rect x="58" y="50" width="9" height="18"/><rect x="70" y="50" width="9" height="18"/>' +
    '<rect x="82" y="50" width="9" height="18"/><rect x="94" y="50" width="9" height="18"/>' +
    '<rect x="106" y="50" width="9" height="18"/><rect x="118" y="50" width="9" height="18"/>' +
    '<rect x="130" y="50" width="9" height="18"/></g>' +
    '<path d="M54 84h92M54 94h92M54 104h60" stroke="#99a1aa" stroke-width="2"/>' +
    '<path d="M100 116v20M76 136h48" stroke="#14161a" stroke-width="2.5"/>',

  ev: '<rect x="118" y="26" width="42" height="62" rx="4" fill="#e2e5e8" stroke="#14161a" stroke-width="2.5"/>' +
    '<rect x="126" y="34" width="26" height="18" fill="#14161a"/>' +
    '<circle cx="139" cy="66" r="9" fill="#ffd21e" stroke="#14161a" stroke-width="2"/>' +
    '<path d="M118 78C86 78 70 96 70 120" fill="none" stroke="#14161a" stroke-width="3.5"/>' +
    '<rect x="58" y="118" width="24" height="16" rx="3" fill="#ffd21e" stroke="#14161a" stroke-width="2"/>' +
    '<path d="M30 140h140" stroke="#99a1aa" stroke-width="2"/>',

  lights: '<path d="M26 44h148" stroke="#14161a" stroke-width="3"/>' +
    '<g fill="#ffd21e" stroke="#14161a" stroke-width="2">' +
    '<circle cx="56" cy="58" r="11"/><circle cx="100" cy="58" r="11"/><circle cx="144" cy="58" r="11"/>' +
    '</g>' +
    '<g stroke="#ffd21e" stroke-width="2" opacity="0.6">' +
    '<path d="M46 76 36 104M56 78v28M66 76 76 104"/>' +
    '<path d="M90 76 80 104M100 78v28M110 76 120 104"/>' +
    '<path d="M134 76 124 104M144 78v28M154 76 164 104"/></g>' +
    '<path d="M26 140h148" stroke="#99a1aa" stroke-width="2"/>',

  report: '<rect x="56" y="24" width="88" height="112" fill="#ffffff" stroke="#14161a" stroke-width="2.5"/>' +
    '<path d="M68 44h64M68 58h64M68 72h44" stroke="#99a1aa" stroke-width="2.5"/>' +
    '<rect x="68" y="88" width="28" height="12" fill="#ffd21e" stroke="#14161a" stroke-width="1.6"/>' +
    '<rect x="100" y="88" width="32" height="12" fill="#e2e5e8" stroke="#14161a" stroke-width="1.6"/>' +
    '<path d="M68 112h64" stroke="#99a1aa" stroke-width="2.5"/>' +
    '<path d="M104 120l10 10 22-24" fill="none" stroke="#1f7a4d" stroke-width="4"/>',

  rewire: '<rect x="34" y="30" width="132" height="92" fill="none" stroke="#14161a" stroke-width="2.5"/>' +
    '<path d="M34 76h132" stroke="#14161a" stroke-width="2"/>' +
    '<path d="M100 30v92" stroke="#14161a" stroke-width="2"/>' +
    '<g stroke="#ffd21e" stroke-width="3" fill="none">' +
    '<path d="M46 64h42M46 52v12M88 52v12"/>' +
    '<path d="M112 64h42M112 52v12M154 52v12"/>' +
    '<path d="M46 110h42M46 98v12M88 98v12"/>' +
    '<path d="M112 110h42M112 98v12M154 98v12"/></g>' +
    '<g fill="#14161a"><circle cx="46" cy="52" r="4"/><circle cx="88" cy="52" r="4"/>' +
    '<circle cx="112" cy="52" r="4"/><circle cx="154" cy="52" r="4"/>' +
    '<circle cx="46" cy="98" r="4"/><circle cx="88" cy="98" r="4"/>' +
    '<circle cx="112" cy="98" r="4"/><circle cx="154" cy="98" r="4"/></g>',

  alarm: '<path d="M26 40h148" stroke="#14161a" stroke-width="3"/>' +
    '<g fill="#e2e5e8" stroke="#14161a" stroke-width="2.5">' +
    '<circle cx="62" cy="58" r="16"/><circle cx="138" cy="58" r="16"/></g>' +
    '<g fill="#ffd21e"><circle cx="62" cy="58" r="5"/><circle cx="138" cy="58" r="5"/></g>' +
    '<g stroke="#ffd21e" stroke-width="2.5" fill="none" opacity="0.8">' +
    '<path d="M82 50a26 26 0 0 1 0 16M94 44a38 38 0 0 1 0 28"/>' +
    '<path d="M118 50a26 26 0 0 0 0 16M106 44a38 38 0 0 0 0 28"/></g>' +
    '<path d="M62 74v34h76V74" fill="none" stroke="#99a1aa" stroke-width="2" stroke-dasharray="5 4"/>' +
    '<path d="M26 140h148" stroke="#99a1aa" stroke-width="2"/>'
};

TR.jobArt = function (key) {
  return '<svg viewBox="0 0 200 150" role="img" aria-label="Technical illustration" ' +
    'preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">' +
    (TR.JOB_ART[key] || TR.JOB_ART.board) + "</svg>";
};
