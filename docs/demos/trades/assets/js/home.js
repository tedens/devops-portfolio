/* HOLLIS ELECTRICAL: homepage: service cards, recent jobs. */

(function () {
  "use strict";

  var ICONS = {
    faults: '<path d="M13 3 5 14h6l-1 7 8-11h-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    install: '<rect x="3" y="5" width="18" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10v4M12 10v4M16 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    ev: '<rect x="4" y="3" width="11" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M11 8 8 12.5h2.6L9.8 17l3.4-5h-2.6z" fill="currentColor"/><path d="M15 8h3a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    safety: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
  };

  var cards = document.getElementById("service-cards");
  if (cards) {
    cards.innerHTML = TR.GROUPS.map(function (g) {
      var fixed = g.services.filter(function (s) { return s.mode === "fixed"; });
      var from = fixed.length ? "From " + TR.money(Math.min.apply(null, fixed.map(function (s) { return s.price; }))) : "Priced on survey";

      return '<a class="card" href="services.html#' + g.id + '" data-reveal>' +
        '<svg class="card__icon" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[g.id] || ICONS.faults) + "</svg>" +
        "<h3>" + g.name + "</h3><p>" + g.blurb + "</p>" +
        '<span class="card__foot">' + from + " →</span></a>";
    }).join("");
    TR.revealIn(cards);
  }

  var jobs = document.getElementById("job-cards");
  if (jobs) {
    jobs.innerHTML = TR.JOBS.slice(0, 3).map(function (j) {
      return '<article class="job" data-reveal>' +
        '<div class="job__art">' + TR.jobArt(j.art) + "</div>" +
        '<div class="job__body"><h3>' + j.title + "</h3>" +
        '<p class="muted" style="font-size:var(--step--1)">' + j.note + "</p>" +
        '<p class="job__meta">' + j.area + " · " + j.days + "</p></div></article>";
    }).join("");
    TR.revealIn(jobs);
  }
})();
