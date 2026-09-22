/* JUNIPER LANE: homepage: service cards, tone strip, look strip, stylists. */

(function () {
  "use strict";

  var ICONS = {
    cut: '<path d="M6 4l9 12M18 4L9 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><circle cx="6.5" cy="18.5" r="2.6" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="17.5" cy="18.5" r="2.6" stroke="currentColor" stroke-width="1.6" fill="none"/>',
    colour: '<path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
    treatments: '<path d="M4 20c0-8 5-13 16-14 0 10-5 14-12 14z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/><path d="M8 20c2-5 5-8 9-9.5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    brows: '<path d="M3 13c3-5 15-5 18 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M8 9.5 6.5 7M12 8.5V6M16 9.5 17.5 7" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
  };

  /* ---- Service cards ---------------------------------------------------- */

  var cards = document.getElementById("service-cards");
  if (cards) {
    cards.innerHTML = SL.GROUPS.map(function (g) {
      var from = Math.min.apply(null, g.services
        .filter(function (s) { return s.price > 0; })
        .map(function (s) { return s.price; }));

      return '<a class="card" href="services.html#' + g.id + '" data-reveal>' +
        '<span class="card__icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24">' +
          (ICONS[g.id] || ICONS.cut) + "</svg></span>" +
        "<h3>" + g.name + "</h3>" +
        "<p>" + g.blurb + "</p>" +
        '<span class="card__foot">From ' + SL.money(from) + " →</span>" +
      "</a>";
    }).join("");
    SL.revealIn(cards);
  }

  /* ---- Tone strip ------------------------------------------------------- */

  var tones = document.getElementById("tone-strip");
  if (tones) {
    tones.innerHTML = SL.TONES.map(function (t) {
      return '<span class="tone tone--lg" title="' + t.name + '" style="--h:' + t.h +
        ";--s:" + t.s + "%;--l:" + t.l + '%"></span>';
    }).join("");
  }

  /* ---- Look strip ------------------------------------------------------- */
  /* Colour work shown as tone studies rather than stock photography. */

  var looks = document.getElementById("look-strip");
  if (looks) {
    looks.innerHTML = [
      { name: "Lived-in bronde", by: "Orla", from: 0, to: 1 },
      { name: "Warm copper gloss", by: "Nadia", from: 2, to: 1 },
      { name: "Soft espresso", by: "Nadia", from: 4, to: 3 },
      { name: "Cool brunette", by: "Jun", from: 5, to: 4 }
    ].map(function (look) {
      var a = SL.TONES[look.from], b = SL.TONES[look.to];
      return '<figure class="look">' +
        '<div class="look__art" role="img" aria-label="' + look.name +
          '" style="background:linear-gradient(160deg, hsl(' + a.h + " " + a.s + "% " + a.l +
          '%) 0%, hsl(' + b.h + " " + b.s + "% " + b.l + '%) 100%)"></div>' +
        '<figcaption class="look__cap"><strong>' + look.name + "</strong>by " + look.by + "</figcaption>" +
      "</figure>";
    }).join("");
  }

  /* ---- Stylists --------------------------------------------------------- */

  var stylists = document.getElementById("stylist-cards");
  if (stylists) {
    stylists.innerHTML = SL.STYLISTS.map(function (p) {
      return '<div class="stylist" data-reveal>' +
        '<div class="stylist__photo">' + SL.portrait(p) + "</div>" +
        "<h3>" + p.name + "</h3>" +
        '<p class="stylist__level">' + p.level + "</p>" +
        "<p>" + p.specialisms.join(" · ") + "</p>" +
        '<p class="stylist__foot"><a class="link-line" href="book.html?stylist=' + p.id +
          '">Book with ' + p.name.split(" ")[0] + "</a></p>" +
      "</div>";
    }).join("");
    SL.revealIn(stylists);
  }
})();
