/* JUNIPER LANE: shared behaviour. Progressive enhancement throughout. */

window.SL = window.SL || {};

(function () {
  "use strict";

  /* ---- Mobile drawer ---------------------------------------------------- */

  var drawer = document.getElementById("drawer");
  var toggle = document.querySelector(".nav-toggle");
  var lastFocused = null;

  function focusablesIn(el) {
    return Array.prototype.filter.call(
      el.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null; }
    );
  }

  function openDrawer() {
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    drawer.removeAttribute("aria-hidden");
    document.body.classList.add("is-locked");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    var first = focusablesIn(drawer)[0];
    if (first) first.focus();
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

    window.matchMedia("(min-width: 900px)").addEventListener("change", function (m) {
      if (m.matches && drawer.classList.contains("is-open")) closeDrawer();
    });
  }

  /* ---- Header ----------------------------------------------------------- */

  var header = document.querySelector(".header");
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        header.classList.toggle("is-scrolled", window.scrollY > 6);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Reveal ----------------------------------------------------------- */

  SL.revealIn = function (root) {
    var els = (root || document).querySelectorAll("[data-reveal]:not(.is-revealed)");
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

  /* ---- Opening status --------------------------------------------------- */
  /* Renders an "Open now" / "Closed" pill and highlights today's row. */

  document.querySelectorAll("[data-hours]").forEach(function (root) {
    var now = new Date();
    var dow = now.getDay();
    var minutes = now.getHours() * 60 + now.getMinutes();
    var today = SL.HOURS[dow];
    var isOpen = Array.isArray(today) && minutes >= today[0] && minutes < today[1];

    var pill = root.querySelector("[data-hours-status]");
    if (pill) {
      pill.textContent = isOpen ? "Open now" : "Closed now";
      pill.classList.add(isOpen ? "tag--open" : "tag--closed");
    }

    var row = root.querySelector('[data-dow="' + dow + '"]');
    if (row) row.classList.add("is-today");
  });

  /* ---- Stylist portraits ------------------------------------------------ */

  document.querySelectorAll("[data-portrait]").forEach(function (el) {
    var person = SL.stylist(el.getAttribute("data-portrait"));
    if (person) el.innerHTML = SL.portrait(person, { bg: el.getAttribute("data-bg") || undefined });
  });

  /* ---- Misc ------------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  SL.revealIn(document);
})();
