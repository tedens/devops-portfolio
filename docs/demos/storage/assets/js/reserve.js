/* GANTRY: the reservation.

   One page, not a wizard. Holding a unit is a short, low-commitment act: no
   payment, no contract, seven days. A five-step flow would make it feel like
   more than it is, and would hide the running total, which is the one thing
   somebody reserving storage actually wants to watch. */

(function () {
  "use strict";

  var type = ST.typeById(ST.qs("id") || "");
  var live = document.getElementById("res-live");
  var done = document.getElementById("res-done");

  if (!type) {
    live.innerHTML = '<div class="panel"><h2 style="font-size:var(--step-1)">Pick a unit first</h2>' +
      '<p class="muted mt-3">Choose a size and we\'ll hold it for a week.</p>' +
      '<div class="btn-row mt-5"><a class="btn" href="units.html">See what\'s free</a>' +
      '<a class="btn btn--outline" href="sizes.html">Work out my size</a></div></div>';
    return;
  }

  var free = ST.remaining(type);
  var state = {
    term: ST.termById(ST.qs("term") || "monthly").id,
    date: ST.clampDate(ST.qs("date")),
    protection: ST.protectionById(ST.qs("p") || "p5").id,
    lock: ST.qs("lock") === "1"
  };

  document.title = "Reserve a " + type.size.name + " · Gantry Self Storage";

  var form = document.getElementById("res-form");
  var costEl = document.getElementById("res-cost");
  var bounds = ST.dateBounds();

  /* ---- The unit being held ------------------------------------------------ */

  document.getElementById("res-unit").innerHTML =
    '<div class="panel">' +
      '<div class="flex-between">' +
        "<div><h2 style=\"font-size:var(--step-2)\">" + type.size.name + " ft · " +
          ST.esc(type.size.nick) + "</h2>" +
          '<span class="utile__sub">' + ST.sqft(type.size) + " sq ft &middot; " +
          ST.buildingFor(type) + "</span></div>" +
        '<span class="avail' + (ST.availClass(free) ? " avail--" + ST.availClass(free) : "") + '">' +
          ST.availLabel(free) + "</span>" +
      "</div>" +
      '<div class="tags mt-4">' + ST.featureTags(type) +
        '<span class="tag">' + type.door.w + " ft " + type.door.type.toLowerCase() + " door</span></div>" +
      '<p class="mt-4"><a class="link-arrow" href="unit.html?id=' + encodeURIComponent(type.id) +
        '">Change unit or see the detail</a></p>' +
    "</div>" +
    (free ? "" :
      '<div class="notice notice--danger mt-4">' + ST.icon("alert", 20) +
      "<p><strong>Every one of these is taken today.</strong> You can still send this and " +
      "we'll put you on the waiting list. Average wait is under two weeks, or " +
      '<a href="units.html">pick a size that\'s free</a>.</p></div>');

  /* ---- Controls ------------------------------------------------------------ */

  var dateInput = document.getElementById("movein");
  dateInput.min = bounds.min;
  dateInput.max = bounds.max;
  dateInput.value = state.date;

  document.getElementById("res-terms").innerHTML = ST.termButtonsHTML(type, state.term);
  document.getElementById("res-protection").innerHTML = ST.PROTECTION.map(function (p) {
    return '<label class="option"><input type="radio" name="protection" value="' + p.id + '"' +
      (p.id === state.protection ? " checked" : "") + ">" +
      '<span class="option__dot" aria-hidden="true"></span>' +
      '<span class="option__text"><strong>' + p.name + "</strong><span>" + ST.esc(p.note) + "</span></span>" +
      '<span class="option__aside"><span class="option__price">' +
        (p.monthly ? ST.money(p.monthly) : "–") + '</span><span class="option__note">' +
        (p.monthly ? "per month" : "no charge") + "</span></span></label>";
  }).join("");

  document.getElementById("res-lock").checked = state.lock;

  form.addEventListener("click", function (e) {
    var t = e.target.closest("[data-term]");
    if (!t) return;
    state.term = t.getAttribute("data-term");
    document.getElementById("res-terms").innerHTML = ST.termButtonsHTML(type, state.term);
    refresh();
  });

  form.addEventListener("change", function (e) {
    if (e.target.id === "movein") state.date = e.target.value;
    else if (e.target.name === "protection") state.protection = e.target.value;
    else if (e.target.id === "res-lock") state.lock = e.target.checked;
    refresh();
  });

  /* ---- Live cost ------------------------------------------------------------ */

  function refresh() {
    var iso = ST.clampDate(state.date);
    var q = ST.quote(type, state.term, iso, { protection: state.protection, lock: state.lock });
    var pr = q.proRent;

    document.getElementById("term-note").textContent = ST.termById(state.term).note;
    document.getElementById("movein-hint").innerHTML = pr.charged < pr.days
      ? "Moving in on the " + ordinal(ST.parseIso(iso).getDate()) + " means you pay for <strong>" +
        pr.charged + " of the " + pr.days + " days</strong> in " + ST.fmtMonth(iso) + ", not a whole month."
      : "You'd be paying for the whole of " + ST.fmtMonth(iso) + ".";

    costEl.innerHTML =
      '<h2 style="font-size:var(--step-1)">What you\'ll pay</h2>' +
      '<p class="muted mt-2" style="font-size:var(--step--1)">' + type.size.name + " ft, " +
        ST.esc(ST.termById(state.term).name.toLowerCase()) + ", from " +
        ST.fmtDate(iso, { month: "short", day: "numeric" }) + "</p>" +
      '<div class="breakdown mt-5">' + ST.breakdownHTML(q, iso) + "</div>" +
      '<p class="muted mt-5" style="font-size:var(--step--2)">' +
        "Nothing is taken now. You pay this at the office on the day you move in." +
      "</p>";
  }

  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /* ---- Validation ----------------------------------------------------------- */

  function fail(el, msg) {
    var wrap = el.closest(".field") || el.closest("fieldset");
    if (wrap) {
      wrap.classList.add("has-error");
      var slot = wrap.querySelector(".error-text");
      if (slot) slot.textContent = msg;
    }
    el.setAttribute("aria-invalid", "true");
    return el;
  }
  function clear(el) {
    var wrap = el.closest(".field") || el.closest("fieldset");
    if (wrap) wrap.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = document.getElementById("res-name");
    var phone = document.getElementById("res-phone");
    var email = document.getElementById("res-email");
    var ok = document.getElementById("res-terms-ok");
    var first = null;

    [name, phone, email, dateInput, ok].forEach(clear);

    /* Every field is checked and every message shown. Short-circuiting here
       means someone fixes one thing, submits, and is told about the next --
       which is how a four-field form turns into four round trips. */
    function check(bad, el, msg) {
      if (!bad) return;
      var t = fail(el, msg);
      if (!first) first = t;
    }

    check(!name.value.trim(), name, "We need a name for the tenancy.");
    check(phone.value.replace(/\D/g, "").length < 7, phone, "A number we can reach you on.");
    check(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), email, "Check the email address.");
    check(!dateInput.value || dateInput.value < bounds.min || dateInput.value > bounds.max, dateInput,
      "Pick a date between today and " + ST.fmtDate(bounds.max, { month: "long", day: "numeric" }) + ".");
    check(!ok.checked, ok, "Please confirm none of the restricted items are in your load.");

    if (first) { first.focus(); return; }

    complete(name.value.trim(), email.value.trim());
  });

  /* ---- Confirmation ---------------------------------------------------------- */

  function complete(name, email) {
    var iso = ST.clampDate(state.date);
    var q = ST.quote(type, state.term, iso, { protection: state.protection, lock: state.lock });
    var ref = "GS-" + (1000 + (ST.hash(type.id + iso + email) % 9000));
    var until = ST.toIso(ST.addDays(ST.today(), 7));

    /* Take it off the board. The listing reads this, so the count someone
       sees when they go back is the count they just changed. */
    if (free > 0) ST.hold(type.id);

    live.hidden = true;
    done.hidden = false;
    done.innerHTML =
      '<div class="panel panel--pad-lg confirm">' +
        '<div class="confirm__mark">' + ST.icon("check", 38) + "</div>" +
        "<h2 tabindex=\"-1\" id=\"done-head\">" +
          (free > 0 ? "Held for you, " + ST.esc(name.split(" ")[0]) : "You're on the list, " + ST.esc(name.split(" ")[0])) +
        "</h2>" +
        '<p class="muted mt-3 measure" style="margin-inline:auto">' +
          (free > 0
            ? "Your " + type.size.name + " in " + ST.esc(ST.buildingFor(type).split(",")[0]) +
              " is off the board until <strong>" + ST.fmtDate(until, { weekday: "long", month: "long", day: "numeric" }) +
              "</strong>. Nothing has been charged."
            : "This size is full today. We'll call you the moment one comes back. " +
              "the average wait is under two weeks.") +
        "</p>" +
        '<div class="confirm__ref">' + ref + "</div>" +
      "</div>" +

      '<div class="grid grid--2 mt-5">' +
        '<div class="panel"><h3 style="font-size:var(--step-1)">What you\'ve reserved</h3>' +
          '<dl class="specs mt-4">' +
            "<div><dt>Unit</dt><dd>" + type.size.name + " ft, " + ST.esc(type.name.split(", ")[1] || "") + "</dd></div>" +
            "<div><dt>Where</dt><dd>" + ST.buildingFor(type) + "</dd></div>" +
            "<div><dt>Move in</dt><dd>" + ST.fmtDate(iso, { weekday: "short", month: "long", day: "numeric" }) + "</dd></div>" +
            "<div><dt>Term</dt><dd>" + ST.termById(state.term).name + "</dd></div>" +
            "<div><dt>Cover</dt><dd>" + q.protection.name + "</dd></div>" +
            "<div><dt>Pay on the day</dt><dd>" + ST.money(q.today) + "</dd></div>" +
            "<div><dt>Then monthly</dt><dd>" + ST.money(q.monthly) + "</dd></div>" +
          "</dl></div>" +
        '<div class="panel"><h3 style="font-size:var(--step-1)">Bring with you</h3>' +
          '<ul class="checklist mt-4">' +
            "<li>Photo ID, every tenancy needs one, no exceptions</li>" +
            (state.protection === "own"
              ? "<li><strong>Proof of your own insurance.</strong> We can't hand over the unit without it, and it's the thing people forget</li>"
              : "<li>Nothing for insurance. Your cover starts on move-in day</li>") +
            (state.lock ? "<li>Nothing for the lock. We'll fit yours at the office</li>"
                        : "<li>A padlock. A closed-shackle disc lock is what we'd suggest</li>") +
            (type.size.w < 10
              ? "<li><strong>Check your biggest item.</strong> This unit has a " + type.door.w +
                " ft swing door, so nothing wider than that at its narrowest gets in</li>"
              : "<li>Back the van up to the " + (type.access === "driveup" ? "roller door" : "loading bay") +
                ". Trolleys are free and live in the bay</li>") +
          "</ul></div>" +
      "</div>" +

      '<div class="notice notice--info mt-5">' + ST.icon("info", 20) +
        "<p><strong>This is a portfolio demo.</strong> No email has been sent, nothing has been " +
        "stored on a server, and the details you typed are gone the moment you leave this page. " +
        "The only thing kept is a note in this browser that the unit is held, so the availability " +
        "counts stay consistent while you look around.</p></div>" +

      '<div class="btn-row mt-5" style="justify-content:center">' +
        '<a class="btn btn--outline" href="units.html">Back to the units</a>' +
        '<a class="btn btn--ghost" href="sizes.html">Plan what goes in it</a>' +
      "</div>";

    var h = document.getElementById("done-head");
    if (h) h.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  refresh();
})();
