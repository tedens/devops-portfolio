/* THE LUMEN: the property, and the availability engine.

   The thing that makes a hotel booker different from every other booking flow
   is that availability is an INTERVAL, not a moment. A restaurant table, a
   dentist's chair and an electrician's van are free or not free at a point in
   time. A room has to be free on every single night of your stay, and the
   rules that decide whether it can be sold to you. Minimum stay, closed to
   arrival, the rate itself. Change from night to night.

   So nothing here asks "is this room free?". It asks "is this room free for
   all of these nights, may a stay start on the first one, and is the stay long
   enough to be sold at all?", and when the answer is no, it says which night
   was the problem. */

window.HL = window.HL || {};

(function () {
  "use strict";

  /* ---- Primitives -------------------------------------------------------- */

  /* FNV-1a with an avalanche step on the end. The finaliser is not optional:
     without it, hashing "...|2027-04-14" and "...|2027-04-15" left the low
     bits correlated, adjacent nights came out anti-correlated, and the single
     Terrace Penthouse never once had two free nights in a row. */
  HL.hash = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 15;
    h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  };

  HL.money = function (cents, withCents) {
    var v = Math.abs(Math.round(cents));
    var s = (!withCents && v % 100 === 0) ? String(v / 100) : (v / 100).toFixed(2);
    return (cents < 0 ? "−$" : "$") + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  HL.parseIso = function (iso) {
    var p = String(iso).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  };
  HL.toIso = function (d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  };
  HL.addDays = function (iso, n) {
    var d = HL.parseIso(iso);
    d.setDate(d.getDate() + n);
    return HL.toIso(d);
  };
  HL.today = function () {
    var n = new Date();
    return HL.toIso(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  };
  HL.dow = function (iso) { return HL.parseIso(iso).getDay(); };   /* 0 Sun .. 6 Sat */
  HL.nights = function (a, b) {
    return Math.round((HL.parseIso(b) - HL.parseIso(a)) / 86400000);
  };
  HL.eachNight = function (a, b) {
    var out = [], n = HL.nights(a, b);
    for (var i = 0; i < n; i++) out.push(HL.addDays(a, i));
    return out;
  };
  HL.fmt = function (iso, opts) {
    return HL.parseIso(iso).toLocaleDateString("en-US",
      opts || { weekday: "short", month: "short", day: "numeric" });
  };
  HL.fmtLong = function (iso) {
    return HL.parseIso(iso).toLocaleDateString("en-US",
      { weekday: "long", month: "long", day: "numeric" });
  };
  HL.fmtRange = function (a, b) {
    var A = HL.parseIso(a), B = HL.parseIso(b);
    var sameMonth = A.getMonth() === B.getMonth() && A.getFullYear() === B.getFullYear();
    var o = { month: "short", day: "numeric" };
    return HL.fmt(a, o) + " – " + (sameMonth
      ? B.getDate() + (B.getFullYear() !== new Date().getFullYear() ? " " + B.getFullYear() : "")
      : HL.fmt(b, o));
  };

  HL.store = {
    get: function (k, f) {
      try { var r = window.localStorage.getItem("lumen:" + k); return r === null ? f : JSON.parse(r); }
      catch (e) { return f; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem("lumen:" + k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    }
  };

  /* ---- Seasons -----------------------------------------------------------
     Month/day ranges rather than fixed years, so the demo does not expire. */

  HL.SEASONS = [
    { id: "peak", name: "Peak", mult: 1.34, pressure: 0.86, minStay: 2,
      ranges: [[6, 15, 9, 7], [12, 18, 1, 3]],
      note: "Harbour season and the week between Christmas and New Year." },
    { id: "shoulder", name: "Shoulder", mult: 1.08, pressure: 0.71, minStay: 1,
      ranges: [[4, 1, 6, 14], [9, 8, 10, 31]],
      note: "Spring and early autumn." },
    { id: "low", name: "Quiet", mult: 0.84, pressure: 0.54, minStay: 1,
      ranges: [[11, 1, 12, 17], [1, 4, 3, 31]],
      note: "The quiet months, and the best value in the building." }
  ];

  function inRange(mo, da, r) {
    var a = r[0] * 100 + r[1], b = r[2] * 100 + r[3], v = mo * 100 + da;
    return a <= b ? (v >= a && v <= b) : (v >= a || v <= b);   /* wraps the year */
  }

  HL.seasonFor = function (iso) {
    var d = HL.parseIso(iso), mo = d.getMonth() + 1, da = d.getDate();
    for (var i = 0; i < HL.SEASONS.length; i++) {
      var s = HL.SEASONS[i];
      for (var j = 0; j < s.ranges.length; j++) {
        if (inRange(mo, da, s.ranges[j])) return s;
      }
    }
    return HL.SEASONS[2];
  };

  /* Friday and Saturday cost more, Sunday costs less. */
  var DOW_MULT = [0.94, 1.0, 1.0, 1.0, 1.04, 1.16, 1.22];

  /* ---- Rooms -------------------------------------------------------------
     Geometry matches assets/3d/spec.py, which is what the renders and the
     floor plans are both built from. */

  HL.ROOMS = [
    { id: "harbour-king", name: "Harbour King", short: "King", sqm: 25,
      w: 4.2, d: 6.0, beds: "1 king", maxAdults: 2, maxChildren: 1, sleeps: 3,
      count: 48, rate: 28900, demand: 1.0, floors: "6–14",
      view: "Harbour, from the sixth floor up",
      blurb: "The room the hotel is built around. A king bed against a panelled wall, a proper desk at the window, and the harbour from the sixth floor up.",
      highlights: ["Harbour or quarter view", "Rainfall shower", "Nespresso and a kettle", "Blackout blinds", "Desk with two sockets and USB-C"] },

    { id: "quarter-twin", name: "Quarter Twin", short: "Twin", sqm: 28,
      w: 4.6, d: 6.2, beds: "2 queens", maxAdults: 4, maxChildren: 1, sleeps: 4,
      count: 36, rate: 31900, demand: 1.0, floors: "6–12",
      view: "Over the Quarter rooftops",
      blurb: "Two queens rather than two doubles, which is the difference between a family fitting and a family managing. Same desk, same shower, more floor.",
      highlights: ["Two queen beds", "Sleeps four adults", "Rooftop view", "Rainfall shower", "Second washbasin"] },

    { id: "corner-deluxe", name: "Corner Deluxe King", short: "Deluxe", sqm: 36,
      w: 5.4, d: 6.6, beds: "1 king + daybed", maxAdults: 3, maxChildren: 2, sleeps: 3,
      count: 22, rate: 38900, demand: 1.02, floors: "8–16",
      view: "Two aspects. Harbour and the old quarter",
      blurb: "A corner room, so two walls of glass: the harbour on one side and the old quarter on the other. The extra six square metres go into a sitting area you will actually use.",
      highlights: ["Corner room, two aspects", "Separate sitting area", "Freestanding bath", "Walk-in shower", "Nespresso, kettle and a stocked minibar"] },

    { id: "junior-suite", name: "Junior Suite", short: "Suite", sqm: 46,
      w: 5.8, d: 8.0, beds: "1 king + sofa bed", maxAdults: 3, maxChildren: 2, sleeps: 3,
      count: 14, rate: 48900, demand: 1.04, floors: "12–16",
      view: "Harbour, wide aspect",
      blurb: "A bedroom and a living room that happen to share a floor, divided by a low walnut screen rather than a door. The sofa converts, so it sleeps three without anyone drawing the short straw.",
      highlights: ["Living area with a full sofa bed", "Freestanding bath and walk-in shower", "Dining-height desk", "Two garments pressed, complimentary", "Late checkout to 2pm, subject to availability"] },

    { id: "observatory-penthouse", name: "Observatory Penthouse", short: "Penthouse", sqm: 95,
      w: 11.0, d: 8.6, beds: "1 king + 1 queen", maxAdults: 4, maxChildren: 2, sleeps: 4,
      count: 2, rate: 125000, demand: 0.76, floors: "18",
      view: "180 degrees, harbour to headland",
      blurb: "The whole northern end of the eighteenth floor. Two bedrooms' worth of sleeping, a grand piano nobody expects, and glass on three sides. You can watch the harbour and the headland without standing up.",
      highlights: ["Entire north end of the 18th floor", "Glass on three sides", "Grand piano and a stocked bar", "Dining for six", "Airport transfer and daily breakfast included", "Butler on call 7am–11pm"] },

    { id: "terrace-penthouse", name: "Terrace Penthouse", short: "Penthouse", sqm: 75,
      terraceSqm: 43, w: 9.4, d: 8.0, beds: "1 king + sofa bed",
      maxAdults: 4, maxChildren: 2, sleeps: 4,
      count: 1, rate: 158000, demand: 0.68, floors: "18",
      view: "South terrace over the old quarter",
      blurb: "One of a kind, and the only room in the building with its own sky. Forty-three square metres of south-facing terrace with a fire pit and a table for eight, wrapped around a suite that would be generous without it.",
      highlights: ["The only terrace suite in the building", "43 m² private terrace", "Fire pit and outdoor dining for eight", "Freestanding bath facing the glass", "Airport transfer and daily breakfast included", "Butler on call 7am–11pm"] }
  ];

  HL.roomById = function (id) {
    for (var i = 0; i < HL.ROOMS.length; i++) if (HL.ROOMS[i].id === id) return HL.ROOMS[i];
    return null;
  };

  /* ---- Rate plans --------------------------------------------------------- */

  HL.PLANS = [
    { id: "flex", name: "Flexible", mult: 1.0, perNight: 0,
      cancel: "Free cancellation until 6pm the day before arrival.",
      blurb: "Pay when you leave. Change or cancel right up to the evening before." },
    { id: "advance", name: "Advance purchase", mult: 0.82, perNight: 0,
      cancel: "Non-refundable. Charged in full when you book.",
      blurb: "18% off for booking ahead and meaning it. No changes, no refunds." },
    { id: "bnb", name: "Bed & breakfast", mult: 1.0, perNight: 3200,
      cancel: "Free cancellation until 6pm the day before arrival.",
      blurb: "Flexible, plus breakfast in the Long Room for two. $32 a night rather than $27 each." }
  ];
  HL.planById = function (id) {
    for (var i = 0; i < HL.PLANS.length; i++) if (HL.PLANS[i].id === id) return HL.PLANS[i];
    return HL.PLANS[0];
  };

  HL.TAX_RATE = 0.145;
  HL.CITY_LEVY = 450;          /* per room, per night */

  /* ---- Nightly rate and nightly availability ------------------------------ */

  HL.rateFor = function (room, iso) {
    var s = HL.seasonFor(iso);
    var v = room.rate * s.mult * DOW_MULT[HL.dow(iso)];
    return Math.round(v / 100) * 100;
  };

  /* Rooms of this type still unsold on this date. Seeded on the room and the
     date, so a night that is full stays full while somebody clicks around. */
  HL.freeOn = function (room, iso) {
    var s = HL.seasonFor(iso);
    var dw = HL.dow(iso);
    var pressure = s.pressure * room.demand + (dw === 5 || dw === 6 ? 0.10 : 0);
    var h = HL.hash("occ|" + room.id + "|" + iso);
    var occ = pressure + ((h % 1000) / 1000 - 0.5) * 0.30;
    occ = Math.max(0, Math.min(1, occ));
    /* Carry the fraction rather than rounding it away. With two penthouses
       and one terrace suite, rounding 0.3 of a free room down to zero would
       mean the rarest rooms in the building were never once available. */
    var exact = room.count * (1 - occ);
    var free = Math.floor(exact);
    if ((HL.hash("frac|" + room.id + "|" + iso) % 1000) / 1000 < (exact - free)) free += 1;
    free -= (HL.booked()[room.id] || {})[iso] || 0;
    return Math.max(0, Math.min(room.count, free));
  };

  HL.booked = function () { return HL.store.get("booked", {}) || {}; };

  HL.commit = function (roomId, checkin, checkout) {
    var b = HL.booked();
    b[roomId] = b[roomId] || {};
    HL.eachNight(checkin, checkout).forEach(function (n) {
      b[roomId][n] = (b[roomId][n] || 0) + 1;
    });
    HL.store.set("booked", b);
  };

  /* ---- The rules ---------------------------------------------------------- */

  /* Minimum stay is set by the arrival night: weekends and peak season are
     protected, because a hotel that sells a single Saturday cannot then sell
     the Friday or the Sunday either. */
  HL.minStayFor = function (iso) {
    var s = HL.seasonFor(iso);
    var dw = HL.dow(iso);
    var n = s.minStay;
    if (dw === 5 || dw === 6) n = Math.max(n, 2);
    if (s.id === "peak" && (dw === 5 || dw === 6)) n = 3;
    return n;
  };

  /* Peak Saturdays are closed to arrival: that Saturday is being held for the
     guests already arriving on the Friday. It is the rule that surprises
     people most, so the UI has to explain it rather than just refuse. */
  HL.closedToArrival = function (iso) {
    return HL.seasonFor(iso).id === "peak" && HL.dow(iso) === 6;
  };

  /* ---- Interval search ----------------------------------------------------
     The whole point. Returns one entry per room type, available or not, with
     the reason and the offending night when not. */

  HL.search = function (q) {
    var checkin = q.checkin, checkout = q.checkout;
    var adults = q.adults || 2, children = q.children || 0;
    var nights = HL.nights(checkin, checkout);
    var list = HL.eachNight(checkin, checkout);

    var stay = {
      checkin: checkin, checkout: checkout, nights: nights,
      adults: adults, children: children,
      minStay: HL.minStayFor(checkin),
      closedToArrival: HL.closedToArrival(checkin),
      results: [], available: 0
    };

    HL.ROOMS.forEach(function (room) {
      var r = { room: room, ok: false, reason: null, nights: [], full: [] };

      list.forEach(function (iso) {
        var free = HL.freeOn(room, iso);
        r.nights.push({ iso: iso, free: free, rate: HL.rateFor(room, iso) });
        if (free <= 0) r.full.push(iso);
      });

      /* The two stated caps are the rule. An extra total capacity on top of
         them just meant the site advertised "4 adults + 2 children" and then
         refused four adults and one child. */
      if (adults > room.maxAdults || children > room.maxChildren) {
        r.reason = "occupancy";
      } else if (stay.closedToArrival) {
        r.reason = "cta";
      } else if (nights < stay.minStay) {
        r.reason = "minstay";
      } else if (r.full.length) {
        r.reason = "full";
      } else {
        r.ok = true;
        stay.available++;
      }

      if (r.ok || r.reason === "full") {
        r.subtotal = r.nights.reduce(function (n, x) { return n + x.rate; }, 0);
        r.avg = Math.round(r.subtotal / Math.max(1, nights));
      }
      stay.results.push(r);
    });

    return stay;
  };

  /* Price a chosen room on a chosen plan, taxes and all. */
  HL.quote = function (room, plan, checkin, checkout) {
    var list = HL.eachNight(checkin, checkout);
    var nights = list.length;
    var lines = list.map(function (iso) {
      var base = HL.rateFor(room, iso);
      return {
        iso: iso,
        base: base,
        rate: Math.round(base * plan.mult / 100) * 100 + plan.perNight,
        season: HL.seasonFor(iso)
      };
    });
    var room_total = lines.reduce(function (n, l) { return n + l.rate; }, 0);
    var saved = lines.reduce(function (n, l) { return n + l.base; }, 0) - room_total;
    var tax = Math.round(room_total * HL.TAX_RATE);
    var levy = HL.CITY_LEVY * nights;
    return {
      lines: lines, nights: nights, room_total: room_total, saved: saved,
      tax: tax, levy: levy, total: room_total + tax + levy,
      perNight: Math.round(room_total / Math.max(1, nights))
    };
  };

  /* The cheapest nightly rate anywhere in the next 90 days, for "from" prices. */
  HL.fromRate = function (room) {
    var best = Infinity, t = HL.today();
    for (var i = 1; i < 90; i++) {
      var iso = HL.addDays(t, i);
      var r = HL.rateFor(room, iso);
      if (r < best) best = r;
    }
    return best;
  };

  /* Next date the room can actually be sold for `nights` nights. */
  HL.nextOpening = function (room, fromIso, nights, adults, children) {
    for (var i = 0; i < 120; i++) {
      var ci = HL.addDays(fromIso, i);
      if (HL.closedToArrival(ci)) continue;
      var need = Math.max(nights, HL.minStayFor(ci));
      var co = HL.addDays(ci, need);
      var ok = HL.eachNight(ci, co).every(function (n) { return HL.freeOn(room, n) > 0; });
      if (ok) return { checkin: ci, checkout: co, nights: need };
    }
    return null;
  };
})();
