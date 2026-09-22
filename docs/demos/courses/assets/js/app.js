/* Coursefolk: shared behaviour.

   Progressive enhancement. Demo state (cart, enrolments, progress, the signed-in
   display name) lives in localStorage so the prototype feels continuous between
   pages. No account, no server, and no password is ever read or stored. See
   the sign-in handler at the bottom. */

window.CF = window.CF || {};

(function () {
  "use strict";

  /* ---- Storage (never throws) ------------------------------------------ */

  var store = CF.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem("cf." + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem("cf." + key, JSON.stringify(value)); }
      catch (e) { /* private mode, blocked storage. The page still works */ }
      return value;
    },
    remove: function (key) {
      try { localStorage.removeItem("cf." + key); } catch (e) {}
    }
  };

  /* ---- Demo state ------------------------------------------------------- */

  CF.cart = {
    ids: function () { return store.get("cart", []); },
    has: function (id) { return CF.cart.ids().indexOf(id) !== -1; },
    add: function (id) {
      var ids = CF.cart.ids();
      if (ids.indexOf(id) === -1) ids.push(id);
      store.set("cart", ids);
      CF.paintBadges();
      return ids;
    },
    remove: function (id) {
      var ids = CF.cart.ids().filter(function (x) { return x !== id; });
      store.set("cart", ids);
      CF.paintBadges();
      return ids;
    },
    clear: function () { store.set("cart", []); CF.paintBadges(); }
  };

  CF.enrolment = {
    ids: function () { return store.get("enrolled", ["type-systems", "colour-for-interfaces"]); },
    has: function (id) { return CF.enrolment.ids().indexOf(id) !== -1; },
    add: function (ids) {
      var cur = CF.enrolment.ids();
      (Array.isArray(ids) ? ids : [ids]).forEach(function (id) {
        if (cur.indexOf(id) === -1) cur.push(id);
      });
      return store.set("enrolled", cur);
    }
  };

  CF.progress = {
    all: function () { return store.get("progress", { "type-systems": ["0-0", "0-1", "0-2", "1-0"] }); },
    done: function (courseId) { return CF.progress.all()[courseId] || []; },
    toggle: function (courseId, key) {
      var all = CF.progress.all();
      var list = all[courseId] || [];
      var i = list.indexOf(key);
      if (i === -1) list.push(key); else list.splice(i, 1);
      all[courseId] = list;
      store.set("progress", all);
      return list;
    },
    percent: function (course) {
      var total = CF.totalLessons(course);
      if (!total) return 0;
      return Math.round((CF.progress.done(course.id).length / total) * 100);
    }
  };

  CF.user = {
    get: function () { return store.get("user", null); },
    signIn: function (name, role) {
      var initials = name.trim().split(/\s+/).map(function (w) { return w[0]; })
        .join("").slice(0, 2).toUpperCase() || "YOU";
      return store.set("user", { name: name.trim(), initials: initials, role: role });
    },
    signOut: function () { store.remove("user"); }
  };

  /* ---- Header badges + account chrome ----------------------------------- */

  CF.paintBadges = function () {
    var n = CF.cart.ids().length;
    document.querySelectorAll("[data-cart-badge]").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
  };

  function paintAccount() {
    var user = CF.user.get();
    document.querySelectorAll("[data-when-signed-in]").forEach(function (el) { el.hidden = !user; });
    document.querySelectorAll("[data-when-signed-out]").forEach(function (el) { el.hidden = !!user; });

    if (!user) return;
    document.querySelectorAll("[data-user-name]").forEach(function (el) { el.textContent = user.name; });
    document.querySelectorAll("[data-user-initials]").forEach(function (el) { el.textContent = user.initials; });
    document.querySelectorAll("[data-user-role]").forEach(function (el) {
      el.textContent = user.role === "teach" ? "Instructor" : "Learner";
    });
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-sign-out]")) return;
    e.preventDefault();
    CF.user.signOut();
    window.location.href = "index.html";
  });

  /* ---- Mobile drawer ---------------------------------------------------- */

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

  /* ---- Header shadow ---------------------------------------------------- */

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

  /* ---- Reveal on scroll ------------------------------------------------- */

  CF.revealIn = function (root) {
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
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });

    els.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 4, 3) * 60 + "ms";
      io.observe(el);
    });
  };

  /* ---- Course card ------------------------------------------------------ */

  CF.cardHTML = function (course) {
    /* A draft in the builder has no instructor record yet, so it can pass a
       name directly. */
    var tutor = course.tutorName ? { name: course.tutorName } : CF.instructorOf(course);
    var priceLabel = course.price
      ? '<span class="price">' + CF.money(course.price) +
        (course.was ? '<span class="price--was">' + CF.money(course.was) + "</span>" : "") + "</span>"
      : '<span class="price price--free">Free</span>';

    return '<a class="ccard" href="course.html?id=' + course.id + '">' +
      CF.coverHTML(course) +
      '<div class="ccard__body">' +
        '<span class="ccard__cat">' + course.category + "</span>" +
        "<h3>" + course.title + "</h3>" +
        '<span class="ccard__by">' + tutor.name + "</span>" +
        '<div class="ccard__stats">' +
          '<span class="rating"><span class="rating__num">' + course.rating.toFixed(1) + "</span>" +
          '<span class="rating__stars" aria-hidden="true">' + CF.stars(course.rating) + "</span>" +
          '<span class="rating__count">(' + course.reviews.toLocaleString() + ")</span></span>" +
          "<span>·</span><span>" + course.hours + " hrs</span>" +
        "</div>" +
        '<div class="ccard__foot">' + priceLabel +
          '<span class="tag tag--quiet">' + course.level + "</span>" +
        "</div>" +
      "</div></a>";
  };

  CF.renderCards = function (host, courses) {
    if (!host) return;
    host.innerHTML = courses.map(function (c) {
      return '<div data-reveal>' + CF.cardHTML(c) + "</div>";
    }).join("");
    CF.revealIn(host);
  };

  /* ---- Search boxes ----------------------------------------------------- */

  document.querySelectorAll("[data-search-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (form.querySelector("input").value || "").trim();
      window.location.href = "catalog.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    });
  });

  /* ---- Instructor revenue calculator (teach.html) ----------------------- */

  var calc = document.getElementById("calc");
  if (calc) {
    var priceEl = document.getElementById("calc-price");
    var salesEl = document.getElementById("calc-sales");

    var paint = function () {
      var price = Number(priceEl.value);
      var sales = Number(salesEl.value);
      var gross = price * sales;
      var fee = Math.round(gross * 0.12);
      var net = gross - fee;

      document.getElementById("calc-price-out").textContent = "$" + price;
      document.getElementById("calc-sales-out").textContent = sales.toLocaleString();
      document.getElementById("calc-gross").textContent = "$" + gross.toLocaleString();
      document.getElementById("calc-fee").textContent = "−$" + fee.toLocaleString();
      document.getElementById("calc-net").textContent = "$" + net.toLocaleString();
    };

    priceEl.addEventListener("input", paint);
    salesEl.addEventListener("input", paint);
    paint();
  }

  /* ---- Sign in (demo) --------------------------------------------------- */

  var signin = document.getElementById("signin-form");
  if (signin) {
    signin.addEventListener("submit", function (e) {
      e.preventDefault();

      var nameField = signin.elements.displayName;
      var name = (nameField.value || "").trim();
      var wrap = nameField.closest(".field");

      if (name.length < 2) {
        wrap.classList.add("has-error");
        wrap.querySelector(".error-text").textContent = "Tell us what to call you.";
        nameField.focus();
        return;
      }
      wrap.classList.remove("has-error");

      var role = (signin.querySelector('input[name="role"]:checked') || {}).value || "learn";

      /* Only the display name and the role are kept. The password field below
         is never read. There is no account and nothing to authenticate. */
      CF.user.signIn(name, role);

      var next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && /^[a-z-]+\.html$/.test(next)
        ? next
        : (role === "teach" ? "dashboard.html#teaching" : "dashboard.html");
    });
  }

  /* ---- Misc ------------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  CF.paintBadges();
  paintAccount();
  CF.revealIn(document);
})();
