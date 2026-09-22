/* THE LUMEN: the booker.

   Three views in one page: results, then rate-and-details, then the
   confirmation. The search bar at the top is the same component as the
   homepage, so the dates you arrive with are the dates you keep. */

(function () {
  "use strict";

  var q = HL.readQuery();
  var chosenRoom = HL.roomById(HL.qs("room") || "");
  var chosenPlan = HL.planById(HL.qs("plan") || "flex");

  var elIntro   = document.getElementById("book-intro");
  var elHead    = document.getElementById("stayhead");
  var elResults = document.getElementById("results-section");
  var elChoose  = document.getElementById("choose-section");
  var elDone    = document.getElementById("done-section");
  var form      = document.getElementById("guest-form");

  var bar = document.querySelector("[data-searchbar]");
  HL.wireSearchbar(bar, {
    state: q,
    onSubmit: function (state) {
      q = state;
      chosenRoom = null;
      history.replaceState(null, "", "book.html?" + HL.queryString(q));
      show("results");
    }
  });

  document.getElementById("change-dates").addEventListener("click", function () {
    show("search");
    elIntro.scrollIntoView({ behavior: "smooth", block: "start" });
    bar.querySelector('[name="checkin"]').focus();
  });

  /* ---- View switching ----------------------------------------------------- */

  function show(view) {
    elIntro.hidden  = view !== "search";
    elHead.hidden   = view === "search" || view === "done";
    elResults.hidden = view !== "results";
    elChoose.hidden = view !== "choose";
    elDone.hidden   = view !== "done";

    if (view === "results") { paintHead(); paintResults(); }
    if (view === "choose")  { paintHead(); paintChoose(); }
  }

  function paintHead() {
    var n = HL.nights(q.checkin, q.checkout);
    document.getElementById("stayhead-dates").textContent = HL.fmtRange(q.checkin, q.checkout);
    document.getElementById("stayhead-meta").textContent =
      n + " night" + (n === 1 ? "" : "s") + " · " +
      q.adults + " adult" + (q.adults === 1 ? "" : "s") +
      (q.children ? " and " + q.children + " child" + (q.children === 1 ? "" : "ren") : "") +
      " · " + HL.seasonFor(q.checkin).name.toLowerCase() + " season";
  }

  /* ---- Results ------------------------------------------------------------ */

  function paintResults() {
    var stay = HL.search(q);
    var rules = document.getElementById("stay-rules");
    var host = document.getElementById("results");

    /* Rules that stop the whole search get said once, at the top, rather than
       six times over identical cards. */
    if (stay.closedToArrival || stay.nights < stay.minStay) {
      var fake = { room: HL.ROOMS[0], reason: stay.closedToArrival ? "cta" : "minstay", full: [] };
      var fix = stay.closedToArrival
        ? { checkin: HL.addDays(stay.checkin, -1),
            checkout: HL.addDays(HL.addDays(stay.checkin, -1), Math.max(stay.nights + 1, HL.minStayFor(HL.addDays(stay.checkin, -1)))) }
        : { checkin: stay.checkin, checkout: HL.addDays(stay.checkin, stay.minStay) };
      rules.innerHTML = '<div class="why why--stop">' + HL.icon("alert", 18) + "<div>" +
        HL.reasonHTML(fake, stay, q) +
        '<p class="mt-3"><button class="btn btn--sm" type="button" data-fix=\'' +
        JSON.stringify(fix) + "'>Use " + HL.fmtRange(fix.checkin, fix.checkout) + "</button></p>" +
        "</div></div>";
      host.innerHTML = "";
      return;
    }

    rules.innerHTML = '<p class="muted" style="font-size:var(--step--1)">' +
      "<strong>" + stay.available + " of " + stay.results.length + "</strong> room types are free for " +
      "every night of this stay. Rates below are room only, before tax." +
      (stay.minStay > 1 ? " This arrival date has a " + stay.minStay + "-night minimum." : "") +
      "</p>";

    host.innerHTML = stay.results.map(function (r) { return resultHTML(r, stay); }).join("");
    HL.revealIn(host);
  }

  function resultHTML(r, stay) {
    var room = r.room;
    var strip = r.nights.length ? '<div class="nightstrip mt-3">' + r.nights.map(function (nt) {
      return '<div class="night' + (nt.free <= 0 ? " night--full" : "") + '">' +
        '<span class="night__dow">' + HL.fmt(nt.iso, { weekday: "short" }) + "</span>" +
        '<span class="night__day">' + HL.parseIso(nt.iso).getDate() + "</span>" +
        '<span class="night__rate">' + (nt.free > 0 ? HL.money(nt.rate) : "full") + "</span>" +
        "</div>";
    }).join("") + "</div>" : "";

    var right = r.ok
      ? '<div class="result__price"><b>' + HL.money(r.subtotal) + "</b>" +
        "<span>" + stay.nights + " night" + (stay.nights === 1 ? "" : "s") + ", room only</span>" +
        "<span>" + HL.money(r.avg) + " a night average</span></div>"
      : "";

    var body = r.ok
      ? strip +
        '<div class="result__foot">' +
          '<span class="muted" style="font-size:var(--step--2)">' +
            room.count + " of this type" + (room.count <= 2 ? " in the building" : "") + "</span>" +
          '<button class="btn" type="button" data-pick="' + room.id + '">Choose this room</button>' +
        "</div>"
      : (r.reason === "full" ? strip : "") +
        '<div class="why' + (r.reason === "occupancy" ? "" : " why--warn") + ' mt-3">' +
          HL.icon("alert", 18) + "<div>" + HL.reasonHTML(r, stay, q) + altFix(r, stay) + "</div></div>";

    return '<article class="result' + (r.ok ? "" : " result--gone") + '" data-reveal>' +
      '<div class="result__art"><img src="' + HL.roomImg(room) + '" alt="' + HL.esc(HL.roomAlt(room)) +
        '" loading="lazy" width="1500" height="938"></div>' +
      '<div class="result__body">' +
        '<div class="result__head"><div>' +
          "<h2 style=\"font-size:var(--step-2)\">" + HL.esc(room.name) + "</h2>" +
          '<span class="roomcard__meta">' + room.sqm + " m² &middot; " + HL.esc(room.beds) +
            " &middot; " + HL.sleepsLine(room) + "</span>" +
        "</div>" + right + "</div>" +
        '<p class="roomcard__desc">' + HL.esc(room.blurb.split(". ")[0]) + ". " +
          '<a href="room.html?id=' + room.id + "&" + HL.queryString(q) + '">See the room</a></p>' +
        body +
      "</div></article>";
  }

  /* When a room is full on some nights, offer the nearest stay that works. */
  function altFix(r, stay) {
    if (r.reason !== "full") return "";
    var open = HL.nextOpening(r.room, stay.checkin, stay.nights, q.adults, q.children);
    if (!open) return '<p class="mt-2">Nothing in the next four months, which for this room is normal.</p>';
    if (open.checkin === stay.checkin) return "";
    return '<p class="mt-3"><button class="btn btn--sm btn--ghost" type="button" data-fix=\'' +
      JSON.stringify({ checkin: open.checkin, checkout: open.checkout }) + "'>" +
      "Nearest: " + HL.fmtRange(open.checkin, open.checkout) + "</button></p>";
  }

  document.addEventListener("click", function (e) {
    var fix = e.target.closest("[data-fix]");
    if (fix) {
      var v = JSON.parse(fix.getAttribute("data-fix"));
      q.checkin = v.checkin; q.checkout = v.checkout;
      HL.wireSearchbar(bar, { state: q, onSubmit: null });
      history.replaceState(null, "", "book.html?" + HL.queryString(q));
      show("results");
      elHead.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    var pick = e.target.closest("[data-pick]");
    if (pick) {
      chosenRoom = HL.roomById(pick.getAttribute("data-pick"));
      history.replaceState(null, "", "book.html?" + HL.queryString(q, { room: chosenRoom.id }));
      show("choose");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  /* ---- Choose a rate, then give us a name --------------------------------- */

  function paintChoose() {
    var room = chosenRoom;
    document.getElementById("book-title").textContent = room.name;

    document.getElementById("chosen-room").innerHTML =
      '<div class="result">' +
        '<div class="result__art"><img src="' + HL.roomImg(room) + '" alt="' + HL.esc(HL.roomAlt(room)) +
          '" width="1500" height="938"></div>' +
        '<div class="result__body">' +
          "<h2 style=\"font-size:var(--step-2)\">" + HL.esc(room.name) + "</h2>" +
          '<span class="roomcard__meta">' + room.sqm + " m² &middot; " + HL.esc(room.beds) +
            " &middot; " + HL.esc(room.view) + "</span>" +
          '<p class="roomcard__desc mt-2">' + HL.esc(room.blurb.split(". ")[0]) + ".</p>" +
          '<div class="result__foot"><button class="btn btn--ghost btn--sm" type="button" ' +
            'id="back-to-results">Pick a different room</button></div>' +
        "</div></div>";

    document.getElementById("back-to-results").addEventListener("click", function () {
      chosenRoom = null;
      history.replaceState(null, "", "book.html?" + HL.queryString(q));
      show("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.getElementById("plan-options").innerHTML = HL.PLANS.map(function (p) {
      var qt = HL.quote(room, p, q.checkin, q.checkout);
      return '<label class="planopt"><input type="radio" name="plan" value="' + p.id + '"' +
        (p.id === chosenPlan.id ? " checked" : "") + ">" +
        '<span class="planopt__name">' + p.name + "</span>" +
        '<span class="planopt__price">' + HL.money(qt.total) + "</span>" +
        '<span class="planopt__per">total for ' + qt.nights + " night" + (qt.nights === 1 ? "" : "s") +
          ", tax and levy included</span>" +
        '<p class="planopt__blurb mt-2">' + HL.esc(p.blurb) + "</p>" +
        '<span class="planopt__cancel">' + HL.esc(p.cancel) + "</span>" +
        "</label>";
    }).join("");

    document.getElementById("plan-options").addEventListener("change", function (e) {
      if (e.target.name !== "plan") return;
      chosenPlan = HL.planById(e.target.value);
      paintCost();
    });

    paintCost();
  }

  function paintCost() {
    var qt = HL.quote(chosenRoom, chosenPlan, q.checkin, q.checkout);
    var host = document.getElementById("cost-summary");
    var n = qt.nights;

    host.innerHTML =
      '<h2 style="font-size:var(--step-1)">Your stay</h2>' +
      '<p class="muted mt-2" style="font-size:var(--step--1)">' + HL.esc(chosenRoom.name) + "<br>" +
        HL.fmtRange(q.checkin, q.checkout) + " &middot; " + n + " night" + (n === 1 ? "" : "s") + "<br>" +
        q.adults + " adult" + (q.adults === 1 ? "" : "s") +
        (q.children ? " and " + q.children + " child" + (q.children === 1 ? "" : "ren") : "") + "</p>" +

      '<div class="nightlist">' + qt.lines.map(function (l) {
        return '<div class="sumrow"><span>' + HL.fmt(l.iso, { weekday: "short", month: "short", day: "numeric" }) +
          "</span><span>" + HL.money(l.rate) + "</span></div>";
      }).join("") + "</div>" +

      '<div class="mt-4">' +
        '<div class="sumrow"><span>Room, ' + n + " night" + (n === 1 ? "" : "s") + "</span><span>" +
          HL.money(qt.room_total) + "</span></div>" +
        (qt.saved > 0 ? '<div class="sumrow sumrow--sub"><span>Advance purchase saving</span><span>−' +
          HL.money(qt.saved) + "</span></div>" : "") +
        (chosenPlan.perNight ? '<div class="sumrow sumrow--sub"><span>Breakfast for two, included above</span><span>' +
          HL.money(chosenPlan.perNight) + "/night</span></div>" : "") +
        '<div class="sumrow"><span>Occupancy tax, 14.5%</span><span>' + HL.money(qt.tax) + "</span></div>" +
        '<div class="sumrow"><span>City levy, ' + HL.money(HL.CITY_LEVY) + " × " + n +
          "</span><span>" + HL.money(qt.levy) + "</span></div>" +
      "</div>" +
      '<div class="sumtotal"><span>Total</span><b>' + HL.money(qt.total) + "</b></div>" +
      '<p class="muted mt-3" style="font-size:var(--step--2)">' + HL.esc(chosenPlan.cancel) + "</p>";
  }

  /* ---- Validation and confirmation ---------------------------------------- */

  function fail(el, msg) {
    var wrap = el.closest(".field") || el.closest("fieldset") || el.parentNode;
    if (wrap && wrap.classList) wrap.classList.add("has-error");
    var slot = wrap && wrap.querySelector ? wrap.querySelector(".error-text") : null;
    if (slot) slot.textContent = msg;
    el.setAttribute("aria-invalid", "true");
    return el;
  }
  function clear(el) {
    var wrap = el.closest(".field") || el.closest("fieldset") || el.parentNode;
    if (wrap && wrap.classList) wrap.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var first = document.getElementById("g-first");
    var last = document.getElementById("g-last");
    var email = document.getElementById("g-email");
    var phone = document.getElementById("g-phone");
    var terms = document.getElementById("g-terms");
    var bad = null;

    [first, last, email, phone].forEach(clear);
    document.getElementById("terms-err").textContent = "";
    document.getElementById("terms-err").style.display = "none";

    /* Every field is checked, not just the first one to fail. */
    function check(isBad, el, msg) {
      if (!isBad) return;
      var t = fail(el, msg);
      if (!bad) bad = t;
    }
    check(!first.value.trim(), first, "We need a first name.");
    check(!last.value.trim(), last, "And a last name.");
    check(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), email, "Check the email address.");
    check(phone.value.replace(/\D/g, "").length < 7, phone, "A number we can reach you on.");
    if (!terms.checked) {
      var te = document.getElementById("terms-err");
      te.textContent = "Please confirm you've read the rate conditions.";
      te.style.display = "block";
      if (!bad) bad = terms;
    }
    if (bad) { bad.focus(); return; }

    complete(first.value.trim(), last.value.trim(), email.value.trim());
  });

  function complete(first, last, email) {
    var qt = HL.quote(chosenRoom, chosenPlan, q.checkin, q.checkout);
    var ref = "LMN-" + (100000 + (HL.hash(chosenRoom.id + q.checkin + email) % 900000));

    /* Take the nights off the board so the results you go back to reflect
       what you just did. */
    HL.commit(chosenRoom.id, q.checkin, q.checkout);

    show("done");
    document.getElementById("done").innerHTML =
      '<div class="confirm">' +
        '<div class="confirm__mark">' + HL.icon("check", 30) + "</div>" +
        '<h1 tabindex="-1" id="done-head" style="font-size:var(--step-4)">Booked, ' + HL.esc(first) + "</h1>" +
        '<p class="muted mt-4 measure" style="margin-inline:auto">' +
          HL.esc(chosenRoom.name) + " for " + qt.nights + " night" + (qt.nights === 1 ? "" : "s") +
          ", " + HL.fmtRange(q.checkin, q.checkout) + ". A confirmation would be on its way to " +
          HL.esc(email) + "." +
        "</p>" +
        '<div class="confirm__ref">' + ref + "</div>" +
      "</div>" +

      '<div class="grid grid--2 mt-5">' +
        '<div class="summary"><h2 style="font-size:var(--step-1)">Your booking</h2>' +
          '<dl class="specs mt-4" style="border:0">' +
            "<div style=\"padding-inline:0\"><dt>Room</dt><dd>" + HL.esc(chosenRoom.name) + "</dd></div>" +
            "<div style=\"padding-inline:0\"><dt>Arrive</dt><dd>" + HL.fmtLong(q.checkin) + ", from 3pm</dd></div>" +
            "<div style=\"padding-inline:0\"><dt>Leave</dt><dd>" + HL.fmtLong(q.checkout) + ", by 11am</dd></div>" +
            "<div style=\"padding-inline:0\"><dt>Guests</dt><dd>" + q.adults + " adult" +
              (q.adults === 1 ? "" : "s") + (q.children ? " and " + q.children + " child" +
              (q.children === 1 ? "" : "ren") : "") + "</dd></div>" +
            "<div style=\"padding-inline:0\"><dt>Rate</dt><dd>" + chosenPlan.name + "</dd></div>" +
            "<div style=\"padding-inline:0\"><dt>Total</dt><dd>" + HL.money(qt.total) + "</dd></div>" +
          "</dl></div>" +
        '<div class="summary"><h2 style="font-size:var(--step-1)">Before you come</h2>' +
          '<ul class="checklist mt-4">' +
            "<li>Check-in is from 3pm. Arrive earlier and we'll take your bags.</li>" +
            "<li>" + HL.esc(chosenPlan.cancel) + "</li>" +
            (chosenRoom.count <= 2
              ? "<li>Airport transfers and breakfast are included with the penthouses. Tell us your flight and we'll meet it.</li>"
              : "<li>Breakfast in the Long Room is " + (chosenPlan.perNight ? "included in your rate" : "$27, or add it at the desk") + ".</li>") +
            "<li>Parking is $38 a night, valet. Four EV bays, no charge.</li>" +
          "</ul></div>" +
      "</div>" +

      '<div class="notice notice--info mt-5">' + HL.icon("info", 20) +
        "<p><strong>This is a portfolio demo.</strong> No email was sent, no card was taken and nothing " +
        "reached a server. The only thing kept is a note in this browser that these nights are gone, " +
        "so the availability you see next stays consistent.</p></div>" +

      '<div class="btn-row mt-5" style="justify-content:center">' +
        '<a class="btn btn--ghost" href="book.html">Book another stay</a>' +
        '<a class="btn btn--ghost" href="stay.html">About the hotel</a>' +
      "</div>";

    var h = document.getElementById("done-head");
    if (h) h.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---- Go ------------------------------------------------------------------ */

  if (chosenRoom) {
    var stay0 = HL.search(q);
    var mine = stay0.results.filter(function (r) { return r.room.id === chosenRoom.id; })[0];
    if (mine && mine.ok) show("choose");
    else { chosenRoom = null; show("results"); }
  } else if (HL.qs("checkin")) {
    show("results");
  } else {
    show("search");
  }
})();
