/* BRINDLE: product detail.

   Colour drives everything visible: the gallery, the stock on each size and
   the swatch state. Size availability is per colourway, so switching colour
   can invalidate the chosen size, that case is handled rather than ignored. */

(function () {
  "use strict";

  var root = document.getElementById("pdp-root");
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var product = BR.byId(params.get("id") || "");

  if (!product) {
    document.getElementById("pdp-missing").hidden = false;
    document.title = "Not found · BRINDLE";
    return;
  }

  root.hidden = false;

  var colour = params.get("colour");
  if (product.colours.indexOf(colour) === -1) colour = product.colours[0];

  var sizes = BR.sizesOf(product);
  var size = product.sizeSet === "one" ? sizes[0] : null;
  var view = 0;           /* gallery index */
  var unit = "cm";

  document.title = product.name + " · BRINDLE";
  var meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", product.blurb);

  /* ---- Static copy ------------------------------------------------------ */

  document.getElementById("p-crumb").innerHTML =
    '<a href="index.html" style="color:inherit">Home</a> / ' +
    '<a href="shop.html" style="color:inherit">Shop</a> / ' +
    '<a href="shop.html?category=' + encodeURIComponent(product.category) +
    '" style="color:inherit">' + product.category + "</a> / " + product.name;

  document.getElementById("p-cat").textContent = product.category + " · " + product.collection;
  document.getElementById("p-name").textContent = product.name;
  document.getElementById("p-blurb").textContent = product.blurb;
  document.getElementById("p-description").textContent = product.description;
  document.getElementById("p-fit-label").textContent = product.fitLabel;
  document.getElementById("p-fit-note").textContent = product.fitNotes;
  document.getElementById("p-model").textContent = product.modelNote;

  document.getElementById("p-fit-pip").style.left =
    ((product.fit - 1) / 4 * 100) + "%";

  document.getElementById("p-price").innerHTML = product.was
    ? '<span class="price-now">' + BR.money(product.price) + "</span>" +
      '<span class="price-was">' + BR.money(product.was) + "</span>" +
      '<span class="micro micro--clay">Save ' + BR.money(product.was - product.price) + "</span>"
    : BR.money(product.price);

  document.getElementById("p-material").innerHTML = [
    ["Composition", product.material],
    ["Weight", product.weight],
    ["Made", product.origin],
    ["Fit", product.fitLabel]
  ].map(function (row) {
    return '<li><span class="spec-list__k">' + row[0] + "</span>" +
      '<span class="spec-list__v">' + row[1] + "</span></li>";
  }).join("");

  document.getElementById("p-care").innerHTML =
    product.care.map(function (c) { return "<li>" + c + "</li>"; }).join("");

  /* ---- Gallery ---------------------------------------------------------- */

  function views() {
    return [
      { label: "Front", html: BR.garmentHTML(product, colour, { flag: true }) },
      { label: "Back", html: BR.garmentHTML(product, colour, { view: "back" }) },
      { label: "Fabric", html: BR.weaveHTML(colour) },
      { label: "Measurements", html: BR.measureHTML(product, colour) }
    ];
  }

  function paintGallery() {
    var list = views();

    document.getElementById("p-main").innerHTML = list[view].html;

    document.getElementById("p-thumbs").innerHTML = list.map(function (v, i) {
      return '<button class="thumb" type="button" data-view="' + i +
        '" aria-current="' + (i === view) + '" aria-label="' + v.label + ' view">' +
        v.html + "</button>";
    }).join("");
  }

  document.getElementById("p-thumbs").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-view]");
    if (!btn) return;
    view = Number(btn.dataset.view);
    paintGallery();
  });

  /* ---- Colour ----------------------------------------------------------- */

  function paintSwatches() {
    document.getElementById("p-colour-name").textContent = BR.colour(colour).name;

    document.getElementById("p-swatches").innerHTML = product.colours.map(function (key) {
      var c = BR.colour(key);
      return '<button class="swatch swatch--lg" type="button" data-colour="' + key +
        '" aria-pressed="' + (key === colour) + '" title="' + c.name +
        '" aria-label="' + c.name + '" style="--fab:hsl(' + c.h + " " + c.s + "% " + c.l +
        '%)"></button>';
    }).join("");
  }

  document.getElementById("p-swatches").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-colour]");
    if (!btn) return;

    colour = btn.dataset.colour;

    /* The chosen size may not exist in this colourway. */
    if (size && BR.stock(product.id, colour, size) === 0) size = null;

    var p = new URLSearchParams({ id: product.id, colour: colour });
    history.replaceState(null, "", "?" + p.toString());

    paintSwatches();
    paintGallery();
    paintSizes();
    paintMeasurements();
  });

  /* ---- Sizes ------------------------------------------------------------ */

  var sizeBlock = document.getElementById("p-size-block");
  var stockNote = document.getElementById("p-stock");

  function paintSizes() {
    if (product.sizeSet === "one") {
      sizeBlock.hidden = true;
      return;
    }

    document.getElementById("p-sizes").innerHTML = sizes.map(function (s) {
      var n = BR.stock(product.id, colour, s);
      return '<button class="size" type="button" data-size="' + s +
        '" aria-pressed="' + (s === size) + '"' + (n === 0 ? " disabled" : "") +
        (n === 0 ? ' aria-label="' + s + ', sold out"' : "") + ">" + s + "</button>";
    }).join("");

    paintStockNote();
    highlightMeasureRow();
  }

  function paintStockNote() {
    if (!size) {
      var any = BR.inStockSizes(product, colour).length;
      stockNote.className = "stock-note stock-note--out";
      stockNote.textContent = any
        ? "Select a size. " + any + " of " + sizes.length + " in stock in " + BR.colour(colour).name + "."
        : "Sold out in " + BR.colour(colour).name + ". Try another colourway.";
      return;
    }

    var n = BR.stock(product.id, colour, size);
    if (n === 0) {
      stockNote.className = "stock-note stock-note--out";
      stockNote.textContent = "Sold out in this size.";
    } else if (n <= 3) {
      stockNote.className = "stock-note stock-note--low";
      stockNote.textContent = "Only " + n + " left in " + BR.colour(colour).name + " " + size + ".";
    } else {
      stockNote.className = "stock-note stock-note--ok";
      stockNote.textContent = "In stock. Ships in 1–2 working days.";
    }
  }

  document.getElementById("p-sizes").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-size]");
    if (!btn || btn.disabled) return;
    size = btn.dataset.size;
    paintSizes();
  });

  /* ---- Measurements ----------------------------------------------------- */

  function paintMeasurements() {
    var data = BR.measurements(product, unit);
    var table = document.getElementById("p-measure");

    table.innerHTML =
      "<thead><tr><th>Size</th>" +
        data.keys.map(function (k) { return "<th>" + k + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      data.rows.map(function (row) {
        return '<tr data-row-size="' + row.size + '"><th scope="row">' + row.size + "</th>" +
          row.values.map(function (v) { return "<td>" + v + "</td>"; }).join("") +
        "</tr>";
      }).join("") +
      "</tbody>";

    highlightMeasureRow();
  }

  function highlightMeasureRow() {
    document.querySelectorAll("#p-measure tbody tr").forEach(function (tr) {
      tr.classList.toggle("is-picked", tr.dataset.rowSize === size);
    });
  }

  document.querySelectorAll("[data-unit]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      unit = btn.dataset.unit;
      document.querySelectorAll("[data-unit]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.unit === unit));
      });
      paintMeasurements();
    });
  });

  /* ---- Add to bag ------------------------------------------------------- */

  document.getElementById("p-add").addEventListener("click", function () {
    if (product.sizeSet !== "one" && !size) {
      stockNote.className = "stock-note stock-note--low";
      stockNote.textContent = "Pick a size first.";
      document.getElementById("p-sizes").querySelector(".size:not([disabled])").focus();
      return;
    }

    BR.bag.add(product.id, colour, size, 1);
    BR.toast(
      product.name + " · " + BR.colour(colour).name + (size ? " · " + size : "") + " added",
      '<a href="bag.html">View bag</a>'
    );
  });

  /* ---- Upsell ----------------------------------------------------------- */

  var pairs = (product.pairs || []).map(BR.byId).filter(Boolean);
  document.getElementById("p-pairs").innerHTML =
    pairs.map(function (p) { return BR.tileHTML(p); }).join("");

  /* Anything not already shown as a pairing. */
  var shown = {};
  pairs.forEach(function (p) { shown[p.id] = true; });
  var similar = BR.similar(product, 8).filter(function (p) { return !shown[p.id]; }).slice(0, 4);

  document.getElementById("p-similar-head").textContent =
    "More " + product.category.toLowerCase();
  BR.renderTiles(document.getElementById("p-similar"), similar);

  /* ---- Go --------------------------------------------------------------- */

  paintSwatches();
  paintGallery();
  paintSizes();
  paintMeasurements();
})();
