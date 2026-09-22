/* JUNIPER LANE: appointment booking.

   DEMO ONLY. No backend: nothing is transmitted and the form clears itself
   after "sending". A real deployment posts over TLS to the salon's booking
   system and keeps client details out of query strings and analytics.

   What makes this different from a generic booker: availability is the
   intersection of the salon's opening hours, the chosen stylist's working
   days, and a clear run long enough for the service. A 3-hour balayage will
   not offer you 4:45pm on a Saturday. */

(function () {
  "use strict";

  var form = document.getElementById("booking-form");
  if (!form) return;

  var DAYS_AHEAD = 28;
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DEPOSIT_FROM = 150; /* minutes */

  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var stepperItems = Array.prototype.slice.call(document.querySelectorAll(".stepper li"));
  var live = document.getElementById("b-live");
  var current = 0;

  var state = { service: null, stylist: null, date: "", time: null };

  /* ---- Step 1: services -------------------------------------------------- */

  document.getElementById("b-services").innerHTML = SL.GROUPS.map(function (group) {
    return '<div class="svc-group">' +
      '<p class="micro">' + group.name + "</p>" +
      '<div class="options">' + group.services.map(function (s) {
        return '<label class="option">' +
          '<input type="radio" name="service" value="' + s.id + '">' +
          '<span class="option__dot" aria-hidden="true"></span>' +
          '<span class="option__text"><strong>' + s.name + "</strong>" +
            "<span>" + s.desc + "</span></span>" +
          '<span class="option__aside">' +
            '<span class="option__price">' + (s.consult ? "Free" : "from " + SL.money(s.price)) + "</span>" +
            '<span class="option__dur">' + SL.duration(s.dur) + "</span>" +
          "</span></label>";
      }).join("") + "</div></div>";
  }).join("");

  /* ---- Step 2: stylists -------------------------------------------------- */

  function paintStylists() {
    var host = document.getElementById("b-stylists");
    if (!state.service) { host.innerHTML = ""; return; }

    var eligible = SL.stylistsFor(state.service.id);
    var cheapest = Math.min.apply(null, eligible.map(function (p) {
      return SL.tierPrice(state.service.price, p.tier);
    }));

    var any = '<label class="option">' +
      '<input type="radio" name="stylist" value="any">' +
      '<span class="option__dot" aria-hidden="true"></span>' +
      '<span class="option__text"><strong>No preference</strong>' +
        "<span>First available, usually the soonest appointment, and priced at whoever takes it.</span></span>" +
      '<span class="option__aside"><span class="option__price">from ' +
        (state.service.consult ? "Free" : SL.money(cheapest)) + "</span></span></label>";

    host.innerHTML = any + eligible.map(function (p) {
      var price = state.service.consult ? "Free" : SL.money(SL.tierPrice(state.service.price, p.tier));
      var days = p.days.map(function (d) { return DOW[d]; }).join(" · ");

      return '<label class="option">' +
        '<input type="radio" name="stylist" value="' + p.id + '">' +
        '<span class="option__dot" aria-hidden="true"></span>' +
        '<span class="stylist-pick" style="min-width:0">' +
          '<span class="stylist-pick__photo">' + SL.portrait(p, { bg: "#403436" }) + "</span>" +
          '<span class="option__text"><strong>' + p.name + "</strong>" +
            "<span>" + p.level + " · " + p.specialisms.slice(0, 2).join(", ") + "<br>" + days + "</span></span>" +
        "</span>" +
        '<span class="option__aside"><span class="option__price">' + price + "</span></span></label>";
    }).join("");
  }

  /* ---- Step 3: dates and times ------------------------------------------- */

  var datestrip = document.getElementById("datestrip");
  var slotsHost = document.getElementById("slots");

  function isoOf(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
  }

  /* Who could take this booking on the chosen day. */
  function candidates() {
    var eligible = SL.stylistsFor(state.service.id);
    return state.stylist === "any" ? eligible : eligible.filter(function (p) {
      return p.id === state.stylist;
    });
  }

  /* Start times, mapped to the stylists who can take them. */
  function offersFor(iso) {
    var byMinute = {};
    candidates().forEach(function (p) {
      SL.slotsFor(p.id, iso, state.service.dur).forEach(function (minute) {
        (byMinute[minute] = byMinute[minute] || []).push(p.id);
      });
    });
    return byMinute;
  }

  function dayHasOffers(iso) {
    return Object.keys(offersFor(iso)).length > 0;
  }

  function renderDates() {
    datestrip.innerHTML = "";
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var frag = document.createDocumentFragment();

    for (var i = 1; i <= DAYS_AHEAD; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      var iso = isoOf(d);
      var open = dayHasOffers(iso);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "daypill";
      btn.dataset.date = iso;
      btn.setAttribute("aria-pressed", String(iso === state.date));
      if (!open) btn.disabled = true;

      btn.innerHTML =
        '<span class="daypill__dow">' + DOW[d.getDay()] + "</span>" +
        '<span class="daypill__day">' + d.getDate() + "</span>" +
        '<span class="daypill__mon">' + MON[d.getMonth()] + "</span>";

      btn.setAttribute("aria-label",
        DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()] +
        (open ? "" : ". Nothing available"));

      frag.appendChild(btn);
    }
    datestrip.appendChild(frag);
  }

  function renderSlots() {
    slotsHost.innerHTML = "";
    if (!state.date) {
      slotsHost.innerHTML = '<p class="muted">Choose a day above to see times.</p>';
      return;
    }

    var byMinute = offersFor(state.date);
    var minutes = Object.keys(byMinute).map(Number).sort(function (a, b) { return a - b; });

    if (!minutes.length) {
      slotsHost.innerHTML = '<p class="muted">Nothing free that day for ' +
        SL.duration(state.service.dur) + ". Try another, or call us. We keep a cancellation list.</p>";
      return;
    }

    var bands = [
      { title: "Morning", from: 0, to: 12 * 60 },
      { title: "Afternoon", from: 12 * 60, to: 17 * 60 },
      { title: "Evening", from: 17 * 60, to: 24 * 60 }
    ];

    bands.forEach(function (band) {
      var inBand = minutes.filter(function (m) { return m >= band.from && m < band.to; });
      if (!inBand.length) return;

      var wrap = document.createElement("div");
      wrap.className = "slots-group";
      wrap.innerHTML = '<p class="micro micro--plain micro--muted">' + band.title + "</p>";

      var grid = document.createElement("div");
      grid.className = "slots";

      inBand.forEach(function (m) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.dataset.minute = m;
        b.textContent = SL.minutesToLabel(m);
        b.setAttribute("aria-pressed", String(state.time === m));
        b.setAttribute("aria-label", SL.minutesToLabel(m) + " to " +
          SL.minutesToLabel(m + state.service.dur));
        grid.appendChild(b);
      });

      wrap.appendChild(grid);
      slotsHost.appendChild(wrap);
    });

    announce(prettyDate(state.date) + ": " + minutes.length + " times available.");
  }

  datestrip.addEventListener("click", function (e) {
    var pill = e.target.closest(".daypill");
    if (!pill || pill.disabled) return;

    state.date = pill.dataset.date;
    state.time = null;

    datestrip.querySelectorAll(".daypill").forEach(function (p) {
      p.setAttribute("aria-pressed", String(p === pill));
    });

    renderSlots();
    paintSummary();
    clearWhenError();
  });

  datestrip.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var pills = Array.prototype.filter.call(datestrip.querySelectorAll(".daypill"),
      function (p) { return !p.disabled; });
    var i = pills.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    var next = pills[e.key === "ArrowRight" ? i + 1 : i - 1];
    if (next) next.focus();
  });

  slotsHost.addEventListener("click", function (e) {
    var slot = e.target.closest(".slot");
    if (!slot || slot.disabled) return;

    state.time = Number(slot.dataset.minute);
    slotsHost.querySelectorAll(".slot").forEach(function (s) {
      s.setAttribute("aria-pressed", String(s === slot));
    });

    paintSummary();
    clearWhenError();
  });

  function clearWhenError() {
    var slot = form.querySelector('[data-error-for="when"]');
    if (slot) slot.closest(".field").classList.remove("has-error");
  }

  /* ---- Derived facts ----------------------------------------------------- */

  function assignedStylist() {
    if (!state.date || state.time === null) return null;
    if (state.stylist && state.stylist !== "any") return SL.stylist(state.stylist);
    var ids = offersFor(state.date)[state.time] || [];
    return ids.length ? SL.stylist(ids[0]) : null;
  }

  function priceLabel() {
    if (!state.service) return "";
    if (state.service.consult) return "Free";

    var person = assignedStylist();
    if (person) return SL.money(SL.tierPrice(state.service.price, person.tier));

    var eligible = SL.stylistsFor(state.service.id);
    var low = Math.min.apply(null, eligible.map(function (p) {
      return SL.tierPrice(state.service.price, p.tier);
    }));
    return "from " + SL.money(low);
  }

  function needsPatchTest() {
    return !!(state.service && state.service.patch);
  }

  function needsDeposit() {
    return !!(state.service && !state.service.consult && state.service.dur >= DEPOSIT_FROM);
  }

  function prettyDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()];
  }

  function whenLabel() {
    if (!state.date) return "";
    if (state.time === null) return prettyDate(state.date);
    return prettyDate(state.date) + ", " + SL.minutesToLabel(state.time) +
      "–" + SL.minutesToLabel(state.time + state.service.dur);
  }

  /* ---- Summary ----------------------------------------------------------- */

  function setSummary(key, value) {
    var el = document.querySelector('[data-summary="' + key + '"]');
    if (!el) return;
    var empty = !value;
    el.textContent = empty ? (el.getAttribute("data-empty") || "Not chosen yet") : value;
    el.classList.toggle("is-empty", empty);
  }

  function paintSummary() {
    var person = assignedStylist();

    setSummary("service", state.service ? state.service.name : "");
    setSummary("stylist", state.stylist
      ? (state.stylist === "any"
          ? (person ? person.name + " (first available)" : "First available")
          : SL.stylist(state.stylist).name)
      : "");
    setSummary("when", whenLabel());
    setSummary("duration", state.service ? SL.duration(state.service.dur) : "");

    var total = document.querySelector("[data-summary-price]");
    if (total) total.textContent = state.service ? priceLabel() : "–";

    var notes = [];
    if (needsPatchTest()) notes.push("Patch test needed 48 hours before.");
    if (needsDeposit()) notes.push("A $50 deposit is taken when we confirm.");
    var noteEl = document.querySelector("[data-summary-notes]");
    if (noteEl) {
      noteEl.innerHTML = notes.length
        ? notes.map(function (n) { return "<span>" + n + "</span>"; }).join("<br>")
        : "Free to change or cancel up to 24 hours before.";
    }
  }

  /* ---- Choice handling --------------------------------------------------- */

  form.addEventListener("change", function (e) {
    if (e.target.name === "service") {
      state.service = SL.service(e.target.value);
      /* A new service invalidates everything downstream. */
      state.stylist = null;
      state.date = "";
      state.time = null;
      paintStylists();
      paintPatchBlock();
      clearGroupError(e.target);
      paintSummary();
      return;
    }

    if (e.target.name === "stylist") {
      state.stylist = e.target.value;
      /* Different diary. The day and time may no longer exist. */
      state.date = "";
      state.time = null;
      renderDates();
      renderSlots();
      clearGroupError(e.target);
      paintSummary();
      return;
    }

    if (e.target.name === "clientType") clearGroupError(e.target);
  });

  function clearGroupError(input) {
    var group = input.closest("[data-require-group]");
    if (group) group.classList.remove("has-error");
  }

  /* ---- Patch test block -------------------------------------------------- */

  function paintPatchBlock() {
    var block = document.getElementById("b-patch-block");
    var deposit = document.getElementById("b-deposit-note");
    if (block) {
      block.hidden = !needsPatchTest();
      if (!needsPatchTest()) {
        var box = document.getElementById("patch");
        if (box) box.checked = false;
      }
    }
    if (deposit) deposit.hidden = !needsDeposit();
  }

  /* ---- Validation -------------------------------------------------------- */

  function setError(el, message) {
    var wrap = el.closest(".field");
    if (!wrap) return;
    wrap.classList.add("has-error");
    var slot = wrap.querySelector(".error-text");
    if (slot) slot.textContent = message;
    el.setAttribute("aria-invalid", "true");
  }

  function clearError(el) {
    var wrap = el.closest(".field");
    if (!wrap) return;
    wrap.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  }

  function validateControl(el) {
    if (el.type === "checkbox") {
      if (el.required && !el.checked) {
        setError(el, el.dataset.msg || "Please tick this to continue.");
        return false;
      }
      clearError(el);
      return true;
    }

    var value = (el.value || "").trim();

    if (el.required && !value) {
      setError(el, el.dataset.msg || "This field is required.");
      return false;
    }
    if (el.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError(el, "Enter an email like name@example.com.");
      return false;
    }
    if (el.type === "tel" && value && value.replace(/\D/g, "").length < 10) {
      setError(el, "Enter a 10-digit mobile number.");
      return false;
    }
    clearError(el);
    return true;
  }

  function validateStep(index) {
    var step = steps[index];
    var ok = true;
    var firstBad = null;

    step.querySelectorAll("[data-require-group]").forEach(function (group) {
      var name = group.getAttribute("data-require-group");
      if (form.querySelector('input[name="' + name + '"]:checked')) {
        group.classList.remove("has-error");
        return;
      }
      ok = false;
      group.classList.add("has-error");
      var slot = group.querySelector(".error-text");
      if (slot) slot.textContent = group.getAttribute("data-msg") || "Pick an option to continue.";
      if (!firstBad) firstBad = group.querySelector("input");
    });

    if (step.querySelector("#datestrip")) {
      var slot2 = step.querySelector('[data-error-for="when"]');
      if (!state.date || state.time === null) {
        ok = false;
        if (slot2) {
          slot2.closest(".field").classList.add("has-error");
          slot2.textContent = !state.date ? "Choose a day." : "Choose a time.";
        }
        if (!firstBad) firstBad = step.querySelector(".daypill:not([disabled])");
      } else if (slot2) {
        slot2.closest(".field").classList.remove("has-error");
      }
    }

    step.querySelectorAll("input:not([type=radio]), select, textarea").forEach(function (el) {
      if (el.disabled || el.closest("[hidden]")) return;
      if (!validateControl(el)) {
        ok = false;
        if (!firstBad) firstBad = el;
      }
    });

    if (!ok && firstBad) {
      firstBad.focus();
      announce("Please fix the highlighted field before continuing.");
    }
    return ok;
  }

  form.addEventListener("input", function (e) {
    var wrap = e.target.closest(".field");
    if (wrap && wrap.classList.contains("has-error")) validateControl(e.target);
  });

  /* ---- Steps -------------------------------------------------------------- */

  function announce(message) { if (live) live.textContent = message; }

  function showStep(index, silent) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === current); });

    stepperItems.forEach(function (li, i) {
      li.setAttribute("data-state", i === current ? "active" : i < current ? "done" : "todo");
      if (i === current) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });

    if (silent) return;

    var h = steps[current].querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
    announce("Step " + (current + 1) + " of " + steps.length + ". " + (h ? h.textContent : ""));
  }

  function fillReview() {
    var get = function (n) {
      var el = form.elements[n];
      return el ? (el.value || "").trim() : "";
    };
    var person = assignedStylist();

    var rows = {
      service: state.service.name + " · " + SL.duration(state.service.dur),
      stylist: person ? person.name + " · " + person.level : "First available",
      when: whenLabel(),
      price: priceLabel() + (needsDeposit() ? " · $50 deposit on confirmation" : ""),
      name: get("firstName") + " " + get("lastName"),
      phone: get("phone"),
      email: get("email"),
      client: (form.querySelector('input[name="clientType"]:checked') || {}).value === "new"
        ? "New here" : "Been before",
      notes: get("notes") || "–"
    };

    Object.keys(rows).forEach(function (k) {
      var el = document.querySelector('[data-review="' + k + '"]');
      if (el) el.textContent = rows[k];
    });

    var patchRow = document.getElementById("review-patch");
    if (patchRow) patchRow.hidden = !needsPatchTest();
  }

  form.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    if (next) {
      e.preventDefault();
      if (!validateStep(current)) return;
      if (current + 1 === steps.length - 1) fillReview();
      showStep(current + 1);
      return;
    }

    var back = e.target.closest("[data-back]");
    if (back) { e.preventDefault(); showStep(current - 1); return; }

    var edit = e.target.closest("[data-edit-step]");
    if (edit) { e.preventDefault(); showStep(Number(edit.dataset.editStep)); }
  });

  /* ---- Submit ------------------------------------------------------------- */

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    for (var i = 0; i < steps.length - 1; i++) {
      if (!validateStep(i)) { showStep(i); return; }
    }

    var btn = form.querySelector("[data-submit]");
    if (btn) { btn.disabled = true; btn.textContent = "Sending request…"; }

    window.setTimeout(function () {
      var panel = document.getElementById("booking-done");
      var shell = document.getElementById("booking-shell");
      if (!panel || !shell) return;

      var person = assignedStylist();

      panel.querySelector("[data-confirm-code]").textContent =
        "JL-" + String(Math.floor(Math.random() * 9000) + 1000);
      panel.querySelector("[data-confirm-when]").textContent = whenLabel();
      panel.querySelector("[data-confirm-who]").textContent = person ? person.name : "one of the team";
      panel.querySelector("[data-confirm-service]").textContent = state.service.name;

      var patchNote = panel.querySelector("[data-confirm-patch]");
      if (patchNote) patchNote.hidden = !needsPatchTest();
      var depositNote = panel.querySelector("[data-confirm-deposit]");
      if (depositNote) depositNote.hidden = !needsDeposit();

      shell.hidden = true;
      panel.hidden = false;

      var h = panel.querySelector("h2");
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      announce("Request sent. Confirmation details are on screen.");

      /* Demo hygiene: don't leave a filled-in form sitting in the tab. */
      form.reset();
    }, 700);
  });

  /* ---- Deep links: book.html?service=balayage&stylist=orla ---------------- */

  (function prefill() {
    var params = new URLSearchParams(window.location.search);

    var wantService = params.get("service");
    if (wantService && SL.service(wantService)) {
      var sInput = form.querySelector('input[name="service"][value="' + CSS.escape(wantService) + '"]');
      if (sInput) { sInput.checked = true; sInput.dispatchEvent(new Event("change", { bubbles: true })); }
    }

    var wantStylist = params.get("stylist");
    if (wantStylist && state.service) {
      var ok = SL.stylistsFor(state.service.id).some(function (p) { return p.id === wantStylist; });
      if (ok) {
        var pInput = form.querySelector('input[name="stylist"][value="' + CSS.escape(wantStylist) + '"]');
        if (pInput) { pInput.checked = true; pInput.dispatchEvent(new Event("change", { bubbles: true })); }
      }
    }
  })();

  paintPatchBlock();
  paintSummary();
  showStep(0, true);
})();
