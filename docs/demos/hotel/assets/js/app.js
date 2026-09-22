/* THE LUMEN: shared chrome, the search bar, and the shared room renderers. */

window.HL = window.HL || {};

(function () {
  "use strict";

  HL.qs = function (name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  };

  HL.esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  /* ---- Drawer ------------------------------------------------------------ */

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
    window.matchMedia("(min-width: 1000px)").addEventListener("change", function (m) {
      if (m.matches && drawer.classList.contains("is-open")) closeDrawer();
    });
  }

  /* ---- Reveal ------------------------------------------------------------ */

  HL.revealIn = function (root) {
    root = root || document;
    var els = Array.prototype.slice.call(root.querySelectorAll("[data-reveal]:not(.is-revealed)"));
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
      el.style.transitionDelay = Math.min(i % 3, 2) * 80 + "ms";
      io.observe(el);
    });
  };

  var ICONS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    info:  '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    cross: '<path d="M18 6 6 18M6 6l12 12"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5M17 20a6 6 0 0 0-2-4.4"/>',
    bed:   '<path d="M3 18V7M3 12h18v6M21 18v-4"/><circle cx="7.5" cy="10" r="1.8"/><path d="M11 12V9.5h7A3 3 0 0 1 21 12"/>',
    area:  '<path d="M4 4h16v16H4z"/><path d="M4 9h5V4M20 15h-5v5"/>'
  };
  HL.icon = function (name, size) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  };

  /* ---- Search bar --------------------------------------------------------
     Shared by the homepage, the rooms page and the booking page. Checkout is
     dragged along behind check-in rather than being allowed to go invalid,
     and it is nudged out to the minimum stay for the arrival date, because a
     date picker that lets you pick an unsellable stay is just a slower way of
     saying no. */

  HL.defaults = function () {
    var ci = HL.addDays(HL.today(), 21);
    while (HL.closedToArrival(ci)) ci = HL.addDays(ci, 1);
    return { checkin: ci, checkout: HL.addDays(ci, Math.max(2, HL.minStayFor(ci))),
             adults: 2, children: 0 };
  };

  HL.readQuery = function () {
    var d = HL.defaults();
    var ci = HL.qs("checkin"), co = HL.qs("checkout");
    var ok = /^\d{4}-\d{2}-\d{2}$/;
    var q = {
      checkin: ok.test(ci || "") ? ci : d.checkin,
      checkout: ok.test(co || "") ? co : d.checkout,
      adults: Math.min(4, Math.max(1, parseInt(HL.qs("adults"), 10) || d.adults)),
      children: Math.min(2, Math.max(0, parseInt(HL.qs("children"), 10) || 0))
    };
    if (HL.nights(q.checkin, q.checkout) < 1) q.checkout = HL.addDays(q.checkin, 1);
    return q;
  };

  HL.queryString = function (q, extra) {
    var p = ["checkin=" + q.checkin, "checkout=" + q.checkout,
             "adults=" + q.adults, "children=" + q.children];
    if (extra) Object.keys(extra).forEach(function (k) {
      if (extra[k] != null) p.push(k + "=" + encodeURIComponent(extra[k]));
    });
    return p.join("&");
  };

  HL.wireSearchbar = function (form, opts) {
    opts = opts || {};
    var state = opts.state || HL.readQuery();
    var ci = form.querySelector('[name="checkin"]');
    var co = form.querySelector('[name="checkout"]');
    var note = form.querySelector("[data-searchnote]");
    var maxIso = HL.addDays(HL.today(), 400);

    ci.min = HL.today(); ci.max = maxIso;
    co.max = HL.addDays(maxIso, 14);

    function paint() {
      ci.value = state.checkin;
      co.value = state.checkout;
      co.min = HL.addDays(state.checkin, 1);
      form.querySelectorAll("[data-out]").forEach(function (o) {
        o.textContent = state[o.getAttribute("data-out")];
      });
      form.querySelectorAll("[data-guest]").forEach(function (b) {
        var k = b.getAttribute("data-guest"), d = +b.getAttribute("data-delta");
        var lim = k === "adults" ? [1, 4] : [0, 2];
        b.disabled = (d < 0 && state[k] <= lim[0]) || (d > 0 && state[k] >= lim[1]);
      });
      if (note) note.innerHTML = hint();
    }

    function hint() {
      var n = HL.nights(state.checkin, state.checkout);
      var min = HL.minStayFor(state.checkin);
      var s = HL.seasonFor(state.checkin);
      var bits = [n + " night" + (n === 1 ? "" : "s") + " · " + s.name.toLowerCase() + " season"];
      if (HL.closedToArrival(state.checkin)) {
        bits.push("<strong>stays can't start on a peak Saturday</strong>");
      } else if (min > 1) {
        bits.push(min + "-night minimum for this arrival date");
      }
      return bits.join(" · ");
    }

    ci.addEventListener("change", function () {
      if (!ci.value) return;
      state.checkin = HL.clampIso(ci.value);
      var need = Math.max(1, HL.minStayFor(state.checkin));
      if (HL.nights(state.checkin, state.checkout) < need) {
        state.checkout = HL.addDays(state.checkin, need);
      }
      paint();
    });
    co.addEventListener("change", function () {
      if (!co.value) return;
      state.checkout = co.value <= state.checkin ? HL.addDays(state.checkin, 1) : co.value;
      paint();
    });
    form.addEventListener("click", function (e) {
      var b = e.target.closest("[data-guest]");
      if (!b) return;
      var k = b.getAttribute("data-guest");
      var lim = k === "adults" ? [1, 4] : [0, 2];
      state[k] = Math.min(lim[1], Math.max(lim[0], state[k] + (+b.getAttribute("data-delta"))));
      paint();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (opts.onSubmit) opts.onSubmit(state);
      else window.location.href = "book.html?" + HL.queryString(state);
    });

    paint();
    return state;
  };

  HL.clampIso = function (iso) {
    var t = HL.today();
    return iso < t ? t : iso;
  };

  /* ---- Shared room renderers --------------------------------------------- */

  HL.roomImg = function (room, kind) {
    return "assets/img/" + room.id + "-" + (kind || "room") + ".jpg";
  };

  HL.roomAlt = function (room) {
    return room.name + ": a " + room.sqm + " square metre room with " +
      room.beds.toLowerCase() + ", rendered from a 3D model.";
  };

  HL.sleepsLine = function (room) {
    var s = room.maxAdults + " adult" + (room.maxAdults === 1 ? "" : "s");
    if (room.maxChildren) s += " + " + room.maxChildren + " child" + (room.maxChildren === 1 ? "" : "ren");
    return s;
  };

  HL.roomCardHTML = function (room, q) {
    var href = "room.html?id=" + room.id + (q ? "&" + HL.queryString(q) : "");
    var from = HL.fromRate(room);
    return '<article class="roomcard" data-reveal>' +
      '<a class="roomcard__art" href="' + href + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + HL.roomImg(room) + '" alt="" loading="lazy" width="1500" height="938">' +
      "</a>" +
      '<div class="roomcard__body">' +
        '<div class="roomcard__top">' +
          "<div><h3><a href=\"" + href + "\" style=\"text-decoration:none\">" + HL.esc(room.name) + "</a></h3>" +
            '<span class="roomcard__meta">' + room.sqm + " m² &middot; " + HL.esc(room.beds) +
            " &middot; " + HL.sleepsLine(room) + "</span></div>" +
          '<div class="roomcard__price"><b>' + HL.money(from) + "</b><span>from, per night</span></div>" +
        "</div>" +
        '<p class="roomcard__desc">' + HL.esc(room.blurb.split(". ")[0]) + ".</p>" +
        '<div class="roomcard__foot">' +
          '<a class="btn btn--ghost btn--sm" href="' + href + '">Details</a>' +
          '<a class="btn btn--sm" href="book.html?' + HL.queryString(q || HL.defaults(), { room: room.id }) + '">Check dates</a>' +
        "</div>" +
      "</div></article>";
  };

  /* ---- Why a room can't be sold ------------------------------------------
     Shared by the booking results and the room page. A hotel that just says
     "not available" makes you guess; naming the night, or the rule, turns a
     dead end into a one-day change of plan. */

  HL.reasonHTML = function (r, stay, q) {
    var room = r.room;
    var n = stay.nights;

    if (r.reason === "occupancy") {
      var asked = q.adults + " adult" + (q.adults === 1 ? "" : "s") +
        (q.children ? " and " + q.children + " child" + (q.children === 1 ? "" : "ren") : "");
      return "<strong>Too many people for this room.</strong> The " + HL.esc(room.name) +
        " sleeps " + HL.sleepsLine(room).toLowerCase() + ", and you've asked for " + asked + ".";
    }

    if (r.reason === "cta") {
      var fri = HL.addDays(stay.checkin, -1);
      return "<strong>Stays can't start on " + HL.fmt(stay.checkin, { weekday: "long", month: "long", day: "numeric" }) +
        ".</strong> A peak Saturday is held for guests already arriving on the Friday. " +
        "Arriving " + HL.fmt(fri, { weekday: "long", month: "long", day: "numeric" }) + " instead would work.";
    }

    if (r.reason === "minstay") {
      var s = HL.seasonFor(stay.checkin);
      var why = (HL.dow(stay.checkin) === 5 || HL.dow(stay.checkin) === 6)
        ? "A weekend arrival" : "An arrival in " + s.name.toLowerCase() + " season";
      return "<strong>" + why + " needs " + stay.minStay + " nights.</strong> " +
        "You've asked for " + n + ". " +
        "Selling a single weekend night leaves the nights either side unsellable, so they go together.";
    }

    if (r.reason === "full") {
      var days = r.full.map(function (d) { return HL.fmt(d, { weekday: "short", month: "short", day: "numeric" }); });
      var free = n - r.full.length;
      var list = days.length === 1 ? days[0]
        : days.length === 2 ? days[0] + " and " + days[1]
        : days.slice(0, -1).join(", ") + " and " + days[days.length - 1];
      var only = room.count === 1 ? "The only one is" : "All " + room.count + " are";
      return "<strong>Full on " + (days.length === 1 ? "one of your nights" : days.length + " of your nights") +
        ".</strong> " + (free > 0 ? "Free on " + free + " of " + n + ", but " : "") +
        only.toLowerCase() + " taken on " + list + ", and a stay needs every night.";
    }
    return "<strong>Not available for these dates.</strong>";
  };

  /* ---- Boot --------------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  document.querySelectorAll("[data-searchbar]").forEach(function (form) {
    if (!form.hasAttribute("data-wired")) {
      form.setAttribute("data-wired", "1");
      HL.wireSearchbar(form);
    }
  });

  HL.revealIn(document);
})();
