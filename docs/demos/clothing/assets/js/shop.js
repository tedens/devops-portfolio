/* BRINDLE: shop listing: filters, sorting, URL sync. */

(function () {
  "use strict";

  var results = document.getElementById("results");
  if (!results) return;

  var NEW_ORDER = ["New", "Restocked", "Bestseller", "Sale", ""];

  var state = { category: "", collection: "", sizes: [], colours: [], sale: false, sort: "featured" };

  /* ---- URL -------------------------------------------------------------- */

  function readURL() {
    var p = new URLSearchParams(window.location.search);
    state.category = p.get("category") || "";
    state.collection = p.get("collection") || "";
    state.sizes = p.getAll("size");
    state.colours = p.getAll("colour");
    state.sale = p.get("sale") === "1";
    state.sort = p.get("sort") || "featured";
  }

  function writeURL() {
    var p = new URLSearchParams();
    if (state.category) p.set("category", state.category);
    if (state.collection) p.set("collection", state.collection);
    state.sizes.forEach(function (s) { p.append("size", s); });
    state.colours.forEach(function (c) { p.append("colour", c); });
    if (state.sale) p.set("sale", "1");
    if (state.sort !== "featured") p.set("sort", state.sort);

    var qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : window.location.pathname);
  }

  /* ---- Filtering -------------------------------------------------------- */

  function matches(product) {
    if (state.category && product.category !== state.category) return false;
    if (state.collection && product.collection !== state.collection) return false;
    if (state.sale && !product.was) return false;

    if (state.colours.length) {
      var hit = product.colours.some(function (c) { return state.colours.indexOf(c) !== -1; });
      if (!hit) return false;
    }

    /* Size filter means "available in that size right now", in any colourway. */
    if (state.sizes.length) {
      var available = product.colours.some(function (colour) {
        return state.sizes.some(function (size) {
          return BR.sizesOf(product).indexOf(size) !== -1 &&
            BR.stock(product.id, colour, size) > 0;
        });
      });
      if (!available) return false;
    }

    return true;
  }

  function sortList(list) {
    var by = {
      featured: function (a, b) {
        return NEW_ORDER.indexOf(a.badge) - NEW_ORDER.indexOf(b.badge) ||
          a.name.localeCompare(b.name);
      },
      new: function (a, b) {
        return (b.badge === "New" ? 1 : 0) - (a.badge === "New" ? 1 : 0) ||
          a.name.localeCompare(b.name);
      },
      "price-asc": function (a, b) { return a.price - b.price; },
      "price-desc": function (a, b) { return b.price - a.price; },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    };
    return list.slice().sort(by[state.sort] || by.featured);
  }

  /* ---- Controls --------------------------------------------------------- */

  function uniq(list) {
    var seen = {}, out = [];
    list.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  var CATEGORIES = uniq(BR.PRODUCTS.map(function (p) { return p.category; })).sort();
  var ALL_SIZES = uniq(BR.SIZE_SETS.alpha.concat(BR.SIZE_SETS.waist));
  var ALL_COLOURS = uniq(BR.PRODUCTS.reduce(function (acc, p) {
    return acc.concat(p.colours);
  }, []));

  function pill(label, pressed, attrs) {
    return '<button class="pill" type="button" ' + attrs +
      ' aria-pressed="' + (pressed ? "true" : "false") + '">' + label + "</button>";
  }

  function paintControls() {
    document.getElementById("f-categories").innerHTML =
      pill("All", !state.category, 'data-category=""') +
      CATEGORIES.map(function (c) {
        var n = BR.PRODUCTS.filter(function (p) { return p.category === c; }).length;
        return pill(c + ' <span class="pill__n">' + n + "</span>", state.category === c,
          'data-category="' + c + '"');
      }).join("");

    document.getElementById("f-collections").innerHTML =
      pill("Any", !state.collection, 'data-collection=""') +
      BR.COLLECTIONS.map(function (c) {
        return pill(c.name, state.collection === c.id, 'data-collection="' + c.id + '"');
      }).join("");

    document.getElementById("f-sizes").innerHTML = ALL_SIZES.map(function (s) {
      return pill(s, state.sizes.indexOf(s) !== -1, 'data-size="' + s + '"');
    }).join("");

    document.getElementById("f-colours").innerHTML = ALL_COLOURS.map(function (key) {
      var c = BR.colour(key);
      return '<button class="pill" type="button" data-colour="' + key +
        '" aria-pressed="' + (state.colours.indexOf(key) !== -1) + '">' +
        '<span class="swatch swatch--dot" style="--fab:hsl(' + c.h + " " + c.s + "% " + c.l +
        '%)" aria-hidden="true"></span>' + c.name + "</button>";
    }).join("");

    var saleBtn = document.querySelector("[data-sale]");
    saleBtn.setAttribute("aria-pressed", String(state.sale));

    document.getElementById("sort").value = state.sort;

    var extra = state.sizes.length + state.colours.length +
      (state.collection ? 1 : 0) + (state.sale ? 1 : 0);
    var badge = document.getElementById("more-count");
    badge.textContent = extra;
    badge.hidden = extra === 0;
  }

  /* ---- Render ----------------------------------------------------------- */

  var title = document.getElementById("shop-title");
  var sub = document.getElementById("shop-sub");

  function render() {
    var list = sortList(BR.PRODUCTS.filter(matches));

    BR.renderTiles(results, list);
    results.hidden = list.length === 0;
    document.getElementById("empty").hidden = list.length !== 0;

    document.getElementById("count").textContent =
      list.length === 1 ? "1 piece" : list.length + " pieces";

    if (state.category) {
      title.textContent = state.category;
      sub.textContent = "Every " + state.category.toLowerCase() + " piece we make.";
      document.title = state.category + " · BRINDLE";
    } else if (state.collection) {
      var coll = BR.COLLECTIONS.filter(function (c) { return c.id === state.collection; })[0];
      title.textContent = coll ? coll.name : state.collection;
      sub.textContent = coll ? coll.blurb : "";
      document.title = (coll ? coll.name : state.collection) + " · BRINDLE";
    } else if (state.sale) {
      title.textContent = "On sale";
      sub.textContent = "We don't run a markdown calendar. These are end-of-cloth, not end-of-season.";
      document.title = "On sale · BRINDLE";
    } else {
      title.textContent = "Shop all";
      sub.textContent = "Twelve pieces, re-cut when the cloth improves. No seasonal churn.";
      document.title = "Shop all · BRINDLE";
    }

    writeURL();
  }

  /* ---- Events ----------------------------------------------------------- */

  function toggleIn(list, value) {
    var i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
    return list;
  }

  document.getElementById("filters").addEventListener("click", function (e) {
    var btn = e.target.closest(".pill");
    if (!btn) return;

    if (btn.id === "more-toggle") {
      var panel = document.getElementById("more-filters");
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      return;
    }

    if (btn.dataset.category !== undefined) state.category = btn.dataset.category;
    else if (btn.dataset.collection !== undefined) state.collection = btn.dataset.collection;
    else if (btn.dataset.size !== undefined) toggleIn(state.sizes, btn.dataset.size);
    else if (btn.dataset.colour !== undefined) toggleIn(state.colours, btn.dataset.colour);
    else if (btn.dataset.sale !== undefined) state.sale = !state.sale;
    else return;

    paintControls();
    render();
  });

  document.getElementById("sort").addEventListener("change", function (e) {
    state.sort = e.target.value;
    render();
  });

  function clearAll() {
    state.category = ""; state.collection = ""; state.sizes = []; state.colours = []; state.sale = false;
    paintControls();
    render();
  }

  document.getElementById("clear").addEventListener("click", clearAll);
  document.getElementById("empty-clear").addEventListener("click", clearAll);

  /* ---- Go --------------------------------------------------------------- */

  readURL();
  paintControls();
  render();

  /* Open the extra filters if the visitor arrived with one applied. */
  if (state.collection || state.sizes.length || state.colours.length || state.sale) {
    document.getElementById("more-filters").hidden = false;
    document.getElementById("more-toggle").setAttribute("aria-expanded", "true");
  }
})();
