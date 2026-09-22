/* HOLLIS ELECTRICAL: visit booking.

   DEMO ONLY. No backend: nothing is transmitted and the form clears itself
   after "sending". A real deployment posts over TLS to the job-management
   system and keeps customer addresses out of query strings and analytics.

   This booker is the inverse of an appointment booker. The customer doesn't
   travel to a fixed premises, so:
     - the ADDRESS comes before the date, and decides whether we can come at
       all and on which days (core area = weekdays, fringe = Tue/Thu only);
     - slots are arrival WINDOWS, not times, because that is what a van can
       honestly promise;
     - the job size consumes whole windows. A socket is one, a consumer unit
       is a full day, a rewire needs two consecutive working days. */

(function () {
  "use strict";

  var form = document.getElementById("booking-form");
  if (!form) return;

  var DAYS_AHEAD = 28;
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var stepperItems = Array.prototype.slice.call(document.querySelectorAll(".stepper li"));
  var live = document.getElementById("b-live");
  var current = 0;

  var state = { service: null, zip: "", zone: null, date: "", window: null };

  /* ---- Step 1: the job --------------------------------------------------- */

  document.getElementById("b-services").innerHTML = TR.GROUPS.map(function (group) {
    return '<div class="mt-6"><p class="kicker">' + group.name + "</p>" +
      '<div class="options mt-3">' + group.services.map(function (s) {
        var price = s.mode === "survey"
          ? '<span class="option__price">Free survey</span>'
          : '<span class="option__price">' + TR.money(s.price) + "</span>";
        return '<label class="option">' +
          '<input type="radio" name="service" value="' + s.id + '">' +
          '<span class="option__dot" aria-hidden="true"></span>' +
          '<span class="option__text"><strong>' + s.name + "</strong>" +
            "<span>" + s.desc + "</span></span>" +
          '<span class="option__aside">' + price +
            '<span class="option__dur">' + TR.windowSpan(s.windows) + "</span></span></label>";
      }).join("") + "</div></div>";
  }).join("");

  /* ---- Step 2: the address ---------------------------------------------- */

  var zipInput = form.elements.zip;
  var coverageOut = document.getElementById("b-coverage");

  function checkCoverage() {
    var zip = (zipInput.value || "").trim().slice(0, 5);
    state.zip = zip;
    state.zone = TR.zoneFor(zip);

    /* Changing the address can invalidate a day already picked. */
    state.date = "";
    state.window = null;

    coverageOut.innerHTML = state.zone ? TR.verdictHTML(state.zone, zip) : "";
    paintSummary();
  }

  zipInput.addEventListener("input", function () {
    if ((zipInput.value || "").trim().length >= 5) checkCoverage();
    else { coverageOut.innerHTML = ""; state.zone = null; paintSummary(); }
  });

  /* ---- Step 3: day and arrival window ----------------------------------- */

  var datestrip = document.getElementById("datestrip");
  var windowsHost = document.getElementById("windows");

  function isoOf(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
  }

  function need() { return state.service ? state.service.windows : 1; }

  function renderDates() {
    datestrip.innerHTML = "";
    if (!state.zone || state.zone === "outside") return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var frag = document.createDocumentFragment();

    for (var i = 1; i <= DAYS_AHEAD; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);
      var iso = isoOf(d);
      var open = TR.windowsFor(state.zone, iso, need()).length > 0;

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

  function renderWindows() {
    windowsHost.innerHTML = "";

    if (!state.zone || state.zone === "outside") {
      windowsHost.innerHTML = '<p class="muted">Enter a ZIP we cover to see availability.</p>';
      return;
    }
    if (!state.date) {
      windowsHost.innerHTML = '<p class="muted">Pick a day above to see arrival windows.</p>';
      return;
    }

    var list = TR.windowsFor(state.zone, state.date, need());
    if (!list.length) {
      windowsHost.innerHTML = '<p class="muted">Nothing free that day for a ' +
        TR.windowSpan(need()).toLowerCase() + " job. Try another.</p>";
      return;
    }

    var grid = document.createElement("div");
    grid.className = "windows";

    list.forEach(function (w) {
      var left = w.wholeDay ? null : TR.vansFree(state.date, w.id);
      var note = w.wholeDay
        ? (need() >= 4 ? "Plus the next working day" : "We're with you all day")
        : (w.surcharge ? w.note + " · +" + TR.money(w.surcharge)
                       : (left === 1 ? "Last van" : left + " vans free"));

      var b = document.createElement("button");
      b.type = "button";
      b.className = "window";
      b.dataset.window = w.id;
      b.setAttribute("aria-pressed", String(state.window === w.id));
      b.innerHTML = '<span class="window__name">' + w.name + "</span>" +
        '<span class="window__time">' + w.label + "</span>" +
        '<span class="window__note">' + note + "</span>";
      grid.appendChild(b);
    });

    windowsHost.appendChild(grid);
    announce(prettyDate(state.date) + ": " + list.length + " option" + (list.length === 1 ? "" : "s") + ".");
  }

  datestrip.addEventListener("click", function (e) {
    var pill = e.target.closest(".daypill");
    if (!pill || pill.disabled) return;
    state.date = pill.dataset.date;
    state.window = null;
    datestrip.querySelectorAll(".daypill").forEach(function (p) {
      p.setAttribute("aria-pressed", String(p === pill));
    });
    renderWindows();
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

  windowsHost.addEventListener("click", function (e) {
    var btn = e.target.closest(".window");
    if (!btn || btn.disabled) return;
    state.window = btn.dataset.window;
    windowsHost.querySelectorAll(".window").forEach(function (w) {
      w.setAttribute("aria-pressed", String(w === btn));
    });
    paintSummary();
    clearWhenError();
  });

  function clearWhenError() {
    var slot = form.querySelector('[data-error-for="when"]');
    if (slot) slot.closest(".field").classList.remove("has-error");
  }

  /* ---- Derived ----------------------------------------------------------- */

  function prettyDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()];
  }

  function windowObj() {
    if (!state.window) return null;
    if (state.window === "day") return { id: "day", name: "Full day", label: "8:00am – 5:00pm" };
    return TR.WINDOWS.filter(function (w) { return w.id === state.window; })[0] || null;
  }

  function whenLabel() {
    if (!state.date) return "";
    var w = windowObj();
    if (!w) return prettyDate(state.date);
    var base = prettyDate(state.date) + ", " + w.label;
    if (need() >= 4) base += " + next working day";
    return base;
  }

  function total() {
    if (!state.service || state.service.mode === "survey") return null;
    var w = windowObj();
    return state.service.price + (w && w.surcharge ? w.surcharge : 0);
  }

  function priceLabel() {
    if (!state.service) return "–";
    if (state.service.mode === "survey") return "Free";
    return TR.money(total());
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
    setSummary("job", state.service ? state.service.name : "");
    setSummary("where", state.zone && state.zone !== "outside"
      ? state.zip + " · " + TR.ZONES[state.zone].name : "");
    setSummary("when", whenLabel());
    setSummary("onsite", state.service ? TR.windowSpan(state.service.windows) : "");

    var p = document.querySelector("[data-summary-price]");
    if (p) p.textContent = priceLabel();

    var notes = [];
    if (state.service && state.service.mode === "survey") {
      notes.push("Survey is free and carries no obligation. Written quote the same day.");
    }
    if (state.service && state.service.tags.indexOf("Notifiable") !== -1) {
      notes.push("Notifiable work. Certificate issued and registered on your behalf.");
    }
    var w = windowObj();
    if (w && w.surcharge) notes.push("Evening visits carry an out-of-hours rate.");

    var noteEl = document.querySelector("[data-summary-notes]");
    if (noteEl) {
      noteEl.innerHTML = notes.length
        ? notes.map(function (n) { return "<span>" + n + "</span>"; }).join("<br>")
        : "We call 30 minutes before we set off. Free to change up to 24 hours ahead.";
    }
  }

  /* ---- Choices ----------------------------------------------------------- */

  form.addEventListener("change", function (e) {
    if (e.target.name === "service") {
      state.service = TR.service(e.target.value);
      /* A different job needs a different amount of time, so the day may no
         longer work. */
      state.date = "";
      state.window = null;
      clearGroupError(e.target);
      paintSummary();
      return;
    }
    if (e.target.name === "whoHome" || e.target.name === "parking") clearGroupError(e.target);
  });

  function clearGroupError(input) {
    var g = input.closest("[data-require-group]");
    if (g) g.classList.remove("has-error");
  }

  /* ---- Validation --------------------------------------------------------- */

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
      if (el.required && !el.checked) { setError(el, el.dataset.msg || "Please tick this to continue."); return false; }
      clearError(el); return true;
    }
    var value = (el.value || "").trim();
    if (el.required && !value) { setError(el, el.dataset.msg || "This field is required."); return false; }
    if (el.name === "zip" && value) {
      var zone = TR.zoneFor(value);
      if (!zone) { setError(el, "Enter a five-digit ZIP code."); return false; }
      if (zone === "outside") { setError(el, "We don't cover that ZIP. See the note above."); return false; }
    }
    if (el.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError(el, "Enter an email like name@example.com."); return false;
    }
    if (el.type === "tel" && value && value.replace(/\D/g, "").length < 10) {
      setError(el, "Enter a 10-digit phone number."); return false;
    }
    clearError(el); return true;
  }

  function validateStep(index) {
    var step = steps[index];
    var ok = true, firstBad = null;

    step.querySelectorAll("[data-require-group]").forEach(function (group) {
      var name = group.getAttribute("data-require-group");
      if (form.querySelector('input[name="' + name + '"]:checked')) { group.classList.remove("has-error"); return; }
      ok = false;
      group.classList.add("has-error");
      var slot = group.querySelector(".error-text");
      if (slot) slot.textContent = group.getAttribute("data-msg") || "Pick an option to continue.";
      if (!firstBad) firstBad = group.querySelector("input");
    });

    if (step.querySelector("#datestrip")) {
      var slot2 = step.querySelector('[data-error-for="when"]');
      if (!state.date || !state.window) {
        ok = false;
        if (slot2) {
          slot2.closest(".field").classList.add("has-error");
          slot2.textContent = !state.date ? "Choose a day." : "Choose an arrival window.";
        }
        if (!firstBad) firstBad = step.querySelector(".daypill:not([disabled])");
      } else if (slot2) {
        slot2.closest(".field").classList.remove("has-error");
      }
    }

    step.querySelectorAll("input:not([type=radio]), select, textarea").forEach(function (el) {
      if (el.disabled || el.closest("[hidden]")) return;
      if (!validateControl(el)) { ok = false; if (!firstBad) firstBad = el; }
    });

    if (!ok && firstBad) { firstBad.focus(); announce("Please fix the highlighted field before continuing."); }
    return ok;
  }

  form.addEventListener("input", function (e) {
    var wrap = e.target.closest(".field");
    if (wrap && wrap.classList.contains("has-error")) validateControl(e.target);
  });

  /* ---- Steps --------------------------------------------------------------- */

  function announce(msg) { if (live) live.textContent = msg; }

  function showStep(index, silent) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === current); });
    stepperItems.forEach(function (li, i) {
      li.setAttribute("data-state", i === current ? "active" : i < current ? "done" : "todo");
      if (i === current) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });

    /* Entering the date step rebuilds it, because the answer depends on the
       job picked in step 1 and the ZIP given in step 2. */
    if (steps[current].querySelector("#datestrip")) { renderDates(); renderWindows(); }

    if (silent) return;
    var h = steps[current].querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
    announce("Step " + (current + 1) + " of " + steps.length + ". " + (h ? h.textContent : ""));
  }

  function fillReview() {
    var get = function (n) { var el = form.elements[n]; return el ? (el.value || "").trim() : ""; };
    var pick = function (n) {
      var el = form.querySelector('input[name="' + n + '"]:checked');
      if (!el) return "–";
      var strong = el.closest(".option").querySelector(".option__text strong");
      return strong ? strong.textContent.trim() : el.value;
    };

    var rows = {
      job: state.service.name + (state.service.mode === "survey" ? " · free survey" : ""),
      where: get("address1") + ", " + get("city") + " " + state.zip,
      when: whenLabel(),
      onsite: TR.windowSpan(state.service.windows),
      price: state.service.mode === "survey" ? "Free. Written quote after the visit" : TR.money(total()),
      name: get("firstName") + " " + get("lastName"),
      phone: get("phone"),
      email: get("email"),
      whoHome: pick("whoHome"),
      parking: pick("parking"),
      notes: get("notes") || "–"
    };

    Object.keys(rows).forEach(function (k) {
      var el = document.querySelector('[data-review="' + k + '"]');
      if (el) el.textContent = rows[k];
    });
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

  /* ---- Submit -------------------------------------------------------------- */

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    for (var i = 0; i < steps.length - 1; i++) {
      if (!validateStep(i)) { showStep(i); return; }
    }

    var btn = form.querySelector("[data-submit]");
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

    window.setTimeout(function () {
      var panel = document.getElementById("booking-done");
      var shell = document.getElementById("booking-shell");
      if (!panel || !shell) return;

      panel.querySelector("[data-confirm-ref]").textContent =
        "HE-" + String(Math.floor(Math.random() * 9000) + 1000);
      panel.querySelector("[data-confirm-when]").textContent = whenLabel();
      panel.querySelector("[data-confirm-job]").textContent = state.service.name;

      var surveyNote = panel.querySelector("[data-confirm-survey]");
      if (surveyNote) surveyNote.hidden = state.service.mode !== "survey";
      var dayNote = panel.querySelector("[data-confirm-fullday]");
      if (dayNote) dayNote.hidden = state.service.windows < 2;

      shell.hidden = true;
      panel.hidden = false;
      var h = panel.querySelector("h2");
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      announce("Request sent. Confirmation details are on screen.");

      /* Demo hygiene: don't leave an address sitting in a live form. */
      form.reset();
    }, 700);
  });

  /* ---- Deep links: book.html?service=eicr&zip=44118 ------------------------ */

  (function prefill() {
    var params = new URLSearchParams(window.location.search);

    var wantService = params.get("service");
    if (wantService && TR.service(wantService)) {
      var input = form.querySelector('input[name="service"][value="' + CSS.escape(wantService) + '"]');
      if (input) { input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); }
    }

    var wantZip = params.get("zip");
    if (wantZip && TR.zoneFor(wantZip)) {
      zipInput.value = wantZip.slice(0, 5);
      checkCoverage();
    }
  })();

  paintSummary();
  showStep(0, true);
})();
