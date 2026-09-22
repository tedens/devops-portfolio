/* HOLLIS ELECTRICAL: ballpark quote calculator.

   Deliberately returns a RANGE with the factors shown. A single number before
   anyone has seen the property would be a guess dressed up as a price. */

(function () {
  "use strict";

  var form = document.getElementById("quote-form");
  if (!form) return;

  var picks = { job: TR.QUOTE_JOBS[0].id, size: "flat", age: "new", access: "easy", urgency: "flexible" };

  /* Job picker */
  document.getElementById("q-jobs").innerHTML = TR.QUOTE_JOBS.map(function (j, i) {
    return '<label class="option"><input type="radio" name="job" value="' + j.id + '"' +
      (i === 0 ? " checked" : "") + '>' +
      '<span class="option__dot" aria-hidden="true"></span>' +
      '<span class="option__text"><strong>' + j.name + "</strong>" +
      "<span>Typically " + TR.money(j.low) + " – " + TR.money(j.high) + " before adjustments</span></span></label>";
  }).join("");

  /* Factor pickers */
  document.getElementById("q-factors").innerHTML = Object.keys(TR.QUOTE_FACTORS).map(function (key) {
    var g = TR.QUOTE_FACTORS[key];
    return '<fieldset class="mt-6"><legend class="legend">' + g.label + "</legend>" +
      '<div class="options options--2 mt-3">' + g.options.map(function (o, i) {
        return '<label class="option"><input type="radio" name="' + key + '" value="' + o.id + '"' +
          (i === 0 ? " checked" : "") + '>' +
          '<span class="option__dot" aria-hidden="true"></span>' +
          '<span class="option__text"><strong>' + o.name + "</strong></span>" +
          (o.mult > 1 ? '<span class="option__aside"><span class="option__dur">+' +
            Math.round((o.mult - 1) * 100) + "%</span></span>" : "") +
          "</label>";
      }).join("") + "</div></fieldset>";
  }).join("");

  function paint() {
    var q = TR.quote(picks.job, picks);
    if (!q) return;

    document.getElementById("q-range").textContent = TR.money(q.low) + " – " + TR.money(q.high);
    document.getElementById("q-job").textContent = q.job.name;

    document.getElementById("q-breakdown").innerHTML = q.factors.map(function (f) {
      return '<div class="factors__row' + (f.pct === 0 ? " factors__row--zero" : "") + '">' +
        "<span>" + f.value + "</span><span>" + (f.pct ? "+" + f.pct + "%" : "–") + "</span></div>";
    }).join("");

    document.getElementById("q-book").href = "book.html";
  }

  form.addEventListener("change", function (e) {
    if (!e.target.name) return;
    picks[e.target.name] = e.target.value;
    paint();
  });

  paint();
})();
