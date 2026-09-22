/* Coursefolk: catalogue filtering, sorting and URL sync. */

(function () {
  "use strict";

  var results = document.getElementById("results");
  if (!results) return;

  var LEVELS = ["Beginner", "Intermediate", "All levels"];
  var UPDATED_ORDER = ["September 2026", "August 2026", "July 2026", "June 2026",
    "May 2026", "April 2026", "March 2026"];

  var state = { q: "", cats: [], levels: [], price: "all", rating: 0, sort: "popular" };

  /* ---- URL <-> state ---------------------------------------------------- */

  function readURL() {
    var p = new URLSearchParams(window.location.search);
    state.q = p.get("q") || "";
    state.cats = p.getAll("cat");
    state.levels = p.getAll("level");
    state.price = p.get("price") || "all";
    state.rating = Number(p.get("rating") || 0);
    state.sort = p.get("sort") || "popular";
  }

  function writeURL() {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    state.cats.forEach(function (c) { p.append("cat", c); });
    state.levels.forEach(function (l) { p.append("level", l); });
    if (state.price !== "all") p.set("price", state.price);
    if (state.rating) p.set("rating", String(state.rating));
    if (state.sort !== "popular") p.set("sort", state.sort);

    var qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : window.location.pathname);
  }

  /* ---- Filtering -------------------------------------------------------- */

  function matches(course) {
    if (state.cats.length && state.cats.indexOf(course.category) === -1) return false;
    if (state.levels.length && state.levels.indexOf(course.level) === -1) return false;
    if (state.price === "free" && course.price !== 0) return false;
    if (state.price === "paid" && course.price === 0) return false;
    if (state.rating && course.rating < state.rating) return false;

    if (state.q) {
      var tutor = CF.instructorOf(course);
      var hay = [course.title, course.subtitle, course.category, course.level, tutor.name]
        .join(" ").toLowerCase();
      var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.every(function (t) { return hay.indexOf(t) !== -1; })) return false;
    }
    return true;
  }

  function sortList(list) {
    var by = {
      popular: function (a, b) { return b.students - a.students; },
      rating: function (a, b) { return (b.rating - a.rating) || (b.reviews - a.reviews); },
      new: function (a, b) { return UPDATED_ORDER.indexOf(a.updated) - UPDATED_ORDER.indexOf(b.updated); },
      "price-asc": function (a, b) { return a.price - b.price; },
      "price-desc": function (a, b) { return b.price - a.price; }
    };
    return list.slice().sort(by[state.sort] || by.popular);
  }

  /* ---- Rendering -------------------------------------------------------- */

  var countEl = document.getElementById("result-count");
  var emptyEl = document.getElementById("empty");
  var titleEl = document.getElementById("catalog-title");
  var subEl = document.getElementById("catalog-sub");

  function activeFilterCount() {
    return state.cats.length + state.levels.length +
      (state.price !== "all" ? 1 : 0) + (state.rating ? 1 : 0);
  }

  function render() {
    var list = sortList(CF.COURSES.filter(matches));

    CF.renderCards(results, list);
    emptyEl.hidden = list.length !== 0;
    results.hidden = list.length === 0;

    countEl.textContent = list.length === 1
      ? "1 course"
      : list.length + " courses";

    if (state.q) countEl.textContent += ' matching “' + state.q + '”';

    var badge = document.getElementById("filter-count");
    var n = activeFilterCount();
    badge.textContent = n;
    badge.hidden = n === 0;

    /* Page heading follows the strongest filter, so the tab title and the H1
       say something useful when someone lands from a category link. */
    if (state.q) {
      titleEl.textContent = "Results for “" + state.q + "”";
      subEl.textContent = "Searching titles, descriptions, subjects and instructors.";
    } else if (state.cats.length === 1) {
      titleEl.textContent = state.cats[0];
      subEl.textContent = "Every " + state.cats[0].toLowerCase() + " course on Coursefolk.";
    } else {
      titleEl.textContent = "Every course";
      subEl.textContent = "Filter it down, or just scroll. Two lessons of each are free to preview.";
    }

    writeURL();
  }

  /* ---- Filter controls -------------------------------------------------- */

  function chip(label, pressed, attrs) {
    return '<button class="chip" type="button" ' + attrs +
      ' aria-pressed="' + (pressed ? "true" : "false") + '">' + label + "</button>";
  }

  function paintControls() {
    document.getElementById("f-cats").innerHTML = CF.categories().map(function (cat) {
      return chip(cat.name + '<span class="chip__count">' + cat.count + "</span>",
        state.cats.indexOf(cat.name) !== -1,
        'data-cat="' + cat.name.replace(/"/g, "&quot;") + '"');
    }).join("");

    document.getElementById("f-levels").innerHTML = LEVELS.map(function (lv) {
      return chip(lv, state.levels.indexOf(lv) !== -1, 'data-level="' + lv + '"');
    }).join("");

    document.querySelectorAll("#f-price .chip").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.price === state.price));
    });

    document.querySelectorAll("#f-rating .chip").forEach(function (b) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.rating) === state.rating));
    });

    document.getElementById("sort").value = state.sort;

    document.querySelectorAll("[data-search-form] input").forEach(function (i) { i.value = state.q; });
  }

  function toggleIn(list, value) {
    var i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
    return list;
  }

  document.getElementById("filters").addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (btn) {
      if (btn.dataset.cat !== undefined) toggleIn(state.cats, btn.dataset.cat);
      else if (btn.dataset.level !== undefined) toggleIn(state.levels, btn.dataset.level);
      else if (btn.dataset.price !== undefined) state.price = btn.dataset.price;
      else if (btn.dataset.rating !== undefined) state.rating = Number(btn.dataset.rating);
      paintControls();
      render();
      return;
    }

    if (e.target.closest("#f-clear")) {
      state.cats = []; state.levels = []; state.price = "all"; state.rating = 0; state.q = "";
      paintControls();
      render();
    }
  });

  document.getElementById("empty-clear").addEventListener("click", function () {
    state.cats = []; state.levels = []; state.price = "all"; state.rating = 0; state.q = "";
    paintControls();
    render();
  });

  document.getElementById("sort").addEventListener("change", function (e) {
    state.sort = e.target.value;
    render();
  });

  /* Searching from the header on this page filters in place rather than
     reloading. The app-wide handler navigates, so intercept first. */
  document.querySelectorAll("[data-search-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      state.q = (form.querySelector("input").value || "").trim();
      paintControls();
      render();
      document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
    }, true);
  });

  /* Filters start collapsed on phones so results are the first thing you see. */
  var shell = document.getElementById("filter-shell");
  if (window.matchMedia("(max-width: 999px)").matches) shell.open = false;

  readURL();
  paintControls();
  render();
})();
