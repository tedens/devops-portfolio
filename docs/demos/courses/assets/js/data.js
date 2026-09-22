/* Coursefolk: demo catalogue.

   Static seed data for the marketplace. In a real build this comes from an API;
   everything here is invented, including the instructors and the reviews. */

window.CF = window.CF || {};

/* Category glyphs, drawn inline on generated course covers. */
CF.GLYPHS = {
  code: '<path d="m8 6-6 6 6 6M16 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 9.8C22 6 17.5 3 12 3z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7.5" cy="11" r="1.3" fill="currentColor"/><circle cx="11" cy="7" r="1.3" fill="currentColor"/><circle cx="16" cy="8.5" r="1.3" fill="currentColor"/>',
  database: '<ellipse cx="12" cy="5.5" rx="8" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" fill="none" stroke="currentColor" stroke-width="2"/>',
  wave: '<path d="M2 12h2.5l2-6 3 14 3-11 2.5 5H22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  pen: '<path d="M12 19l7-7-4-4-7 7-1 5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15 8l3-3 4 4-3 3M3 21h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  leaf: '<path d="M4 20c0-9 6-15 16-16 0 11-5 16-13 16H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 20c2-6 6-9 10-10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  sigma: '<path d="M18 4H6l7 8-7 8h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  camera: '<path d="M3 8h3.5L8 5.5h8L17.5 8H21a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/>'
};

