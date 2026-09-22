---
layout: home
title: "Projects"
permalink: /projects/
description: "Infrastructure, Kubernetes, security and cost-automation projects, plus full-stack product work."
---

<div class="page-head">
  <div class="wrap">
    <span class="kicker">Projects</span>
    <h1>Everything, filterable</h1>
    <p class="page-head__sum">
      Infrastructure and platform work, plus the product side. Each one has its
      own write-up; most link straight to the code.
    </p>
  </div>
</div>

<section class="section">
  <div class="wrap">
    <div class="filters" data-filters role="group" aria-label="Filter projects by category"></div>
    <p class="visually-hidden" data-filter-status role="status" aria-live="polite"></p>

    <div class="cards cards--3" data-filterable>
      {%- for p in site.data.projects -%}
        {% include project-card.html project=p %}
      {%- endfor -%}
    </div>

    <p class="filter-empty" data-filter-empty hidden>Nothing in that category yet.</p>
  </div>
</section>
