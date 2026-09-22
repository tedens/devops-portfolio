---
layout: home
title: "Anthony Edens"
description: "DevOps and platform engineering: Kubernetes, Terraform, CI/CD and AWS cost and security automation, plus full-stack product work."
---

<section class="hero">
  <div class="wrap hero__inner">
    <span class="kicker">DevOps Manager · Healthcare SaaS</span>
    <h1>I build the <em>boring</em> infrastructure that lets teams ship.</h1>
    <p class="hero__lede">
      I'm Anthony (TJ) Edens. Professional since 2012, and for the last eight years
      or so that has meant automation-first infrastructure, with full-stack
      development alongside it rather than behind it. I currently lead DevOps at a healthcare SaaS, where
      the platform has to be fast, cheap, and auditable at the same time.
    </p>
    <div class="btn-row">
      <a class="btn btn--lg" href="{{ site.baseurl }}/projects/">See the work</a>
      <a class="btn btn--lg btn--ghost" href="{{ site.baseurl }}/contact/">Work with me</a>
    </div>
    <div class="hero__stats">
      <div class="stat"><b>99.995%</b><span>uptime on multi-account Kubernetes</span></div>
      <div class="stat"><b>60%</b><span>cloud spend removed</span></div>
      <div class="stat"><b>{{ site.time | date: "%Y" | minus: site.career_start }} yrs</b><span>professional since {{ site.career_start }}, 8 of them DevOps</span></div>
      <div class="stat"><b>HIPAA<span class="visually-hidden"> and </span>/SOC 2</b><span>audit-ready by default</span></div>
    </div>
  </div>
</section>

<section class="section section--edge">
  <div class="wrap">
    <div class="head-row">
      <div>
        <span class="kicker">Selected work</span>
        <h2>Things I built and ran</h2>
      </div>
      <a href="{{ site.baseurl }}/projects/">All {{ site.data.projects | size }} projects &rarr;</a>
    </div>

    <div class="cards cards--3">
      {%- assign featured = site.data.projects | where: "featured", true -%}
      {%- for p in featured -%}
        {% include project-card.html project=p feature=forloop.first %}
      {%- endfor -%}
    </div>
  </div>
</section>

<section class="section section--edge">
  <div class="wrap">
    <div class="section-head">
      <span class="kicker">What I do</span>
      <h2>Where I'm useful</h2>
      <p>Most of my work sits at the join between the platform and the people using it.</p>
    </div>

    <div class="grid grid--3">
      <div>
        <h3 class="mt-0">Platform &amp; Kubernetes</h3>
        <p>Multi-account EKS, Terraform and Terragrunt, ArgoCD, Karpenter, ingress and certificate automation. Clusters that other engineers can safely deploy to without asking me first.</p>
      </div>
      <div>
        <h3 class="mt-0">Cost &amp; reliability</h3>
        <p>Tag hygiene, budget enforcement, spot capacity, autoscaling, disaster-recovery rehearsal. Cutting spend without quietly trading away the recovery story.</p>
      </div>
      <div>
        <h3 class="mt-0">Security &amp; compliance</h3>
        <p>Short-lived SSH certificates, SSO across accounts, automated secret rotation, audit trails that hold up. Built for HIPAA and SOC 2 rather than retrofitted to them.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--edge">
  <div class="wrap">
    <div class="head-row">
      <div>
        <span class="kicker">Front of house</span>
        <h2>I also ship product</h2>
      </div>
      <a href="{{ site.baseurl }}/14-niche-web-design/">See all seven &rarr;</a>
    </div>
    <p class="lede">
      Seven complete demo sites, one per industry, each built around a different
      hard problem: interval availability for a hotel, rectangle packing for a
      storage facility, an inverted booking model for a trade. Static HTML, CSS
      and vanilla JS with no build step and no dependencies. Every one of them is
      live and clickable.
    </p>
    <div class="btn-row">
      <a class="btn" href="{{ site.baseurl }}/14-niche-web-design/">Open the case study</a>
      <a class="btn btn--ghost" href="{{ site.baseurl }}/demos/hotel/">Try the hotel booker</a>
    </div>
  </div>
</section>

<section class="section section--edge">
  <div class="wrap wrap--narrow">
    <span class="kicker">Availability</span>
    <h2>Open to a few things</h2>
    <ul>
      <li><strong>Long-term part-time DevOps contracts</strong>, 10 to 25 hours a week.</li>
      <li><strong>Fractional or advisory CTO work</strong>: architecture, hiring, and telling you which problem to solve first.</li>
      <li><strong>Mentorship</strong> for engineers moving into platform, observability or DevSecOps.</li>
    </ul>
    <p>
      If you need secure, scalable foundations built from scratch, or an existing
      setup matured into something audit-ready and affordable, get in touch.
    </p>
    <div class="btn-row">
      <a class="btn btn--lg" href="{{ site.baseurl }}/contact/">Start a conversation</a>
    </div>
  </div>
</section>
