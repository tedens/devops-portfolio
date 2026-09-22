/* THE LUMEN: rate plans, priced against one sample stay so they compare. */
(function () {
  "use strict";
  var cards = document.getElementById("plan-cards");
  if (!cards) return;

  /* A two-night midweek stay in a Harbour King, so the three plans are
     directly comparable rather than each quoting its own best case. */
  var room = HL.roomById("harbour-king");
  var ci = HL.addDays(HL.today(), 28);
  while (HL.dow(ci) !== 2) ci = HL.addDays(ci, 1);        /* a Tuesday */
  var co = HL.addDays(ci, 2);

  cards.innerHTML = HL.PLANS.map(function (p) {
    var q = HL.quote(room, p, ci, co);
    return '<article class="planopt" style="cursor:default">' +
      '<span class="planopt__name">' + p.name + "</span>" +
      '<span class="planopt__price">' + HL.money(q.perNight) + "</span>" +
      '<span class="planopt__per">per night, room only, before tax</span>' +
      '<p class="planopt__blurb mt-2">' + HL.esc(p.blurb) + "</p>" +
      '<span class="planopt__cancel">' + HL.esc(p.cancel) + "</span>" +
      "</article>";
  }).join("");

  var note = document.createElement("p");
  note.className = "muted mt-4";
  note.style.fontSize = "var(--step--2)";
  note.textContent = "Sample stay: " + HL.fmtRange(ci, co) + ", two nights, Harbour King.";
  cards.parentNode.insertBefore(note, cards.nextSibling);

  var st = document.getElementById("season-table");
  if (st) {
    st.innerHTML = HL.SEASONS.map(function (s) {
      return "<div><dt>" + s.name + "<br><span style=\"font-weight:400\">" + HL.esc(s.note) +
        "</span></dt><dd>" + (s.mult > 1 ? "+" : "−") +
        Math.abs(Math.round((s.mult - 1) * 100)) + "%</dd></div>";
    }).join("");
  }
  var dt = document.getElementById("dow-table");
  if (dt) {
    var rows = [["Sunday", -6], ["Monday to Thursday", 0], ["Friday", 4], ["Saturday", 22]];
    dt.innerHTML = rows.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" +
        (r[1] === 0 ? "base rate" : (r[1] > 0 ? "+" : "−") + Math.abs(r[1]) + "%") +
        "</dd></div>";
    }).join("");
  }
})();
