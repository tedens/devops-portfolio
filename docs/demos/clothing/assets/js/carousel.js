/* BRINDLE: hero carousel.

   Follows the ARIA carousel pattern: a labelled region with a rotation
   control, slides exposed as groups, and a live region that only announces
   when rotation is stopped. Autoplay pauses on hover, on focus inside the
   carousel, when the tab is hidden, and never starts at all if the visitor
   has asked for reduced motion. */

(function () {
  "use strict";

  var root = document.getElementById("hero");
  if (!root || !window.BR || !BR.HERO) return;

  var DWELL = 6000;
  var viewport = root.querySelector(".hero__viewport");
  var slides = [];
  var index = 0;
  var timer = null;
  var playing = false;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- Build ------------------------------------------------------------ */

  var items = BR.HERO.map(function (slide) {
    var product = BR.byId(slide.product);
    return product ? { conf: slide, product: product } : null;
  }).filter(Boolean);

  if (!items.length) return;

  viewport.innerHTML = items.map(function (item, i) {
    var p = item.product;
    var c = item.conf;
    var price = p.was
      ? '<span class="price-now">' + BR.money(p.price) + '</span> <span class="price-was">' + BR.money(p.was) + "</span>"
      : BR.money(p.price);

    return '<div class="hero__slide" role="group" aria-roledescription="slide" aria-label="' +
        (i + 1) + " of " + items.length + ": " + p.name + '" id="hero-slide-' + i + '">' +
      '<div class="wrap hero__inner">' +
        '<div class="hero__copy">' +
          '<p class="micro micro--clay">' + c.eyebrow + "</p>" +
          "<h2>" + c.headline + "</h2>" +
          '<p class="hero__lede">' + c.lede + "</p>" +
          '<p class="hero__price">' + p.name + " · " + price + "</p>" +
          '<p class="hero__actions btn-row">' +
            '<a class="btn btn--lg" href="product.html?id=' + p.id + "&colour=" + c.colour + '">' + c.cta + "</a>" +
            '<a class="btn btn--outline btn--lg" href="shop.html">All products</a>' +
          "</p>" +
        "</div>" +
        '<div class="hero__art">' + BR.garmentHTML(p, c.colour) + "</div>" +
      "</div></div>";
  }).join("");

  slides = Array.prototype.slice.call(viewport.querySelectorAll(".hero__slide"));

  /* ---- Controls --------------------------------------------------------- */

  var dotsHost = root.querySelector(".hero__dots");
  dotsHost.innerHTML = items.map(function (item, i) {
    return '<button class="hero__dot" type="button" data-go="' + i +
      '" aria-current="' + (i === 0) + '" aria-label="Slide ' + (i + 1) + ": " +
      item.product.name + '"><i></i></button>';
  }).join("");

  var dots = Array.prototype.slice.call(dotsHost.querySelectorAll(".hero__dot"));
  var counter = root.querySelector(".hero__counter");
  var pauseBtn = root.querySelector(".hero__pause");

  root.style.setProperty("--hero-dwell", DWELL + "ms");

  /* ---- Paint ------------------------------------------------------------ */

  function paint(next, announce) {
    index = (next + slides.length) % slides.length;

    slides.forEach(function (s, i) {
      s.classList.toggle("is-current", i === index);
      /* Off-screen slides are display:none, so their links leave the tab order
         on their own, no aria-hidden bookkeeping needed. */
    });

    dots.forEach(function (d, i) {
      d.setAttribute("aria-current", String(i === index));
      /* Restart the fill animation on the active dot. */
      var bar = d.querySelector("i");
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    });

    if (counter) {
      counter.textContent = String(index + 1).padStart(2, "0") + " / " +
        String(slides.length).padStart(2, "0");
    }

    if (announce) viewport.setAttribute("aria-live", "polite");
  }

  /* ---- Rotation --------------------------------------------------------- */

  function start() {
    if (reduced.matches || playing) return;
    playing = true;
    root.classList.remove("is-paused");
    viewport.setAttribute("aria-live", "off");
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", "false");
      pauseBtn.setAttribute("aria-label", "Pause slideshow");
      pauseBtn.innerHTML = PAUSE_ICON;
    }
    clearInterval(timer);
    timer = setInterval(function () { paint(index + 1); }, DWELL);
  }

  function stop(byUser) {
    playing = false;
    clearInterval(timer);
    timer = null;
    root.classList.add("is-paused");
    viewport.setAttribute("aria-live", "polite");
    if (byUser && pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", "true");
      pauseBtn.setAttribute("aria-label", "Play slideshow");
      pauseBtn.innerHTML = PLAY_ICON;
    }
  }

  var PAUSE_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  var PLAY_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>';

  /* A user pause is sticky; hovering only suspends. */
  var userPaused = false;

  function suspend() { if (!userPaused) stop(false); }
  function resume() { if (!userPaused) start(); }

  if (pauseBtn) {
    pauseBtn.innerHTML = PAUSE_ICON;
    pauseBtn.addEventListener("click", function () {
      userPaused = !userPaused;
      userPaused ? stop(true) : start();
    });
  }

  root.addEventListener("mouseenter", suspend);
  root.addEventListener("mouseleave", resume);
  root.addEventListener("focusin", suspend);
  root.addEventListener("focusout", function (e) {
    if (!root.contains(e.relatedTarget)) resume();
  });

  document.addEventListener("visibilitychange", function () {
    document.hidden ? suspend() : resume();
  });

  /* ---- Interaction ------------------------------------------------------ */

  function goManual(next) {
    paint(next, true);
    if (!userPaused) { stop(false); start(); } /* restart the dwell */
  }

  root.querySelectorAll("[data-step]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      goManual(index + Number(btn.dataset.step));
    });
  });

  dotsHost.addEventListener("click", function (e) {
    var dot = e.target.closest("[data-go]");
    if (dot) goManual(Number(dot.dataset.go));
  });

  /* Arrow keys work anywhere inside the carousel region. */
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); goManual(index + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goManual(index - 1); }
  });

  /* Swipe */
  var startX = null, startY = null;

  viewport.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    suspend();
  }, { passive: true });

  viewport.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    /* Ignore mostly-vertical drags so page scrolling still works. */
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) goManual(index + (dx < 0 ? 1 : -1));
    startX = startY = null;
    resume();
  }, { passive: true });

  /* ---- Go --------------------------------------------------------------- */

  paint(0, false);

  if (reduced.matches) {
    stop(true);
    if (pauseBtn) pauseBtn.hidden = true;
  } else {
    start();
  }

  reduced.addEventListener("change", function (m) {
    if (m.matches) { userPaused = true; stop(true); }
  });
})();
