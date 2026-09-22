---
title: "Seven Niche Business Sites"
layout: page
permalink: /14-niche-web-design/
description: "Seven complete demo sites, one per industry, each built around a different hard booking or commerce problem. Static HTML, CSS and vanilla JS, no build step."
---

Seven complete websites, one per industry, built to answer a question I get
asked a lot: *can you do the front of house too?*

Each one is a real site rather than a mockup: real navigation, a real booking
or commerce flow, and correct behaviour on a phone. They share a house
engineering standard and share almost nothing else, because the point was to
show range rather than a template with seven colour schemes.

**45 pages. No build step, no framework, no dependencies.** Every folder is
self-contained, so any single site can be zipped and handed to a client.

<div class="demos">

  <article class="demo">
    <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/hotel/</span></div>
    <div class="demo__body">
      <span class="demo__niche">Hotel · 7 pages</span>
      <h3><a href="{{ site.baseurl }}/demos/hotel/">The Lumen</a></h3>
      <p>A harbour hotel with the booking model the others don't have: availability over a <strong>range</strong>, not a moment.</p>
      <p class="demo__hard"><b>Hard part:</b> a room must be free on every night of the stay. Minimum stays, closed-to-arrival dates and per-night pricing all compound, and when it fails it names the night.</p>
    </div>
  </article>

  <article class="demo">
    <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/storage/</span></div>
    <div class="demo__body">
      <span class="demo__niche">Self storage · 7 pages</span>
      <h3><a href="{{ site.baseurl }}/demos/storage/">Gantry Self Storage</a></h3>
      <p>A facility site whose main event is a measuring tool: add your furniture, watch it packed into a unit drawn to scale.</p>
      <p class="demo__hard"><b>Hard part:</b> a real two-phase rectangle packer (MAXRECTS) plus the rule that boxes go on top of the furniture. Matches published operator size guides on all eight typical loads.</p>
    </div>
  </article>

  <article class="demo">
    <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/trades/</span></div>
    <div class="demo__body">
      <span class="demo__niche">Electrician · 6 pages</span>
      <h3><a href="{{ site.baseurl }}/demos/trades/">Hollis Electrical</a></h3>
      <p>The booking model inverted: a trade travels to <em>you</em>, so your address gates everything else.</p>
      <p class="demo__hard"><b>Hard part:</b> ZIP decides which days exist at all, slots are arrival windows rather than times, and job size eats windows, so a rewire needs two consecutive working days.</p>
    </div>
  </article>

  <article class="demo">
    <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/courses/</span></div>
    <div class="demo__body">
      <span class="demo__niche">Course marketplace · 9 pages</span>
      <h3><a href="{{ site.baseurl }}/demos/courses/">Coursefolk</a></h3>
      <p>Two-sided marketplace: instructors publish, learners buy. The largest of the seven.</p>
      <p class="demo__hard"><b>Hard part:</b> state that survives page changes (cart, enrolments, per-lesson progress and notes), plus a four-step course builder with a live preview of the card students will see.</p>
    </div>
  </article>

  <article class="demo">
    <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/clothing/</span></div>
    <div class="demo__body">
      <span class="demo__niche">Apparel · 6 pages</span>
      <h3><a href="{{ site.baseurl }}/demos/clothing/">Brindle</a></h3>
      <p>A clothing label storefront, built around the hero carousel and a product page that answers every question before someone emails.</p>
      <p class="demo__hard"><b>Hard part:</b> the ARIA carousel pattern done properly, and per-variant stock where changing colour can invalidate the size you'd picked.</p>
    </div>
  </article>

  <article class="demo">
    <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/salon/</span></div>
    <div class="demo__body">
      <span class="demo__niche">Hair studio · 5 pages</span>
      <h3><a href="{{ site.baseurl }}/demos/salon/">Juniper Lane</a></h3>
      <p>Same brief as the dentist, solved differently on purpose, and dark where the dentist is light.</p>
      <p class="demo__hard"><b>Hard part:</b> availability is the intersection of opening hours, the stylist's rota, <em>and</em> a clear run long enough for the service. A three-hour balayage offers far fewer slots than a cut.</p>
    </div>
  </article>

  <article class="demo">
    <div class="demo__bar"><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__dot"></span><span class="demo__url">/demos/dentist/</span></div>
    <div class="demo__body">
      <span class="demo__niche">Dental practice · 5 pages</span>
      <h3><a href="{{ site.baseurl }}/demos/dentist/">Sherry's Dentistry</a></h3>
      <p>A two-office family practice, built around one job: getting a nervous person to book.</p>
      <p class="demo__hard"><b>Hard part:</b> less the code than the tone: a five-step booker that never asks for clinical detail, with a fixed Call/Book bar under the thumb on mobile.</p>
    </div>
  </article>