CF.COURSES = [
  {
    id: "type-systems",
    title: "Type Systems for Working Developers",
    subtitle: "Stop fighting the compiler and start using it. Generics, narrowing, variance and the escape hatches, with the reasoning behind each.",
    category: "Development",
    level: "Intermediate",
    glyph: "code",
    hue: 258,
    price: 6900,
    was: 12900,
    rating: 4.8,
    reviews: 2841,
    students: 18420,
    hours: 9.5,
    lessonCount: 62,
    updated: "August 2026",
    language: "English",
    badge: "Bestseller",
    instructor: "noor",
    outcomes: [
      "Read a gnarly generic signature and know what it actually promises",
      "Model real domains with unions and discriminated types instead of booleans",
      "Know when an escape hatch is the right call, and how to fence it off",
      "Diagnose the five error messages that account for most wasted hours"
    ],
    requirements: [
      "A year or so writing JavaScript, Python, or a similar language",
      "No prior type-theory background. We build it from the ground up"
    ],
    curriculum: [
      { title: "Why types, really", lessons: [
        { name: "What a type system is actually checking", dur: "8:12", preview: true },
        { name: "Soundness, completeness, and the trade nobody mentions", dur: "11:40" },
        { name: "Reading an error message properly", dur: "9:05", preview: true }
      ]},
      { title: "Narrowing and control flow", lessons: [
        { name: "How the checker follows your branches", dur: "13:22" },
        { name: "Discriminated unions in anger", dur: "16:48" },
        { name: "Exhaustiveness, and making the compiler nag you", dur: "10:31" },
        { name: "Exercise: modelling an order lifecycle", dur: "21:07" }
      ]},
      { title: "Generics without the headache", lessons: [
        { name: "Type parameters as functions on types", dur: "12:55" },
        { name: "Constraints: saying just enough", dur: "14:18" },
        { name: "Variance, finally explained with boxes", dur: "18:02" },
        { name: "When inference gives up, and what to do", dur: "11:44" }
      ]},
      { title: "Escape hatches and boundaries", lessons: [
        { name: "Casting: the honest uses", dur: "9:36" },
        { name: "Validating at the edge of your program", dur: "17:21" },
        { name: "Wrapping an untyped dependency", dur: "13:09" }
      ]}
    ]
  },
  {
    id: "colour-for-interfaces",
    title: "Colour for Interfaces",
    subtitle: "Build a palette that survives dark mode, colour blindness and a product manager who wants it 'more blue'. Perceptual colour, made practical.",
    category: "Design",
    level: "All levels",
    glyph: "palette",
    hue: 18,
    price: 5400,
    was: 8900,
    rating: 4.9,
    reviews: 1136,
    students: 7310,
    hours: 6,
    lessonCount: 38,
    updated: "July 2026",
    language: "English",
    badge: "Highest rated",
    instructor: "dez",
    outcomes: [
      "Build a ramp that stays legible at every step, in both themes",
      "Use a perceptual colour space instead of guessing with hex",
      "Pass contrast requirements without making everything grey",
      "Pick categorical colours that stay distinguishable for everyone"
    ],
    requirements: [
      "Any design tool you already use",
      "Curiosity about why your greys look muddy"
    ],
    curriculum: [
      { title: "The problem with hex", lessons: [
        { name: "Why #888 isn't half of #fff", dur: "7:44", preview: true },
        { name: "Lightness, chroma, hue. A working mental model", dur: "12:30" }
      ]},
      { title: "Building a ramp", lessons: [
        { name: "Anchors first, steps second", dur: "14:11" },
        { name: "Keeping hue honest across a ramp", dur: "10:58" },
        { name: "The neutral ramp everything else leans on", dur: "12:02" },
        { name: "Workshop: a 10-step brand ramp", dur: "24:16" }
      ]},
      { title: "Two themes, one system", lessons: [
        { name: "Dark mode is not an inversion", dur: "13:35", preview: true },
        { name: "Semantic tokens that hold in both themes", dur: "15:20" },
        { name: "Elevation without drop shadows", dur: "9:47" }
      ]},
      { title: "Colour that includes people", lessons: [
        { name: "What contrast ratios do and don't tell you", dur: "11:16" },
        { name: "Designing for the common colour vision deficiencies", dur: "16:43" },
        { name: "Never let colour be the only signal", dur: "8:29" }
      ]}
    ]
  },
  {
    id: "sql-you-actually-need",
    title: "The SQL You Actually Need",
    subtitle: "Window functions, CTEs, and the query plan. Six weeks of on-the-job SQL compressed into a weekend, using a messy real-world dataset.",
    category: "Data",
    level: "Beginner",
    glyph: "database",
    hue: 200,
    price: 4900,
    was: 0,
    rating: 4.7,
    reviews: 3902,
    students: 41280,
    hours: 7.5,
    lessonCount: 54,
    updated: "September 2026",
    language: "English",
    badge: "Bestseller",
    instructor: "tomas",
    outcomes: [
      "Write a window function without looking it up every time",
      "Break a horrifying query into readable CTEs",
      "Read a query plan well enough to find the slow bit",
      "Know which index would help, and which wouldn't"
    ],
    requirements: [
      "Access to any SQL database (we provide a Postgres sandbox)",
      "No prior SQL needed; we start at SELECT"
    ],
    curriculum: [
      { title: "Getting your bearings", lessons: [
        { name: "The shape of a query", dur: "9:20", preview: true },
        { name: "Joins, drawn out properly", dur: "15:46" },
        { name: "NULL, and why it ruins your day", dur: "11:03" }
      ]},
      { title: "Aggregation and grouping", lessons: [
        { name: "GROUP BY without the guesswork", dur: "13:18" },
        { name: "HAVING vs WHERE, settled", dur: "7:52" },
        { name: "Exercise: a revenue report from raw events", dur: "22:41" }
      ]},
      { title: "Window functions", lessons: [
        { name: "OVER, PARTITION BY, and frames", dur: "16:09", preview: true },
        { name: "Running totals and moving averages", dur: "14:27" },
        { name: "Ranking, deduping, and first-per-group", dur: "18:33" }
      ]},
      { title: "Making it fast", lessons: [
        { name: "Reading EXPLAIN without panic", dur: "17:55" },
        { name: "Indexes: what they cost you", dur: "15:12" },
        { name: "Five rewrites that usually work", dur: "19:40" }
      ]}
    ]
  },
  {
    id: "field-recording",
    title: "Field Recording from Scratch",
    subtitle: "Capture rooms, weather and cities with gear you can afford. Mic technique, wind, levels, and cleaning it all up afterwards.",
    category: "Music & Audio",
    level: "Beginner",
    glyph: "wave",
    hue: 150,
    price: 3900,
    was: 6500,
    rating: 4.8,
    reviews: 642,
    students: 4180,
    hours: 5,
    lessonCount: 31,
    updated: "May 2026",
    language: "English",
    badge: "",
    instructor: "ines",
    outcomes: [
      "Record clean outdoor audio in wind that would ruin most takes",
      "Set levels once and stop riding the gain",
      "Build a personal library that's actually searchable",
      "Clean up hiss and handling noise without gutting the recording"
    ],
    requirements: [
      "Any stereo recorder, including a phone with an external mic",
      "Headphones you can wear outdoors"
    ],
    curriculum: [
      { title: "Before you press record", lessons: [
        { name: "Listening as a skill, not a sense", dur: "8:55", preview: true },
        { name: "Gear that punches above its price", dur: "12:14" },
        { name: "Levels, headroom, and the 12dB rule", dur: "10:32" }
      ]},
      { title: "Out in the world", lessons: [
        { name: "Wind: blimps, dead cats, and body-blocking", dur: "14:08" },
        { name: "Recording rooms and reverb tails", dur: "11:47" },
        { name: "Cities without the traffic rumble", dur: "13:22" }
      ]},
      { title: "After the take", lessons: [
        { name: "Naming and tagging so you find it in a year", dur: "9:18" },
        { name: "Gentle noise reduction", dur: "15:36" },
        { name: "Building a loopable ambience bed", dur: "17:02" }
      ]}
    ]
  },
  {
    id: "essay-craft",
    title: "Essay Craft: Structure Before Style",
    subtitle: "Most weak essays are structurally weak, not badly written. Learn to build the frame first, then the sentences look after themselves.",
    category: "Writing",
    level: "All levels",
    glyph: "pen",
    hue: 330,
    price: 4500,
    was: 7200,
    rating: 4.9,
    reviews: 918,
    students: 6640,
    hours: 4.5,
    lessonCount: 27,
    updated: "June 2026",
    language: "English",
    badge: "Highest rated",
    instructor: "marguerite",
    outcomes: [
      "Find the actual argument buried in your first draft",
      "Build a spine that a reader can follow without effort",
      "Cut 30% without losing anything you cared about",
      "Open and close without clichés"
    ],
    requirements: [
      "Something you've written and aren't happy with",
      "A willingness to delete"
    ],
    curriculum: [
      { title: "What an essay is doing", lessons: [
        { name: "The claim under the topic", dur: "10:40", preview: true },
        { name: "Why your draft keeps wandering", dur: "12:11" }
      ]},
      { title: "The frame", lessons: [
        { name: "Spines: four that carry almost anything", dur: "16:24" },
        { name: "Outlining backwards from the last line", dur: "13:50" },
        { name: "Workshop: reframing a wandering draft", dur: "21:35" }
      ]},
      { title: "Sentences, last", lessons: [
        { name: "Rhythm, and reading aloud", dur: "11:09" },
        { name: "Cutting for muscle, not length", dur: "14:47" },
        { name: "Endings that don't restate the intro", dur: "9:58" }
      ]}
    ]
  },
  {
    id: "pricing-small-software",
    title: "Pricing for Small Software Businesses",
    subtitle: "How to set, test and raise a price when you have a hundred customers rather than a hundred thousand, and no research budget.",
    category: "Business",
    level: "Intermediate",
    glyph: "chart",
    hue: 42,
    price: 8900,
    was: 14900,
    rating: 4.6,
    reviews: 487,
    students: 3120,
    hours: 6.5,
    lessonCount: 34,
    updated: "August 2026",
    language: "English",
    badge: "",
    instructor: "hal",
    outcomes: [
      "Pick a value metric that grows with what customers get",
      "Run a price test that's honest about small sample sizes",
      "Raise prices on existing customers without a revolt",
      "Build a tier ladder that doesn't cannibalise itself"
    ],
    requirements: [
      "A product with at least a few paying customers",
      "A spreadsheet"
    ],
    curriculum: [
      { title: "Foundations", lessons: [
        { name: "Cost-plus is a trap", dur: "11:22", preview: true },
        { name: "Finding your value metric", dur: "15:40" },
        { name: "Willingness to pay, with tiny samples", dur: "17:18" }
      ]},
      { title: "Packaging", lessons: [
        { name: "Three tiers and why", dur: "13:55" },
        { name: "Fencing features without being petty", dur: "12:31" },
        { name: "The enterprise line that isn't a lie", dur: "10:44" }
      ]},
      { title: "Changing the price", lessons: [
        { name: "Grandfathering: the maths and the manners", dur: "16:12" },
        { name: "Announcing a rise", dur: "12:08" },
        { name: "What to do when churn spikes", dur: "14:36" }
      ]}
    ]
  },
  {
    id: "botanical-watercolour",
    title: "Botanical Illustration in Watercolour",
    subtitle: "Observational drawing and layered washes, working from real plants. Twelve finished studies by the end, from seed head to full stem.",
    category: "Art & Illustration",
    level: "Beginner",
    glyph: "leaf",
    hue: 100,
    price: 0,
    was: 0,
    rating: 4.9,
    reviews: 1520,
    students: 22760,
    hours: 8,
    lessonCount: 44,
    updated: "April 2026",
    language: "English",
    badge: "Free",
    instructor: "yuki",
    outcomes: [
      "Draw what's in front of you instead of what you assume is there",
      "Build depth with layered washes rather than darker paint",
      "Mix greens that don't all look the same",
      "Finish a study instead of abandoning it at 80%"
    ],
    requirements: [
      "A small pan set, one round brush, and any 200gsm paper",
      "A plant. Weeds are ideal."
    ],
    curriculum: [
      { title: "Seeing first", lessons: [
        { name: "Measuring by eye", dur: "12:50", preview: true },
        { name: "Negative space as a cheat code", dur: "14:22" },
        { name: "Contour studies: ten minutes a day", dur: "9:41" }
      ]},
      { title: "Water and pigment", lessons: [
        { name: "Controlling the wash", dur: "16:33" },
        { name: "Layering for depth", dur: "18:07" },
        { name: "Greens: mixing a family, not a colour", dur: "15:28", preview: true }
      ]},
      { title: "Twelve studies", lessons: [
        { name: "Seed head", dur: "22:14" },
        { name: "Single leaf, two lighting conditions", dur: "26:40" },
        { name: "Full stem with foreshortening", dur: "31:05" }
      ]}
    ]
  },
  {
    id: "statistics-without-fear",
    title: "Statistics Without the Fear",
    subtitle: "Confidence intervals, p-values and regression explained the way they should have been the first time, with simulations instead of proofs.",
    category: "Data",
    level: "Beginner",
    glyph: "sigma",
    hue: 275,
    price: 5900,
    was: 9900,
    rating: 4.7,
    reviews: 2104,
    students: 15840,
    hours: 10,
    lessonCount: 58,
    updated: "September 2026",
    language: "English",
    badge: "Updated",
    instructor: "tomas",
    outcomes: [
      "Explain what a p-value means without saying anything false",
      "Know when a confidence interval is telling you nothing",
      "Fit and critique a regression you'd defend in a meeting",
      "Spot the four ways a chart quietly lies"
    ],
    requirements: [
      "High-school algebra",
      "No calculus, no proofs, no prior stats"
    ],
    curriculum: [
      { title: "Uncertainty as a first idea", lessons: [
        { name: "Sampling, simulated", dur: "13:44", preview: true },
        { name: "What varies and what doesn't", dur: "11:52" },
        { name: "The standard error, from scratch", dur: "16:20" }
      ]},
      { title: "Inference", lessons: [
        { name: "Confidence intervals you can explain", dur: "18:11" },
        { name: "p-values: what they are, precisely", dur: "19:03" },
        { name: "Power, and why small studies mislead", dur: "15:37" }
      ]},
      { title: "Relationships", lessons: [
        { name: "Correlation, and its four disguises", dur: "14:09" },
        { name: "Linear regression as a line of best guesses", dur: "21:26" },
        { name: "Confounding, in pictures", dur: "17:48" }
      ]}
    ]
  },
  {
    id: "darkroom-basics",
    title: "Darkroom Basics: Black & White",
    subtitle: "Develop your own film and make prints you're proud of, in a bathroom, on a budget. Chemistry demystified, contrast controlled.",
    category: "Photography",
    level: "Beginner",
    glyph: "camera",
    hue: 220,
    price: 4200,
    was: 6900,
    rating: 4.8,
    reviews: 736,
    students: 5290,
    hours: 5.5,
    lessonCount: 29,
    updated: "March 2026",
    language: "English",
    badge: "",
    instructor: "dez",
    outcomes: [
      "Develop a roll of 35mm without ruining it",
      "Set up a temporary darkroom in a bathroom in 20 minutes",
      "Use contrast filters to rescue a flat negative",
      "Dodge and burn a print with your hands"
    ],
    requirements: [
      "A film camera and one roll of black-and-white film",
      "A room you can make properly dark"
    ],
    curriculum: [
      { title: "Developing film", lessons: [
        { name: "The kit list, honestly costed", dur: "10:15", preview: true },
        { name: "Loading a reel blind", dur: "13:40" },
        { name: "Times, temperature, agitation", dur: "16:55" }
      ]},
      { title: "Making prints", lessons: [
        { name: "Bathroom darkroom in twenty minutes", dur: "12:28" },
        { name: "Test strips and the first good print", dur: "18:14" },
        { name: "Contrast filters as a rescue tool", dur: "15:33" }
      ]},
      { title: "Finishing", lessons: [
        { name: "Dodging and burning by hand", dur: "19:47" },
        { name: "Washing, drying, flattening", dur: "11:06" }
      ]}
    ]
  }
];

