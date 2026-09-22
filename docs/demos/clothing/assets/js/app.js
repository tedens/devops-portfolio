/* BRINDLE: shared behaviour.

   Progressive enhancement. The bag lives in localStorage so the storefront
   feels continuous between pages; there is no account and no server. */

window.BR = window.BR || {};

(function () {
  "use strict";

  /* ---- Storage (never throws) ------------------------------------------ */

  var store = BR.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem("br." + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem("br." + key, JSON.stringify(value)); } catch (e) {}
      return value;
    },
    remove: function (key) { try { localStorage.removeItem("br." + key); } catch (e) {} }
  };

  /* ---- Bag -------------------------------------------------------------- */
  /* A line is { id, colour, size, qty }. Key is id|colour|size. */

  BR.bag = {
    lines: function () { return store.get("bag", []); },

    count: function () {
      return BR.bag.lines().reduce(function (n, l) { return n + l.qty; }, 0);
    },

    subtotal: function () {
      return BR.bag.lines().reduce(function (n, l) {
        var p = BR.byId(l.id);
        return n + (p ? p.price * l.qty : 0);
      }, 0);
    },

    add: function (id, colour, size, qty) {
      var lines = BR.bag.lines();
      var found = lines.filter(function (l) {
        return l.id === id && l.colour === colour && l.size === size;
      })[0];

      var cap = BR.stock(id, colour, size);
      if (found) found.qty = Math.min(cap, found.qty + (qty || 1));
      else lines.push({ id: id, colour: colour, size: size, qty: Math.min(cap, qty || 1) });

      store.set("bag", lines);
      BR.paintBag();
      return lines;
    },

    setQty: function (id, colour, size, qty) {
      var lines = BR.bag.lines().map(function (l) {
        if (l.id === id && l.colour === colour && l.size === size) l.qty = qty;
        return l;
      }).filter(function (l) { return l.qty > 0; });
      store.set("bag", lines);
      BR.paintBag();
      return lines;
    },

    remove: function (id, colour, size) {
      return BR.bag.setQty(id, colour, size, 0);
    },

    clear: function () { store.set("bag", []); BR.paintBag(); }
  };

  BR.paintBag = function () {
    var n = BR.bag.count();
    document.querySelectorAll("[data-bag-count]").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    document.querySelectorAll("[data-bag-label]").forEach(function (el) {
      el.textContent = n === 1 ? "1 item" : n + " items";
    });
    paintBagDrawer();
  };

  /* ---- Bag drawer ------------------------------------------------------- */

  var FREE_SHIP = 15000;

  function paintBagDrawer() {
    var linesHost = document.getElementById("bag-drawer-lines");
    var footHost = document.getElementById("bag-drawer-foot");
    if (!linesHost || !footHost) return;

    var lines = BR.bag.lines();

    if (!lines.length) {
      linesHost.innerHTML = '<p class="muted" style="padding-block:var(--sp-6)">' +
        "Your bag is empty.</p>";
      footHost.innerHTML = '<a class="btn btn--block" href="shop.html">Start shopping</a>';
      return;
    }

    linesHost.innerHTML = lines.map(function (l) {
      var p = BR.byId(l.id);
      if (!p) return "";
      return '<div class="bagline" style="grid-template-columns:64px minmax(0,1fr) auto">' +
        BR.garmentHTML(p, l.colour, { className: "garment--tall" }) +
        "<div><p style=\"font-family:var(--font-display);color:var(--ink)\">" + p.name + "</p>" +
          '<p class="muted" style="font-size:var(--step--1)">' + BR.colour(l.colour).name +
            " · " + l.size + " · Qty " + l.qty + "</p></div>" +
        '<div class="bagline__right"><span>' + BR.money(p.price * l.qty) + "</span>" +
          '<button class="link-line" type="button" style="font-size:var(--step--2)" ' +
            'data-drawer-remove="' + l.id + "|" + l.colour + "|" + l.size + '">Remove</button>' +
        "</div></div>";
    }).join("");

    var subtotal = BR.bag.subtotal();
    var left = Math.max(0, FREE_SHIP - subtotal);

    footHost.innerHTML =
      '<div class="freeship" style="margin-bottom:var(--sp-4)">' +
        '<p style="font-size:var(--step--1)">' +
          (left > 0
            ? BR.money(left) + " away from free shipping"
            : "Free shipping unlocked") + "</p>" +
        '<span class="freeship__track"><span class="freeship__fill" style="width:' +
          Math.min(100, Math.round(subtotal / FREE_SHIP * 100)) + '%"></span></span>' +
      "</div>" +
      '<div class="totals__row totals__row--grand" style="margin-bottom:var(--sp-4)">' +
        "<span>Subtotal</span><span>" + BR.money(subtotal) + "</span></div>" +
      '<a class="btn btn--block" href="bag.html">View bag &amp; check out</a>';
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-drawer-remove]");
    if (!btn) return;
    var parts = btn.dataset.drawerRemove.split("|");
    BR.bag.remove(parts[0], parts[1], parts[2]);
  });

  /* ---- Drawers (menu and bag) ------------------------------------------ */

  var lastFocused = null;

  function focusablesIn(el) {
    return Array.prototype.filter.call(
      el.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null; }
    );
  }

  function openDrawer(drawer) {
    lastFocused = document.activeElement;
    drawer.classList.add("is-open");
    drawer.removeAttribute("aria-hidden");
    document.body.classList.add("is-locked");
    document.querySelectorAll('[aria-controls="' + drawer.id + '"]').forEach(function (b) {
      b.setAttribute("aria-expanded", "true");
    });
    var first = focusablesIn(drawer)[0];
    if (first) first.focus();
  }

  function closeDrawer(drawer) {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".drawer.is-open")) document.body.classList.remove("is-locked");
    document.querySelectorAll('[aria-controls="' + drawer.id + '"]').forEach(function (b) {
      b.setAttribute("aria-expanded", "false");
    });
    if (lastFocused) lastFocused.focus();
  }

  BR.openDrawer = openDrawer;
  BR.closeDrawer = closeDrawer;

  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-drawer-open]");
    if (opener) {
      var target = document.getElementById(opener.getAttribute("aria-controls"));
      if (target) {
        e.preventDefault();
        target.classList.contains("is-open") ? closeDrawer(target) : openDrawer(target);
      }
      return;
    }

    var closer = e.target.closest("[data-drawer-close]");
    if (closer) {
      var d = closer.closest(".drawer");
      if (d) closeDrawer(d);
      return;
    }

    if (e.target.classList.contains("drawer__scrim")) {
      closeDrawer(e.target.closest(".drawer"));
    }
  });

  document.addEventListener("keydown", function (e) {
    var open = document.querySelector(".drawer.is-open");
    if (!open) return;

    if (e.key === "Escape") { closeDrawer(open); return; }
    if (e.key !== "Tab") return;

    var items = focusablesIn(open);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  window.matchMedia("(min-width: 900px)").addEventListener("change", function (m) {
    var menu = document.getElementById("menu-drawer");
    if (m.matches && menu && menu.classList.contains("is-open")) closeDrawer(menu);
  });

  /* ---- Header ----------------------------------------------------------- */

  var header = document.querySelector(".header");
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        header.classList.toggle("is-scrolled", window.scrollY > 4);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Reveal ----------------------------------------------------------- */

  BR.revealIn = function (root) {
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

  /* ---- Product tile ----------------------------------------------------- */

  BR.tileHTML = function (product, colourKey) {
    var colour = colourKey || product.colours[0];
    var price = product.was
      ? '<span class="price-now">' + BR.money(product.price) + "</span>" +
        '<span class="price-was">' + BR.money(product.was) + "</span>"
      : "<span>" + BR.money(product.price) + "</span>";

    var swatches = product.colours.length > 1
      ? '<div class="swatches">' + product.colours.map(function (key) {
          return '<span class="swatch swatch--dot" style="--fab:hsl(' +
            BR.colour(key).h + " " + BR.colour(key).s + "% " + BR.colour(key).l +
            '%)" title="' + BR.colour(key).name + '"></span>';
        }).join("") + "</div>"
      : "";

    return '<a class="tile" href="product.html?id=' + product.id +
      "&colour=" + colour + '" data-tile="' + product.id + '">' +
      '<span class="tile__media">' +
        BR.garmentHTML(product, colour, { flag: true }) +
      "</span>" +
      '<span class="tile__body">' +
        '<span class="tile__name">' + product.name + "</span>" +
        '<span class="tile__meta">' + product.category + " · " + product.fitLabel + "</span>" +
        '<span class="tile__price">' + price + "</span>" +
        swatches +
      "</span></a>";
  };

  BR.renderTiles = function (host, products) {
    if (!host) return;
    host.innerHTML = products.map(function (p) {
      return "<div data-reveal>" + BR.tileHTML(p) + "</div>";
    }).join("");
    BR.revealIn(host);
  };

  /* ---- Toast ------------------------------------------------------------ */

  var toastTimer = null;

  BR.toast = function (message, actionHTML) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.innerHTML = "<span>" + message + "</span>" + (actionHTML || "");
    el.classList.add("is-up");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-up"); }, 4000);
  };

  /* ---- Newsletter (footer) ---------------------------------------------- */

  document.querySelectorAll("[data-signup]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input");
      var wrap = input.closest(".field");
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((input.value || "").trim());

      if (!ok) {
        wrap.classList.add("has-error");
        wrap.querySelector(".error-text").textContent = "That doesn't look like an email address.";
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }

      wrap.classList.remove("has-error");
      input.removeAttribute("aria-invalid");
      input.value = "";
      var note = form.querySelector("[data-signup-done]");
      if (note) note.hidden = false;
    });
  });

  /* ---- Misc ------------------------------------------------------------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  BR.paintBag();
  BR.revealIn(document);
})();
