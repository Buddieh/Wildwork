// English text for the Calling test. Strings it shares with the main site (training levels, job badges, the US outlook
// and AI lines) come from ../i18n/en.js.

export default {
  nav: { home: "Wildwork home", method: "How it works" },
  loadError: "Couldn't load the test. Please refresh the page.",
  dataLoading: "Loading 900+ occupations…",
  list: (items, and = "and") => items.length < 3 ? items.join(` ${and} `) : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`,

  intro: {
    eyebrow: "Wildwork · experimental",
    title: "Find what you love doing.",
    lede: "A new test for finding your calling. It starts with what you already enjoy, asks what you enjoy most about it, what gives you energy and what you want work to be for, then lets you try on real workdays before telling you which job each one was.",
    start: "Start",
    continue: part => `Continue: ${part}`,
    results: "See my results",
    reset: "Start over",
    resetConfirm: "Clear all your Calling answers and start over?",
    partsTitle: "Five parts, about 15 minutes",
    change: "Change",
    note: "Calling is separate from the animal and career quizzes and doesn't use their answers. It's new and hasn't been validated, so treat what it suggests as ideas to try, not verdicts.",
    saveNote: "Your progress saves in this browser automatically.",
  },
  // n holds the sizes of the lists in content.js: areas, sliders, meaning, days.
  parts: [
    { name: "What you love", text: () => "Your hobbies, what you enjoy most about each one, and three questions about everyday life.", time: "4 min" },
    { name: "What draws you", text: n => `${n.areas} quick cards, one for each area of work, then your top four.`, time: "4 min" },
    { name: "Energy", text: n => `${n.sliders} things about everyday work that give you energy or drain it.`, time: "2 min" },
    { name: "What it's for", text: n => `Put ${n.meaning} kinds of purpose in order.`, time: "1 min" },
    { name: "Try it on", text: n => `Two questions about training, then ${n.days} short workdays to react to. Each job's name comes after your answer.`, time: "4 min" },
  ],
  part: (n, name) => `Part ${n} of 5 · ${name}`,
  back: "Back", next: "Next", skip: "Skip", done: "Done",
  of: (n, total) => `${n} of ${total}`,
  hint: keys => `Keys ${keys} answer · arrow keys move`,

  loves: {
    title: "What do you love doing in your free time?",
    lede: "Pick up to six things you do, or used to do, just because you enjoy them. Leave out things you feel you ought to like.",
    find: "Find a hobby",
    picked: (n, max) => `${n} of ${max} picked`,
    max: max => `You can pick up to ${max}. Unpick one to add another.`,
    none: "No hobby matches that. Try another word, or add it with “Something else”.",
    skip: "Skip: nothing right now",
    other: "Something else…",
    otherTitle: "Something that isn't on the list",
    otherName: "What is it?",
    otherPlaceholder: "For example, restoring old radios",
    otherAreas: max => `Which of these is it closest to? Pick up to ${max}.`,
    otherAdd: "Add it",
    otherCancel: "Cancel",
    otherNote: "The name stays on this device. Your save code keeps only the areas you picked.",
    otherDefault: "Something else you love",
    otherNeed: "Pick at least one area it's close to.",
  },
  hooks: {
    prompt: "What do you enjoy most about it?",
    pick: max => `Pick up to ${max}.`,
    work: "Would you want it as your work?",
    count: (n, total) => `Hobby ${n} of ${total}`,
    need: "Pick at least one thing you enjoy about it, and whether you'd want it as work.",
  },
  life: {
    count: (n, total) => `Question ${n} of ${total}`,
    pick: max => `Pick up to ${max}, or skip if none fit.`,
  },
  cards: {
    prompt: "How do you feel about this kind of activity?",
    lede: n => `${n} areas of work, one card each. Go with your first reaction, about five seconds a card. Answer for the activity itself, not the pay, the status or whether you're good at it yet.`,
    examples: "For example",
  },
  top: {
    title: "Which of these matter most?",
    lede: max => `Tap up to ${max}, in order, starting with the one you'd most like your work to be about. Tap again to take one out.`,
    likedToo: "You loved fewer than four, so the areas you like are here too.",
  },
  energy: {
    promptUni: "How does this affect your energy at work?",
    promptBi: "Which suits you better?",
    lede: n => `${n} things about everyday work. Think about how you'd feel at the end of the day, not about what sounds impressive.`,
  },
  meaning: {
    title: "What do you want your work to be for?",
    lede: "Tap the cards in order of importance, starting with the one that matters most. Three is enough; rank more if you like. Tap a card again to take it out.",
    clear: "Clear",
    need: "Rank at least three to continue.",
  },
  training: {
    haveNote: "Count related work experience too: a few years in a field can stand in for a level of formal training. This doesn't change your scores. It splits jobs into ones that fit your training now and ones that need more.",
    zoneNote: "This doesn't change your scores. The workdays you try on and the directions you see stay within this much training, and you can change it on the results page.",
  },
  days: {
    lede: "Imagine a workday like this one. React to the work itself: the job's name appears after you answer. Every snapshot includes a downside, because every job has one.",
    prompt: "How does this day sound?",
    count: (n, total) => `Day ${n} of ${total}`,
    reactions: ["I'd love this", "Could be OK", "Not for me"],
    was: "This was",
    change: "Tap another answer to change it.",
    next: "Next day",
    toResults: "See my results",
  },

  results: {
    eyebrow: "Your calling profile",
    lede: "What you told the test, in a few lines. Below it are directions where it comes together in real work.",
    stillTitle: "Still exploring",
    flat: "You didn't love any of the 41 areas, so these suggestions rest on milder likes and are less certain. That's common, and interest often grows once you get good at something, so the experiments under each direction matter more than the order.",
    loves: "What you love",
    hooks: "What you enjoy most",
    energizers: "Gives you lots of energy",
    drainers: "Drains you a lot",
    leanings: "How you'd like to work",
    meaning: "What work is for, in your order",
    rather: (strong, side) => `${strong ? "Strongly prefer" : "Prefer"} ${side}`,
    dirsTitle: "Directions to explore",
    dirsLede: "Each direction turns an area you love or like, or two of them together, into real occupations, and each of your top three loves gets one if a job built around it fits you well. Jobs are shown in fit bands rather than exact ranks, because small differences in score don't mean much.",
    dirsNone: "No direction stands out within the training you'd do. Try raising “The most you'd do”, or look through all jobs below.",
    direction: n => `Direction ${n}`,
    dirOne: (name, love) => `Built on your ${love ? "love of" : "interest in"} ${name}.`,
    dirTwo: (a, aLove, b, bLove) => `Where your ${aLove ? "love of" : "interest in"} ${a} meets your ${bLove ? "love of" : "interest in"} ${b}.`,
    dirCount: n => `${n} ${n === 1 ? "job" : "jobs"} in this direction`,
    unplacedTitle: "Loves without a direction",
    unplacedLede: "Some of what you love didn't lead to a direction above. Here is the closest job for each; select its name to see it in the full list.",
    unplacedJob: (job, band) => `Closest job: ${job}, a ${band}.`,
    unplacedIn: n => `It's in direction ${n}.`,
    unplacedAlone: "It just didn't make it into the directions above.",
    unplacedBack: why => `Holding it back: ${why}.`,
    unplacedPart: part => `Its weakest part for you is ${part}.`,
    unplacedParts: { hooks: "what you enjoy doing", energy: "energy", meaning: "purpose (what you want work to be for)" },
    unplacedNone: "No job within the training you'd do is built around it.",
    showAll: n => `Show all ${n}`,
    showFewer: "Show fewer",
    tryTitle: "Try it this month",
    keptTitle: "Loves you're keeping as yours",
    keptText: (list, n) => `You'd rather keep ${list} as ${n > 1 ? "hobbies" : "a hobby"}. That's a real answer, not a gap: being paid for something you enjoy can change how it feels (Deci, Koestner and Ryan, 1999). These still told the test what you enjoy, but they don't steer the job list.`,
    provide: "You put providing for yourself and your family near the top. Pay isn't part of the score, so check the US pay line on each job card; pay differs a lot between countries.",
    honestTitle: "A note on finding what you love",
    honestText: "Passions are usually built rather than found. People who expect to discover a ready-made passion tend to drop a new interest once it gets hard, while people who expect interest to grow keep going long enough for it to happen. So treat these directions as experiments to run, not answers to accept: try a few things, notice what you want more of, and come back (O'Keefe, Dweck and Walton, 2018).",
    allTitle: "All jobs, best fit first",
    allLede: "Every occupation in O*NET, scored the same way for you. Search for one you're curious about.",
    haveLabel: "Training you have now", willingLabel: "The most you'd do",
    search: "Search jobs", growing: "Growing fast in the US",
    none: "No jobs match these filters.",
    more: n => `Show more (${n} left)`,
    good: "Why it might fit",
    watch: "Worth knowing",
    parts: { love: "Your loves", hooks: "What you enjoy", energy: "Energy", meaning: "Purpose" },
    partsTitle: "Where this job ranks for you on each part of the test, among all occupations",
    moreAbout: "More about this job",
    partsHead: "How it scores for you on each part, among all occupations",
    snapshot: "The workday you tried on",
    snapshotAny: "A workday in this job",
    tasks: "Core tasks",
    edit: "Change my answers",
    reset: "Start over",
  },
  why: {
    // Area names often contain "and", so two areas are kept apart by their own clauses. feel is how the person rated
    // the area's card ("love" or "like"), or empty when only their hobbies and everyday answers point to it.
    areas: ([a, b]) => {
      const clause = (x, also) => (x.feel ? `which you ${also ? "also " : ""}${x.feel}` : `which ${also ? "also " : ""}came up in your hobbies and everyday life`);
      return `Built around ${a.name}, ${clause(a)}${b ? `, and ${b.name}, ${clause(b, a.feel === b.feel)}` : ""}`;
    },
    hobby: (name, yes) => `Close to ${name}, which you'd ${yes ? "love" : "maybe like"} as work`,
    meaning: title => `Fits what you want work to be for: ${title}`,
    dayLoved: (same, title) => same ? "You loved this workday when you tried it on" : `Close to a workday you loved (${title})`,
    dayNo: (same, title) => same ? "You said this workday wasn't for you" : `Close to a workday you turned down (${title})`,
    no: name => `Involves ${name}, which you said is definitely not for you`,
    // Energy: uni items say how much of the condition the job has; bi items say which end it's at.
    lots: noun => `Lots of ${noun}, which gives you energy`,
    little: noun => `Not much ${noun} (it drains you)`,
    lacks: noun => `Not much ${noun}, though it gives you energy`,
    heavy: noun => `Lots of ${noun}, which drains you`,
    side: side => `${side}, as you prefer`,
    against: (side, want) => `${side}, though you'd rather ${want}`,
  },
  // For each energy item: the condition as a noun (uni), or the job's two ends and the person's two wishes (bi).
  energyWords: {
    public: "dealing with customers or the public",
    body: { job: ["Mostly at a desk", "Mostly on your feet"], want: ["work at a desk", "be on your feet"] },
    team: "close teamwork",
    lead: "responsibility for other people's work",
    variety: { job: ["Mostly familiar, repeated tasks", "Something different most days"], want: ["stick to tasks you know well", "do something different every day"] },
    stage: "speaking in front of groups",
    upset: "dealing with upset or angry people",
    outdoors: "time outdoors in all weather",
    home: { job: ["Done at a workplace", "Often possible from home"], want: ["go in to a workplace", "work from home"] },
    hands: "hands-on work with tools",
    freedom: { job: ["Mostly following set instructions", "Lots of freedom to decide what to do and how"], want: ["have clear instructions", "decide for yourself"] },
    deadlines: "deadline pressure",
    ai: { job: ["Most of its tasks still need a person", "AI tools can speed up many of its tasks"], want: ["have little or no AI in your work", "use a lot of AI"] },
    compete: "competing for sales, clients or rankings",
    heights: "working at heights",
    machines: "heavy machinery or dangerous materials",
  },

  save: {
    titleSave: "Keep your calling map",
    titleOpen: "Been here before?",
    leadSave: "Your answers stay only in this browser. To come back later or continue on another device, save your calling map: a picture of what you love with your answers hidden inside it. Open it here any time to pick up where you left off.",
    leadOpen: "Open your calling map, or paste your calling code, to pick up where you left off.",
    download: "Save my calling map", copy: "Copy calling code", open: "Open my calling map", paste: "Paste a calling code", go: "Continue",
    codeLabel: "Your calling code",
    privacy: "Nothing is uploaded or stored online. Messaging apps can strip the hidden answers from pictures, so keep the map as a file, or keep the code in your notes.",
    making: "Drawing your calling map…", saved: "Saved. Keep this file to continue later.", copied: "Calling code copied. Paste it into your notes.",
    bad: "That doesn't look like a calling map or calling code. If the picture went through a messaging app, its hidden answers may have been removed.",
    starMap: "That's a star map from the animal quiz. Open it on the Wildwork home page instead.",
    mapFailed: "Couldn't draw the map in this browser. Use the calling code instead.",
    replace: "This replaces the Calling answers in this browser. Continue?",
    cardEyebrow: "MY WILDWORK CALLING MAP",
    progressTitle: "A calling in progress",
    progress: n => `${n} of 5 parts done`,
    with: names => `Also: ${names.join(" · ")}`,
    enjoy: names => `What I enjoy most: ${names.join(" · ")}`,
    stillSub: "Trying things on to find what I love",
    cardFooter: "buddieh.github.io/Wildwork/calling · open this map there to continue",
  },

  footer: {
    areas: 'Interest areas: O*NET\'s 41 specific interests (O*NET 30.3 and later), based on the Comprehensive Assessment of Basic Interests (Su et al., 2019).',
    privacy: 'Your answers stay on your device. Nothing is sent anywhere. <a href="https://github.com/Buddieh/Wildwork">Source on GitHub</a>',
  },

  method: `
    <h1>How Calling works</h1>
    <p class="muted">An experimental test that looks for work you'd love doing. Instead of measuring personality and interests separately, it asks about the things that make work feel like yours (what you love doing, what you enjoy most about it, what gives you energy and what you want work to be for) and turns them into one score for every occupation. It's new and hasn't been validated, so read its suggestions as ideas to try.</p>
    <h2>The five parts</h2>
    <ol>
      <li><b>What you love.</b> Up to six hobbies, what you enjoy most about each one (making something, figuring things out, helping someone…), whether you'd want it as your work, and three questions about everyday life. Leisure interests overlap with work interests, but only partly (Leuty, Hansen and Speaks, 2015), so the test asks before turning a hobby into a job. “I'd keep it as a hobby” is a real answer: being rewarded for something you already enjoy can change how it feels (Deci, Koestner and Ryan, 1999). A hobby you keep still says what you enjoy, but doesn't steer the job list.</li>
      <li><b>What draws you.</b> One card for each of O*NET's 41 specific interest areas, which O*NET added in release 30.3, based on the Comprehensive Assessment of Basic Interests (Su and colleagues, 2019). The plain names and examples on the cards were written for this test. “Not sure” counts the same as “not really”, so nobody has to guess about an area they don't know. Then you pick your top four.</li>
      <li><b>Energy.</b> 16 conditions of everyday work, matched to O*NET's work context ratings (how much a job involves the public, teamwork, deadlines, time outdoors and so on), to whether it can be done from home (Dingel and Neiman's 2020 rules, applied to the current O*NET data) and, for the AI question, to the AI exposure measures described below.</li>
      <li><b>What it's for.</b> Eleven kinds of purpose, in your order. Each is matched to the interest areas and work activities that serve it, except “providing for yourself and your family”: pay is shown on every job card but kept out of the score, so that card is there to make the list honest rather than to move jobs.</li>
      <li><b>Try it on.</b> Two questions about training, then up to 12 short snapshots of real workdays, written from each occupation's main O*NET tasks in today's terms. Each one includes a downside, as realistic job previews do (Premack and Wanous, 1985). The job's name is hidden until you react, because job titles carry prestige and stereotypes that sway what people say they'd like (Gottfredson, 1981). The snapshots adapt to you: mostly the best fits so far, within the training you'd do, and every third from an area you haven't tried, so a blind spot can show up.</li>
    </ol>
    <h2>One score</h2>
    <ul>
      <li>Every occupation gets one score from four parts: <b>your loves</b> (50%), <b>what you enjoy</b> (15%), <b>energy</b> (20%) and <b>purpose</b> (15%). Each part is put on the same scale across all occupations for you before weighting, so the weights mean what they say.</li>
      <li><b>Your loves</b> weights each interest area by how central it is to the job. A card you love counts 3 and one you like counts 1; your top four add a bonus; hobbies you'd want as work and your everyday answers add more. An area you said is definitely not for you subtracts when it's central to a job, by at least as much as your strongest love, so one of your loves can't hide it.</li>
      <li><b>What you enjoy</b> matches what you like most about your hobbies to the job's activities and style: making things to creative work, figuring things out to analysis, helping to caring for people, and so on.</li>
      <li><b>Energy</b> matches your answers to the job's conditions. Things that drain you count 1.5 times as much as things that energize you, because a draining job hurts more than an energizing one helps.</li>
      <li><b>Try-on reactions</b> then move jobs that are similar to each workday you tried (by interest areas and work activities) up or down. Several reactions add up, but together they can't move a job further than one full reaction.</li>
      <li>Fit bands show where a job falls among all occupations for you: top match is the best 3%, strong the top 10%, good the top 25% and partial the top half.</li>
    </ul>
    <h2>Directions</h2>
    <ul>
      <li>Jobs in your top quarter are grouped by the love, or pair of loves, they're built around. A job only counts for an area that's central to it (one of its top three, or rated at least 3.7 of 7 by O*NET), and only for an area you like or love.</li>
      <li>A direction's place comes from its three best jobs, its best job has to be in your top 10%, and no single love leads more than two directions, so one big area doesn't crowd out the rest.</li>
      <li>Each direction comes with small experiments you can run within a month. People who change careers well mostly find their way by trying things and talking to people who do the work, not by thinking it through alone (Ibarra, 2003; Burnett and Evans, 2016).</li>
    </ul>
    <h2>Today's job market</h2>
    <ul>
      <li>The US outlook and AI lines on job cards are the same as in the main career quiz: Bureau of Labor Statistics projections as published on O*NET OnLine, and two research measures of AI exposure, “could speed up” (<a href="https://www.science.org/doi/10.1126/science.adj0998">Eloundou and colleagues, 2024, <i>Science</i></a>) and “in use for” (<a href="https://www.anthropic.com/research/labor-market-impacts">Anthropic, March 2026</a>, based on conversations with its AI, Claude; Wildwork was built with help from Claude, so keep in mind where this source comes from). Exposure isn't the same as job loss.</li>
      <li>Pay and growth are shown as information and never change a score. The one exception is your own answer to the AI question in part 3, which matches your preference to how exposed each job is.</li>
    </ul>
    <h2>Why experiments, not verdicts</h2>
    <ul>
      <li>In research terms, a calling is a consuming, meaningful passion for a domain of work (Dobrow and Tosti-Kharas, 2011). It isn't fixed: studies that follow people for years find it changes, and that being actively involved in the work goes with a stronger calling later (Dobrow, 2013).</li>
      <li>People who believe passions are found rather than developed lose interest faster when a new field gets difficult (O'Keefe, Dweck and Walton, 2018). Interest and skill grow together, so a direction that only looks “good” now can become a love with practice.</li>
    </ul>
    <h2>Your privacy</h2>
    <ul>
      <li>Everything runs in your browser. Answers are kept in this browser's storage so you can resume, and nowhere else.</li>
      <li>Your calling map and calling code carry your answers so you can continue elsewhere. The name of a hobby you add yourself stays on this device and isn't in the code.</li>
    </ul>
    <h2>Limits worth knowing</h2>
    <ul>
      <li>This test is new. Unlike the main quizzes, it hasn't been checked against how people actually fare in jobs, and its weights are our own choices, tuned on made-up profiles.</li>
      <li>O*NET's ratings of the 41 interest areas for each occupation were made by AI models and checked against expert ratings.</li>
      <li>The occupations, training levels and outlook figures describe the US.</li>
      <li>A good match means “worth trying”, not “you'll love it”. Talk to people who do the work.</li>
    </ul>
    <p class="muted small"><a href="#/">Back to the test</a> · <a href="../">Wildwork home</a></p>`,
};
