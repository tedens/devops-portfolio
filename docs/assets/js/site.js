/* Mobile nav and project filtering. Both degrade to working HTML without JS:
   the mobile menu is a plain list that is simply always shown when the
   stylesheet cannot hide it, and the filter bar is only built if JS runs. */
(function () {
  "use strict";

  /* ---- Mobile nav ------------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("mobile-nav");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 860px)").addEventListener("change", function (m) {
      if (m.matches) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---- Project filtering ------------------------------------------------ */
  var grid = document.querySelector("[data-filterable]");
  var bar = document.querySelector("[data-filters]");
  if (!grid || !bar) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-category]"));
  var cats = [];
  cards.forEach(function (c) {
    var v = c.getAttribute("data-category");
    if (cats.indexOf(v) === -1) cats.push(v);
  });
  cats.sort();

  function button(label, value, n) {
    var b = document.createElement("button");
    b.className = "filter";
    b.type = "button";
    b.setAttribute("data-value", value);
    b.setAttribute("aria-pressed", value === "all" ? "true" : "false");
    b.innerHTML = label + ' <span class="filter__n">' + n + "</span>";
    return b;
  }

  bar.appendChild(button("All", "all", cards.length));
  cats.forEach(function (c) {
    var n = cards.filter(function (x) { return x.getAttribute("data-category") === c; }).length;
    bar.appendChild(button(c, c, n));
  });

  var empty = document.querySelector("[data-filter-empty]");

  bar.addEventListener("click", function (e) {
    var b = e.target.closest(".filter");
    if (!b) return;
    var value = b.getAttribute("data-value");
    bar.querySelectorAll(".filter").forEach(function (x) {
      x.setAttribute("aria-pressed", String(x === b));
    });
    var shown = 0;
    cards.forEach(function (c) {
      var hit = value === "all" || c.getAttribute("data-category") === value;
      c.hidden = !hit;
      if (hit) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    /* Announce the result rather than silently reflowing the page. */
    var live = document.querySelector("[data-filter-status]");
    if (live) {
      live.textContent = shown + " project" + (shown === 1 ? "" : "s") +
        (value === "all" ? "" : " in " + value);
    }
  });
})();
