/* GANTRY: the unit listing. Filter state round-trips through the URL, so any
   view is linkable and the back button behaves. */

(function () {
  "use strict";

  var state = { sizes: [], climate: false, access: [], hideGone: false };

  var list = document.getElementById("unit-list");
  var sizeChips = document.getElementById("size-chips");
  var featChips = document.getElementById("feature-chips");
  var countEl = document.getElementById("result-count");
  var clearBtn = document.getElementById("clear-filters");
  var empty = document.getElementById("no-results");
  var emptyWhy = document.getElementById("no-results-why");

  /* ---- URL ---------------------------------------------------------------- */

  function readUrl() {
    var s = ST.qs("size");
    if (s) state.sizes = s.split(",").filter(function (id) { return !!ST.sizeById(id); });
    if (ST.qs("climate") === "1") state.climate = true;
    var a = ST.qs("access");
    if (a) state.access = a.split(",").filter(function (k) { return !!ST.ACCESS[k]; });
    if (ST.qs("free") === "1") state.hideGone = true;
  }

  function writeUrl() {
    var p = [];
    if (state.sizes.length) p.push("size=" + state.sizes.join(","));
    if (state.climate) p.push("climate=1");
    if (state.access.length) p.push("access=" + state.access.join(","));
    if (state.hideGone) p.push("free=1");
    var url = window.location.pathname + (p.length ? "?" + p.join("&") : "");
    window.history.replaceState(null, "", url);
  }

  /* ---- Chips -------------------------------------------------------------- */

  function buildChips() {
    sizeChips.innerHTML = ST.SIZES.map(function (s) {
      var free = ST.typesForSize(s.id).reduce(function (n, t) { return n + ST.remaining(t); }, 0);
      return '<button class="chip" type="button" data-size="' + s.id + '" aria-pressed="false">' +
        s.name + " <small>" + free + "</small></button>";
    }).join("");

    featChips.innerHTML =
      '<button class="chip" type="button" data-feat="climate" aria-pressed="false">Climate controlled</button>' +
      '<button class="chip" type="button" data-access="driveup" aria-pressed="false">Drive-up</button>' +
      '<button class="chip" type="button" data-access="ground" aria-pressed="false">Ground floor</button>' +
      '<button class="chip" type="button" data-access="upper" aria-pressed="false">Upper floor</button>' +
      '<button class="chip" type="button" data-feat="free" aria-pressed="false">Available now</button>';
  }

  function syncChips() {
    sizeChips.querySelectorAll("[data-size]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(state.sizes.indexOf(b.getAttribute("data-size")) > -1));
    });
    featChips.querySelectorAll("[data-access]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(state.access.indexOf(b.getAttribute("data-access")) > -1));
    });
    featChips.querySelector('[data-feat="climate"]').setAttribute("aria-pressed", String(state.climate));
    featChips.querySelector('[data-feat="free"]').setAttribute("aria-pressed", String(state.hideGone));
    clearBtn.hidden = !(state.sizes.length || state.climate || state.access.length || state.hideGone);
  }

  function toggle(arr, v) {
    var i = arr.indexOf(v);
    if (i > -1) arr.splice(i, 1); else arr.push(v);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-size],[data-access],[data-feat]");
    if (!b || !b.closest(".filterbar")) return;
    if (b.hasAttribute("data-size")) toggle(state.sizes, b.getAttribute("data-size"));
    else if (b.hasAttribute("data-access")) toggle(state.access, b.getAttribute("data-access"));
    else if (b.getAttribute("data-feat") === "climate") state.climate = !state.climate;
    else if (b.getAttribute("data-feat") === "free") state.hideGone = !state.hideGone;
    apply();
  });

  function reset() {
    state = { sizes: [], climate: false, access: [], hideGone: false };
    apply();
  }
  clearBtn.addEventListener("click", reset);
  document.getElementById("reset-from-empty").addEventListener("click", reset);

  /* ---- Render ------------------------------------------------------------- */

  function matches(t) {
    if (state.sizes.length && state.sizes.indexOf(t.sizeId) === -1) return false;
    if (state.climate && !t.climate) return false;
    if (state.access.length && state.access.indexOf(t.access) === -1) return false;
    if (state.hideGone && ST.remaining(t) === 0) return false;
    return true;
  }

  /* Why nothing matched, in the words of the filter that did it. A bare
     "no results" makes people think the site is broken. */
  function whyEmpty() {
    if (state.climate && state.access.indexOf("driveup") > -1 && state.access.length === 1) {
      return "Drive-up units open onto the yard, so none of them are climate controlled. " +
             "the two are mutually exclusive here. Drop one of the two and try again.";
    }
    var loosened = ST.TYPES.filter(function (t) {
      return (!state.sizes.length || state.sizes.indexOf(t.sizeId) > -1) &&
             (!state.climate || t.climate) &&
             (!state.access.length || state.access.indexOf(t.access) > -1);
    });
    if (state.hideGone && loosened.length) {
      return "Those units exist, but every one of them is taken today. Untick " +
             "“Available now” to see them anyway, or ask us about the waiting list. " +
             "the average wait is under two weeks.";
    }
    return "We don't build that combination. Try loosening one filter. " +
           "the larger sizes are drive-up only, and the 5 ft widths are all indoors.";
  }

  function apply() {
    var hits = ST.TYPES.filter(matches).sort(function (a, b) {
      return (ST.sqft(a.size) - ST.sqft(b.size)) || (a.rate - b.rate);
    });

    list.innerHTML = hits.map(ST.unitTileHTML).join("");
    empty.hidden = hits.length > 0;
    if (!hits.length) emptyWhy.textContent = whyEmpty();

    var free = hits.reduce(function (n, t) { return n + ST.remaining(t); }, 0);
    countEl.innerHTML = hits.length
      ? "<b>" + hits.length + "</b> unit type" + (hits.length === 1 ? "" : "s") +
        " &middot; <b>" + free + "</b> free"
      : "Nothing matches";

    syncChips();
    writeUrl();
  }

  buildChips();
  readUrl();
  apply();
})();
