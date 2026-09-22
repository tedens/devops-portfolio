/* Coursefolk: cart and checkout.

   There is no payment processor here and no backend. "Continue to secure
   payment" opens a stand-in for a hosted checkout, which is the shape a real
   build should take: the card form belongs to the PSP, on the PSP's origin, so
   card data never reaches the merchant's site or its logs. Nothing typed on
   this page is transmitted or persisted beyond the cart itself. */

(function () {
  "use strict";

  var shell = document.getElementById("cart-shell");
  if (!shell) return;

  var COUPONS = { FOLK20: { off: 0.2, label: "FOLK20. 20% off" } };
  var coupon = null;

  /* ?add=<id> lets a "Buy now" button drop straight into checkout. */
  var add = new URLSearchParams(window.location.search).get("add");
  if (add && CF.byId(add)) {
    CF.cart.add(add);
    history.replaceState(null, "", window.location.pathname);
  }

  var linesHost = document.getElementById("cart-lines");
  var totalsHost = document.getElementById("totals");
  var emptyEl = document.getElementById("cart-empty");
  var doneEl = document.getElementById("cart-done");

  function items() {
    return CF.cart.ids().map(CF.byId).filter(Boolean);
  }

  /* ---- Render ----------------------------------------------------------- */

  function paint() {
    var list = items();

    shell.hidden = list.length === 0;
    emptyEl.hidden = list.length !== 0;
    if (!list.length) return;

    linesHost.innerHTML = list.map(function (c) {
      var tutor = CF.instructorOf(c);
      return '<div class="cartline">' +
        CF.coverHTML(c, "cover--wide") +
        "<div><h3>" + c.title + "</h3>" +
          '<p class="cartline__by">' + tutor.name + " · " + c.hours + " hrs · " + c.level + "</p>" +
          '<p class="mt-2"><span class="tag tag--quiet">Lifetime access</span></p>' +
        "</div>" +
        '<div class="cartline__right">' +
          '<span class="price">' + CF.money(c.price) + "</span>" +
          '<button class="btn btn--sm btn--quiet" type="button" data-remove="' + c.id + '">Remove</button>' +
        "</div></div>";
    }).join("");

    var subtotal = list.reduce(function (n, c) { return n + c.price; }, 0);
    var listTotal = list.reduce(function (n, c) { return n + (c.was || c.price); }, 0);
    var bundleSave = listTotal - subtotal;
    var discount = coupon ? Math.round(subtotal * coupon.off) : 0;
    var total = subtotal - discount;

    var rows = [
      '<div class="totals__row"><span>' + list.length + (list.length === 1 ? " course" : " courses") +
        "</span><span>" + CF.money(listTotal) + "</span></div>"
    ];
    if (bundleSave > 0) {
      rows.push('<div class="totals__row totals__row--save"><span>Instructor discounts</span><span>−' +
        CF.money(bundleSave) + "</span></div>");
    }
    if (discount > 0) {
      rows.push('<div class="totals__row totals__row--save"><span>' + coupon.label +
        "</span><span>−" + CF.money(discount) + "</span></div>");
    }
    rows.push('<div class="totals__row totals__row--grand"><span>Total</span><span>' +
      CF.money(total) + "</span></div>");

    totalsHost.innerHTML = rows.join("");
    document.getElementById("pay-amount").textContent = CF.money(total);

    var payBtn = document.getElementById("pay");
    payBtn.lastChild.textContent = total === 0
      ? " Enrol for free"
      : " Continue to secure payment";
  }

  linesHost.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-remove]");
    if (!btn) return;
    CF.cart.remove(btn.dataset.remove);
    paint();
  });

  /* ---- Coupon ----------------------------------------------------------- */

  document.getElementById("coupon-apply").addEventListener("click", function () {
    var field = document.getElementById("coupon");
    var msg = document.getElementById("coupon-msg");
    var code = (field.value || "").trim().toUpperCase();

    if (!code) { field.focus(); return; }

    if (COUPONS[code]) {
      coupon = COUPONS[code];
      msg.textContent = "Applied. " + coupon.label + ".";
      msg.style.color = "var(--success)";
      field.value = code;
    } else {
      coupon = null;
      msg.textContent = "That code isn't recognised or has expired.";
      msg.style.color = "var(--danger)";
    }
    paint();
  });

  /* ---- Email validation ------------------------------------------------- */

  function emailOK() {
    var el = document.getElementById("email");
    var wrap = el.closest(".field");
    var value = (el.value || "").trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

    wrap.classList.toggle("has-error", !ok);
    wrap.querySelector(".error-text").textContent = value
      ? "That doesn't look like an email address."
      : "We need an email to send your receipt.";
    el.setAttribute("aria-invalid", ok ? "false" : "true");

    if (!ok) el.focus();
    return ok;
  }

  document.getElementById("email").addEventListener("input", function (e) {
    var wrap = e.target.closest(".field");
    if (wrap.classList.contains("has-error")) {
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.target.value.trim());
      if (ok) { wrap.classList.remove("has-error"); e.target.setAttribute("aria-invalid", "false"); }
    }
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

  document.getElementById("pay").addEventListener("click", function () {
    if (!emailOK()) return;

    var total = items().reduce(function (n, c) { return n + c.price; }, 0);
    if (coupon) total -= Math.round(total * coupon.off);

    /* A free order needs no payment step at all. */
    if (total === 0) { complete(); return; }
    openSheet();
  });

  document.getElementById("pay-cancel").addEventListener("click", closeSheet);

  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) closeSheet();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !sheet.hidden) closeSheet();
  });

  document.getElementById("pay-confirm").addEventListener("click", function (e) {
    var btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Authorising…";

    window.setTimeout(function () {
      btn.disabled = false;
      btn.textContent = "Pay now";
      closeSheet();
      complete();
    }, 900);
  });

  /* ---- Complete --------------------------------------------------------- */

  function complete() {
    var bought = items();
    CF.enrolment.add(bought.map(function (c) { return c.id; }));
    CF.cart.clear();

    document.getElementById("done-list").innerHTML = bought.map(function (c) {
      var tutor = CF.instructorOf(c);
      return '<div class="rowcard">' +
        CF.coverHTML(c, "cover--wide") +
        '<div class="rowcard__main"><h3>' + c.title + "</h3>" +
          '<p class="muted" style="font-size:.9rem">' + tutor.name + " · " + c.lessonCount + " lessons</p></div>" +
        '<a class="btn btn--sm" href="learn.html?id=' + c.id + '">Start</a>' +
      "</div>";
    }).join("");

    shell.hidden = true;
    emptyEl.hidden = true;
    doneEl.hidden = false;

    document.querySelector("#cart-done h2").setAttribute("tabindex", "-1");
    document.querySelector("#cart-done h2").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  paint();
})();