CF.INSTRUCTORS = {
  noor: {
    name: "Noor Haddad", initials: "NH", hue: 258,
    title: "Compiler engineer, 12 years",
    bio: "Noor spends her days on a type checker used by a few million developers and her evenings explaining it to people who'd rather it just worked. She teaches from the error messages up, because that's where everyone actually meets a type system.",
    courses: 3, students: 24100, rating: 4.8
  },
  dez: {
    name: "Dez Okonkwo", initials: "DO", hue: 18,
    title: "Design systems lead",
    bio: "Dez has rebuilt the colour system at three companies and lost the same argument about grey each time. He writes and teaches about perceptual colour, accessibility, and the unglamorous parts of design systems.",
    courses: 4, students: 13600, rating: 4.85
  },
  tomas: {
    name: "Tomás Rivera", initials: "TR", hue: 200,
    title: "Data engineer & lecturer",
    bio: "Tomás teaches statistics and SQL to people who were told at school they weren't maths people. He is unconvinced that such people exist. Previously a data engineer at a logistics firm with very large, very ugly tables.",
    courses: 5, students: 57100, rating: 4.7
  },
  ines: {
    name: "Inés Calvo", initials: "IC", hue: 150,
    title: "Sound designer for film",
    bio: "Inés records for documentary and games, mostly outdoors, mostly in bad weather. Her library of Atlantic coastal storms is used in more films than she can keep track of.",
    courses: 2, students: 6300, rating: 4.8
  },
  marguerite: {
    name: "Marguerite Bell", initials: "MB", hue: 330,
    title: "Essayist & editor",
    bio: "Marguerite edited a literary quarterly for nine years, which is nine years of reading first drafts that had a good essay hiding somewhere inside them. She teaches structure because that's what was nearly always missing.",
    courses: 2, students: 8900, rating: 4.9
  },
  hal: {
    name: "Hal Brennan", initials: "HB", hue: 42,
    title: "Founder, two bootstrapped products",
    bio: "Hal has raised prices badly once and well three times, and is more useful about the first than the others. He now advises small software businesses on packaging and pricing.",
    courses: 1, students: 3120, rating: 4.6
  },
  yuki: {
    name: "Yuki Tanaka", initials: "YT", hue: 100,
    title: "Botanical illustrator",
    bio: "Yuki illustrates for herbaria and field guides, and has drawn the same species of thistle roughly four hundred times. She teaches observation first and paint second, which surprises people.",
    courses: 3, students: 31400, rating: 4.9
  }
};

