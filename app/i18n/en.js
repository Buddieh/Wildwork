// English text for the site. fa.js mirrors every key.

export default {
  dir: "ltr",
  num: n => String(n),
  big: n => n.toLocaleString("en-US"),
  pct: p => { const n = Math.max(1, Math.min(99, Math.round(p))); const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); },
  percentile: "percentile",
  langSwitch: { href: "fa/", label: "فارسی" },
  nav: { method: "How it works", animals: "The animals" },
  footer: {
    ipip: 'Personality items: <a href="https://ipip.ori.org/">International Personality Item Pool</a> (public domain), IPIP-NEO-120 by John A. Johnson. Scores compare you with a large, mostly US online sample.',
    onet: 'This site incorporates information from the O*NET Interest Profiler and from O*NET OnLine and the O*NET Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> license. O*NET® is a trademark of USDOL/ETA. Job data and growth outlook describe the US labor market.',
    privacy: 'Your answers stay on your device. Nothing is sent anywhere. <a href="https://github.com/Buddieh/Wildwork">Source on GitHub</a>',
  },
  loadError: "Couldn't load the questionnaire. Please refresh the page.",
  home: {
    eyebrow: "A personality and career quiz",
    title: "Find your animal, then find your work.",
    lede: "Answer two well-tested questionnaires. Your personality draws your animal in the stars, and your interests plus your personality pick out real jobs that fit.",
    start: "Find my animal",
    continueP: (n, total) => `Continue (${n} of ${total})`,
    continueI: "Continue to the career quiz",
    results: "See my results",
    myAnimal: "My animal",
    reset: "Start over",
    resetConfirm: "Clear all your answers and start over?",
    skyTitle: "The sky of sixteen",
    skyLede: "Each constellation is a personality pattern. Tap one to meet it.",
    part1: "Part 1 · about 15 minutes", part1Title: "Your animal",
    part1Text: "116 statements from the IPIP-NEO-120, a free scientific Big Five test. You get your scores on five traits and 29 facets, and the animal whose pattern is closest to yours.",
    part2: "Part 2 · about 6 minutes", part2Title: "Your work",
    part2Text: "60 activities from the US Department of Labor's O*NET Interest Profiler. Your interests (70%) and personality (30%) are matched against 900+ real occupations.",
    saveNote: "Your progress saves in this browser automatically.",
  },
  start: {
    title: "Before you start",
    why: "Personality scores are compared with people of your age and sex, because averages differ between groups. Both questions are optional; without them you're compared with adults aged 21 to 40 of both sexes.",
    age: "Age", optional: "Optional", sex: "Sex", female: "Female", male: "Male", skip: "Prefer not to say",
    howTitle: "How to answer",
    honest: "Go with your first reaction. There are no right answers, and answering honestly is what makes the result accurate.",
    go: "Start the questions",
  },
  quiz: {
    part1: "Part 1 · Personality", part2: "Part 2 · Work interests",
    of: (i, n) => `${i} of ${n}`,
    promptP: "How accurately does this describe you?",
    promptI: "How would you feel about doing this as work?",
    back: "Back", next: "Next",
    hint: "Keyboard: press 1 to 5 to answer, ← to go back.",
    reviewing: "Reviewing your answers", doneReviewing: "Done reviewing",
  },
  quality: {
    title: "Quick check before your animal",
    body: run => `Some of your answers didn't agree with each other as much as usual${run ? `, and ${run} answers in a row were the same` : ""}. That often happens when people go fast or skim, and it makes the result less trustworthy.`,
    options: "You can change any answer, start the personality part again, or carry on with these answers.",
    review: "Review my answers", retake: "Start part 1 again", anyway: "Show my animal anyway",
    retakeConfirm: "Clear your personality answers and start part 1 again?",
    flagged: "Some answers looked inconsistent, so treat this result with extra caution.",
  },
  career: {
    eyebrow: "Part 2 · Work interests",
    title: "Now, what kind of work would you enjoy?",
    dated: "60 short activities, about 6 minutes. Some sound old-fashioned (they are the official O*NET items, kept word for word because they are the best-tested ones); just ask yourself whether you'd like that kind of task.",
    go: "Start part 2",
    zoneEyebrow: "Last question",
    zoneNote: "This doesn't change your scores. It hides jobs that need more preparation than you want, and you can change it on the results page.",
    redoConfirm: "Clear your work-interest answers and redo part 2?",
  },
  animal: {
    yours: "Your animal", theirs: "Their animal",
    the: name => `The ${name}`,
    why: (name, parts) => `Why the ${name}: ${parts.join("; ")}.`,
    whyPart: (domain, high, pct) => `${domain} ${high ? "high" : "low"} (yours: ${pct} percentile)`,
    whyRaccoon: "Why the Raccoon: none of your five traits is far from average, so the balanced animal fits you best.",
    share: (pct, name) => `${pct}% ${name}`,
    strengths: "Strengths", watch: "Watch out for",
    traitsTitle: shared => shared ? "Their five traits" : "Your five traits",
    traitsLede: group => `The five bright stars in the constellation are these traits; tap one, and the higher the score, the bigger the star. Percentiles compare with ${group} in a large, mostly US online sample.`,
    group: (sex, age) => `${sex === "male" ? "men" : sex === "female" ? "women" : "adults"} aged ${age.replace("<21", "under 21").replace(">60", "over 60")}`,
    facets: n => `${n} facets`,
    band: "The shaded band shows the likely range given how precise each scale is. Wider bands mean less certainty.",
    starHint: "Tap a bright star to see which trait it is.",
    starInfo: (name, plain, pct) => `<b>${name}</b> · ${plain}<br>${pct} percentile`,
    next: "Next: find your work", jobs: "See my job matches", theirJobs: "See their job matches",
    shareBtn: "Share my animal", meetAll: "Meet all 16 animals",
    sharedBanner: "You're looking at someone's shared result.", ownCta: "Find your own animal",
    typesTitle: "In other systems",
    mbtiLabel: "MBTI-style type (estimated)",
    mbtiNote: "The site measures the Big Five, not Myers-Briggs. These letters are estimated from your scores using the well-known links between the two (E from Extraversion, N from Openness, F from Agreeableness, J from Conscientiousness, and -T or -A from Neuroticism). Faded letters are close to the middle and could go either way.",
    sloanLabel: "Big Five code (SLOAN)",
    sloanNote: "The Big Five's own five-letter shorthand, taken straight from your scores. Lowercase letters are close to average.",
    sloanWords: { S: "Social", R: "Reserved", L: "Limbic (emotionally reactive)", C: "Calm", O: "Organized", U: "Unstructured", A: "Accommodating", E: "Egocentric (self-directed)", I: "Inquisitive", N: "Non-curious (practical)" },
  },
  results: {
    eyebrow: shared => shared ? "Their work interests" : "Your work interests",
    code: "Interest code",
    scale: "Holland (RIASEC) scores from 10 to 50.",
    flat: "Your six interest scores are close together, so no type clearly leads. Matches below rely more on small differences than usual; treat them as a starting list to explore.",
    tie: '"=" marks scores within 3 points of each other, which is too close to call; their order could swap if you took the test again.',
    jobsTitle: shared => shared ? "Jobs that fit them" : "Jobs that fit you",
    jobsLede: (wi, wp) => `Ranked by how well each occupation's interest profile matches (${wi}%) and how well the personality fits the work styles it needs (${wp}%). Treat the top 20 or so as a shortlist to explore, not a strict order.`,
    prep: "Preparation needed", search: "Search jobs", growing: "Growing fast in the US", trending: "Trending roles",
    none: "No jobs match these filters.", more: n => `Show more (${n} left)`,
    loading: "Matching against 900+ occupations…",
    myAnimal: shared => shared ? "Their animal" : "My animal",
    share: "Share my results", redo: "Redo part 2",
    aka: "Also called:", growBadge: "Growing", growTitle: "O*NET Bright Outlook: projected to grow quickly or have many openings in the US",
    trendBadge: "Trending titles", trendBadgeSame: "Trending role", trendTitle: "Job titles named as fast-growing in recent job-market reports (LinkedIn Jobs on the Rise, WEF Future of Jobs and others) that belong to this occupation",
    shrinkBadge: "Declining worldwide", shrinkTitle: "The World Economic Forum's Future of Jobs Report 2025 names this among the fastest-declining roles worldwide for 2025–30",
    outlookUS: period => `US outlook${period ? ` ${period}` : ""}:`,
    outlookTitle: "US Bureau of Labor Statistics projections: change in the number of jobs over ten years, average openings a year (new jobs plus people leaving), and median yearly pay. US figures; your country may differ.",
    growth: s => `${s}% jobs`,
    openings: n => `${n} openings a year`,
    wage: (n, atLeast) => `${atLeast ? "$" + n + "+" : "$" + n} median pay`,
    outlookGroup: "Figures for the wider group:", outlookShared: "Figures shared with related occupations.",
    aiLabel: "AI:",
    aiPotential: p => `could speed up ${p}% of its tasks`,
    aiObserved: p => p === "0" ? "no notable use seen yet" : `already in use for ${p}% of them`,
    aiTitle: "Could speed up: share of tasks a GPT-4-class AI could do at least twice as fast (Eloundou et al., Science 2024, rated in 2023). In use: share of those tasks with real work-related AI use in late 2025 (Anthropic, 2026). Exposure is not the same as job loss. See How it works.",
    todayTitle: "These activities today",
    todayLede: shared => `The career-quiz activities ${shared ? "they" : "you"} liked most, and jobs where that's core work now. The number is the job's place in ${shared ? "their" : "your"} list; tap one to find it.`,
    todayFind: "Show this job in the list below",
    interests: "Interests", personality: "Personality", relTitle: "Compared with your fit for other occupations",
    why: "Why it fits",
    jobMostly: (types, shared) => `This job is mostly ${types}${shared ? `; it shares ${shared} with your top three` : "; none of these is in your top three, but the overall shape of the profiles is similar"}.`,
    and: " and ", list: ", ",
    stylesHead: "Work styles that matter most here, and where you stand:",
    styleLevel: (s, lvl) => `${s}: you're ${lvl}`,
    levels: { high: "high", average: "average", low: "low" },
    noStyles: "O*NET hasn't rated the work styles for this occupation yet, so only interests were used.",
    onet: "Full details on O*NET OnLine",
    fit: { Excellent: "Excellent", Strong: "Strong", Moderate: "Moderate", Weak: "Weak", "Not rated": "Not rated" },
    interestsBold: "Interests.",
  },
  zones: {
    long: { 1: "Little or no preparation", 2: "Some preparation", 3: "Medium preparation", 4: "Considerable preparation", 5: "Extensive preparation" },
    short: { 1: "No prep", 2: "Some prep", 3: "Medium prep", 4: "Degree", 5: "Advanced degree" },
  },
  gallery: {
    title: "The 16 animals",
    lede: "Each animal stands for a pattern of Big Five scores. You get the one whose pattern is closest to yours, and the result shows how much of each nearby animal you are.",
    back: "Back to my animal", find: "Find my animal",
    pattern: "Pattern",
    patternPart: (domain, high) => `${high ? "High" : "Low"} ${domain}`,
    balanced: "Close to average on all five traits",
    all: "All animals",
  },

  save: {
    titleSave: "Keep your star map",
    titleOpen: "Been here before?",
    leadSave: "Your answers stay only in this browser. To continue on another device or come back later, save your star map: a picture of your constellation with your answers hidden inside it. Open it here any time to pick up where you left off.",
    leadOpen: "Open your star map, or paste your star code, to pick up where you left off.",
    download: "Save my star map", copy: "Copy star code", open: "Open my star map", paste: "Paste a star code", go: "Continue",
    codeLabel: "Your star code",
    privacy: "Nothing is uploaded or stored online. Messaging apps can strip the hidden answers from pictures, so keep the star map as a file, or keep the star code in your notes.",
    making: "Drawing your star map…", saved: "Saved. Keep this file to continue later.", copied: "Star code copied. Paste it into your notes.",
    bad: "That doesn't look like a Wildwork star map or star code. If the picture went through a messaging app, its hidden answers may have been removed.",
    mapFailed: "Couldn't draw the star map in this browser. Use the star code instead.",
    cardEyebrow: "MY WILDWORK STAR MAP",
    progressTitle: "A journey in progress",
    progress: (n, total) => `${n} of ${total} questions answered`,
    cardFooter: "buddieh.github.io/Wildwork · open this map there to continue",
  },
  privacyHome: "No accounts and no servers: your answers never leave your device unless you save them yourself.",
  method: `
    <h1>How Wildwork works</h1>
    <p class="muted">Short version: two published, well-tested questionnaires, scored the way their authors score them, and matched to real US Department of Labor occupation data. No AI guesswork, and no data leaves your device.</p>
    <h2>Part 1: personality</h2>
    <ul>
      <li>The <b>IPIP-NEO-120</b> (Johnson, 2014), a public-domain measure of the Big Five traits and their facets. Items are used word for word. The four items of the Liberalism facet were removed because they ask about US politics, so Openness is scored from its other five facets.</li>
      <li>Scores are compared with published norms for your age band and sex (or averaged norms if you skip those questions). The norm sample is a large group of mostly US volunteers online.</li>
      <li>Every score shows a likely range based on the scale's reliability. A quick consistency check flags answer patterns that look rushed.</li>
    </ul>
    <h2>Your animal</h2>
    <ul>
      <li>Each of the 16 animals is a prototype pattern of the five traits (for example, the Fox is high in Openness and low in Agreeableness). You get the animal whose pattern is closest to your scores, and the blend bar shows how close the runners-up are.</li>
      <li>The animal is a friendly summary. The trait and facet scores underneath are the accurate part.</li>
      <li>The five bright stars in your constellation are your five traits, sized by your scores. Tap one to see which is which.</li>
      <li>The MBTI-style letters are estimated from your Big Five scores; the site doesn't measure Myers-Briggs types directly. The SLOAN code is the Big Five's own shorthand.</li>
    </ul>
    <h2>Part 2: work interests</h2>
    <ul>
      <li>The <b>O*NET Interest Profiler Short Form</b>, 60 items, from the US Department of Labor. It measures the six Holland (RIASEC) interest types. Items are used word for word.</li>
      <li>Scores within 3 points are shown as ties, and a flat profile is flagged rather than forced into a top type.</li>
    </ul>
    <h2>Job matching</h2>
    <ul>
      <li><b>Interest fit (70%)</b>: the correlation between your six interest scores and each occupation's O*NET interest ratings, using the whole profile rather than just the top letter.</li>
      <li><b>Personality fit (30%)</b>: your facet scores are translated into O*NET's 21 work styles and compared with how much each style helps performance in the occupation. Less reliable facets count for less. The label shows how this job ranks for you among all occupations, because most work styles help in most jobs. The facet-to-style translation is our own content-based mapping and hasn't been tested empirically.</li>
      <li>Both parts are put on the same scale across all occupations before weighting. Interests carry more weight because they predict job choice and satisfaction more strongly than personality.</li>
      <li>The preparation filter uses O*NET Job Zones. The "Growing" badge is O*NET's Bright Outlook flag for the US and is never part of the score.</li>
      <li>The job list comes from the latest O*NET database (refreshed monthly), including the modern titles employers use in postings.</li>
    </ul>
    <h2>Today's job market</h2>
    <p class="muted">Shown on every job card as information. None of it changes your match ranking: your fit comes from you, and market forecasts are uncertain.</p>
    <ul>
      <li><b>US outlook</b>: the Bureau of Labor Statistics 2025–35 projections as published on O*NET OnLine: how much the number of jobs is expected to change over ten years, average openings a year (new jobs plus people retiring or switching), and median yearly pay. When several occupations share one set of figures, the card says which wider group they describe. Ten-year projections are educated guesses and often miss, especially for jobs that AI is changing.</li>
      <li><b>AI</b>: two research measures. "Could speed up" is the share of the job's tasks that a GPT-4-class AI, alone or with software built on it, could do at least twice as fast, as rated by people in <a href="https://www.science.org/doi/10.1126/science.adj0998">Eloundou and colleagues (2024, <i>Science</i>)</a>. It describes what was technically possible in 2023 and may now be higher. "In use for" is the share of those tasks where real work-related AI use was seen in late 2025, counting automation fully and assistance by half, from <a href="https://www.anthropic.com/research/labor-market-impacts">Anthropic's labor-market study (March 2026)</a>, based on conversations with its AI, Claude. Wildwork was built with help from Claude, so keep in mind that this source comes from Anthropic. Exposure isn't the same as job loss: in many jobs AI takes over some tasks and the people doing them shift to others. That study found no clear rise in unemployment in highly exposed jobs so far, but tentative signs of fewer young people getting hired into them.</li>
      <li><b>Trending titles</b>: job titles that recent job-market reports name as fast-growing (LinkedIn Jobs on the Rise, the World Economic Forum's Future of Jobs Report 2025 and others), each matched to the O*NET occupation that does that work. A "Declining worldwide" badge means the World Economic Forum's report names it among the fastest-declining roles globally; declines in the US already show in the outlook figures.</li>
      <li><b>These activities today</b>: after the test, the career-quiz activities you liked most are linked to jobs where that's core work now. The questions themselves stay word for word, because changing or annotating them would change what they measure.</li>
    </ul>
    <h2>Your privacy</h2>
    <ul>
      <li>Everything runs in your browser. Answers are kept in this browser's storage so you can resume, and nowhere else.</li>
      <li>Your star map and star code carry your answers so you can continue elsewhere. Share links carry them too, so only share with people you'd show your results to.</li>
    </ul>
    <h2>Limits worth knowing</h2>
    <ul>
      <li>Self-report tests describe how you see yourself. Answer as you are, not as you'd like to be.</li>
      <li>Norms, job zones and growth data are US-based.</li>
      <li>A good match means "worth exploring", not "you'll love it". Talk to people who do the job.</li>
    </ul>
    <p class="muted small">Full research notes: <a href="https://github.com/Buddieh/Wildwork/blob/main/questionnaire/ANALYSIS.md">ANALYSIS.md</a>.</p>`,
  shareText: name => `I'm a ${name} on Wildwork. Find your animal and your work:`,
  copied: "Link copied", copyPrompt: "Copy this link:",
  brokenLink: 'This share link looks broken. <a href="#/">Take the quiz</a>',

  animals: {
    "lion": {
      "name": "Lion",
      "tagline": "Bold, direct and hard to rattle",
      "about": "You step forward when a group needs someone to decide, and you say what you think without much cushioning. Pressure that unsettles other people tends to sharpen you. You care more about getting a result than about everyone liking how you got it.",
      "strengths": [
        "Takes charge when things are unclear",
        "Stays calm under pressure",
        "Negotiates and argues a case well"
      ],
      "watch": [
        "Can steamroll quieter people",
        "May come across as harsh when you mean to be efficient"
      ]
    },
    "dolphin": {
      "name": "Dolphin",
      "tagline": "Warm, playful and curious about everyone",
      "about": "You connect easily and bring energy into a room, and you are genuinely interested in people and ideas. You like variety, conversation and trying things together. Others tend to feel included around you.",
      "strengths": [
        "Builds trust and rapport quickly",
        "Brings ideas and people together",
        "Keeps groups lively and open"
      ],
      "watch": [
        "Can spread yourself across too many people and plans",
        "May avoid conflict that needs to happen"
      ]
    },
    "wolf": {
      "name": "Wolf",
      "tagline": "Energetic, organized and made for the pack",
      "about": "You combine drive with discipline: you like to set a direction, rally people and follow through. You are at your best with a clear goal and a team to move toward it. Plans that drift without an owner frustrate you.",
      "strengths": [
        "Organizes people around a goal",
        "Follows through on commitments",
        "High energy that stays focused"
      ],
      "watch": [
        "Can push a pace others can't keep",
        "May find unstructured situations draining"
      ]
    },
    "otter": {
      "name": "Otter",
      "tagline": "Fun-loving, spontaneous and easygoing",
      "about": "You enjoy the moment, roll with surprises and rarely let worry slow you down. People like having you around because you make things lighter. Rigid schedules feel like a cage; you would rather improvise.",
      "strengths": [
        "Adapts quickly when plans change",
        "Keeps spirits up",
        "Starts conversations and adventures easily"
      ],
      "watch": [
        "Details and deadlines can slip",
        "May get bored with long, repetitive work"
      ]
    },
    "hummingbird": {
      "name": "Hummingbird",
      "tagline": "Vivid, expressive and full of feeling",
      "about": "You live with the volume turned up: lots of energy, lots of people, and emotions you feel strongly and show openly. Your enthusiasm is contagious, and you notice when a mood shifts. Busy, changing settings suit you better than quiet ones.",
      "strengths": [
        "Expressive and engaging",
        "Quick to notice and respond to feelings",
        "Brings intensity and enthusiasm"
      ],
      "watch": [
        "Stress can hit hard and fast",
        "Can burn energy faster than you refill it"
      ]
    },
    "cat": {
      "name": "Cat",
      "tagline": "Independent, selective and self-possessed",
      "about": "You keep your own counsel, choose your company carefully and don't feel the need to please. You prefer to work things out yourself rather than by committee. The people who earn your trust get your full loyalty.",
      "strengths": [
        "Works well alone and independently",
        "Sees through flattery and groupthink",
        "Makes decisions on your own terms"
      ],
      "watch": [
        "Can seem distant or hard to read",
        "May skip the relationship-building that teams need"
      ]
    },
    "deer": {
      "name": "Deer",
      "tagline": "Gentle, perceptive and deeply caring",
      "about": "You are kind, attentive and quick to sense how others feel, often before they say it. You prefer calm settings and a few close people to big crowds. You feel things deeply, which makes you an unusually caring friend.",
      "strengths": [
        "Empathetic and considerate",
        "Notices subtle signals in people",
        "Loyal and supportive in close relationships"
      ],
      "watch": [
        "Can absorb other people's stress",
        "May hold back opinions to keep the peace"
      ]
    },
    "owl": {
      "name": "Owl",
      "tagline": "Thoughtful, curious and quietly deep",
      "about": "Your inner world is busy: ideas, questions, books, theories. You recharge alone and think before you speak, and when you do speak it is usually worth hearing. Small talk bores you; a good conversation about something real does not.",
      "strengths": [
        "Thinks deeply and independently",
        "Learns complex things for the joy of it",
        "Calm, considered judgment"
      ],
      "watch": [
        "Can stay in your head when action is needed",
        "May be underestimated in loud groups"
      ]
    },
    "octopus": {
      "name": "Octopus",
      "tagline": "Inventive, unconventional and hard to box in",
      "about": "You see possibilities everywhere and like to follow your curiosity wherever it goes. Rules and routines feel optional to you, which makes you creative and adaptable. Your ideas often arrive faster than your plans to finish them.",
      "strengths": [
        "Original ideas and creative leaps",
        "Comfortable with the unusual",
        "Adapts and improvises freely"
      ],
      "watch": [
        "Projects can stay unfinished",
        "Structure and admin may feel like a drag"
      ]
    },
    "fox": {
      "name": "Fox",
      "tagline": "Clever, skeptical and quick-witted",
      "about": "You question things, enjoy a good argument and spot the flaw in an idea quickly. You are curious but not credulous: you want to see the evidence. Your wit can be sharp, and you value being right over being agreeable.",
      "strengths": [
        "Critical, independent thinking",
        "Finds the weak spot in a plan",
        "Debates and challenges ideas well"
      ],
      "watch": [
        "Skepticism can read as cynicism",
        "May win the argument and lose the room"
      ]
    },
    "beaver": {
      "name": "Beaver",
      "tagline": "Practical, industrious and reliable",
      "about": "You like tangible results, proven methods and a job done properly. You would rather build something solid than talk about ideas in the abstract. People rely on you because you show up and finish what you start.",
      "strengths": [
        "Dependable and thorough",
        "Practical, hands-on problem solving",
        "Sticks with a task until it's done"
      ],
      "watch": [
        "Can resist new methods that aren't proven yet",
        "May get impatient with open-ended brainstorming"
      ]
    },
    "elephant": {
      "name": "Elephant",
      "tagline": "Calm, kind and steady as a rock",
      "about": "You are the person others lean on: patient, responsible and hard to fluster. You look after people without making a fuss about it, and you keep your commitments. Your steadiness makes groups feel safe.",
      "strengths": [
        "Reliable and trustworthy",
        "Stays calm and patient with people",
        "Balances care with getting things done"
      ],
      "watch": [
        "Can take on too much for others",
        "May avoid rocking the boat when change is needed"
      ]
    },
    "panda": {
      "name": "Panda",
      "tagline": "Relaxed, unhurried and content",
      "about": "You move at your own pace and don't feel the need to fill every hour or every silence. You prefer comfort and calm to hustle, and you are good at enjoying simple things. Pressure to perform for its own sake leaves you cold.",
      "strengths": [
        "Low-drama and easy to be around",
        "Doesn't overreact or overcommit",
        "Good at enjoying the present"
      ],
      "watch": [
        "Motivation can dip without outside structure",
        "May put off things that matter"
      ]
    },
    "meerkat": {
      "name": "Meerkat",
      "tagline": "Watchful, careful and conscientious",
      "about": "You notice risks early and prepare for them, which makes you the one who checked the details. You hold yourself to high standards and feel it when things go wrong. That vigilance protects the people around you.",
      "strengths": [
        "Anticipates problems before they happen",
        "Careful, thorough work",
        "Takes responsibility seriously"
      ],
      "watch": [
        "Worry can turn into overwork",
        "May be hard on yourself about mistakes"
      ]
    },
    "hedgehog": {
      "name": "Hedgehog",
      "tagline": "Guarded, honest and fiercely real",
      "about": "You protect yourself well and don't pretend to feel what you don't. You can be blunt, and you react strongly when something seems unfair or wrong. Under the spikes, you are loyal to the few who get close.",
      "strengths": [
        "Honest about problems others gloss over",
        "Quick to sense when something is off",
        "Protective of your people"
      ],
      "watch": [
        "Frustration can flare quickly",
        "Can keep people at arm's length for too long"
      ]
    },
    "raccoon": {
      "name": "Raccoon",
      "tagline": "Adaptable, balanced and versatile",
      "about": "Your scores sit near the middle on most traits, which is a real result, not a lack of one. You can be outgoing or quiet, structured or flexible, depending on what the situation needs. That range makes you one of the most adaptable animals in the forest.",
      "strengths": [
        "Adjusts style to the situation",
        "Gets along with very different people",
        "Few strong blind spots"
      ],
      "watch": [
        "Your preferences can be hard to read, even for you",
        "Career fit depends more on your interests than your personality"
      ]
    }
  },
  domains: {
    "O": {
      "name": "Openness",
      "plain": "Curiosity and imagination",
      "low": "practical, prefers the familiar",
      "high": "curious, imaginative, open to new ideas"
    },
    "C": {
      "name": "Conscientiousness",
      "plain": "Organization and drive",
      "low": "flexible, spontaneous, relaxed about plans",
      "high": "organized, disciplined, dependable"
    },
    "E": {
      "name": "Extraversion",
      "plain": "Social energy",
      "low": "reserved, recharges alone",
      "high": "outgoing, energetic, assertive"
    },
    "A": {
      "name": "Agreeableness",
      "plain": "Warmth and cooperation",
      "low": "direct, competitive, skeptical",
      "high": "warm, trusting, cooperative"
    },
    "N": {
      "name": "Neuroticism",
      "plain": "Emotional sensitivity",
      "low": "calm, steady under stress",
      "high": "feels stress and emotions strongly"
    }
  },
  facets: {
    "N1": {
      "name": "Anxiety",
      "desc": "worries and feels nervous"
    },
    "N2": {
      "name": "Anger",
      "desc": "gets angry or irritated easily"
    },
    "N3": {
      "name": "Depression",
      "desc": "feels down or discouraged"
    },
    "N4": {
      "name": "Self-Consciousness",
      "desc": "feels self-conscious around others"
    },
    "N5": {
      "name": "Immoderation",
      "desc": "finds cravings and urges hard to resist"
    },
    "N6": {
      "name": "Vulnerability",
      "desc": "feels overwhelmed under pressure"
    },
    "E1": {
      "name": "Friendliness",
      "desc": "warm and friendly toward others"
    },
    "E2": {
      "name": "Gregariousness",
      "desc": "enjoys crowds and lots of company"
    },
    "E3": {
      "name": "Assertiveness",
      "desc": "takes charge and speaks up"
    },
    "E4": {
      "name": "Activity Level",
      "desc": "busy, fast-paced, always on the go"
    },
    "E5": {
      "name": "Excitement-Seeking",
      "desc": "seeks thrills and stimulation"
    },
    "E6": {
      "name": "Cheerfulness",
      "desc": "cheerful and full of joy"
    },
    "O1": {
      "name": "Imagination",
      "desc": "rich imagination and daydreaming"
    },
    "O2": {
      "name": "Artistic Interests",
      "desc": "moved by art, music and beauty"
    },
    "O3": {
      "name": "Emotionality",
      "desc": "aware of and values own feelings"
    },
    "O4": {
      "name": "Adventurousness",
      "desc": "likes new experiences and variety"
    },
    "O5": {
      "name": "Intellect",
      "desc": "enjoys ideas, puzzles and theory"
    },
    "A1": {
      "name": "Trust",
      "desc": "assumes the best of people"
    },
    "A2": {
      "name": "Morality",
      "desc": "straightforward, doesn't manipulate"
    },
    "A3": {
      "name": "Altruism",
      "desc": "helps others and gives time freely"
    },
    "A4": {
      "name": "Cooperation",
      "desc": "avoids confrontation, yields to keep peace"
    },
    "A5": {
      "name": "Modesty",
      "desc": "doesn't talk self up"
    },
    "A6": {
      "name": "Sympathy",
      "desc": "moved by others' hardship"
    },
    "C1": {
      "name": "Self-Efficacy",
      "desc": "confident in getting things done"
    },
    "C2": {
      "name": "Orderliness",
      "desc": "neat, tidy and orderly"
    },
    "C3": {
      "name": "Dutifulness",
      "desc": "keeps promises and follows rules"
    },
    "C4": {
      "name": "Achievement-Striving",
      "desc": "ambitious, works hard toward goals"
    },
    "C5": {
      "name": "Self-Discipline",
      "desc": "starts and finishes tasks without procrastinating"
    },
    "C6": {
      "name": "Cautiousness",
      "desc": "thinks before acting"
    }
  },
};
