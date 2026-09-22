---
layout: home
title: "Live demos"
permalink: /demos/
description: "Seven complete niche business websites, live and clickable."
sitemap: false
---
<div class="page-head">
  <div class="wrap">
    <span class="kicker">Live demos</span>
    <h1>Seven niche sites, running</h1>
    <p class="page-head__sum">Each one is a complete static site. The case study explains what each was built to solve.</p>
    <div class="btn-row"><a class="btn" href="{{ site.baseurl }}/14-niche-web-design/">Read the case study</a></div>
  </div>
</div>
<section class="section">
  <div class="wrap">
    <div class="demos">
      {%- assign sites = "hotel,The Lumen,Hotel;storage,Gantry Self Storage,Self storage;trades,Hollis Electrical,Electrician;courses,Coursefolk,Course marketplace;clothing,Brindle,Apparel;salon,Juniper Lane,Hair studio;dentist,Sherry's Dentistry,Dental practice" | split: ";" -%}
      {%- for s in sites -%}
        {%- assign b = s | split: "," -%}
        <article class="demo">
          <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/{{ b[0] }}/</span></div>
          <div class="demo__body">
            <span class="demo__niche">{{ b[2] }}</span>
            <h3><a href="{{ site.baseurl }}/demos/{{ b[0] }}/">{{ b[1] }}</a></h3>
          </div>
        </article>
      {%- endfor -%}
    </div>
  </div>
</section>
