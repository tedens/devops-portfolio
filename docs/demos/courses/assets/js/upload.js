/* Coursefolk: course builder.

   A four-step wizard with a live preview of the card students will see. The
   draft autosaves to localStorage so the page can be closed and reopened;
   nothing is uploaded, because there is no backend here. */

(function () {
  "use strict";

  var form = document.getElementById("builder-form");
  if (!form) return;

  var HUES = [258, 18, 200, 150, 330, 42, 100, 275, 220];
  var GLYPH_LABELS = {
    code: "Code", palette: "Design", database: "Data", wave: "Audio",
    pen: "Writing", chart: "Business", leaf: "Nature", sigma: "Maths", camera: "Photo"
  };

  var blank = {
    title: "", subtitle: "", category: "Development", level: "All levels",
    glyph: "code", hue: 258, model: "paid", price: 59, launch: true,
    sections: [
      { title: "Getting started", lessons: [
        { name: "What this course covers", dur: "6:00", preview: true },
        { name: "Setting up", dur: "9:00", preview: false }
      ]}
    ]
  };

  var draft = CF.store.get("draft", null) || JSON.parse(JSON.stringify(blank));

  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var stepperItems = Array.prototype.slice.call(document.querySelectorAll(".stepper li"));
  var live = document.getElementById("builder-live");
  var current = 0;

  /* ---- Save ------------------------------------------------------------- */

  var saveTimer = null;
  var badges = document.querySelectorAll("[data-save-state]");

  function sayState(text) {
    badges.forEach(function (b) { b.textContent = text; });
  }

  function save() {
    sayState("Saving…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      CF.store.set("draft", draft);
      sayState("Draft saved");
    }, 350);
  }

  /* ---- Steps ------------------------------------------------------------ */

  function showStep(index, silent) {
    current = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach(function (s, i) { s.classList.toggle("is-active", i === current); });

    stepperItems.forEach(function (li, i) {
      li.setAttribute("data-state", i === current ? "active" : i < current ? "done" : "todo");
      if (i === current) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });

    if (silent) return;

    var h = steps[current].querySelector("h2");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
    live.textContent = "Step " + (current + 1) + " of " + steps.length + ". " + (h ? h.textContent : "");
  }

  /* ---- Validation ------------------------------------------------------- */

  function setError(el, message) {
    var wrap = el.closest(".field");
    if (!wrap) return;
    wrap.classList.add("has-error");
    wrap.querySelector(".error-text").textContent = message;
    el.setAttribute("aria-invalid", "true");
  }

  function clearError(el) {
    var wrap = el.closest(".field");
    if (!wrap) return;
    wrap.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  }

  function validateStep(index) {
    if (index === 0) {
      var title = document.getElementById("b-title");
      var sub = document.getElementById("b-subtitle");
      var ok = true;

      if (title.value.trim().length < 8) {
        setError(title, "Give it a title of at least 8 characters.");
        ok = false;
      } else clearError(title);

      if (sub.value.trim().length < 20) {
        setError(sub, "A sentence or two, at least 20 characters.");
        if (ok) sub.focus();
        ok = false;
      } else clearError(sub);

      if (!ok) { (title.getAttribute("aria-invalid") ? title : sub).focus(); }
      return ok;
    }

    if (index === 1) {
      var err = document.getElementById("b-curriculum-error");
      var lessons = draft.sections.reduce(function (n, s) { return n + s.lessons.length; }, 0);
      var named = draft.sections.every(function (s) {
        return s.title.trim() && s.lessons.every(function (l) { return l.name.trim(); });
      });

      if (lessons < 3) {
        err.textContent = "Outline at least three lessons before continuing.";
        err.style.display = "block";
        return false;
      }
      if (!named) {
        err.textContent = "Every section and lesson needs a title.";
        err.style.display = "block";
        return false;
      }
      err.style.display = "none";
      return true;
    }

    return true;
  }

  /* ---- Step 1: basics --------------------------------------------------- */

  var titleEl = document.getElementById("b-title");
  var subEl = document.getElementById("b-subtitle");
  var catEl = document.getElementById("b-category");
  var levelEl = document.getElementById("b-level");

  catEl.innerHTML = CF.categories().map(function (c) {
    return '<option' + (c.name === draft.category ? " selected" : "") + ">" + c.name + "</option>";
  }).join("");

  titleEl.value = draft.title;
  subEl.value = draft.subtitle;
  levelEl.value = draft.level;

  function paintCounts() {
    document.getElementById("b-title-count").textContent = titleEl.value.length;
    document.getElementById("b-sub-count").textContent = subEl.value.length;
  }

  [titleEl, subEl].forEach(function (el) {
    el.addEventListener("input", function () {
      draft.title = titleEl.value;
      draft.subtitle = subEl.value;
      if (el.closest(".field").classList.contains("has-error")) clearError(el);
      paintCounts();
      paintPreview();
      save();
    });
  });

  [catEl, levelEl].forEach(function (el) {
    el.addEventListener("change", function () {
      draft.category = catEl.value;
      draft.level = levelEl.value;
      paintPreview();
      save();
    });
  });

  document.getElementById("b-glyphs").innerHTML = Object.keys(CF.GLYPHS).map(function (g) {
    return '<button class="chip" type="button" data-glyph="' + g + '" aria-pressed="' +
      (g === draft.glyph) + '">' +
      '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">' + CF.GLYPHS[g] + "</svg>" +
      GLYPH_LABELS[g] + "</button>";
  }).join("");

  document.getElementById("b-hues").innerHTML = HUES.map(function (h) {
    return '<button class="chip" type="button" data-hue="' + h + '" aria-pressed="' +
      (h === draft.hue) + '" aria-label="Colour ' + h + '">' +
      '<span style="width:18px;height:18px;border-radius:50%;background:hsl(' + h +
      ' 58% 45%);display:block"></span></button>';
  }).join("");

  document.getElementById("b-glyphs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-glyph]");
    if (!b) return;
    draft.glyph = b.dataset.glyph;
    this.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.dataset.glyph === draft.glyph));
    });
    paintPreview();
    save();
  });

  document.getElementById("b-hues").addEventListener("click", function (e) {
    var b = e.target.closest("[data-hue]");
    if (!b) return;
    draft.hue = Number(b.dataset.hue);
    this.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(Number(c.dataset.hue) === draft.hue));
    });
    paintPreview();
    save();
  });

  /* ---- Step 2: curriculum ----------------------------------------------- */

  var builder = document.getElementById("b-builder");

  function paintBuilder() {
    builder.innerHTML = draft.sections.map(function (section, si) {
      var lessons = section.lessons.map(function (lesson, li) {
        return '<div class="blesson">' +
          '<input class="input" value="' + escapeAttr(lesson.name) + '" placeholder="Lesson title"' +
            ' data-s="' + si + '" data-l="' + li + '" data-k="name" aria-label="Lesson title">' +
          '<input class="input blesson__dur" value="' + escapeAttr(lesson.dur) + '" placeholder="0:00"' +
            ' data-s="' + si + '" data-l="' + li + '" data-k="dur" aria-label="Lesson length">' +
          '<label class="check nowrap" style="grid-template-columns:20px auto;font-size:.82rem" title="Free preview">' +
            '<input type="checkbox" ' + (lesson.preview ? "checked" : "") +
            ' data-s="' + si + '" data-l="' + li + '" data-k="preview" style="width:18px;height:18px">' +
            "<span>Preview</span></label>" +
          '<button class="iconbtn-sm" type="button" data-del-lesson="' + si + "," + li + '" aria-label="Delete lesson">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          "</button></div>";
      }).join("");

      return '<div class="bsection">' +
        '<div class="bsection__head">' +
          '<span class="tag tag--quiet nowrap">' + (si + 1) + "</span>" +
          '<input class="input" value="' + escapeAttr(section.title) + '" placeholder="Section title"' +
            ' data-s="' + si + '" data-k="section" aria-label="Section title">' +
          '<button class="iconbtn-sm iconbtn-sm--up" type="button" data-move="' + si + ',-1"' +
            (si === 0 ? " disabled" : "") + ' aria-label="Move section up">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 15 6-6 6 6"/></svg></button>' +
          '<button class="iconbtn-sm iconbtn-sm--down" type="button" data-move="' + si + ',1"' +
            (si === draft.sections.length - 1 ? " disabled" : "") + ' aria-label="Move section down">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
          '<button class="iconbtn-sm" type="button" data-del-section="' + si + '"' +
            (draft.sections.length === 1 ? " disabled" : "") + ' aria-label="Delete section">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        "</div>" + lessons +
        '<div class="blesson"><button class="btn btn--sm btn--quiet" type="button" data-add-lesson="' + si + '">+ Add lesson</button></div>' +
      "</div>";
    }).join("");
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  builder.addEventListener("input", function (e) {
    var el = e.target;
    var si = Number(el.dataset.s);

    if (el.dataset.k === "section") draft.sections[si].title = el.value;
    else if (el.dataset.k === "name") draft.sections[si].lessons[Number(el.dataset.l)].name = el.value;
    else if (el.dataset.k === "dur") draft.sections[si].lessons[Number(el.dataset.l)].dur = el.value;

    paintPreview();
    save();
  });

  builder.addEventListener("change", function (e) {
    if (e.target.dataset.k !== "preview") return;
    draft.sections[Number(e.target.dataset.s)].lessons[Number(e.target.dataset.l)].preview = e.target.checked;
    save();
  });

  builder.addEventListener("click", function (e) {
    var addLesson = e.target.closest("[data-add-lesson]");
    if (addLesson) {
      draft.sections[Number(addLesson.dataset.addLesson)].lessons.push({ name: "", dur: "10:00", preview: false });
      paintBuilder(); paintPreview(); save();
      var inputs = builder.querySelectorAll('[data-k="name"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
      return;
    }

    var delLesson = e.target.closest("[data-del-lesson]");
    if (delLesson) {
      var parts = delLesson.dataset.delLesson.split(",").map(Number);
      draft.sections[parts[0]].lessons.splice(parts[1], 1);
      paintBuilder(); paintPreview(); save();
      return;
    }

    var delSection = e.target.closest("[data-del-section]");
    if (delSection) {
      draft.sections.splice(Number(delSection.dataset.delSection), 1);
      paintBuilder(); paintPreview(); save();
      return;
    }

    var move = e.target.closest("[data-move]");
    if (move) {
      var mp = move.dataset.move.split(",").map(Number);
      var from = mp[0], to = from + mp[1];
      if (to < 0 || to >= draft.sections.length) return;
      var moved = draft.sections.splice(from, 1)[0];
      draft.sections.splice(to, 0, moved);
      paintBuilder(); save();
    }
  });

  document.getElementById("b-add-section").addEventListener("click", function () {
    draft.sections.push({ title: "", lessons: [{ name: "", dur: "10:00", preview: false }] });
    paintBuilder(); paintPreview(); save();
    var sectionInputs = builder.querySelectorAll('[data-k="section"]');
    sectionInputs[sectionInputs.length - 1].focus();
  });

  /* ---- Step 3: pricing -------------------------------------------------- */

  var priceEl = document.getElementById("b-price");
  var paidFields = document.getElementById("b-paid-fields");
  var launchEl = document.getElementById("b-launch");

  priceEl.value = draft.price;
  launchEl.checked = draft.launch;
  form.querySelector('input[name="model"][value="' + draft.model + '"]').checked = true;

  function paintPricing() {
    var free = draft.model === "free";
    paidFields.hidden = free;

    var price = draft.price;
    var fee = price * 0.12;

    document.getElementById("b-price-out").textContent = "$" + price;
    document.getElementById("b-pay").textContent = "$" + price;
    document.getElementById("b-fee").textContent = "−$" + fee.toFixed(2);
    document.getElementById("b-keep").textContent = "$" + (price - fee).toFixed(2);
  }

  priceEl.addEventListener("input", function () {
    draft.price = Number(priceEl.value);
    paintPricing(); paintPreview(); save();
  });

  launchEl.addEventListener("change", function () {
    draft.launch = launchEl.checked;
    paintPreview(); save();
  });

  form.addEventListener("change", function (e) {
    if (e.target.name !== "model") return;
    draft.model = e.target.value;
    paintPricing(); paintPreview(); save();
  });

  /* ---- Preview ---------------------------------------------------------- */

  function asCourse() {
    var lessonCount = draft.sections.reduce(function (n, s) { return n + s.lessons.length; }, 0);
    var minutes = draft.sections.reduce(function (n, s) {
      return n + s.lessons.reduce(function (m, l) {
        var p = String(l.dur || "0:00").split(":");
        return m + (Number(p[0]) || 0) + (Number(p[1]) || 0) / 60;
      }, 0);
    }, 0);

    return {
      id: "draft",
      title: draft.title || "Untitled course",
      subtitle: draft.subtitle,
      category: draft.category,
      level: draft.level,
      glyph: draft.glyph,
      hue: draft.hue,
      price: draft.model === "free" ? 0 : draft.price * 100,
      was: draft.model === "free" || !draft.launch ? 0 : Math.round(draft.price * 1.6) * 100,
      rating: 0,
      reviews: 0,
      students: 0,
      hours: Math.max(0.1, Math.round(minutes / 6) / 10),
      lessonCount: lessonCount,
      badge: draft.launch && draft.model === "paid" ? "Launch price" : "",
      tutorName: (CF.user.get() || {}).name || "You",
      instructor: "noor",
      curriculum: draft.sections
    };
  }

  function paintPreview() {
    var course = asCourse();
    var host = document.getElementById("b-preview");

    /* The shared card renders a rating; a brand-new course has none, so swap
       that line for the honest version. */
    host.innerHTML = CF.cardHTML(course)
      .replace(/<span class="rating">[\s\S]*?<\/span><\/span>/,
        '<span class="tag tag--quiet">New</span>')
      .replace('href="course.html?id=draft"', 'href="#" onclick="return false"');
  }

  /* ---- Review ----------------------------------------------------------- */

  function paintReview() {
    var course = asCourse();
    var lessonCount = course.lessonCount;
    var previews = draft.sections.reduce(function (n, s) {
      return n + s.lessons.filter(function (l) { return l.preview; }).length;
    }, 0);

    var rows = [
      ["Title", course.title],
      ["Description", draft.subtitle || "–"],
      ["Subject", draft.category + " · " + draft.level],
      ["Curriculum", draft.sections.length + (draft.sections.length === 1 ? " section · " : " sections · ") +
        lessonCount + (lessonCount === 1 ? " lesson · ~" : " lessons · ~") + course.hours + " hrs"],
      ["Free previews", previews + (previews === 2 ? "" : previews < 2 ? ". We'd suggest 2" : ". More than most need")],
      ["Price", draft.model === "free" ? "Free" : "$" + draft.price +
        (draft.launch ? " launch price" : "")],
      ["You keep per sale", draft.model === "free" ? "–" : "$" + (draft.price * 0.88).toFixed(2)]
    ];

    document.getElementById("b-review").innerHTML = rows.map(function (r) {
      return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
    }).join("");
  }

  /* ---- Navigation ------------------------------------------------------- */

  form.addEventListener("click", function (e) {
    if (e.target.closest("#b-publish")) return; /* handled below */

    var next = e.target.closest("[data-next]");
    if (next) {
      if (!validateStep(current)) return;
      if (current + 1 === steps.length - 1) paintReview();
      showStep(current + 1);
      return;
    }

    var back = e.target.closest("[data-back]");
    if (back) { showStep(current - 1); return; }

    var edit = e.target.closest("[data-edit-step]");
    if (edit) showStep(Number(edit.dataset.editStep));
  });

  document.getElementById("b-publish").addEventListener("click", function () {
    var terms = document.getElementById("b-terms");
    var err = document.getElementById("b-terms-error");

    if (!terms.checked) {
      err.textContent = "Please confirm the rights and the agreement.";
      err.style.display = "block";
      terms.focus();
      return;
    }
    err.style.display = "none";

    var btn = this;
    btn.disabled = true;
    btn.textContent = "Submitting…";

    setTimeout(function () {
      document.getElementById("b-done-card").innerHTML =
        CF.cardHTML(asCourse()).replace('href="course.html?id=draft"', 'href="#" onclick="return false"');
      document.getElementById("builder-shell").hidden = true;
      document.getElementById("builder-done").hidden = false;
      var h = document.querySelector("#builder-done h2");
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 800);
  });

  document.getElementById("b-restart").addEventListener("click", function () {
    CF.store.remove("draft");
    window.location.reload();
  });

  /* ---- Init ------------------------------------------------------------- */

  paintCounts();
  paintBuilder();
  paintPricing();
  paintPreview();
  showStep(0, true);
})();
