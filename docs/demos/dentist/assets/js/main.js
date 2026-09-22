/* Sherry's Dentistry. Site-wide behaviour.
   Progressive enhancement only: every page works with JS disabled. */

(function () {
  "use strict";

  /* ---- Mobile drawer --------------------------------------------------- */

  var drawer = document.getElementById("drawer");
  var toggle = document.querySelector(".nav-toggle");
  var lastFocused = null;

  function focusablesIn(el) {
    return Array.prototype.filter.call(
      el.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null; }
    );
  }

  function openDrawer() {
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    drawer.removeAttribute("aria-hidden");
    document.body.classList.add("is-locked");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    var first = focusablesIn(drawer)[0];
    if (first) first.focus();
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (lastFocused) lastFocused.focus();
  }

  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
    });

    drawer.addEventListener("click", function (e) {
      if (e.target.closest("[data-drawer-close]") || e.target.classList.contains("drawer__scrim")) {
        closeDrawer();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;

      if (e.key === "Escape") { closeDrawer(); return; }

      if (e.key === "Tab") {
        var items = focusablesIn(drawer);
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Desktop breakpoint reached while drawer open. Reset state.
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (m) {
      if (m.matches && drawer.classList.contains("is-open")) closeDrawer();
    });
  }

  /* ---- Header shadow on scroll ----------------------------------------- */

  var header = document.querySelector(".header");

  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Reveal on scroll ------------------------------------------------ */

  var revealables = document.querySelectorAll("[data-reveal]");

  if (revealables.length) {
    if (!("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealables.forEach(function (el) { el.classList.add("is-revealed"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

      revealables.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i % 4, 3) * 70 + "ms";
        io.observe(el);
      });
    }
  }

  /* ---- Opening-hours status -------------------------------------------- */
  /* Each [data-hours] element carries a JSON map of weekday -> [open, close]
     in 24h minutes-from-midnight. Renders an "Open now" / "Closed" pill and
     highlights today's row in the sibling hours table. */

  document.querySelectorAll("[data-hours]").forEach(function (root) {
    var schedule;
    try { schedule = JSON.parse(root.getAttribute("data-hours")); }
    catch (err) { return; }

    var now = new Date();
    var dow = String(now.getDay());
    var minutes = now.getHours() * 60 + now.getMinutes();
    var today = schedule[dow];
    var isOpen = Array.isArray(today) && minutes >= today[0] && minutes < today[1];

    var pill = root.querySelector("[data-hours-status]");
    if (pill) {
      pill.textContent = isOpen ? "Open now" : "Closed now";
      pill.classList.add(isOpen ? "tag--open" : "tag--closed");
    }

    var row = root.querySelector('[data-dow="' + dow + '"]');
    if (row) row.classList.add("is-today");
  });

  /* ---- Current year ----------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- Service deep-link from cards ------------------------------------- */
  /* Links like book.html?service=cleaning are read by booking.js. Nothing to
     do here beyond making sure in-page anchors close the drawer. */

  document.querySelectorAll('.drawer__nav a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", closeDrawer);
  });
})();
