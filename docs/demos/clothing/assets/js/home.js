/* BRINDLE: shopfront: new-in rail, collection banners, bestsellers. */

(function () {
  "use strict";

  /* New in */
  var rail = document.getElementById("new-rail");
  if (rail) {
    var order = { New: 0, Restocked: 1, Sale: 2, Bestseller: 3 };
    var fresh = BR.PRODUCTS.slice().sort(function (a, b) {
      var ra = a.badge in order ? order[a.badge] : 9;
      var rb = b.badge in order ? order[b.badge] : 9;
      return ra - rb;
    }).slice(0, 6);

    rail.innerHTML = fresh.map(function (p) { return BR.tileHTML(p); }).join("");
  }

  /* Collections, each banner borrows a garment from the collection as a
     ghosted background mark. */
  var host = document.getElementById("collections");
  if (host) {
    host.innerHTML = BR.COLLECTIONS.map(function (c) {
      var members = BR.PRODUCTS.filter(function (p) { return p.collection === c.id; });
      var member = members[0];
      var n = members.length;

      /* Just the silhouette, not the whole tile. A full garment card at low
         opacity washes out to nothing against the banner. */
      var ghost = member
        ? '<span class="banner__ghost" style="' + BR.garmentStyle(member.colours[0]) + '">' +
            '<svg viewBox="0 0 200 250" aria-hidden="true">' +
            BR.SILHOUETTES[member.silhouette] + "</svg></span>"
        : "";

      return '<a class="banner" data-reveal href="shop.html?collection=' + encodeURIComponent(c.id) +
        '" style="--bg:hsl(' + c.hue + " " + c.sat + "% " + c.light + '%)">' +
        ghost +
        '<span class="banner__inner">' +
          '<span class="micro">' + n + (n === 1 ? " piece" : " pieces") + "</span>" +
          "<h3>" + c.name + "</h3>" +
          "<p>" + c.blurb + "</p>" +
          '<span class="link-line">Shop ' + c.name.toLowerCase() + "</span>" +
        "</span></a>";
    }).join("");

    BR.revealIn(host);
  }

  /* Bestsellers. The pieces most often listed as a pairing elsewhere in the
     catalogue, which is a decent stand-in for "most reordered". */
  var grid = document.getElementById("best-grid");
  if (grid) {
    var score = {};
    BR.PRODUCTS.forEach(function (p) {
      (p.pairs || []).forEach(function (id) { score[id] = (score[id] || 0) + 1; });
    });

    var best = BR.PRODUCTS.slice().sort(function (a, b) {
      return (score[b.id] || 0) - (score[a.id] || 0);
    }).slice(0, 4);

    BR.renderTiles(grid, best);
  }
})();
