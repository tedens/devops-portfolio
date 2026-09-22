/* GANTRY: homepage. Everything here is derived from data.js so the numbers
   on the front page can never drift from the listing. */

(function () {
  "use strict";

  /* ---- Shared ladder renderer ------------------------------------------- */

  var widest = ST.SIZES[ST.SIZES.length - 1];
  var maxArea = ST.sqft(widest);

  function ladderRow(size, opts) {
    var types = ST.typesForSize(size.id);
    var cheapest = types.reduce(function (a, t) { return (!a || t.rate < a.rate) ? t : a; }, null);
    var free = types.reduce(function (n, t) { return n + ST.remaining(t); }, 0);
    var pct = Math.round(ST.sqft(size) / maxArea * 100);
    var cls = ST.availClass(free);

    var right = opts.showFree
      ? '<span class="ladder__price">' + ST.money(cheapest.rate) +
        '<small class="' + (free === 0 ? "muted" : "") + '" style="color:' +
        (free === 0 ? "var(--muted)" : free <= 2 ? "var(--warn)" : "var(--go)") + '">' +
        ST.availLabel(free) + "</small></span>"
      : '<span class="ladder__price">' + ST.money(cheapest.rate) +
        "<small class=\"muted\">per month</small></span>";

    return '<a class="ladder__row" href="units.html?size=' + size.id + '">' +
      '<span class="ladder__size">' + size.name + "</span>" +
      '<span class="ladder__bar"><i style="width:' + pct + '%"></i>' +
        "<span>" + ST.sqft(size) + " sq ft &middot; " + size.nick + "</span></span>" +
      right + "</a>";
  }

  function fillLadder(el, opts) {
    if (!el) return;
    el.innerHTML = ST.SIZES.map(function (s) { return ladderRow(s, opts); }).join("");
  }

  fillLadder(document.getElementById("hero-ladder"), { showFree: true });
  fillLadder(document.getElementById("price-ladder"), { showFree: false });

  var hd = document.getElementById("hero-date");
  if (hd) hd.textContent = ST.fmtDate(ST.stamp(), { month: "short", day: "numeric" });

  /* ---- Three worked examples -------------------------------------------- */

  var examples = document.getElementById("home-examples");
  if (examples) {
    var want = ["studio", "onebed", "twobed"];
    examples.innerHTML = want.map(function (id, i) {
      var preset = ST.PRESETS.filter(function (p) { return p.id === id; })[0];
      var rec = ST.recommend(preset.items);
      if (!rec) return "";
      var types = ST.typesForSize(rec.size.id);
      var cheapest = types.reduce(function (a, t) { return (!a || t.rate < a.rate) ? t : a; }, null);
      var n = Object.keys(preset.items).reduce(function (s, k) { return s + preset.items[k]; }, 0);
      return '<a class="card" href="sizes.html?load=' + preset.id + '">' +
        "<h3>" + ST.esc(preset.name) + "</h3>" +
        '<p>' + n + " things, packed into the smallest unit that takes them.</p>" +
        '<div class="mt-2">' + ST.planSVG(rec.result, { id: "ex" + i }) + "</div>" +
        '<div class="flex-between mt-3">' +
          '<span class="tag tag--dark">' + rec.size.name + "</span>" +
          '<span class="tag">from ' + ST.money(cheapest.rate) + "/mo</span>" +
        "</div>" +
        '<span class="card__foot">Change it to match yours &rarr;</span>' +
        "</a>";
    }).join("");
    ST.revealIn(examples);
  }

  /* ---- The day-one figure ------------------------------------------------ */

  var bd = document.getElementById("home-breakdown");
  if (bd) {
    var type = ST.typeById("10x10-ground-c");
    var iso = ST.stamp();
    var q = ST.quote(type, "monthly", iso, { protection: "p5", lock: false });
    var pr = q.proRent;
    bd.innerHTML =
      row("Rent, " + pr.charged + " of " + pr.days + " days in " + ST.fmtMonth(iso), ST.money(pr.cents)) +
      row("Cover, $5,000, same " + pr.charged + " days", ST.money(q.proProt.cents)) +
      row("Admin fee, one off", ST.money(q.admin)) +
      row("Deposit", "None") +
      '<div class="breakdown__total"><span>Pay on move-in day</span><b>' + ST.money(q.today) + "</b></div>" +
      '<div class="breakdown__then"><span>Then monthly from ' +
        ST.fmtDate(q.firstFullIso, { month: "long", day: "numeric" }) + "</span><b>" +
        ST.money(q.monthly) + "</b></div>";
  }

  function row(label, value) {
    return '<div class="breakdown__row"><span>' + label + "</span><span>" + value + "</span></div>";
  }
})();
