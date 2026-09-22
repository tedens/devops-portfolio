/* Coursefolk: homepage: category chips and the featured row. */

(function () {
  "use strict";

  var chips = document.getElementById("category-chips");
  if (chips) {
    chips.innerHTML = CF.categories().map(function (cat) {
      return '<a class="chip" href="catalog.html?cat=' + encodeURIComponent(cat.name) + '">' +
        cat.name + '<span class="chip__count">' + cat.count + "</span></a>";
    }).join("");
  }

  var featured = document.getElementById("featured");
  if (featured) {
    /* Highest rated first, then by how many people have taken it. */
    var picks = CF.COURSES.slice().sort(function (a, b) {
      return (b.rating - a.rating) || (b.students - a.students);
    }).slice(0, 4);

    CF.renderCards(featured, picks);
  }
})();
