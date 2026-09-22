/* HOLLIS ELECTRICAL: price list, rendered from the same data the booker uses
   so the two can't drift apart. */

(function () {
  "use strict";

  var host = document.getElementById("menu");
  if (!host) return;

  document.getElementById("jump").innerHTML = TR.GROUPS.map(function (g) {
    return '<a class="btn btn--ghost btn--sm" href="#' + g.id + '">' + g.name + "</a>";
  }).join("");

  host.innerHTML = TR.GROUPS.map(function (group) {
    var rows = group.services.map(function (s) {
      var tags = s.tags.map(function (t) {
        var cls = t === "Notifiable" ? " tag--yellow" : (t === "Free" ? " tag--green" : "");
        return '<span class="tag' + cls + '">' + t + "</span>";
      });
      if (s.emergency) tags.unshift('<span class="tag tag--red">24hr call-out</span>');

      var price = s.mode === "survey"
        ? '<span class="svc__price">Free survey<small>Written quote after</small></span>'
        : '<span class="svc__price">' + TR.money(s.price) + "<small>" +
          (s.tags.indexOf("Per socket") !== -1 || s.tags.indexOf("From price") !== -1 ? "From" : "Fixed price") +
          "</small></span>";

      return '<div class="svc" data-reveal><div>' +
        '<h3 class="svc__name">' + s.name + "</h3>" +
        '<p class="svc__desc">' + s.desc + "</p>" +
        (tags.length ? '<div class="svc__tags">' + tags.join("") + "</div>" : "") +
        "</div>" +
        '<div class="svc__right">' + price +
        '<span class="svc__meta">' + TR.windowSpan(s.windows) + " on site</span>" +
        '<a class="btn btn--outline btn--sm" href="book.html?service=' + s.id + '">' +
          (s.mode === "survey" ? "Book survey" : "Book this") + "</a>" +
        "</div></div>";
    }).join("");

    return '<section class="mt-7" id="' + group.id + '">' +
      '<div class="flex-between" style="align-items:baseline;padding-bottom:var(--sp-4);border-bottom:3px solid var(--ink)">' +
      "<h2>" + group.name + "</h2>" +
      '<p class="muted" style="max-width:40ch;font-size:var(--step--1)">' + group.blurb + "</p></div>" +
      rows + "</section>";
  }).join("");

  TR.revealIn(host);
})();
