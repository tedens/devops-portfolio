/* THE LUMEN: homepage. */
(function () {
  "use strict";
  var host = document.getElementById("home-rooms");
  if (!host) return;
  var picks = ["harbour-king", "corner-deluxe", "terrace-penthouse"];
  host.innerHTML = picks.map(function (id) {
    return HL.roomCardHTML(HL.roomById(id));
  }).join("");
  HL.revealIn(host);
})();
