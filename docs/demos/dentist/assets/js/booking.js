/* Sherry's Dentistry. Appointment request flow.

   DEMO ONLY. Nothing is transmitted: there is no backend, and the form does
   not persist anything to storage. A real deployment must post over TLS to a
   HIPAA-ready scheduling endpoint (signed BAA with the vendor) and must never
   put patient details in query strings, analytics, or client-side storage.  */

(function () {
  "use strict";

  var form = document.getElementById("booking-form");
  if (!form) return;

  var DAYS_AHEAD = 21;
  var DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* Clinic hours by weekday: null = closed. */
  var HOURS = {
    0: null,               // Sun
    1: [8 * 60, 17 * 60],  // Mon
    2: [8 * 60, 17 * 60],
    3: [8 * 60, 19 * 60],  // Wed. Late night
    4: [8 * 60, 17 * 60],
    5: [8 * 60, 15 * 60],  // Fri
    6: [9 * 60, 13 * 60]   // Sat, every other week, thinned out below
  };

  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var stepperItems = Array.prototype.slice.call(document.querySelectorAll(".stepper li"));
  var liveRegion = document.getElementById("booking-live");
  var current = 0;

  var state = { service: "", location: "", date: "", time: "" };

  /* ---- Step navigation -------------------------------------------------- */

  function showStep(index, opts) {
    opts = opts || {};
    current = Math.max(0, Math.min(index, steps.length - 1));

    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === current); });

    stepperItems.forEach(function (li, i) {
      li.setAttribute("data-state", i === current ? "active" : i < current ? "done" : "todo");
      if (i === current) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });

    if (!opts.silent) {
      var heading = steps[current].querySelector("h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
      var top = form.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: top, behavior: "smooth" });
      announce("Step " + (current + 1) + " of " + steps.length + ". " +
        (heading ? heading.textContent : ""));
    }
  }

  function announce(msg) {
    if (liveRegion) liveRegion.textContent = msg;
  }

  /* ---- Validation ------------------------------------------------------- */

  function fieldWrap(el) { return el.closest(".field") || el.closest("fieldset"); }

  function setError(el, message) {
    var wrap = fieldWrap(el);
    if (!wrap) return;
    wrap.classList.add("has-error");
    var slot = wrap.querySelector(".error-text");
    if (slot) slot.textContent = message;
    el.setAttribute("aria-invalid", "true");
  }

  function clearError(el) {
    var wrap = fieldWrap(el);
    if (!wrap) return;
    wrap.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  }

  function validateControl(el) {
    var value = (el.value || "").trim();

    if (el.type === "checkbox") {
      if (el.required && !el.checked) {
        setError(el, el.dataset.msgRequired || "Please tick this to continue.");
        return false;
      }
      clearError(el);
      return true;
    }

    if (el.required && !value) {
      setError(el, el.dataset.msgRequired || "This field is required.");
      return false;
    }
    if (el.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError(el, "Enter an email like name@example.com.");
      return false;
    }
    if (el.type === "tel" && value && value.replace(/\D/g, "").length < 10) {
      setError(el, "Enter a 10-digit phone number.");
      return false;
    }
    clearError(el);
    return true;
  }

  function validateStep(index) {
    var step = steps[index];
    var ok = true;
    var firstBad = null;

    // Required radio groups.
    step.querySelectorAll("[data-require-group]").forEach(function (group) {
      var name = group.getAttribute("data-require-group");
      var picked = form.querySelector('input[name="' + name + '"]:checked');
      var slot = group.querySelector(".error-text");
      if (picked) {
        group.classList.remove("has-error");
      } else {
        ok = false;
        group.classList.add("has-error");
        if (slot) slot.textContent = group.getAttribute("data-msg") || "Pick an option to continue.";
        if (!firstBad) firstBad = group.querySelector("input");
      }
    });

    // Date + time (custom widgets, not native inputs).
    if (step.querySelector("#datestrip")) {
      var slot2 = step.querySelector('[data-error-for="when"]');
      if (!state.date || !state.time) {
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

    // Native controls.
    step.querySelectorAll("input:not([type=radio]):not([type=hidden]), select, textarea").forEach(function (el) {
      if (el.disabled) return;
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
    if (e.target.matches("input, select, textarea") &&
        fieldWrap(e.target) && fieldWrap(e.target).classList.contains("has-error")) {
      validateControl(e.target);
    }
  });

  form.addEventListener("blur", function (e) {
    if (e.target.matches("input:not([type=radio]), select, textarea") && e.target.value) {
      validateControl(e.target);
    }
  }, true);

  /* ---- Summary rail ----------------------------------------------------- */

  function labelFor(name) {
    var picked = form.querySelector('input[name="' + name + '"]:checked');
    if (!picked) return "";
    var strong = picked.closest(".option").querySelector(".option__text strong");
    return strong ? strong.textContent.trim() : picked.value;
  }

  function prettyDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-");
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return DOW_SHORT[d.getDay()] + ", " + MON_SHORT[d.getMonth()] + " " + d.getDate();
  }

  function renderSummary() {
    var map = {
      service: state.service ? labelFor("service") : "",
      location: state.location ? labelFor("location") : "",
      when: state.date ? prettyDate(state.date) + (state.time ? " at " + state.time : "") : ""
    };

    Object.keys(map).forEach(function (key) {
      var el = document.querySelector('[data-summary="' + key + '"]');
      if (!el) return;
      var empty = !map[key];
      el.textContent = empty ? (el.getAttribute("data-empty") || "Not chosen yet") : map[key];
      el.classList.toggle("is-empty", empty);
    });
  }

  /* ---- Service / location choices --------------------------------------- */

  form.addEventListener("change", function (e) {
    if (e.target.name === "service") {
      state.service = e.target.value;
      var group = e.target.closest("[data-require-group]");
      if (group) group.classList.remove("has-error");
      var dur = e.target.getAttribute("data-duration");
      var durEl = document.querySelector("[data-summary-duration]");
      if (durEl && dur) durEl.textContent = dur;
      renderSummary();
    }
    if (e.target.name === "location") {
      state.location = e.target.value;
      var lgroup = e.target.closest("[data-require-group]");
      if (lgroup) lgroup.classList.remove("has-error");
      // A different office means different chairs. Re-offer times.
      state.time = "";
      if (state.date) renderSlots(state.date);
      renderSummary();
    }
  });

  /* ---- Availability ------------------------------------------------------ */

  /* Deterministic pseudo-availability so the demo looks alive but never
     changes under the user mid-session. */
  function seeded(dateIso, minuteOfDay, locationKey) {
    var s = dateIso + "|" + minuteOfDay + "|" + (locationKey || "");
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h / 4294967295;
  }

  function isoOf(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function dayIsOpen(d) {
    var hours = HOURS[d.getDay()];
    if (!hours) return false;
    // Saturdays alternate.
    if (d.getDay() === 6 && Math.floor(d.getDate() / 7) % 2 === 0) return false;
    return true;
  }

  function minutesToLabel(m) {
    var h24 = Math.floor(m / 60);
    var mm = m % 60;
    var suffix = h24 >= 12 ? "PM" : "AM";
    var h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return h12 + ":" + String(mm).padStart(2, "0") + " " + suffix;
  }

  /* ---- Date strip -------------------------------------------------------- */

  var datestrip = document.getElementById("datestrip");
  var slotsHost = document.getElementById("slots");

  function renderDates() {
    if (!datestrip) return;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var frag = document.createDocumentFragment();

    for (var i = 1; i <= DAYS_AHEAD; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() + i);

      var iso = isoOf(d);
      var open = dayIsOpen(d);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "daypill";
      btn.setAttribute("aria-pressed", "false");
      btn.dataset.date = iso;
      if (!open) btn.disabled = true;

      btn.innerHTML =
        '<span class="daypill__dow">' + DOW_SHORT[d.getDay()] + "</span>" +
        '<span class="daypill__day">' + d.getDate() + "</span>" +
        '<span class="daypill__mon">' + MON_SHORT[d.getMonth()] + "</span>";

      btn.setAttribute("aria-label",
        DOW_SHORT[d.getDay()] + " " + MON_SHORT[d.getMonth()] + " " + d.getDate() +
        (open ? "" : ". Closed"));

      frag.appendChild(btn);
    }

    datestrip.appendChild(frag);
  }

  function renderSlots(iso) {
    if (!slotsHost) return;

    var parts = iso.split("-");
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    var hours = HOURS[d.getDay()];
    slotsHost.innerHTML = "";

    if (!hours) {
      slotsHost.innerHTML = '<p class="hint">We are closed that day. Pick another.</p>';
      return;
    }

    var groups = [
      { title: "Morning", from: hours[0], to: Math.min(12 * 60, hours[1]) },
      { title: "Afternoon", from: Math.max(12 * 60, hours[0]), to: Math.min(17 * 60, hours[1]) },
      { title: "Evening", from: Math.max(17 * 60, hours[0]), to: hours[1] }
    ];

    var anyFree = false;

    groups.forEach(function (g) {
      if (g.to <= g.from) return;

      var wrap = document.createElement("div");
      wrap.className = "slots-group";

      var h = document.createElement("h4");
      h.textContent = g.title;
      wrap.appendChild(h);

      var grid = document.createElement("div");
      grid.className = "slots";

      for (var m = g.from; m + 30 <= g.to; m += 30) {
        if (m >= 12 * 60 && m < 13 * 60) continue; // lunch

        var free = seeded(iso, m, state.location) > 0.38;
        if (free) anyFree = true;

        var b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.dataset.time = minutesToLabel(m);
        b.textContent = minutesToLabel(m);
        b.setAttribute("aria-pressed", "false");
        if (!free) {
          b.disabled = true;
          b.setAttribute("aria-label", minutesToLabel(m) + ". Already booked");
        }
        grid.appendChild(b);
      }

      wrap.appendChild(grid);
      if (grid.children.length) slotsHost.appendChild(wrap);
    });

    if (!anyFree) {
      var p = document.createElement("p");
      p.className = "hint mt-4";
      p.textContent = "That day is fully booked. Try another day, or call us. We keep a same-week cancellation list.";
      slotsHost.appendChild(p);
    }

    announce(prettyDate(iso) + " selected. " +
      slotsHost.querySelectorAll(".slot:not([disabled])").length + " times available.");
  }

  if (datestrip) {
    renderDates();

    datestrip.addEventListener("click", function (e) {
      var pill = e.target.closest(".daypill");
      if (!pill || pill.disabled) return;

      datestrip.querySelectorAll(".daypill").forEach(function (p) {
        p.setAttribute("aria-pressed", String(p === pill));
      });

      state.date = pill.dataset.date;
      state.time = "";
      renderSlots(state.date);
      renderSummary();

      var wrap = slotsHost && slotsHost.closest(".field");
      if (wrap) wrap.classList.remove("has-error");
    });

    // Arrow-key roving through the date strip.
    datestrip.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var pills = Array.prototype.filter.call(
        datestrip.querySelectorAll(".daypill"), function (p) { return !p.disabled; });
      var i = pills.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      var next = pills[e.key === "ArrowRight" ? i + 1 : i - 1];
      if (next) next.focus();
    });
  }

  if (slotsHost) {
    slotsHost.addEventListener("click", function (e) {
      var slot = e.target.closest(".slot");
      if (!slot || slot.disabled) return;

      slotsHost.querySelectorAll(".slot").forEach(function (s) {
        s.setAttribute("aria-pressed", String(s === slot));
      });

      state.time = slot.dataset.time;
      renderSummary();

      var wrap = slotsHost.closest(".field");
      if (wrap) wrap.classList.remove("has-error");
    });
  }

  /* ---- Review step ------------------------------------------------------- */

  function fillReview() {
    var get = function (name) {
      var el = form.elements[name];
      return el ? (el.value || "").trim() : "";
    };

    var rows = {
      service: labelFor("service"),
      location: labelFor("location"),
      when: prettyDate(state.date) + " at " + state.time,
      name: get("firstName") + " " + get("lastName"),
      phone: get("phone"),
      email: get("email"),
      patient: labelFor("patientType"),
      insurance: get("insurance") || "Not provided",
      notes: get("notes") || "–"
    };

    Object.keys(rows).forEach(function (key) {
      var el = document.querySelector('[data-review="' + key + '"]');
      if (el) el.textContent = rows[key];
    });
  }

  /* ---- Buttons ----------------------------------------------------------- */

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
    if (back) {
      e.preventDefault();
      showStep(current - 1);
      return;
    }

    var edit = e.target.closest("[data-edit-step]");
    if (edit) {
      e.preventDefault();
      showStep(parseInt(edit.getAttribute("data-edit-step"), 10));
    }
  });

  /* ---- Submit ------------------------------------------------------------ */

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    for (var i = 0; i < steps.length - 1; i++) {
      if (!validateStep(i)) { showStep(i); return; }
    }

    var btn = form.querySelector("[data-submit]");
    if (btn) { btn.disabled = true; btn.textContent = "Sending request…"; }

    // Stand-in for the network round-trip.
    window.setTimeout(function () {
      var panel = document.getElementById("booking-done");
      var shell = document.getElementById("booking-shell");
      if (!panel || !shell) return;

      var codeEl = panel.querySelector("[data-confirm-code]");
      if (codeEl) {
        codeEl.textContent = "SD-" + String(Math.floor(Math.random() * 9000) + 1000);
      }

      var whenEl = panel.querySelector("[data-confirm-when]");
      if (whenEl) whenEl.textContent = prettyDate(state.date) + " at " + state.time;

      var whereEl = panel.querySelector("[data-confirm-where]");
      if (whereEl) whereEl.textContent = labelFor("location");

      shell.hidden = true;
      panel.hidden = false;
      panel.querySelector("h2").setAttribute("tabindex", "-1");
      panel.querySelector("h2").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
      announce("Request sent. Confirmation details are on screen.");

      // Demo hygiene: drop the details we collected rather than leave them
      // sitting in a live form in the tab.
      form.reset();
    }, 700);
  });

  /* ---- Deep link: book.html?service=whitening ---------------------------- */

  (function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get("service");
    if (!wanted) return;

    var input = form.querySelector('input[name="service"][value="' + CSS.escape(wanted) + '"]');
    if (!input) return;

    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })();

  showStep(0, { silent: true });
  renderSummary();
})();
