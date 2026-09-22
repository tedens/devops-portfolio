/* GANTRY: the size planner.

   State is a bag of {itemId: quantity} plus two packing assumptions. Every
   render re-packs from scratch, which is cheap and means the drawing can
   never disagree with the verdict. */

(function () {
  "use strict";

  var counts = {};
  var opts = { stacking: true, walkway: false };
  var forced = null;          /* a size the visitor asked to see it in */

  var planCanvas = document.getElementById("plan-canvas");
  var planTitle  = document.getElementById("plan-title");
  var planSub    = document.getElementById("plan-sub");
  var planSqft   = document.getElementById("plan-sqft");
  var planFill   = document.getElementById("plan-fill");
  var planPct    = document.getElementById("plan-pct");
  var planBoxes  = document.getElementById("plan-boxnote");
  var planVerdict= document.getElementById("plan-verdict");
  var planLegend = document.getElementById("plan-legend");
  var picker     = document.getElementById("picker");

  function total() {
    return Object.keys(counts).reduce(function (n, k) { return n + counts[k]; }, 0);
  }

  /* ---- Picker ------------------------------------------------------------ */

  function buildPicker() {
    picker.innerHTML = ST.GROUPS.map(function (g) {
      var items = ST.itemsInGroup(g.id);
      return '<details class="picker__group" data-group="' + g.id + '">' +
        "<summary>" +
          '<i aria-hidden="true" style="width:14px;height:14px;border-radius:4px;flex:none;background:' + g.colour + '"></i>' +
          "<span>" + g.name + "</span>" +
          '<span class="picker__count" data-gcount="' + g.id + '" hidden>0</span>' +
        "</summary>" +
        items.map(itemRow).join("") +
      "</details>";
    }).join("");
  }

  function itemRow(item) {
    var dim = item.w + " &times; " + item.d + " ft";
    return '<div class="itemrow" data-row="' + item.id + '">' +
      "<div>" +
        '<div class="itemrow__name">' + ST.esc(item.name) + "</div>" +
        '<div class="itemrow__dim">' + dim + (item.note ? " &middot; " + ST.esc(item.note) : "") + "</div>" +
      "</div>" +
      '<div class="qty">' +
        '<button type="button" data-step="-1" data-item="' + item.id + '" aria-label="One fewer ' + ST.esc(item.name).toLowerCase() + '" disabled>&minus;</button>' +
        '<output data-out="' + item.id + '" aria-label="' + ST.esc(item.name) + '">0</output>' +
        '<button type="button" data-step="1" data-item="' + item.id + '" aria-label="One more ' + ST.esc(item.name).toLowerCase() + '">+</button>' +
      "</div>" +
    "</div>";
  }

  picker.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-step]");
    if (!btn) return;
    var id = btn.getAttribute("data-item");
    var next = (counts[id] || 0) + (+btn.getAttribute("data-step"));
    if (next <= 0) delete counts[id]; else counts[id] = Math.min(99, next);
    forced = null;
    syncPicker();
    render();
  });

  function syncPicker() {
    ST.ITEMS.forEach(function (item) {
      var n = counts[item.id] || 0;
      var out = picker.querySelector('[data-out="' + item.id + '"]');
      if (out) out.textContent = n;
      var row = picker.querySelector('[data-row="' + item.id + '"]');
      if (row) row.classList.toggle("is-on", n > 0);
      var minus = picker.querySelector('[data-step="-1"][data-item="' + item.id + '"]');
      if (minus) minus.disabled = n === 0;
    });
    ST.GROUPS.forEach(function (g) {
      var n = ST.itemsInGroup(g.id).reduce(function (s, i) { return s + (counts[i.id] || 0); }, 0);
      var badge = picker.querySelector('[data-gcount="' + g.id + '"]');
      if (badge) { badge.textContent = n; badge.hidden = n === 0; }
      var det = picker.querySelector('[data-group="' + g.id + '"]');
      if (det && n > 0) det.open = true;
    });
  }

  /* ---- Presets ----------------------------------------------------------- */

  var presetWrap = document.getElementById("presets");
  presetWrap.innerHTML = ST.PRESETS.map(function (p) {
    return '<button class="chip" type="button" data-preset="' + p.id + '" aria-pressed="false">' +
      ST.esc(p.name) + " <small>" + ST.esc(p.hint) + "</small></button>";
  }).join("");

  presetWrap.addEventListener("click", function (e) {
    var b = e.target.closest("[data-preset]");
    if (!b) return;
    loadPreset(b.getAttribute("data-preset"));
  });

  function loadPreset(id) {
    var p = ST.PRESETS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    counts = {};
    Object.keys(p.items).forEach(function (k) { counts[k] = p.items[k]; });
    forced = null;
    presetWrap.querySelectorAll("[data-preset]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-preset") === id));
    });
    syncPicker();
    render();
  }

  document.getElementById("clear-all").addEventListener("click", function () {
    counts = {}; forced = null;
    presetWrap.querySelectorAll("[data-preset]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    syncPicker();
    render();
  });

  document.getElementById("opt-stack").addEventListener("change", function (e) {
    opts.stacking = e.target.checked; render();
  });
  document.getElementById("opt-walk").addEventListener("change", function (e) {
    opts.walkway = e.target.checked; render();
  });

  /* ---- Render ------------------------------------------------------------ */

  function render() {
    var n = total();

    if (!n) {
      planTitle.textContent = "Add something to start";
      planSub.textContent = "Seen from above · door on the left";
      planSqft.textContent = "–";
      planCanvas.innerHTML = ST.planSVG(ST.pack({}, ST.sizeById("10x10"), opts), { id: "tool" });
      planFill.style.width = "0%";
      planFill.className = "planbar__fill";
      planPct.textContent = "0%";
      planBoxes.textContent = "";
      planVerdict.innerHTML = verdict("empty",
        "Nothing in it yet",
        "Pick a typical load above, or add things one at a time. The plan redraws as you go.");
      planLegend.innerHTML = "";
      var chips = document.getElementById("plan-sizes");
      if (chips) chips.hidden = true;
      return;
    }

    var rec = ST.recommend(counts, opts);
    var size = forced || (rec ? rec.size : ST.SIZES[ST.SIZES.length - 1]);
    var res = ST.pack(counts, size, opts);

    planTitle.textContent = size.name + " ft";
    planSub.textContent = size.nick + " · " + (res.walk ? res.walk + " ft walkway kept clear" : "packed solid");
    planSqft.textContent = ST.sqft(size) + " sq ft";
    planCanvas.innerHTML = ST.planSVG(res, { id: "tool" });

    var pct = Math.min(100, Math.round(res.fill * 100));
    planFill.style.width = pct + "%";
    planFill.className = "planbar__fill" + (res.fits ? (pct >= 88 ? " is-tight" : "") : " is-over");
    planPct.textContent = pct + "%";
    planBoxes.textContent = res.boxes
      ? (res.overhead >= res.boxes
          ? "All " + res.boxes + " boxes go on top of the furniture"
          : res.overhead + " of " + res.boxes + " boxes on top, " + res.columns +
            " column" + (res.columns === 1 ? "" : "s") + " on the floor")
      : "";

    planVerdict.innerHTML = verdictFor(res, rec, size);
    planLegend.innerHTML = legendFor(res);
    renderSizeChips(rec, size);
  }

  function verdict(kind, title, body, action) {
    var icon = kind === "over" ? "cross" : kind === "tight" ? "alert" : kind === "empty" ? "info" : "check";
    return '<div class="verdict verdict--' + kind + '">' + ST.icon(icon, 22) +
      "<div><strong>" + title + "</strong><p>" + body + "</p>" + (action || "") + "</div></div>";
  }

  function verdictFor(res, rec, size) {
    var extra = res.needsDriveUp
      ? " A vehicle also needs a <a href=\"units.html?access=driveup\">drive-up unit</a>. You can't get one down a corridor."
      : "";

    if (res.blocked.length) {
      var names = phrase(res.blocked.map(function (b) { return b.item; }));
      var bigger = ST.SIZES.filter(function (s) { return s.w >= 10; })[0];
      return verdict("over",
        "That won't go through the door",
        "A " + size.w + " ft unit has a " + res.doorW + " ft swing door, and the " +
        names + " can't be angled through it however much floor is spare. " +
        "You need a 10 ft wide unit, which has an 8 ft roller.",
        '<a class="btn btn--sm" href="#" data-try="' + bigger.id + '">Try a ' + bigger.name + "</a>");
    }

    if (!res.fits) {
      var leftNames = phrase(res.over.map(function (f) { return f.item; }));
      var act = rec && rec.size.id !== size.id
        ? '<a class="btn btn--sm" href="#" data-try="' + rec.size.id + '">Show me the ' + rec.size.name + "</a>"
        : "";
      return verdict("over",
        "Too much for a " + size.name,
        (rec
          ? "The " + leftNames + " won't go in. The smallest that takes the lot is a <strong>" +
            rec.size.name + "</strong>."
          : "Even our largest unit, the 10 &times; 30, won't take all of this. Two units is the usual answer. " +
            "<a href=\"tel:+15550182400\">give us a call</a> and we'll work out the cheapest pair.") + extra,
        act);
    }

    var pct = Math.round(res.fill * 100);
    var detail = "Floor is " + pct + "% used" +
      (res.overhead ? ", with " + res.overhead + " box" + (res.overhead === 1 ? "" : "es") + " stacked on top of the furniture" : "") + ".";

    if (pct >= 88) {
      var next = nextSize(res.size);
      return verdict("tight",
        "It fits a " + res.size.name + ", but only just",
        detail + " There's very little room to move once it's in. If you'll need to get at anything, take the " +
        (next ? next.name : "next size up") + "." + extra,
        next ? '<a class="btn btn--sm btn--outline" href="#" data-try="' + next.id + '">See the ' + next.name + "</a>" : "");
    }

    return verdict("fits",
      "A " + res.size.name + " takes all of it",
      detail + extra,
      '<a class="btn btn--sm" href="units.html?size=' + res.size.id + '">See ' + res.size.name + " units and prices</a>");
  }

  function legendFor(res) {
    var seen = {};
    res.placed.forEach(function (p) { seen[p.item.g] = (seen[p.item.g] || 0) + 1; });
    var parts = ST.GROUPS.filter(function (g) { return seen[g.id]; }).map(function (g) {
      return "<span><i style=\"background:" + g.colour + "\"></i>" + g.name + "</span>";
    });
    if (res.walk) parts.push('<span><i style="background:repeating-linear-gradient(45deg,#9aa6b8 0 2px,transparent 2px 5px)"></i>Walkway</span>');
    return parts.join("");
  }

  /* Chips to force a different size, so people can check their own hunch. */
  function renderSizeChips(rec, current) {
    var host = document.getElementById("plan-sizes");
    if (!host) {
      host = document.createElement("div");
      host.id = "plan-sizes";
      host.className = "chipset mt-4";
      host.setAttribute("role", "group");
      host.setAttribute("aria-label", "See this load in another size");
      planLegend.parentNode.insertBefore(host, planLegend);
    }
    host.hidden = false;
    host.innerHTML = ST.SIZES.map(function (s) {
      return '<button class="chip" type="button" data-try="' + s.id + '" aria-pressed="' +
        (s.id === current.id) + '">' + s.name +
        (rec && s.id === rec.size.id ? " <small>best fit</small>" : "") + "</button>";
    }).join("");
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-try]");
    if (!t) return;
    e.preventDefault();
    forced = ST.sizeById(t.getAttribute("data-try"));
    render();
    planCanvas.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  function nextSize(size) {
    var i = ST.SIZES.map(function (s) { return s.id; }).indexOf(size.id);
    return ST.SIZES[i + 1] || null;
  }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  /* Names up to the first comma: "Mattress, double" is a useful label in a
     list of things to buy and an unreadable one in a sentence. Three names,
     then a count. A list of eleven is a wall nobody reads. */
  function phrase(items) {
    var names = uniq(items.map(function (i) { return i.name.split(",")[0].toLowerCase(); }));
    var shown = names.slice(0, 3);
    var rest = names.length - shown.length;
    var head = shown.length === 1 ? shown[0]
      : shown.slice(0, -1).join(", ") + " and " + shown[shown.length - 1];
    if (!rest) return head;
    return shown.join(", ") + " and " + rest + " other thing" + (rest === 1 ? "" : "s");
  }

  /* ---- The size ladder, below the tool ----------------------------------- */

  var cards = document.getElementById("size-cards");
  if (cards) {
    cards.innerHTML = ST.SIZES.map(function (size) {
      var types = ST.typesForSize(size.id);
      var cheapest = types.reduce(function (a, t) { return (!a || t.rate < a.rate) ? t : a; }, null);
      var free = types.reduce(function (n, t) { return n + ST.remaining(t); }, 0);
      var door = ST.doorWidthFor(size);
      return '<article class="panel" data-reveal>' +
        '<div class="flex-between">' +
          "<div><h3>" + size.name + ' ft</h3><span class="utile__sub">' + ST.sqft(size) +
            " sq ft &middot; " + size.nick + "</span></div>" +
          '<div class="utile__price"><b>' + ST.money(cheapest.rate) + "</b><span>from, per month</span></div>" +
        "</div>" +
        '<div style="max-width:220px;margin-top:var(--sp-4)">' + ST.elevationSVG(cheapest) + "</div>" +
        "<p class=\"muted mt-4\" style=\"font-size:var(--step--1)\">" + ST.esc(size.blurb) + "</p>" +
        '<div class="tags mt-4">' +
          '<span class="tag">About ' + ST.esc(size.like.toLowerCase()) + "</span>" +
          '<span class="tag">' + door + " ft " + (door >= 8 ? "roller" : "swing") + " door</span>" +
          '<span class="avail' + (ST.availClass(free) ? " avail--" + ST.availClass(free) : "") + '">' +
            ST.availLabel(free) + "</span>" +
        "</div>" +
        '<div class="btn-row mt-5">' +
          '<a class="btn btn--sm btn--outline" href="#" data-try="' + size.id + '">Plan this size</a>' +
          '<a class="btn btn--sm" href="units.html?size=' + size.id + '">See what\'s free</a>' +
        "</div>" +
      "</article>";
    }).join("");
    ST.revealIn(cards);
  }

  /* ---- Go -------------------------------------------------------------- */

  buildPicker();
  syncPicker();
  var load = ST.qs("load");
  if (load) loadPreset(load); else render();
})();