CF.REVIEWS = {
  "type-systems": [
    { name: "Priya S.", initials: "PS", hue: 300, stars: 5, when: "2 weeks ago", text: "The variance lesson with the boxes is the first explanation that ever stuck. I've read four blog posts on it and understood none of them. Twenty minutes here and it's just obvious now." },
    { name: "Ben O.", initials: "BO", hue: 210, stars: 5, when: "1 month ago", text: "Worth it for the 'reading an error message' lesson alone, which I'd have called filler before watching it. It isn't. Our team's PR review time dropped noticeably." },
    { name: "Aria K.", initials: "AK", hue: 160, stars: 4, when: "2 months ago", text: "Excellent, though section four assumes you've got a build pipeline you can experiment in. I'd watch it twice: once for the ideas, once with your own code open." }
  ],
  "colour-for-interfaces": [
    { name: "Marcus L.", initials: "ML", hue: 40, stars: 5, when: "3 weeks ago", text: "I came for dark mode and stayed for the neutral ramp lesson. Our greys had been quietly wrong for two years and I couldn't articulate why. Now I can." },
    { name: "Sofia N.", initials: "SN", hue: 280, stars: 5, when: "1 month ago", text: "Dez keeps saying 'never let colour be the only signal' and it's now stuck in my head permanently, which is presumably the point." }
  ],
  "sql-you-actually-need": [
    { name: "Dana W.", initials: "DW", hue: 190, stars: 5, when: "6 days ago", text: "I've been writing SQL for three years by copying things. This filled in every gap at once. The EXPLAIN section is the part I'll rewatch." },
    { name: "Ravi P.", initials: "RP", hue: 120, stars: 4, when: "3 weeks ago", text: "Very good. The sandbox dataset is genuinely messy, which is the right call. Clean teaching data teaches you nothing about real work." }
  ]
};

