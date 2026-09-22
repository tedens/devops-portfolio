/* BRINDLE: size & care page: charts generated from the same specs the
   product pages use, so the two can't drift apart. */

(function () {
  "use strict";

  var host = document.getElementById("charts-host");
  if (!host) return;

  var unit = "cm";

  /* One chart per block, each represented by a real product so the table and
     the silhouette beside it agree. */
  var BLOCKS = [
    { title: "Tees & jersey", product: "halden-tee" },
    { title: "Shirts", product: "fenwick-shirt" },
    { title: "Knitwear", product: "ardle-crew" },
    { title: "Trousers", product: "stratton-trouser" }
  ];

  function chart(block) {
    var product = BR.byId(block.product);
    if (!product) return "";

    var data = BR.measurements(product, unit);

    return '<div data-reveal style="border:1px solid var(--line);background:var(--paper);padding:var(--sp-5)">' +
      '<div class="flex-between" style="margin-bottom:var(--sp-4)">' +
        '<h3 style="font-size:var(--step-2)">' + block.title + "</h3>" +
        '<span class="micro">' + unit + "</span>" +
      "</div>" +
      '<div class="table-scroll"><table class="mtable">' +
        "<caption class=\"visually-hidden\">" + block.title + " measurements, in " + unit + "</caption>" +
        "<thead><tr><th>Size</th>" +
          data.keys.map(function (k) { return "<th>" + k + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        data.rows.map(function (row) {
          return "<tr><th scope=\"row\">" + row.size + "</th>" +
            row.values.map(function (v) { return "<td>" + v + "</td>"; }).join("") + "</tr>";
        }).join("") +
      "</tbody></table></div>" +
      '<p class="muted mt-4" style="font-size:var(--step--1)">Based on the ' +
        product.name + " block · " + product.fitLabel.toLowerCase() + " fit</p>" +
    "</div>";
  }

  function paint() {
    host.innerHTML = BLOCKS.map(chart).join("");
    BR.revealIn(host);
  }

  document.querySelectorAll("[data-unit]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      unit = btn.dataset.unit;
      document.querySelectorAll("[data-unit]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.unit === unit));
      });
      paint();
    });
  });

  /* Illustration beside "how to measure". The measurement overlay view. */
  var art = document.getElementById("measure-art");
  if (art) {
    var tee = BR.byId("halden-tee");
    art.innerHTML = BR.measureHTML(tee, "bone") +
      '<p class="muted mt-4" style="font-size:var(--step--1)">' +
      "<strong>A</strong> half-chest, armhole seam to armhole seam. " +
      "<strong>B</strong> body length, high shoulder point to hem.</p>";
  }

  /* Care panel, three fabrics as woven close-ups. */
  var careArt = document.getElementById("care-art");
  if (careArt) {
    careArt.innerHTML = [
      ["oat", "Lambswool"],
      ["raw", "Selvedge denim"],
      ["chalk", "Japanese oxford"],
      ["natural", "18oz canvas"]
    ].map(function (pair) {
      return "<div>" + BR.weaveHTML(pair[0]) +
        '<p class="micro mt-3">' + pair[1] + "</p></div>";
    }).join("");
  }

  paint();
})();
