/* JUNIPER LANE: price list, rendered from the same data the booker uses so
   the two can't drift apart. */

(function () {
  "use strict";

  var menu = document.getElementById("menu");
  if (!menu) return;

  /* ---- Jump links ------------------------------------------------------- */

  document.getElementById("jump").innerHTML = SL.GROUPS.map(function (g) {
    return '<a class="btn btn--quiet btn--sm" href="#' + g.id + '">' + g.name + "</a>";
  }).join("");

  /* ---- Grouped menu ----------------------------------------------------- */

  menu.innerHTML = SL.GROUPS.map(function (group) {
    var rows = group.services.map(function (s) {
      var tags = [];
      if (s.patch) tags.push('<span class="tag tag--brass">Patch test needed</span>');
      if (s.dur >= 150) tags.push('<span class="tag">$50 deposit</span>');
      if (s.consult) tags.push('<span class="tag tag--blush">Free, no obligation</span>');

      return '<div class="srv" data-reveal>' +
        "<div>" +
          '<h4 class="srv__name">' + s.name + "</h4>" +
          '<p class="srv__desc">' + s.desc + "</p>" +
          (tags.length ? '<div class="srv__tags">' + tags.join("") + "</div>" : "") +
        "</div>" +
        '<div class="srv__right">' +
          '<span class="srv__price">' + (s.consult ? "Free" : "from " + SL.money(s.price)) + "</span>" +
          '<span class="srv__dur">' + SL.duration(s.dur) + "</span>" +
          '<a class="btn btn--outline btn--sm" href="book.html?service=' + s.id + '">Book</a>' +
        "</div>" +
      "</div>";
    }).join("");

    return '<section class="menu-group" id="' + group.id + '">' +
      '<div class="menu-group__head">' +
        "<h3>" + group.name + "</h3>" +
        '<p class="muted" style="max-width:44ch;font-size:var(--step--1)">' + group.blurb + "</p>" +
      "</div>" + rows +
    "</section>";
  }).join("");

  SL.revealIn(menu);

  /* ---- Tier table ------------------------------------------------------- */

  var table = document.getElementById("tier-table");
  var priced = SL.SERVICES.filter(function (s) { return s.price > 0; });

  table.innerHTML =
    "<thead><tr><th>Service</th><th>Time</th>" +
      SL.TIERS.map(function (t) { return "<th>" + t.name + "</th>"; }).join("") +
    "</tr></thead><tbody>" +
    priced.map(function (s) {
      return "<tr><th scope=\"row\">" + s.name + "</th>" +
        "<td>" + SL.duration(s.dur) + "</td>" +
        SL.TIERS.map(function (t) {
          return "<td>" + SL.money(SL.tierPrice(s.price, t.key)) + "</td>";
        }).join("") +
      "</tr>";
    }).join("") +
    "</tbody>";
})();
