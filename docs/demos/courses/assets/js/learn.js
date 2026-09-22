/* Coursefolk: course player.

   Lesson navigation, progress, per-lesson notes and a stand-in for the video
   element. Progress and notes live in localStorage; there is no media here. */

(function () {
  "use strict";

  var root = document.getElementById("player-root");
  if (!root) return;

  var params = new URLSearchParams(window.location.search);
  var course = CF.byId(params.get("id") || "");

  if (!course) {
    document.getElementById("player-missing").hidden = false;
    return;
  }

  root.hidden = false;
  document.title = course.title + " · Coursefolk";
  document.getElementById("p-course-title").textContent = course.title;

  var tutor = CF.instructorOf(course);
  var qaAvatar = document.getElementById("qa-avatar");
  qaAvatar.style.setProperty("--h", tutor.hue);
  qaAvatar.textContent = tutor.initials;
  document.getElementById("qa-name").textContent = tutor.name;

  var lessons = CF.flatLessons(course);
  var owned = CF.enrolment.has(course.id);
  var current = 0;

  /* Resume where the learner got to, or open the lesson named in the URL. */
  var wanted = params.get("lesson");
  if (wanted) {
    lessons.forEach(function (l, i) { if (l.key === wanted) current = i; });
  } else {
    var done = CF.progress.done(course.id);
    for (var i = 0; i < lessons.length; i++) {
      if (done.indexOf(lessons[i].key) === -1) { current = i; break; }
    }
  }

  /* ---- Access ----------------------------------------------------------- */

  function canPlay(lesson) { return owned || lesson.preview; }

  /* ---- Syllabus --------------------------------------------------------- */

  var listHost = document.getElementById("p-list");

  function paintList() {
    var done = CF.progress.done(course.id);

    listHost.innerHTML = course.curriculum.map(function (section, si) {
      var rows = section.lessons.map(function (lesson, li) {
        var key = si + "-" + li;
        var flat = lessons.filter(function (l) { return l.key === key; })[0];
        var idx = lessons.indexOf(flat);
        var isDone = done.indexOf(key) !== -1;
        var locked = !canPlay(flat);

        return '<button class="slesson ' + (isDone ? "is-done" : "") + '" type="button"' +
          ' data-index="' + idx + '"' +
          ' aria-current="' + (idx === current ? "true" : "false") + '">' +
          '<span class="slesson__tick" aria-hidden="true">' +
            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
          "</span>" +
          '<span class="slesson__name">' + lesson.name + "</span>" +
          (locked
            ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
            : '<span class="slesson__dur">' + lesson.dur + "</span>") +
          "</button>";
      }).join("");

      return '<div class="syllabus__group"><h3>' + section.title + "</h3>" + rows + "</div>";
    }).join("");
  }

  function paintProgress() {
    var pct = CF.progress.percent(course);
    document.getElementById("p-percent").textContent = pct + "%";
    document.getElementById("p-fill").style.width = pct + "%";
    document.getElementById("p-progress-text").textContent =
      CF.progress.done(course.id).length + " of " + lessons.length + " lessons complete";
  }

  /* ---- Lesson ----------------------------------------------------------- */

  function durationSeconds(dur) {
    var p = dur.split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  var ticker = null;

  function stopTicker() {
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  function paintLesson() {
    var lesson = lessons[current];
    var locked = !canPlay(lesson);

    document.getElementById("l-section").textContent =
      "Section " + (lesson.sectionIndex + 1) + " · " + lesson.section;
    document.getElementById("l-title").textContent = lesson.name;

    /* Stage */
    var stage = document.getElementById("stage");
    var playBtn = document.getElementById("playbtn");
    var caption = document.getElementById("stage-caption");

    stopTicker();
    document.getElementById("scrub-fill").style.width = "0%";
    document.getElementById("scrub-now").textContent = "0:00";
    document.getElementById("scrub-dur").textContent = lesson.dur;

    if (locked) {
      playBtn.disabled = true;
      playBtn.style.opacity = ".35";
      caption.innerHTML = "Locked. <a href='course.html?id=" + course.id +
        "' style='color:#fff'>Buy the course</a> to watch this lesson.";
    } else {
      playBtn.disabled = false;
      playBtn.style.opacity = "1";
      caption.textContent = lesson.preview && !owned
        ? "Free preview lesson. Video placeholder, this demo has no media files."
        : "Video placeholder, this demo has no media files.";
    }

    /* Overview copy is generated so every lesson has something real to show. */
    document.getElementById("l-overview").innerHTML =
      "<p>" + lesson.name + " sits in <strong>" + lesson.section +
      "</strong>, about " + lesson.dur + " of video. " +
      (lesson.preview ? "It's one of the free preview lessons. " : "") +
      "Work through it with the exercise file open. The last third is hands-on.</p>" +
      "<p class='muted' style='font-size:.94rem'>Transcript, captions and a 2× speed control would sit here in a real build.</p>";

    /* Resources */
    document.getElementById("l-resources").innerHTML = [
      { name: "Exercise file. " + lesson.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".zip", meta: "48 KB" },
      { name: "Transcript (PDF)", meta: "12 pages" },
      { name: "Slides used in this lesson", meta: "PDF" }
    ].map(function (r) {
      return '<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/></svg>' +
        '<span class="lessons__name">' + r.name + "</span>" +
        '<span class="lessons__dur">' + r.meta + "</span></li>";
    }).join("");

    /* Notes */
    var notes = CF.store.get("notes", {});
    document.getElementById("l-notes").value = (notes[course.id] || {})[lesson.key] || "";
    document.getElementById("l-notes-status").textContent = "Saved to this browser only.";

    /* Complete button */
    var isDone = CF.progress.done(course.id).indexOf(lesson.key) !== -1;
    var completeBtn = document.getElementById("l-complete");
    completeBtn.textContent = isDone ? "✓ Completed" : "Mark complete";
    completeBtn.className = "btn btn--sm " + (isDone ? "btn--quiet" : "");
    completeBtn.disabled = locked;

    document.getElementById("l-prev").disabled = current === 0;
    document.getElementById("l-next").disabled = current === lessons.length - 1;

    /* Keep the URL shareable without reloading. */
    var p = new URLSearchParams({ id: course.id, lesson: lesson.key });
    history.replaceState(null, "", "?" + p.toString());

    paintList();
    paintProgress();
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, lessons.length - 1));
    paintLesson();
    if (window.matchMedia("(max-width: 999px)").matches) {
      document.getElementById("lesson").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---- Events ----------------------------------------------------------- */

  listHost.addEventListener("click", function (e) {
    var btn = e.target.closest(".slesson");
    if (btn) goTo(Number(btn.dataset.index));
  });

  document.getElementById("l-prev").addEventListener("click", function () { goTo(current - 1); });
  document.getElementById("l-next").addEventListener("click", function () { goTo(current + 1); });

  document.getElementById("l-complete").addEventListener("click", function () {
    CF.progress.toggle(course.id, lessons[current].key);
    paintLesson();
  });

  /* Fake playback so the scrub bar and the completion flow can be seen. */
  document.getElementById("playbtn").addEventListener("click", function () {
    var lesson = lessons[current];
    if (!canPlay(lesson)) return;

    if (ticker) { stopTicker(); return; }

    var total = durationSeconds(lesson.dur);
    var at = 0;
    var step = Math.max(1, Math.round(total / 60)); /* whole lesson in ~6s */

    ticker = setInterval(function () {
      at += step;
      if (at >= total) {
        at = total;
        stopTicker();
        if (CF.progress.done(course.id).indexOf(lesson.key) === -1) {
          CF.progress.toggle(course.id, lesson.key);
        }
        paintLesson();
        return;
      }
      document.getElementById("scrub-now").textContent = fmt(at);
      document.getElementById("scrub-fill").style.width = (at / total * 100) + "%";
    }, 100);
  });

  /* Notes. Debounced write, so we're not hammering storage on every keypress. */
  var notesTimer = null;
  document.getElementById("l-notes").addEventListener("input", function (e) {
    var value = e.target.value;
    document.getElementById("l-notes-status").textContent = "Saving…";
    clearTimeout(notesTimer);
    notesTimer = setTimeout(function () {
      var notes = CF.store.get("notes", {});
      notes[course.id] = notes[course.id] || {};
      notes[course.id][lessons[current].key] = value;
      CF.store.set("notes", notes);
      document.getElementById("l-notes-status").textContent = "Saved to this browser only.";
    }, 400);
  });

  document.getElementById("qa-send").addEventListener("click", function () {
    var box = document.getElementById("qa-new");
    if (!box.value.trim()) { box.focus(); return; }
    box.value = "";
    document.getElementById("qa-status").hidden = false;
  });

  /* ---- Tabs ------------------------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () { selectTab(tab); });
    tab.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var i = tabs.indexOf(tab);
      var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  selectTab(tabs[0]);
  paintLesson();
})();