/* Rating distribution, as percentages: 5,4,3,2,1 */
CF.RATING_SPREAD = { 5: 74, 4: 19, 3: 5, 2: 1, 1: 1 };

/* --- Helpers -------------------------------------------------------------- */

CF.money = function (cents) {
  if (!cents) return "Free";
  return "$" + (cents / 100).toFixed(2).replace(/\.00$/, "");
};

CF.byId = function (id) {
  return CF.COURSES.filter(function (c) { return c.id === id; })[0] || null;
};

CF.instructorOf = function (course) {
  return CF.INSTRUCTORS[course.instructor] || { name: "Unknown", initials: "??", hue: 258 };
};

CF.categories = function () {
  var seen = {};
  CF.COURSES.forEach(function (c) { seen[c.category] = (seen[c.category] || 0) + 1; });
  return Object.keys(seen).sort().map(function (k) { return { name: k, count: seen[k] }; });
};

CF.stars = function (n) {
  var full = Math.floor(n + 0.25);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
};

CF.totalLessons = function (course) {
  return course.curriculum.reduce(function (n, s) { return n + s.lessons.length; }, 0);
};

CF.flatLessons = function (course) {
  var out = [];
  course.curriculum.forEach(function (section, si) {
    section.lessons.forEach(function (lesson, li) {
      out.push({ section: section.title, sectionIndex: si, index: li, key: si + "-" + li, name: lesson.name, dur: lesson.dur, preview: !!lesson.preview });
    });
  });
  return out;
};

/* Generated cover markup, no image files anywhere in this site. */
CF.coverHTML = function (course, extraClass) {
  var glyph = CF.GLYPHS[course.glyph] || CF.GLYPHS.code;
  var badge = course.badge ? '<span class="cover__tag">' + course.badge + "</span>" : "";
  return '<div class="cover ' + (extraClass || "") + '" style="--h:' + course.hue + '" aria-hidden="true">' +
    badge + '<svg viewBox="0 0 24 24">' + glyph + "</svg></div>";
};
