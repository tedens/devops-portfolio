/* Coursefolk: course detail page. */

(function () {
  "use strict";

  var root = document.getElementById("course-root");
  if (!root) return;

  var id = new URLSearchParams(window.location.search).get("id") || CF.COURSES[0].id;
  var course = CF.byId(id);

  if (!course) {
    document.getElementById("course-missing").hidden = false;
    document.title = "Course not found · Coursefolk";
    return;
  }

  var tutor = CF.instructorOf(course);
  root.hidden = false;

  document.title = course.title + " · Coursefolk";
  var desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", course.subtitle);

  /* ---- Head ------------------------------------------------------------- */

  var crumb = document.getElementById("c-crumb-cat");
  crumb.innerHTML = '<a href="catalog.html?cat=' + encodeURIComponent(course.category) + '">' +
    course.category + "</a>";

  document.getElementById("c-badges").innerHTML =
    (course.badge ? '<span class="tag tag--amber">' + course.badge + "</span>" : "") +
    '<span class="tag">' + course.category + "</span>" +
    '<span class="tag tag--quiet">' + course.level + "</span>";

  document.getElementById("c-title").textContent = course.title;
  document.getElementById("c-subtitle").textContent = course.subtitle;

  document.getElementById("c-meta").innerHTML =
    '<span class="rating"><span class="rating__num" style="color:#fff">' + course.rating.toFixed(1) + "</span>" +
    '<span class="rating__stars" aria-hidden="true">' + CF.stars(course.rating) + "</span>" +
    '<span class="rating__count" style="color:rgba(255,255,255,.65)">(' + course.reviews.toLocaleString() + " reviews)</span></span>" +
    "<span>" + course.students.toLocaleString() + " students</span>" +
    "<span>" + course.hours + " hours · " + course.lessonCount + " lessons</span>" +
    "<span>Updated " + course.updated + "</span>" +
    "<span>" + course.language + "</span>";

  var avatar = document.getElementById("c-tutor-avatar");
  avatar.style.setProperty("--h", tutor.hue);
  avatar.textContent = tutor.initials;
  document.getElementById("c-tutor-name").textContent = tutor.name;
  document.getElementById("c-tutor-title").textContent = tutor.title;

  /* ---- Outcomes & requirements ------------------------------------------ */

  document.getElementById("c-outcomes").innerHTML =
    course.outcomes.map(function (o) { return "<li>" + o + "</li>"; }).join("");

  document.getElementById("c-requirements").innerHTML =
    course.requirements.map(function (r) { return "<li>" + r + "</li>"; }).join("");

  /* ---- Curriculum ------------------------------------------------------- */

  function sectionMinutes(section) {
    var total = section.lessons.reduce(function (n, l) {
      var p = l.dur.split(":");
      return n + Number(p[0]) + Number(p[1]) / 60;
    }, 0);
    return Math.round(total);
  }

  document.getElementById("c-curriculum").innerHTML = course.curriculum.map(function (section, i) {
    var lessons = section.lessons.map(function (l) {
      var icon = l.preview
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="6 4 20 12 6 20" fill="currentColor" stroke="none"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
      return '<li class="' + (l.preview ? "is-preview" : "") + '">' + icon +
        '<span class="lessons__name">' + l.name + (l.preview ? ' <span class="tag" style="margin-left:6px">Preview</span>' : "") + "</span>" +
        '<span class="lessons__dur">' + l.dur + "</span></li>";
    }).join("");

    return "<details" + (i === 0 ? " open" : "") + ">" +
      "<summary>" +
        '<span class="curriculum__title">' + section.title + "</span>" +
        '<span class="curriculum__meta">' + section.lessons.length + " lessons · " + sectionMinutes(section) + " min</span>" +
      "</summary>" +
      '<ul class="lessons">' + lessons + "</ul></details>";
  }).join("");

  document.getElementById("c-curriculum-meta").textContent =
    course.curriculum.length + " sections · " + CF.totalLessons(course) + " lessons shown of " + course.lessonCount;

  /* ---- Instructor bio --------------------------------------------------- */

  var bioAvatar = document.getElementById("c-bio-avatar");
  bioAvatar.style.setProperty("--h", tutor.hue);
  bioAvatar.textContent = tutor.initials;
  document.getElementById("c-bio-name").textContent = tutor.name;
  document.getElementById("c-bio-title").textContent = tutor.title;
  document.getElementById("c-bio-text").textContent = tutor.bio;
  document.getElementById("c-bio-stats").innerHTML =
    "<span><strong>" + tutor.rating.toFixed(2) + "</strong> instructor rating</span>" +
    "<span><strong>" + tutor.students.toLocaleString() + "</strong> students</span>" +
    "<span><strong>" + tutor.courses + "</strong> courses</span>";

  /* ---- Reviews ---------------------------------------------------------- */

  document.getElementById("c-rating-big").textContent = course.rating.toFixed(1);
  document.getElementById("c-rating-stars").textContent = CF.stars(course.rating);
  document.getElementById("c-rating-count").textContent = course.reviews.toLocaleString() + " ratings";

  document.getElementById("c-ratebars").innerHTML = [5, 4, 3, 2, 1].map(function (n) {
    var pct = CF.RATING_SPREAD[n];
    return '<div class="ratebar">' +
      '<span class="rating__stars" aria-hidden="true">' + "★".repeat(n) + "</span>" +
      '<span class="ratebar__track"><span class="ratebar__fill" style="width:' + pct + '%"></span></span>' +
      '<span class="ratebar__pct">' + pct + "%</span></div>";
  }).join("");

  var reviews = CF.REVIEWS[course.id];
  var reviewHost = document.getElementById("c-reviews");

  if (reviews && reviews.length) {
    reviewHost.className = "panel panel--pad-lg mt-5";
    reviewHost.innerHTML = reviews.map(function (r) {
      return '<article class="review">' +
        '<div class="review__head">' +
          '<span class="avatar avatar--sm" style="--h:' + r.hue + '" aria-hidden="true">' + r.initials + "</span>" +
          '<span><span class="byline__name">' + r.name + "</span><br>" +
          '<span class="rating__stars" aria-label="' + r.stars + ' out of 5">' + "★".repeat(r.stars) + "</span></span>" +
          '<span class="review__when">' + r.when + "</span>" +
        "</div><p>" + r.text + "</p></article>";
    }).join("");
  } else {
    reviewHost.className = "panel panel--pad-lg mt-5 text-center";
    reviewHost.innerHTML = '<p class="muted">Written reviews for this course are still being moderated. ' +
      'The ' + course.reviews.toLocaleString() + ' star ratings above are already counted.</p>';
  }

  /* ---- Buy rail --------------------------------------------------------- */

  document.getElementById("c-cover-rail").innerHTML = CF.coverHTML(course, "cover--wide");

  document.getElementById("c-price").innerHTML = course.price
    ? '<span class="price">' + CF.money(course.price) + "</span>" +
      (course.was ? '<span class="price--was">' + CF.money(course.was) + "</span>" +
        '<span class="tag tag--amber">' + Math.round((1 - course.price / course.was) * 100) + "% off</span>" : "")
    : '<span class="price price--free">Free</span>';

  var actions = document.getElementById("c-actions");
  var includes = document.getElementById("c-includes");

  includes.innerHTML = [
    course.hours + " hours of video, downloadable",
    course.lessonCount + " lessons across " + course.curriculum.length + " sections",
    "Exercise files and transcripts",
    "Lifetime access, including future updates",
    "Questions answered by " + tutor.name.split(" ")[0]
  ].map(function (x) { return "<li>" + x + "</li>"; }).join("");

  function paintActions() {
    if (CF.enrolment.has(course.id)) {
      actions.innerHTML =
        '<a class="btn btn--block" href="learn.html?id=' + course.id + '">Continue course</a>' +
        '<p class="notice notice--ok" style="grid-template-columns:1fr;text-align:center">You already own this course.</p>';
      document.getElementById("c-refund").hidden = true;
      return;
    }

    var inCart = CF.cart.has(course.id);
    actions.innerHTML =
      '<button class="btn btn--block ' + (inCart ? "btn--quiet" : "") + '" type="button" data-cart-toggle>' +
        (inCart ? "Remove from cart" : (course.price ? "Add to cart" : "Add to my library")) + "</button>" +
      '<a class="btn btn--accent btn--block" href="checkout.html?add=' + course.id + '">' +
        (course.price ? "Buy now" : "Enrol free") + "</a>";
  }

  actions.addEventListener("click", function (e) {
    if (!e.target.closest("[data-cart-toggle]")) return;
    CF.cart.has(course.id) ? CF.cart.remove(course.id) : CF.cart.add(course.id);
    paintActions();
  });

  paintActions();

  /* ---- Related ---------------------------------------------------------- */

  var related = CF.COURSES.filter(function (c) {
    return c.id !== course.id && (c.category === course.category || c.instructor === course.instructor);
  });

  if (related.length < 4) {
    CF.COURSES.forEach(function (c) {
      if (c.id !== course.id && related.indexOf(c) === -1 && related.length < 4) related.push(c);
    });
  }

  CF.renderCards(document.getElementById("c-related"), related.slice(0, 4));
})();
