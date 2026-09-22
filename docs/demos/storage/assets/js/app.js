/* GANTRY SELF STORAGE: shared behaviour and shared drawing.
   Progressive enhancement throughout: every page is readable and navigable
   with this file blocked. */

window.ST = window.ST || {};

(function () {
  "use strict";

  /* ---- Query string ------------------------------------------------------ */

  ST.qs = function (name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  };

  /* ---- Mobile drawer ----------------------------------------------------- */

  var drawer = document.getElementById("drawer");
  var toggle = document.querySelector(".nav-toggle");
  var lastFocused = null;

  function focusablesIn(el) {
    return Array.prototype.filter.call(
      el.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null; });
  }

  function openDrawer() {
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    drawer.removeAttribute("aria-hidden");
    document.body.classList.add("is-locked");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    var f = focusablesIn(drawer)[0];
    if (f) f.focus();
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (lastFocused) lastFocused.focus();
  }

  if (drawer && toggle) {
    toggle.addEventListener("click", function () {
      drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
    });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("[data-drawer-close]") || e.target.classList.contains("drawer__scrim")) closeDrawer();
    });
    document.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;
      if (e.key === "Escape") { closeDrawer(); return; }
      if (e.key !== "Tab") return;
      var items = focusablesIn(drawer);
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.matchMedia("(min-width: 980px)").addEventListener("change", function (m) {
      if (m.matches && drawer.classList.contains("is-open")) closeDrawer();
    });
  }

  /* ---- Reveal ------------------------------------------------------------ */

  ST.revealIn = function (root) {
    root = root || document;
    var els = Array.prototype.slice.call(root.querySelectorAll("[data-reveal]:not(.is-revealed)"));
    /* The root itself may be the thing that needs revealing. It is whenever a
       page fills a [data-reveal] container with markup and then asks for a
       pass over it. */
    if (root.matches && root.matches("[data-reveal]:not(.is-revealed)")) els.unshift(root);
    if (!els.length) return;
    if (!("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach(function (el) { el.classList.add("is-revealed"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    els.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 4, 3) * 70 + "ms";
      io.observe(el);
    });
  };

  /* ---- Icons ------------------------------------------------------------- */

  var ICONS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    info:  '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    cross: '<path d="M18 6 6 18M6 6l12 12"/>',
    lock:  '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    shield:'<path d="M12 3 5 6v6c0 4 3 7.4 7 9 4-1.6 7-5 7-9V6z"/>',
    truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    temp:  '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    stairs:'<path d="M3 20h5v-4h5v-4h5V8h3"/>',
    door:  '<path d="M4 20h16M6 20V4h9v16"/><circle cx="12.5" cy="12" r="1"/>',
    key:   '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15 12v2"/>',
    camera:'<path d="M3 8h13l5 3-5 3H3z"/><path d="M6 14v5"/>',
    ruler: '<path d="m3 15 12-12 6 6-12 12z"/><path d="m7 11 2 2M10 8l2 2M13 5l2 2"/>',
    box:   '<path d="M3 8 12 4l9 4-9 4z"/><path d="M3 8v8l9 4 9-4V8"/><path d="M12 12v8"/>'
  };

  ST.icon = function (name, size) {
    var s = size || 20;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  };

  /* ---- Floor plan --------------------------------------------------------
     Drawn straight from a pack() result. Depth runs left to right with the
     door on the left, which is how you look at a unit when you back a van up
     to it.

     No text inside the plan: a 10 x 30 rendered into a phone-width column is
     about 110px tall, and any label small enough to fit would be unreadable.
     Colour carries the grouping, the legend names it, and every rectangle
     carries a <title> so a pointer or a screen reader gets the detail. */

  var S = 10;      /* svg units per foot */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  ST.esc = esc;

  ST.planSVG = function (res, opts) {
    opts = opts || {};
    var uid = opts.id || "plan";
    /* Left padding only, for the door furniture. Dimension text lives in HTML
       beside the drawing: text inside the SVG scales with the viewBox, so the
       same font size renders enormous on a 5 x 5 and illegible on a 10 x 30. */
    var padL = 17, padT = 6, padR = 6, padB = 6;
    var w = res.D * S, h = res.W * S;
    var vbW = w + padL + padR, vbH = h + padT + padB;
    var ox = padL, oy = padT;
    var out = [];

    out.push('<svg class="plan__svg" viewBox="0 0 ' + vbW + ' ' + vbH + '" role="img" ' +
      'aria-label="' + esc(opts.label || ("Floor plan of a " + res.size.name + " foot unit, " +
        res.placed.length + " items laid out")) + '">');

    out.push('<defs><pattern id="' + uid + '-hatch" width="8" height="8" patternUnits="userSpaceOnUse" ' +
      'patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa6b8" stroke-width="2" stroke-opacity=".5"/></pattern></defs>');

    /* Floor + walls */
    out.push('<rect x="' + ox + '" y="' + oy + '" width="' + w + '" height="' + h +
      '" fill="#ffffff" stroke="#0f1b2d" stroke-width="2.5"/>');

    /* 5 ft grid */
    var g = [];
    for (var fx = 5; fx < res.D; fx += 5) g.push('M' + (ox + fx * S) + ' ' + oy + 'v' + h);
    for (var fy = 5; fy < res.W; fy += 5) g.push('M' + ox + ' ' + (oy + fy * S) + 'h' + w);
    if (g.length) out.push('<path d="' + g.join("") + '" stroke="#dde3ea" stroke-width="1"/>');

    /* Walkway */
    if (res.walk > 0) {
      out.push('<rect x="' + ox + '" y="' + (oy + res.usable * S) + '" width="' + w +
        '" height="' + (res.walk * S) + '" fill="url(#' + uid + '-hatch)">' +
        "<title>Walkway kept clear, " + res.walk + " ft</title></rect>");
    }

    /* Contents. x runs across the width and y along the depth in the packer,
       so the two swap for a drawing with the door on the left. */
    res.placed.forEach(function (p) {
      var grp = ST.groupById(p.item.g);
      var X = ox + p.y * S, Y = oy + p.x * S, PW = p.d * S, PH = p.w * S;
      var pad = (p.pad || 0) * S;
      if (pad > 0) {
        out.push('<rect x="' + X + '" y="' + Y + '" width="' + PW + '" height="' + PH +
          '" rx="2" fill="none" stroke="' + grp.dark + '" stroke-width="1.2" stroke-dasharray="5 4" stroke-opacity=".7">' +
          "<title>Room to get round it</title></rect>");
        X += pad / 2; Y += pad / 2; PW -= pad; PH -= pad;
      }
      var label = p.kind === "boxes"
        ? "Boxes, stacked " + p.high + " high"
        : p.item.name + (p.high > 1 ? " × " + p.high + ", stacked" : "") +
          ". " + p.item.w + " × " + p.item.d + " ft";
      out.push('<rect x="' + X + '" y="' + Y + '" width="' + PW + '" height="' + PH +
        '" rx="2" fill="' + grp.colour + '" fill-opacity="' + (p.kind === "boxes" ? ".78" : ".92") +
        '" stroke="' + grp.dark + '" stroke-width="1.3"><title>' + esc(label) + '</title></rect>');
    });

    /* The door, on the left wall */
    var dw = (opts.doorW || res.doorW || ST.doorWidthFor(res.size)) * S;
    var dy = oy + (h - dw) / 2;
    out.push('<rect x="' + (ox - 5) + '" y="' + dy + '" width="5" height="' + dw + '" fill="#ff6a13"/>');
    var slats = [];
    for (var i = 1; i <= 3; i++) slats.push('M' + (ox - 5 - i * 3.4) + ' ' + dy + 'v' + dw);
    out.push('<path d="' + slats.join("") + '" stroke="#ff6a13" stroke-width="1.5" stroke-opacity="' +
      (0.5) + '"><title>' + (opts.doorLabel || (dw / S + " ft door")) + "</title></path>");

    out.push("</svg>");
    return out.join("");
  };

  /* ---- Unit elevation ----------------------------------------------------
     What you see standing in front of it: the opening, at the right width and
     height, with a 5 ft 10 person beside it. The person is the whole point –
     "8 ft roller door" means nothing to most people. */

  ST.elevationSVG = function (type, opts) {
    opts = opts || {};
    var ceil = type.ceiling, unitW = type.size.w;
    var pad = 1.2, personW = 2.2;
    var totalW = unitW + personW + pad * 2.2;
    var vbW = totalW * S, vbH = (ceil + 1.6) * S;
    var ground = (ceil + 0.9) * S;
    var ox = pad * S;
    var o = [];

    o.push('<svg viewBox="0 0 ' + vbW + ' ' + vbH + '" role="img" aria-label="' +
      esc(type.size.name + " unit, " + type.door.type.toLowerCase() + " door " + type.door.w +
          " feet wide and " + type.door.h + " feet high, shown next to a person for scale") + '">');

    /* Building face */
    o.push('<rect x="' + ox + '" y="' + (ground - ceil * S) + '" width="' + (unitW * S) +
      '" height="' + (ceil * S) + '" rx="3" fill="#ffffff" stroke="#c6d0dc" stroke-width="2"/>');

    /* Opening */
    var dW = type.door.w * S, dH = type.door.h * S;
    var dx = ox + (unitW * S - dW) / 2, dy = ground - dH;
    o.push('<rect x="' + dx + '" y="' + dy + '" width="' + dW + '" height="' + dH +
      '" rx="2" fill="#0f1b2d"/>');

    if (type.door.type === "Roller") {
      var lines = [];
      for (var y = dy + 6; y < ground - 4; y += 7) lines.push('M' + (dx + 3) + ' ' + y + 'h' + (dW - 6));
      o.push('<path d="' + lines.join("") + '" stroke="#f3f6fa" stroke-width="1.6" stroke-opacity=".22"/>');
      o.push('<rect x="' + (dx - 2) + '" y="' + (dy - 5) + '" width="' + (dW + 4) + '" height="6" rx="2" fill="#ff6a13"/>');
      o.push('<rect x="' + (dx + dW / 2 - 9) + '" y="' + (ground - 14) + '" width="18" height="4" rx="2" fill="#ff6a13"/>');
    } else {
      o.push('<rect x="' + (dx + 3) + '" y="' + (dy + 3) + '" width="' + (dW - 6) + '" height="' + (dH - 6) +
        '" rx="2" fill="none" stroke="#f3f6fa" stroke-width="1.4" stroke-opacity=".3"/>');
      o.push('<circle cx="' + (dx + dW - 7) + '" cy="' + (dy + dH / 2) + '" r="2.6" fill="#ff6a13"/>');
      o.push('<path d="M' + (dx + 2) + ' ' + (dy + 8) + 'h4M' + (dx + 2) + ' ' + (dy + dH - 8) + 'h4" stroke="#ff6a13" stroke-width="2"/>');
    }

    /* Person, 5 ft 10 */
    var ph = 5.83 * S;
    var px = ox + unitW * S + 0.9 * S;
    var head = 0.62 * S;
    o.push('<g fill="#8ea4bc">');
    o.push('<circle cx="' + (px + head) + '" cy="' + (ground - ph + head * 0.9) + '" r="' + head + '"/>');
    o.push('<path d="M' + (px + head * 0.18) + ' ' + (ground) +
      'v-' + (ph - head * 2.1) +
      'a' + (head * 0.82) + ' ' + (head * 0.82) + ' 0 0 1 ' + (head * 1.64) + ' 0' +
      'v' + (ph - head * 2.1) + 'z"/>');
    o.push("</g>");

    /* Ground line */
    o.push('<path d="M2 ' + ground + 'H' + (vbW - 2) + '" stroke="#9aa6b8" stroke-width="2.4" stroke-linecap="round"/>');

    /* Height tick */
    o.push('<path d="M' + (ox - 7) + ' ' + (ground - ceil * S) + 'h5M' + (ox - 7) + ' ' + ground + 'h5M' +
      (ox - 4.5) + ' ' + (ground - ceil * S) + 'V' + ground + '" stroke="#74829a" stroke-width="1.2"/>');

    o.push("</svg>");
    return o.join("");
  };

  /* ---- Unit tile ---------------------------------------------------------- */

  ST.featureTags = function (type) {
    var t = [];
    if (type.climate) t.push('<span class="tag tag--go">Climate controlled</span>');
    if (type.access === "driveup") t.push('<span class="tag tag--orange">Drive-up</span>');
    if (type.access === "ground") t.push('<span class="tag">Ground floor</span>');
    if (type.access === "upper") t.push('<span class="tag">Upper floor, lift</span>');
    return t.join("");
  };

  ST.unitTileHTML = function (type) {
    var free = ST.remaining(type);
    var cls = ST.availClass(free);
    var gone = free === 0;
    var href = "unit.html?id=" + encodeURIComponent(type.id);
    return '' +
      '<article class="utile' + (gone ? " utile--gone" : "") + '">' +
        '<div class="utile__art">' + ST.elevationSVG(type) +
          '<span class="utile__avail avail' + (cls ? " avail--" + cls : "") + '">' + ST.availLabel(free) + "</span>" +
        "</div>" +
        '<div class="utile__body">' +
          '<div class="utile__top">' +
            "<div><span class=\"utile__size\">" + type.size.name + "</span>" +
              '<span class="utile__sub">' + ST.sqft(type.size) + " sq ft &middot; " + type.ceiling + " ft high</span></div>" +
            '<div class="utile__price"><b>' + ST.money(type.rate) + "</b><span>per month</span></div>" +
          "</div>" +
          '<div class="tags">' + ST.featureTags(type) + "</div>" +
          '<p class="utile__desc">' + esc(type.size.blurb) + "</p>" +
          '<div class="utile__foot">' +
            (gone
              ? '<a class="btn btn--outline" href="' + href + '">See this size</a>'
              : '<a class="btn btn--outline" href="' + href + '">Details</a>' +
                '<a class="btn" href="reserve.html?id=' + encodeURIComponent(type.id) + '">Reserve</a>') +
          "</div>" +
        "</div>" +
      "</article>";
  };

  /* ---- Cost breakdown ----------------------------------------------------
     Shared by the unit page and the reservation form so the two can never
     quote different numbers for the same unit. */

  ST.breakdownHTML = function (q, iso) {
    function row(label, value, cls) {
      return '<div class="breakdown__row' + (cls ? " " + cls : "") + '"><span>' + label +
        "</span><span>" + value + "</span></div>";
    }
    var pr = q.proRent;
    var part = pr.charged < pr.days;
    var out = [];

    out.push(row(part
      ? "Rent, " + pr.charged + " of " + pr.days + " days in " + ST.fmtMonth(iso)
      : "Rent, all of " + ST.fmtMonth(iso), ST.money(pr.cents)));
    out.push(row(ST.money(q.rent) + " a month" +
      (q.saved > 0 ? ", down from " + ST.money(q.fullRate) : ""), "", "breakdown__row--sub"));

    if (q.protection.monthly > 0) {
      out.push(row("Cover, " + q.protection.name.toLowerCase() +
        (part ? ", same " + pr.charged + " days" : ""), ST.money(q.proProt.cents)));
    } else {
      out.push(row("Cover", "Your own policy"));
    }
    out.push(row("Admin fee, one off", ST.money(q.admin)));
    if (q.lock) out.push(row("Disc lock", ST.money(q.lock)));
    out.push(row("Deposit", "None"));

    out.push('<div class="breakdown__total"><span>Pay on move-in day</span><b>' +
      ST.money(q.today) + "</b></div>");
    out.push('<div class="breakdown__then"><span>Then monthly from ' +
      ST.fmtDate(q.firstFullIso, { month: "long", day: "numeric" }) + "</span><b>" +
      ST.money(q.monthly) + "</b></div>");
    return out.join("");
  };

  ST.termButtonsHTML = function (type, current) {
    return ST.TERMS.map(function (t) {
      var rate = ST.rentFor(type, t.id);
      var save = type.rate - rate;
      return '<button class="term" type="button" data-term="' + t.id + '" aria-pressed="' +
        (t.id === current) + '">' +
        '<span class="term__name">' + t.name + "</span>" +
        '<span class="term__price">' + ST.money(rate) + "</span>" +
        '<span class="term__save' + (save ? "" : " term__save--none") + '">' +
          (save ? "save " + ST.money(save) + "/mo" : "no tie-in") + "</span>" +
      "</button>";
    }).join("");
  };

  /* Sixty days out is as far ahead as the office will hold a rate. */
  ST.dateBounds = function () {
    var t = ST.today();
    return { min: ST.toIso(t), max: ST.toIso(ST.addDays(t, 60)) };
  };
  ST.clampDate = function (iso) {
    var b = ST.dateBounds();
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return b.min;
    if (iso < b.min) return b.min;
    if (iso > b.max) return b.max;
    return iso;
  };

  /* ---- Misc --------------------------------------------------------------- */

  document.querySelectorAll("[data-icon]").forEach(function (el) {
    el.innerHTML = ST.icon(el.getAttribute("data-icon"), el.getAttribute("data-icon-size") || 32);
  });

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Facility-wide availability, used in the top strip. */
  document.querySelectorAll("[data-free-total]").forEach(function (el) {
    el.textContent = ST.countFree();
  });

  ST.revealIn(document);
})();
