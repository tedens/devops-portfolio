/* THE LUMEN: the rooms index. Long rows rather than a grid: there are only
   six, and each one deserves its own line. */
(function () {
  "use strict";
  var host = document.getElementById("room-rows");
  if (!host) return;
  var q = HL.readQuery();

  host.innerHTML = HL.ROOMS.map(function (room, i) {
    var href = "room.html?id=" + room.id + "&" + HL.queryString(q);
    var from = HL.fromRate(room);
    var isPent = room.count <= 2;
    return '<article class="roomrow' + (i % 2 ? " roomrow--flip" : "") + '"' +
      (isPent && !document.getElementById("penthouses") ? ' id="penthouses"' : "") + ' data-reveal>' +
      '<a class="roomrow__art" href="' + href + '" tabindex="-1" aria-hidden="true">' +
        '<img src="' + HL.roomImg(room) + '" alt="" loading="lazy" width="1500" height="938"></a>' +
      "<div>" +
        (isPent ? '<span class="tag tag--copper">One of a kind</span>' : "") +
        "<h2 class=\"mt-3\" style=\"font-size:var(--step-3)\"><a href=\"" + href +
          "\" style=\"text-decoration:none\">" + HL.esc(room.name) + "</a></h2>" +
        '<p class="roomcard__meta mt-2">' + room.sqm + " m²" +
          (room.terraceSqm ? " + " + room.terraceSqm + " m² terrace" : "") +
          " &middot; " + HL.esc(room.beds) + " &middot; floors " + room.floors + "</p>" +
        '<p class="mt-4 muted">' + HL.esc(room.blurb) + "</p>" +
        '<div class="tags mt-5">' +
          '<span class="tag">' + HL.sleepsLine(room) + "</span>" +
          '<span class="tag">' + HL.esc(room.view) + "</span>" +
          '<span class="tag tag--dark">from ' + HL.money(from) + " a night</span>" +
        "</div>" +
        '<div class="btn-row mt-6">' +
          '<a class="btn" href="book.html?' + HL.queryString(q, { room: room.id }) + '">Check dates</a>' +
          '<a class="btn btn--ghost" href="' + href + '">Room detail &amp; plan</a>' +
        "</div>" +
      "</div></article>";
  }).join("");
  HL.revealIn(host);
})();
