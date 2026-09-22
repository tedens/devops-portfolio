/* THE LUMEN, one room type: the render, the cutaway, the plan, and what it
   costs on the dates you arrived with. */
(function () {
  "use strict";

  var room = HL.roomById(HL.qs("id") || "");
  var head = document.getElementById("room-head");
  if (!room) {
    head.innerHTML = '<h1 tabindex="-1">We don\'t have that room</h1>' +
      '<p class="muted mt-4">The link may be old. <a href="rooms.html">See all six rooms</a>.</p>';
    ["room-gallery", "room-plan", "room-alts"].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.remove();
    });
    document.getElementById("room-rail").innerHTML =
      '<a class="btn btn--block" href="rooms.html">All rooms</a>';
    return;
  }

  var q = HL.readQuery();
  document.title = room.name + " · The Lumen";
  document.getElementById("crumb").textContent = room.name;

  head.innerHTML =
    (room.count <= 2 ? '<span class="tag tag--copper">One of a kind</span>' : "") +
    '<h1 class="mt-3" tabindex="-1">' + HL.esc(room.name) + "</h1>" +
    '<p class="roomcard__meta mt-3">' + room.sqm + " m²" +
      (room.terraceSqm ? " + " + room.terraceSqm + " m² terrace" : "") +
      " &middot; " + HL.esc(room.beds) + " &middot; " + HL.sleepsLine(room) +
      " &middot; floors " + room.floors + "</p>";

  document.getElementById("room-gallery").innerHTML =
    "<figure><img src=\"" + HL.roomImg(room) + "\" alt=\"" + HL.esc(HL.roomAlt(room)) +
      "\" width=\"1500\" height=\"938\"><figcaption>The room, looking towards the glass.</figcaption></figure>" +
    "<figure><img src=\"" + HL.roomImg(room, "plan3d") + "\" alt=\"" + HL.esc(room.name) +
      " seen from above with the ceiling removed, showing the full layout including the bathroom.\" " +
      "loading=\"lazy\" width=\"1200\" height=\"900\"><figcaption>The same model from above, ceiling off.</figcaption></figure>";

  document.getElementById("room-blurb").textContent = room.blurb;
  document.getElementById("room-highlights").innerHTML =
    room.highlights.map(function (h) { return "<li>" + HL.esc(h) + "</li>"; }).join("");

  function spec(dt, dd) { return "<div><dt>" + dt + "</dt><dd>" + dd + "</dd></div>"; }
  document.getElementById("room-specs").innerHTML =
    spec("Floor area", room.sqm + " m²" + (room.terraceSqm ? " indoors, plus a " + room.terraceSqm + " m² terrace" : "")) +
    spec("Dimensions", room.w + " &times; " + room.d + " m") +
    spec("Beds", HL.esc(room.beds)) +
    spec("Maximum occupancy", HL.sleepsLine(room)) +
    spec("Outlook", HL.esc(room.view)) +
    spec("Floors", room.floors) +
    spec("Rooms of this type", room.count === 1 ? "One, and only one" : room.count) +
    spec("Lowest rate in 90 days", HL.money(HL.fromRate(room)) + " a night");

  document.getElementById("room-plan").innerHTML =
    '<h2 style="font-size:var(--step-2)">The floor plan</h2>' +
    '<p class="muted mt-2" style="font-size:var(--step--1)">Drawn from the same dimensioned source file as the 3D model, so the bed is in the same place in both.</p>' +
    '<div class="planfig mt-4"><img src="assets/img/plans/' + room.id + '.svg" alt="Floor plan of the ' +
      HL.esc(room.name) + ', ' + room.w + ' by ' + room.d + ' metres." loading="lazy"></div>';

  var others = HL.ROOMS.filter(function (r) { return r.id !== room.id; }).slice(0, 2);
  document.getElementById("room-alt-cards").innerHTML =
    others.map(function (r) { return HL.roomCardHTML(r, q); }).join("");

  /* ---- Rail: what this room costs on the dates in the URL ---------------- */

  var rail = document.getElementById("room-rail");

  function paint() {
    var stay = HL.search(q);
    var mine = stay.results.filter(function (r) { return r.room.id === room.id; })[0];
    var nights = HL.nights(q.checkin, q.checkout);
    var out = ['<h2 style="font-size:var(--step-1)">Your dates</h2>',
      '<p class="muted mt-2" style="font-size:var(--step--1)">' + HL.fmtRange(q.checkin, q.checkout) +
      " &middot; " + nights + " night" + (nights === 1 ? "" : "s") +
      " &middot; " + q.adults + " adult" + (q.adults === 1 ? "" : "s") +
      (q.children ? " + " + q.children : "") + "</p>"];

    if (mine.ok) {
      var qt = HL.quote(room, HL.planById("flex"), q.checkin, q.checkout);
      out.push('<div class="mt-5">');
      out.push('<div class="sumrow"><span>Room, ' + nights + " night" + (nights === 1 ? "" : "s") +
        "</span><span>" + HL.money(qt.room_total) + "</span></div>");
      out.push('<div class="sumrow"><span>Occupancy tax, 14.5%</span><span>' + HL.money(qt.tax) + "</span></div>");
      out.push('<div class="sumrow"><span>City levy</span><span>' + HL.money(qt.levy) + "</span></div>");
      out.push('<div class="sumtotal"><span>Total</span><b>' + HL.money(qt.total) + "</b></div>");
      out.push("</div>");
      out.push('<a class="btn btn--block mt-5" href="book.html?' +
        HL.queryString(q, { room: room.id }) + '">Book these dates</a>');
    } else {
      out.push('<div class="why why--warn mt-5">' + HL.icon("alert", 18) + "<div>" +
        HL.reasonHTML(mine, stay, q) + "</div></div>");
      var open = HL.nextOpening(room, q.checkin, nights, q.adults, q.children);
      if (open) {
        out.push('<a class="btn btn--block mt-4" href="book.html?' +
          HL.queryString({ checkin: open.checkin, checkout: open.checkout,
                           adults: q.adults, children: q.children }, { room: room.id }) +
          '">Try ' + HL.fmtRange(open.checkin, open.checkout) + "</a>");
      }
      out.push('<a class="btn btn--block btn--ghost mt-3" href="book.html?' +
        HL.queryString(q) + '">See what is available</a>');
    }

    out.push('<p class="muted mt-4" style="font-size:var(--step--2)">Rates are per night and vary by night. Tax and levy included above.</p>');
    rail.innerHTML = out.join("");
  }

  paint();
})();