</div>

## The shared standard

Different as they look, all seven are held to the same rules.

**No build step and no dependencies.** Plain HTML, CSS and vanilla JS. Nothing
to install, nothing to keep patched, and a client can host them anywhere. The
only external request is Google Fonts.

**Almost no image files.** Artwork is generated: hand-written SVG, CSS gradient
covers from a hue and a glyph, garment silhouettes tinted at runtime from one
HSL triple, SVG portraits from tone variables, technical drawings. The single
exception is the hotel, covered below.

**Deterministic pseudo-data.** Every "live" availability figure, stock count and
rate comes from a hash of its inputs, never `Math.random()`. A sold-out size or
a taken appointment stays taken while someone clicks around; data that
reshuffles on every render reads as broken.

**Accessibility as a build rule, not a pass at the end.** Skip links, focus
traps in drawers, `aria-live` step announcements, roving arrow-key focus on
tabs and date strips, `prefers-reduced-motion`, 48px touch targets, and a
`<noscript>` fallback on every booking flow.

**No card details, anywhere.** The two sites with a checkout hand off to a
stand-in for a hosted payment page, which is the architecture a real build
should use: the card form belongs to the payment provider and lives on their
origin, so card data never touches the merchant's site, servers or logs.

## The hotel's 3D pipeline

The Lumen is fictional, so there was nothing to photograph. Its six room types
were modelled and rendered instead, from a single dimensioned source file:

- **`spec.py`** holds the geometry: room dimensions, bathroom zones, and the
  position and rotation of every piece of furniture, in metres.
- **`build.py`** turns that into Blender geometry and renders two shots per
  room with Cycles: a hero from where an interior photographer would stand, and
  a cutaway from above with the ceiling removed.
- **`plans.py`** draws the floor plan from the *same* spec, which is why the bed
  is in the same place in the render and the plan. Inkscape then measures each
  plan with `--query-all` and normalises it with `--export-plain-svg`.
- **`validate.py`** runs first and rejects layouts where furniture overlaps,
  escapes the room, or sits inside the bathroom. It caught three collisions
  before a single frame rendered, which is cheap given one hero shot took 55
  minutes.

<div class="note">
  <span class="note__tag">Why it matters</span>
  <div>
    <p>Generating the plan and the model from one file is the whole trick. The usual failure on a hotel site is a floor plan drawn once in Illustrator that quietly stops matching the photographs after a refurbishment. Here they cannot disagree, because there is only one description of the room.</p>
  </div>
</div>

## What went wrong, and what it taught me

The useful part of a project like this is the bugs, so they're worth recording.

**A hash needs a finaliser.** Availability across all seven sites is seeded with
FNV-1a. On the hotel it broke: hashing two adjacent dates leaves the low bits
correlated, consecutive nights came out *anti*-correlated, and the single
one-of-a-kind suite never once had two free nights in a row across 180 days, so
the three-night package the site advertises could not be booked at all.
Adding an avalanche step fixed it.

**Modelling errors hide behind plausible output.** The storage packer's first
version gave up at about half the floor used and sent every load one or two
sizes too big. It looked fine until it was measured against published operator
size guides. The fix wasn't a better algorithm so much as a better model of how
people actually load a unit: they upend sofas, and they stack boxes on top of
the furniture.

**Relative SVG curves drift.** Three of four salon hair shapes were written as
chained relative cubics whose deltas didn't sum back to the start, so each
closed 18–48px from where it began. Outlines that must close are now written in
absolute coordinates. An Inkscape pass caught these; a browser had been happily
hiding some of them.

**Text inside an SVG scales with the drawing.** One font size reads well on a
5 × 5 storage unit and is illegible on a 10 × 30. Labels either live in HTML
beside the drawing, or compute their size from the viewBox.

<div class="note note--warn">
  <span class="note__tag">Fictional</span>
  <div>
    <p>Every business, person, price and review across the seven sites is invented, with <code>555</code> phone numbers and <code>.example</code> domains. They are design and engineering demonstrations, not real companies.</p>
  </div>
</div>
