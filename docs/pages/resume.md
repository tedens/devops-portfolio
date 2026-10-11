---
layout: page
title: "Resume"
permalink: /resume/
summary: "Two pages. Same content as the PDF, which is the copy to send on."
description: "Anthony Edens, DevOps Manager at a healthcare SaaS: Kubernetes on AWS, GitOps, HIPAA and SOC 2 controls, and a PHI-scrubbing OpenTelemetry pipeline."
---

{%- assign r = site.data.resume -%}

<div class="resume-actions">
  <div class="btn-row mt-0">
    <a class="btn" href="{{ site.baseurl }}{{ r.pdf_dark }}" download>Download PDF</a>
    <a class="btn btn--ghost" href="{{ site.baseurl }}{{ r.pdf_light }}" download>Printer-friendly PDF</a>
  </div>
  <p class="muted resume-updated">Updated {{ r.updated | date: "%B %Y" }}. Contact details are left off the public copy; use the <a href="{{ site.baseurl }}/contact/">contact form</a>.</p>
</div>

<p class="lede">{{ r.summary }}</p>

## Experience

{%- for job in r.experience %}
<div class="resume-role">
  <div class="resume-role__head">
    <h3 class="resume-role__title">{{ job.title }} <span class="resume-role__org">{{ job.org }}</span></h3>
    <span class="resume-role__dates">{{ job.dates }}</span>
  </div>
  {%- if job.tagline %}
  <p class="resume-role__tag">{{ job.tagline }}</p>
  {%- endif %}
  <ul>
    {%- for b in job.bullets %}
    <li>{{ b }}</li>
    {%- endfor %}
  </ul>
</div>
{%- endfor %}

## Selected projects

<p class="resume-role__tag">{{ r.projects_intro }}</p>

{%- for p in r.projects %}
<div class="resume-role">
  <div class="resume-role__head">
    <h3 class="resume-role__title"><a href="{{ p.url }}" rel="noopener">{{ p.title }}</a></h3>
    <a class="chip chip--accent" href="{{ p.url }}" rel="noopener">{{ p.repo }}</a>
  </div>
  <p>{{ p.desc }}</p>
</div>
{%- endfor %}

## Technical skills

<dl class="resume-skills">
  {%- for row in r.skills %}
  <div class="resume-skills__row">
    <dt>{{ row.label }}</dt>
    <dd class="chips">
      {%- for it in row.items %}<span class="chip">{{ it }}</span>{%- endfor %}
    </dd>
  </div>
  {%- endfor %}
</dl>

<style>
.resume-actions { margin-bottom: var(--sp-6); }
.resume-updated { margin-top: var(--sp-3); font-size: var(--step--1); }
.resume-role { margin-top: var(--sp-6); }
.resume-role__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--sp-2) var(--sp-4); }
.resume-role__title { margin-top: 0; font-size: var(--step-1); }
.resume-role__title a { color: var(--fg); text-decoration: none; }
.resume-role__title a:hover { color: var(--accent); }
.resume-role__org { color: var(--accent); font-weight: 500; }
.resume-role__org::before { content: "· "; color: var(--muted); }
.resume-role__dates { font-family: var(--font-mono); font-size: var(--step--2); color: var(--muted); letter-spacing: .06em; }
.resume-role__tag { margin-top: var(--sp-1); font-style: italic; color: var(--fg-2); font-size: var(--step--1); }
.resume-role ul { margin-top: var(--sp-3); }
.resume-role p { margin-top: var(--sp-2); }
.resume-skills { margin-top: var(--sp-5); }
.resume-skills__row { display: grid; grid-template-columns: 11rem 1fr; gap: var(--sp-3); align-items: start; padding: var(--sp-3) 0; border-top: 1px solid var(--line); }
.resume-skills__row:first-child { border-top: 0; }
.resume-skills dt { font-family: var(--font-mono); font-size: var(--step--2); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); padding-top: 4px; }
.resume-skills dd { margin: 0; }
.resume-skills .chip { white-space: normal; }
@media (max-width: 640px) {
  .resume-skills__row { grid-template-columns: 1fr; gap: var(--sp-2); }
}
</style>
