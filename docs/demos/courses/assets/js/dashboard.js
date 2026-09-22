/* Coursefolk: learner and instructor dashboard.

   Learning data comes from the demo enrolment/progress state in localStorage.
   The teaching figures are invented sample data, labelled as such on the page. */

(function () {
  "use strict";

  var learningPanel = document.getElementById("panel-learning");
  if (!learningPanel) return;

  /* ---- Tabs ------------------------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));

  function selectTab(tab, push) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (push) {
      history.replaceState(null, "", tab.id === "tab-teaching" ? "#teaching" : window.location.pathname);
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { selectTab(tab, true); });
    tab.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var i = tabs.indexOf(tab);
      var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next, true);
    });
  });

  /* ---- Greeting --------------------------------------------------------- */

  var user = CF.user.get();
  if (!user) {
    document.getElementById("dash-sub").innerHTML =
      'You\'re browsing as a guest. <a href="signin.html">Sign in</a> to name this dashboard. ' +
      "Your demo library below is kept in this browser either way.";
  }

  /* ---- Rows ------------------------------------------------------------- */

  function ring(pct) {
    var r = 22, c = 2 * Math.PI * r;
    return '<span class="progress-ring">' +
      '<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">' +
        '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="5"/>' +
        '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--violet-600)" stroke-width="5"' +
          ' stroke-linecap="round" stroke-dasharray="' + c + '"' +
          ' stroke-dashoffset="' + (c * (1 - pct / 100)) + '"/>' +
      "</svg>" +
      '<span class="progress-ring__val">' + pct + "%</span></span>";
  }

  function rowHTML(course) {
    var pct = CF.progress.percent(course);
    var tutor = CF.instructorOf(course);
    var done = CF.progress.done(course.id).length;
    var total = CF.totalLessons(course);

    return '<div class="rowcard">' +
      CF.coverHTML(course, "cover--wide") +
      '<div class="rowcard__main">' +
        "<h3>" + course.title + "</h3>" +
        '<p class="muted" style="font-size:.9rem">' + tutor.name + " · " +
          done + " of " + total + " lessons" + "</p>" +
      "</div>" +
      ring(pct) +
      '<a class="btn btn--sm" href="learn.html?id=' + course.id + '">' +
        (pct === 0 ? "Start" : pct === 100 ? "Revisit" : "Continue") + "</a>" +
    "</div>";
  }

  var enrolled = CF.enrolment.ids().map(CF.byId).filter(Boolean);
  var inProgress = enrolled.filter(function (c) { return CF.progress.percent(c) < 100; });
  var finished = enrolled.filter(function (c) { return CF.progress.percent(c) === 100; });

  document.getElementById("in-progress").innerHTML = inProgress.map(rowHTML).join("");
  document.getElementById("learning-empty").hidden = enrolled.length !== 0;

  if (finished.length) {
    document.getElementById("completed-wrap").hidden = false;
    document.getElementById("completed").innerHTML = finished.map(rowHTML).join("");
  }

  /* ---- Learner stats ---------------------------------------------------- */

  var lessonsDone = enrolled.reduce(function (n, c) { return n + CF.progress.done(c.id).length; }, 0);
  var hoursOwned = enrolled.reduce(function (n, c) { return n + c.hours; }, 0);

  document.getElementById("learning-stats").innerHTML = [
    [enrolled.length, enrolled.length === 1 ? "Course owned" : "Courses owned"],
    [lessonsDone, "Lessons completed"],
    [Math.round(hoursOwned) + " hrs", "In your library"],
    [finished.length, "Finished"]
  ].map(function (s) {
    return '<div><div class="stat__num">' + s[0] + '</div><div class="stat__label">' + s[1] + "</div></div>";
  }).join("");

  /* ---- Recommendations -------------------------------------------------- */

  var owned = CF.enrolment.ids();
  var recs = CF.COURSES.filter(function (c) { return owned.indexOf(c.id) === -1; })
    .sort(function (a, b) { return b.rating - a.rating; })
    .slice(0, 4);

  CF.renderCards(document.getElementById("recommended"), recs);

  /* ---- Teaching: earnings chart ----------------------------------------- */

  var MONTHS = [
    { m: "Feb", v: 410 }, { m: "Mar", v: 620 }, { m: "Apr", v: 580 }, { m: "May", v: 890 },
    { m: "Jun", v: 1140 }, { m: "Jul", v: 1020 }, { m: "Aug", v: 1480 }, { m: "Sep", v: 1610 }
  ];
  var peak = Math.max.apply(null, MONTHS.map(function (x) { return x.v; }));

  document.getElementById("earnings-bars").innerHTML = MONTHS.map(function (x, i) {
    return '<div class="bars__col">' +
      '<span class="muted" style="font-size:.74rem">$' + (x.v / 1000).toFixed(1) + "k</span>" +
      '<span class="bars__bar' + (i === MONTHS.length - 1 ? "" : " bars__bar--muted") +
        '" style="height:0"></span>' +
      '<span class="bars__label">' + x.m + "</span></div>";
  }).join("");

  /* Grow the bars once they're on screen. */
  function growBars() {
    document.querySelectorAll("#earnings-bars .bars__bar").forEach(function (bar, i) {
      bar.style.height = Math.round((MONTHS[i].v / peak) * 100) + "%";
    });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        growBars();
        io.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(document.getElementById("earnings-bars"));
  } else {
    growBars();
  }

  /* ---- Teaching: course list -------------------------------------------- */

  var TAUGHT = [
    { id: "type-systems", students: 842, revenue: 4890, state: "Published" },
    { id: "colour-for-interfaces", students: 421, revenue: 2764, state: "Published" },
    { id: "field-recording", students: 21, revenue: 758, state: "In review" }
  ];

  document.getElementById("taught").innerHTML = TAUGHT.map(function (row) {
    var course = CF.byId(row.id);
    if (!course) return "";
    var stateTag = row.state === "Published"
      ? '<span class="tag tag--teal">Published</span>'
      : '<span class="tag tag--amber">In review</span>';

    return '<div class="rowcard">' +
      CF.coverHTML(course, "cover--wide") +
      '<div class="rowcard__main">' +
        "<h3>" + course.title + "</h3>" +
        '<p class="muted" style="font-size:.9rem">' + row.students.toLocaleString() +
          " students · " + CF.money(course.price) + " · " + stateTag + "</p>" +
      "</div>" +
      '<div style="text-align:right"><div class="price">$' + row.revenue.toLocaleString() + "</div>" +
        '<div class="muted" style="font-size:.8rem">this year</div></div>' +
      '<a class="btn btn--sm btn--ghost" href="upload.html">Edit</a>' +
    "</div>";
  }).join("");

  /* ---- Open the tab named in the URL ------------------------------------ */

  selectTab(window.location.hash === "#teaching"
    ? document.getElementById("tab-teaching")
    : tabs[0], false);
})();
