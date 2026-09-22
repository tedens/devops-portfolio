/* GANTRY, one unit type. The rail is the point of the page: term, move-in
   date and cover all change the two numbers that matter, and the arithmetic
   is shown rather than summarised. */

(function () {
  "use strict";

  var type = ST.typeById(ST.qs("id") || "");
  var head = document.getElementById("unit-head");

  if (!type) {
    head.innerHTML = "<h1 tabindex=\"-1\">We don't have that unit</h1>" +
      "<p class=\"muted mt-4\">The link may be old, or the size may have been retired. " +
      "<a href=\"units.html\">See everything that's free</a>.</p>";
    document.getElementById("unit-price").innerHTML =
      '<a class="btn btn--block" href="units.html">Back to the list</a>';
    ["unit-art", "unit-specs", "unit-fit", "unit-notes", "unit-alts"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    return;
  }

  var state = {
    term: ST.termById(ST.qs("term") || "monthly").id,
    date: ST.clampDate(ST.qs("date")),
    protection: ST.protectionById(ST.qs("p") || "p5").id,
    lock: ST.qs("lock") === "1"
  };

  var free = ST.remaining(type);
  var size = type.size;

  document.title = size.name + " " + (type.climate ? "climate-controlled" : "standard") +
    " unit · Gantry Self Storage";
  document.getElementById("crumb").textContent = size.name + " " + ST.ACCESS[type.access].short.toLowerCase();

  /* ---- Head --------------------------------------------------------------- */

  head.innerHTML =
    "<h1 tabindex=\"-1\">" + size.name + " ft · " + ST.esc(size.nick) + "</h1>" +
    '<div class="tags mt-4">' + ST.featureTags(type) +
      '<span class="avail' + (ST.availClass(free) ? " avail--" + ST.availClass(free) : "") + '">' +
      ST.availLabel(free) + "</span></div>" +
    '<p class="lede mt-4 measure">' + ST.esc(size.blurb) + "</p>";

  /* ---- Art ---------------------------------------------------------------- */

  document.getElementById("unit-art").innerHTML =
    '<div class="flex-between" style="margin-bottom:var(--sp-4)">' +
      '<h2 style="font-size:var(--step-1)">The opening</h2>' +
      '<span class="tag">' + type.door.w + " ft " + type.door.type.toLowerCase() + " door</span>" +
    "</div>" +
    '<div style="max-width:460px;margin-inline:auto">' + ST.elevationSVG(type) + "</div>" +
    '<p class="muted mt-4 text-center" style="font-size:var(--step--1)">' +
      "Drawn to scale against someone 5 ft 10." +
    "</p>";

  /* ---- Specs -------------------------------------------------------------- */

  function spec(dt, dd) { return "<div><dt>" + dt + "</dt><dd>" + dd + "</dd></div>"; }

  document.getElementById("unit-specs").innerHTML =
    spec("Floor", size.w + " &times; " + size.d + " ft") +
    spec("Area", ST.sqft(size) + " sq ft") +
    spec("Ceiling", type.ceiling + " ft") +
    spec("Volume", (ST.sqft(size) * type.ceiling).toLocaleString() + " cu ft") +
    spec("Door", type.door.type + ", " + type.door.w + " ft wide &times; " + type.door.h + " ft high") +
    spec("Access", ST.ACCESS[type.access].name) +
    spec("Climate control", type.climate ? "Yes, 55&ndash;78&deg;F" : "No") +
    spec("Where", ST.buildingFor(type)) +
    spec("Free today", free + " of " + type.total);

  /* ---- What fits -----------------------------------------------------------
     The heaviest preset this size actually takes, so the drawing shows the
     unit doing real work rather than holding four boxes. */

  var best = null;
  ST.PRESETS.forEach(function (p) {
    var r = ST.pack(p.items, size);
    if (!r.fits) return;
    if (!best || r.usedArea > best.res.usedArea) best = { preset: p, res: r };
  });

  var fit = document.getElementById("unit-fit");
  if (best) {
    fit.innerHTML =
      '<div class="plan__head"><div>' +
        '<span class="plan__title">' + ST.esc(best.preset.name) + "</span>" +
        '<span class="plan__sub">Packed into this size &middot; door on the left</span>' +
      "</div><span class=\"tag\">" + Math.round(best.res.fill * 100) + "% of the floor</span></div>" +
      ST.planSVG(best.res, { id: "fitplan" }) +
      '<p class="muted mt-4" style="font-size:var(--step--1)">' +
        (best.res.overhead
          ? best.res.overhead + " of the " + best.res.boxes + " boxes sit on top of the furniture. "
          : "") +
        "Hover any block to see what it is." +
      "</p>";
  } else {
    fit.innerHTML = '<p class="muted">This size suits a part-load rather than a whole property. ' +
      '<a href="sizes.html">Plan yours</a> to see what goes in.</p>';
  }

  /* ---- Conditional notes --------------------------------------------------- */

  var notes = [];
  if (size.w < 10) {
    notes.push(["warn", "alert", "A " + type.door.w + " ft swing door, not a roller",
      "Sofas, appliances, pallets and anything wider than " + type.door.w +
      " ft at its narrowest will not go in, whatever the floor says. " +
      "If you're storing furniture, you want a 10 ft wide unit."]);
  }
  if (type.access === "upper") {
    notes.push(["", "stairs", "Upper floor, via the goods lift",
      "12% cheaper than the same unit downstairs, and one more stage to carry. " +
      "Sensible if you're storing and leaving; less so if you'll visit weekly."]);
  }
  if (type.access === "driveup") {
    notes.push(["warn", "temp", "Not climate controlled",
      "Drive-up units open onto the yard, so they follow the weather. Fine for tools, " +
      "stock, garden kit and vehicles. Not for paper, photographs, timber furniture, " +
      "instruments or anything with a screen."]);
  }
  if (type.climate) {
    notes.push(["ok", "temp", "Held at 55&ndash;78&deg;F, under 60% humidity",
      "What actually protects paper, photographs, timber, leather, electronics and " +
      "upholstery over a winter. It's the 22% most people should pay."]);
  }
  if (!free) {
    notes.push(["danger", "alert", "All " + type.total + " of these are taken",
      "Put your name down and we'll call when one comes back. The average wait on " +
      "this size is under two weeks. Or take the next size up and move down later, free."]);
  }

  document.getElementById("unit-notes").innerHTML = notes.map(function (n) {
    return '<div class="notice' + (n[0] ? " notice--" + n[0] : "") + '" style="margin-top:var(--sp-3)">' +
      ST.icon(n[1], 20) + "<p><strong>" + n[2] + ".</strong> " + n[3] + "</p></div>";
  }).join("");

  /* ---- Neighbours ---------------------------------------------------------- */

  var idx = ST.SIZES.map(function (s) { return s.id; }).indexOf(size.id);
  var alts = [ST.SIZES[idx - 1], ST.SIZES[idx + 1]].filter(Boolean);

  document.getElementById("unit-alts").innerHTML = alts.map(function (s) {
    var cands = ST.typesForSize(s.id);
    var pick = cands.filter(function (t) { return t.access === type.access && t.climate === type.climate; })[0] ||
               cands.reduce(function (a, t) { return (!a || t.rate < a.rate) ? t : a; }, null);
    var d = pick.rate - type.rate;
    var f = ST.remaining(pick);
    return '<a class="card" href="unit.html?id=' + encodeURIComponent(pick.id) + '">' +
      "<h3>" + s.name + " ft · " + ST.esc(s.nick) + "</h3>" +
      "<p>" + ST.sqft(s) + " sq ft, " + (ST.sqft(s) - ST.sqft(size) > 0 ? "+" : "") +
        (ST.sqft(s) - ST.sqft(size)) + " sq ft on this one.</p>" +
      '<div class="flex-between mt-2">' +
        "<span class=\"tag " + (d > 0 ? "tag--warn" : "tag--go") + "\">" +
          (d > 0 ? "+" : "−") + ST.money(Math.abs(d)).replace("−", "") + " a month</span>" +
        '<span class="avail' + (ST.availClass(f) ? " avail--" + ST.availClass(f) : "") + '">' +
          ST.availLabel(f) + "</span>" +
      "</div>" +
      '<span class="card__foot">Compare &rarr;</span></a>';
  }).join("");

  /* ---- Price rail ----------------------------------------------------------- */

  var rail = document.getElementById("unit-price");
  var bounds = ST.dateBounds();

  function renderRail() {
    var q = ST.quote(type, state.term, state.date, { protection: state.protection, lock: state.lock });
    var params = "id=" + encodeURIComponent(type.id) + "&term=" + state.term +
      "&date=" + state.date + "&p=" + state.protection + (state.lock ? "&lock=1" : "");

    rail.innerHTML =
      '<div class="flex-between">' +
        '<h2 style="font-size:var(--step-1)">Your price</h2>' +
        '<span class="avail' + (ST.availClass(free) ? " avail--" + ST.availClass(free) : "") + '">' +
        ST.availLabel(free) + "</span>" +
      "</div>" +

      '<div class="terms mt-4" role="group" aria-label="Term">' + ST.termButtonsHTML(type, state.term) + "</div>" +
      '<p class="hint mt-2">' + ST.esc(ST.termById(state.term).note) + "</p>" +

      '<div class="field mt-5">' +
        '<label for="rail-date">Move in on</label>' +
        '<input class="input" type="date" id="rail-date" value="' + state.date +
          '" min="' + bounds.min + '" max="' + bounds.max + '">' +
      "</div>" +

      '<div class="field mt-4">' +
        '<label for="rail-prot">Cover for your things</label>' +
        '<select class="select" id="rail-prot">' +
          ST.PROTECTION.map(function (p) {
            return '<option value="' + p.id + '"' + (p.id === state.protection ? " selected" : "") + ">" +
              p.name + (p.monthly ? ". " + ST.money(p.monthly) + "/mo" : "") + "</option>";
          }).join("") +
        "</select>" +
      "</div>" +

      '<label class="check mt-4"><input type="checkbox" id="rail-lock"' + (state.lock ? " checked" : "") +
        "><span>Add a disc lock, " + ST.money(ST.FEES.lock) + "</span></label>" +

      '<div class="breakdown mt-5">' + ST.breakdownHTML(q, state.date) + "</div>" +

      (free
        ? '<a class="btn btn--lg btn--block mt-5" href="reserve.html?' + params + '">Hold this unit free</a>' +
          '<p class="muted text-center mt-3" style="font-size:var(--step--2)">Seven days, no card, cancel any time.</p>'
        : '<a class="btn btn--lg btn--block btn--outline mt-5" href="tel:+15550182400">Join the waiting list</a>' +
          '<p class="muted text-center mt-3" style="font-size:var(--step--2)">Average wait on this size: under two weeks.</p>');
  }

  rail.addEventListener("click", function (e) {
    var t = e.target.closest("[data-term]");
    if (!t) return;
    state.term = t.getAttribute("data-term");
    renderRail();
  });
  rail.addEventListener("change", function (e) {
    if (e.target.id === "rail-date") state.date = ST.clampDate(e.target.value);
    else if (e.target.id === "rail-prot") state.protection = e.target.value;
    else if (e.target.id === "rail-lock") state.lock = e.target.checked;
    else return;
    renderRail();
  });

  renderRail();
})();
