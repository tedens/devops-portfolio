/* HOLLIS ELECTRICAL: shared behaviour. Progressive enhancement throughout. */

window.TR = window.TR || {};

(function () {
  "use strict";

  /* ---- Mobile drawer ---------------------------------------------------- */

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
    window.matchMedia("(min-width: 950px)").addEventListener("change", function (m) {
      if (m.matches && drawer.classList.contains("is-open")) closeDrawer();
    });
  }

  /* ---- Reveal ----------------------------------------------------------- */

  TR.revealIn = function (root) {
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

  /* ---- Coverage checker -------------------------------------------------
     Appears on the homepage and the about page. The booker has its own copy
     wired into step 2, because there the answer gates the rest of the form. */

  TR.verdictHTML = function (zone, zip) {
    var tick = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    var bang = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>';

    if (zone === "core") {
      return '<div class="verdict verdict--in">' + tick +
        "<div><strong>Yes. " + zip + " is in our core area</strong>" +
        "<p>Any weekday, plus evening slots and Saturday mornings for emergencies. No call-out charge.</p></div></div>";
    }
    if (zone === "fringe") {
      return '<div class="verdict verdict--fringe">' + bang +
        "<div><strong>Yes. " + zip + " is on our Tuesday/Thursday run</strong>" +
        "<p>We cover it on the days a van is already out that way, so booking takes a little longer. Still no call-out charge.</p></div></div>";
    }
    return '<div class="verdict verdict--out">' + bang +
      "<div><strong>Sorry. " + zip + " is outside our area</strong>" +
      "<p>We stay within about 20 minutes of the yard so we can get back to emergencies. " +
      'Try <a href="https://www.google.com/search?q=electrician+near+' + encodeURIComponent(zip) +
      '" target="_blank" rel="noopener">a local search</a>, and ask whoever you find for their licence number.</p></div></div>';
  };

  document.querySelectorAll("[data-areacheck]").forEach(function (form) {
    var out = form.querySelector("[data-areacheck-out]");
    var input = form.querySelector("input");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var zip = (input.value || "").trim();
      var zone = TR.zoneFor(zip);
      var wrap = input.closest(".field") || form;

      if (!zone) {
        wrap.classList.add("has-error");
        var slot = wrap.querySelector(".error-text");
        if (slot) slot.textContent = "Enter a five-digit ZIP code.";
        input.setAttribute("aria-invalid", "true");
        input.focus();
        out.innerHTML = "";
        return;
      }

      wrap.classList.remove("has-error");
      input.removeAttribute("aria-invalid");
      out.innerHTML = TR.verdictHTML(zone, zip.slice(0, 5));

      if (zone !== "outside") {
        out.insertAdjacentHTML("beforeend",
          '<p class="mt-4"><a class="btn btn--block" href="book.html?zip=' +
          encodeURIComponent(zip.slice(0, 5)) + '">Book a visit</a></p>');
      }
    });
  });

  /* ---- Misc ------------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  TR.revealIn(document);
})();
