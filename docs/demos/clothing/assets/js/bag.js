/* BRINDLE: bag and checkout.

   No payment processor and no backend. "Continue to secure payment" opens a
   stand-in for a hosted checkout, which is the shape a real build should take:
   the card form belongs to the PSP and lives on the PSP's origin, so card data
   never reaches the merchant's site, servers or logs. Nothing typed here is
   transmitted or persisted beyond the bag itself. */

(function () {
  "use strict";

  var shell = document.getElementById("bag-shell");
  if (!shell) return;

  var FREE_SHIP = 15000;
  var SHIPPING = 900;
  var PROMOS = { MENDIT: { off: 0.15, label: "MENDIT. 15% off" } };
  var promo = null;

  var linesHost = document.getElementById("bag-lines");
  var emptyEl = document.getElementById("bag-empty");
  var doneEl = document.getElementById("bag-done");

  /* ---- Render ----------------------------------------------------------- */

  function lines() {
    return BR.bag.lines().map(function (l) {
      var p = BR.byId(l.id);
      return p ? { line: l, product: p } : null;
    }).filter(Boolean);
  }

  function key(l) { return l.id + "|" + l.colour + "|" + l.size; }

  function paint() {
    var list = lines();

    shell.hidden = list.length === 0;
    emptyEl.hidden = list.length !== 0;
    if (!list.length) return;

    linesHost.innerHTML = list.map(function (item) {
      var p = item.product;
      var l = item.line;
      var cap = BR.stock(p.id, l.colour, l.size);

      return '<div class="bagline">' +
        '<a href="product.html?id=' + p.id + "&colour=" + l.colour + '">' +
          BR.garmentHTML(p, l.colour, { className: "garment--tall" }) +
        "</a>" +
        "<div>" +
          '<a href="product.html?id=' + p.id + "&colour=" + l.colour +
            '" style="font-family:var(--font-display);font-size:var(--step-1);color:var(--ink);text-decoration:none">' +
            p.name + "</a>" +
          '<p class="muted mt-2" style="font-size:var(--step--1)">' +
            BR.colour(l.colour).name + (l.size ? " · Size " + l.size : "") +
            " · " + p.material.split(",")[0] + "</p>" +
          '<div class="qty mt-3">' +
            '<button type="button" data-step="-1" data-key="' + key(l) + '" aria-label="Decrease quantity">−</button>' +
            '<output aria-label="Quantity">' + l.qty + "</output>" +
            '<button type="button" data-step="1" data-key="' + key(l) + '"' +
              (l.qty >= cap ? " disabled" : "") + ' aria-label="Increase quantity">+</button>' +
          "</div>" +
          (l.qty >= cap ? '<p class="stock-note stock-note--low">That\'s all we have in this size.</p>' : "") +
        "</div>" +
        '<div class="bagline__right">' +
          "<span>" + BR.money(p.price * l.qty) + "</span>" +
          '<button class="link-line" type="button" style="font-size:var(--step--2)" data-remove="' +
            key(l) + '">Remove</button>' +
        "</div></div>";
    }).join("");

    /* Hemming only makes sense if there are trousers in the bag. */
    var hasTrousers = list.some(function (i) { return i.product.silhouette === "trousers"; });
    document.getElementById("hem-block").hidden = !hasTrousers;

    paintTotals(list);
  }

  function paintTotals(list) {
    var subtotal = list.reduce(function (n, i) { return n + i.product.price * i.line.qty; }, 0);
    var listTotal = list.reduce(function (n, i) {
      return n + (i.product.was || i.product.price) * i.line.qty;
    }, 0);
    var saved = listTotal - subtotal;
    var discount = promo ? Math.round(subtotal * promo.off) : 0;
    var afterDiscount = subtotal - discount;
    var shipping = afterDiscount >= FREE_SHIP ? 0 : SHIPPING;
    var total = afterDiscount + shipping;

    var left = Math.max(0, FREE_SHIP - afterDiscount);
    document.getElementById("freeship").innerHTML =
      '<p style="font-size:var(--step--1)">' +
        (left > 0 ? BR.money(left) + " away from free shipping" : "Free shipping unlocked") +
      "</p>" +
      '<span class="freeship__track"><span class="freeship__fill" style="width:' +
        Math.min(100, Math.round(afterDiscount / FREE_SHIP * 100)) + '%"></span></span>';

    var rows = ['<div class="totals__row"><span>Subtotal</span><span>' + BR.money(listTotal) + "</span></div>"];
    if (saved > 0) rows.push('<div class="totals__row totals__row--save"><span>Sale</span><span>−' + BR.money(saved) + "</span></div>");
    if (discount > 0) rows.push('<div class="totals__row totals__row--save"><span>' + promo.label + "</span><span>−" + BR.money(discount) + "</span></div>");
    rows.push('<div class="totals__row"><span>Shipping</span><span>' +
      (shipping === 0 ? "Free" : BR.money(shipping)) + "</span></div>");
    rows.push('<div class="totals__row totals__row--grand"><span>Total</span><span>' + BR.money(total) + "</span></div>");

    document.getElementById("totals").innerHTML = rows.join("");
    document.getElementById("pay-amount").textContent = BR.money(total);
  }

  /* ---- Line controls ---------------------------------------------------- */

  linesHost.addEventListener("click", function (e) {
    var step = e.target.closest("[data-step]");
    if (step) {
      var parts = step.dataset.key.split("|");
      var current = BR.bag.lines().filter(function (l) {
        return l.id === parts[0] && l.colour === parts[1] && l.size === parts[2];
      })[0];
      if (!current) return;
      var cap = BR.stock(parts[0], parts[1], parts[2]);
      var next = Math.min(cap, current.qty + Number(step.dataset.step));
      BR.bag.setQty(parts[0], parts[1], parts[2], Math.max(0, next));
      paint();
      return;
    }

    var remove = e.target.closest("[data-remove]");
    if (remove) {
      var r = remove.dataset.remove.split("|");
      BR.bag.remove(r[0], r[1], r[2]);
      paint();
    }
  });

  /* ---- Hemming ---------------------------------------------------------- */

  document.getElementById("hem-save").addEventListener("click", function () {
    var input = document.getElementById("inseam");
    var note = document.getElementById("hem-note");
    var value = Number(input.value);

    if (!input.value.trim()) {
      BR.store.remove("inseam");
      note.textContent = "Leave blank and we'll ship them unhemmed.";
      note.style.color = "";
      return;
    }

    if (isNaN(value) || value < 60 || value > 92) {
      note.textContent = "Inseams between 60 and 92 cm, please.";
      note.style.color = "var(--danger)";
      input.focus();
      return;
    }

    BR.store.set("inseam", value);
    note.textContent = "Noted. We'll hem to " + value + " cm before dispatch.";
    note.style.color = "var(--success)";
  });

  var savedInseam = BR.store.get("inseam", null);
  if (savedInseam) document.getElementById("inseam").value = savedInseam;

  /* ---- Promo ------------------------------------------------------------ */

  document.getElementById("promo-apply").addEventListener("click", function () {
    var input = document.getElementById("promo");
    var note = document.getElementById("promo-note");
    var code = (input.value || "").trim().toUpperCase();

    if (!code) { input.focus(); return; }

    if (PROMOS[code]) {
      promo = PROMOS[code];
      note.textContent = "Applied. " + promo.label + ".";
      note.style.color = "var(--success)";
      input.value = code;
    } else {
      promo = null;
      note.textContent = "That code isn't recognised.";
      note.style.color = "var(--danger)";
    }
    paint();
  });

  /* ---- Payment handoff -------------------------------------------------- */

  var sheet = document.getElementById("paysheet");
  var lastFocused = null;

  function openSheet() {
    lastFocused = document.activeElement;
    sheet.hidden = false;
    document.body.classList.add("is-locked");
    document.getElementById("pay-confirm").focus();
  }

  function closeSheet() {
    sheet.hidden = true;
    document.body.classList.remove("is-locked");
    if (lastFocused) lastFocused.focus();
  }

  document.getElementById("checkout").addEventListener("click", openSheet);
  document.getElementById("pay-cancel").addEventListener("click", closeSheet);

  sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !sheet.hidden) closeSheet();
  });

  document.getElementById("pay-confirm").addEventListener("click", function (e) {
    var btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Authorising…";

    setTimeout(function () {
      btn.disabled = false;
      btn.textContent = "Pay now";
      closeSheet();
      complete();
    }, 900);
  });

  /* ---- Complete --------------------------------------------------------- */

  function complete() {
    var bought = lines();

    document.getElementById("order-no").textContent =
      String(Math.floor(Math.random() * 9000) + 1000);

    document.getElementById("done-lines").innerHTML = bought.map(function (item) {
      var p = item.product, l = item.line;
      return '<div class="bagline" style="grid-template-columns:64px minmax(0,1fr) auto">' +
        BR.garmentHTML(p, l.colour, { className: "garment--tall" }) +
        '<div><p style="font-family:var(--font-display);color:var(--ink)">' + p.name + "</p>" +
          '<p class="muted" style="font-size:var(--step--1)">' + BR.colour(l.colour).name +
            (l.size ? " · " + l.size : "") + " · Qty " + l.qty + "</p></div>" +
        '<div class="bagline__right"><span>' + BR.money(p.price * l.qty) + "</span></div>" +
      "</div>";
    }).join("");

    BR.bag.clear();
    BR.store.remove("inseam");

    shell.hidden = true;
    emptyEl.hidden = true;
    doneEl.hidden = false;

    var h = doneEl.querySelector("h2");
    h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  paint();
})();
