// The 16 animals. Each one is a prototype pattern of Big Five scores (z units: +1 = one SD above
// average). A person gets the animal whose prototype is closest to their own five domain scores.
// Raccoon sits at the centre and catches balanced profiles, so nobody is forced into an extreme.
// Expected shares under realistic trait correlations range from about 3% (Meerkat) to 11% (Elephant).

export const DOMAINS = ["O", "C", "E", "A", "N"];

export const ANIMALS = {
  lion: {
    name: "Lion",
    proto: { E: 1, A: -1, N: -1 },
    tagline: "Bold, direct and hard to rattle",
    about: "You step forward when a group needs someone to decide, and you say what you think without much cushioning. Pressure that unsettles other people tends to sharpen you. You care more about getting a result than about everyone liking how you got it.",
    strengths: ["Takes charge when things are unclear", "Stays calm under pressure", "Negotiates and argues a case well"],
    watch: ["Can steamroll quieter people", "May come across as harsh when you mean to be efficient"],
  },
  dolphin: {
    name: "Dolphin",
    proto: { E: 1, A: 1, O: 1 },
    tagline: "Warm, playful and curious about everyone",
    about: "You connect easily and bring energy into a room, and you are genuinely interested in people and ideas. You like variety, conversation and trying things together. Others tend to feel included around you.",
    strengths: ["Builds trust and rapport quickly", "Brings ideas and people together", "Keeps groups lively and open"],
    watch: ["Can spread yourself across too many people and plans", "May avoid conflict that needs to happen"],
  },
  wolf: {
    name: "Wolf",
    proto: { E: 1, C: 1 },
    tagline: "Energetic, organized and made for the pack",
    about: "You combine drive with discipline: you like to set a direction, rally people and follow through. You are at your best with a clear goal and a team to move toward it. Plans that drift without an owner frustrate you.",
    strengths: ["Organizes people around a goal", "Follows through on commitments", "High energy that stays focused"],
    watch: ["Can push a pace others can't keep", "May find unstructured situations draining"],
  },
  otter: {
    name: "Otter",
    proto: { E: 1, C: -1, N: -1 },
    tagline: "Fun-loving, spontaneous and easygoing",
    about: "You enjoy the moment, roll with surprises and rarely let worry slow you down. People like having you around because you make things lighter. Rigid schedules feel like a cage; you would rather improvise.",
    strengths: ["Adapts quickly when plans change", "Keeps spirits up", "Starts conversations and adventures easily"],
    watch: ["Details and deadlines can slip", "May get bored with long, repetitive work"],
  },
  hummingbird: {
    name: "Hummingbird",
    proto: { E: 1, N: 1 },
    tagline: "Vivid, expressive and full of feeling",
    about: "You live with the volume turned up: lots of energy, lots of people, and emotions you feel strongly and show openly. Your enthusiasm is contagious, and you notice when a mood shifts. Busy, changing settings suit you better than quiet ones.",
    strengths: ["Expressive and engaging", "Quick to notice and respond to feelings", "Brings intensity and enthusiasm"],
    watch: ["Stress can hit hard and fast", "Can burn energy faster than you refill it"],
  },
  cat: {
    name: "Cat",
    proto: { E: -1, A: -1 },
    tagline: "Independent, selective and self-possessed",
    about: "You keep your own counsel, choose your company carefully and don't feel the need to please. You prefer to work things out yourself rather than by committee. The people who earn your trust get your full loyalty.",
    strengths: ["Works well alone and independently", "Sees through flattery and groupthink", "Makes decisions on your own terms"],
    watch: ["Can seem distant or hard to read", "May skip the relationship-building that teams need"],
  },
  deer: {
    name: "Deer",
    proto: { N: 1, A: 1, E: -1 },
    tagline: "Gentle, perceptive and deeply caring",
    about: "You are kind, attentive and quick to sense how others feel, often before they say it. You prefer calm settings and a few close people to big crowds. You feel things deeply, which makes you an unusually caring friend.",
    strengths: ["Empathetic and considerate", "Notices subtle signals in people", "Loyal and supportive in close relationships"],
    watch: ["Can absorb other people's stress", "May hold back opinions to keep the peace"],
  },
  owl: {
    name: "Owl",
    proto: { O: 1, E: -1 },
    tagline: "Thoughtful, curious and quietly deep",
    about: "Your inner world is busy: ideas, questions, books, theories. You recharge alone and think before you speak, and when you do speak it is usually worth hearing. Small talk bores you; a good conversation about something real does not.",
    strengths: ["Thinks deeply and independently", "Learns complex things for the joy of it", "Calm, considered judgment"],
    watch: ["Can stay in your head when action is needed", "May be underestimated in loud groups"],
  },
  octopus: {
    name: "Octopus",
    proto: { O: 1, C: -1 },
    tagline: "Inventive, unconventional and hard to box in",
    about: "You see possibilities everywhere and like to follow your curiosity wherever it goes. Rules and routines feel optional to you, which makes you creative and adaptable. Your ideas often arrive faster than your plans to finish them.",
    strengths: ["Original ideas and creative leaps", "Comfortable with the unusual", "Adapts and improvises freely"],
    watch: ["Projects can stay unfinished", "Structure and admin may feel like a drag"],
  },
  fox: {
    name: "Fox",
    proto: { O: 1, A: -1 },
    tagline: "Clever, skeptical and quick-witted",
    about: "You question things, enjoy a good argument and spot the flaw in an idea quickly. You are curious but not credulous: you want to see the evidence. Your wit can be sharp, and you value being right over being agreeable.",
    strengths: ["Critical, independent thinking", "Finds the weak spot in a plan", "Debates and challenges ideas well"],
    watch: ["Skepticism can read as cynicism", "May win the argument and lose the room"],
  },
  beaver: {
    name: "Beaver",
    proto: { C: 1, O: -1 },
    tagline: "Practical, industrious and reliable",
    about: "You like tangible results, proven methods and a job done properly. You would rather build something solid than talk about ideas in the abstract. People rely on you because you show up and finish what you start.",
    strengths: ["Dependable and thorough", "Practical, hands-on problem solving", "Sticks with a task until it's done"],
    watch: ["Can resist new methods that aren't proven yet", "May get impatient with open-ended brainstorming"],
  },
  elephant: {
    name: "Elephant",
    proto: { A: 1, N: -1, C: 1 },
    tagline: "Calm, kind and steady as a rock",
    about: "You are the person others lean on: patient, responsible and hard to fluster. You look after people without making a fuss about it, and you keep your commitments. Your steadiness makes groups feel safe.",
    strengths: ["Reliable and trustworthy", "Stays calm and patient with people", "Balances care with getting things done"],
    watch: ["Can take on too much for others", "May avoid rocking the boat when change is needed"],
  },
  panda: {
    name: "Panda",
    proto: { C: -1, E: -1 },
    tagline: "Relaxed, unhurried and content",
    about: "You move at your own pace and don't feel the need to fill every hour or every silence. You prefer comfort and calm to hustle, and you are good at enjoying simple things. Pressure to perform for its own sake leaves you cold.",
    strengths: ["Low-drama and easy to be around", "Doesn't overreact or overcommit", "Good at enjoying the present"],
    watch: ["Motivation can dip without outside structure", "May put off things that matter"],
  },
  meerkat: {
    name: "Meerkat",
    proto: { N: 1, C: 1 },
    tagline: "Watchful, careful and conscientious",
    about: "You notice risks early and prepare for them, which makes you the one who checked the details. You hold yourself to high standards and feel it when things go wrong. That vigilance protects the people around you.",
    strengths: ["Anticipates problems before they happen", "Careful, thorough work", "Takes responsibility seriously"],
    watch: ["Worry can turn into overwork", "May be hard on yourself about mistakes"],
  },
  hedgehog: {
    name: "Hedgehog",
    proto: { N: 1, A: -1 },
    tagline: "Guarded, honest and fiercely real",
    about: "You protect yourself well and don't pretend to feel what you don't. You can be blunt, and you react strongly when something seems unfair or wrong. Under the spikes, you are loyal to the few who get close.",
    strengths: ["Honest about problems others gloss over", "Quick to sense when something is off", "Protective of your people"],
    watch: ["Frustration can flare quickly", "Can keep people at arm's length for too long"],
  },
  raccoon: {
    name: "Raccoon",
    proto: {},
    tagline: "Adaptable, balanced and versatile",
    about: "Your scores sit near the middle on most traits, which is a real result, not a lack of one. You can be outgoing or quiet, structured or flexible, depending on what the situation needs. That range makes you one of the most adaptable animals in the forest.",
    strengths: ["Adjusts style to the situation", "Gets along with very different people", "Few strong blind spots"],
    watch: ["Your preferences can be hard to read, even for you", "Career fit depends more on your interests than your personality"],
  },
};

export const DOMAIN_INFO = {
  O: { name: "Openness", plain: "Curiosity and imagination", low: "practical, prefers the familiar", high: "curious, imaginative, open to new ideas" },
  C: { name: "Conscientiousness", plain: "Organization and drive", low: "flexible, spontaneous, relaxed about plans", high: "organized, disciplined, dependable" },
  E: { name: "Extraversion", plain: "Social energy", low: "reserved, recharges alone", high: "outgoing, energetic, assertive" },
  A: { name: "Agreeableness", plain: "Warmth and cooperation", low: "direct, competitive, skeptical", high: "warm, trusting, cooperative" },
  N: { name: "Neuroticism", plain: "Emotional sensitivity", low: "calm, steady under stress", high: "feels stress and emotions strongly" },
};

export const FACET_INFO = {
  N1: "worries and feels nervous", N2: "gets angry or irritated easily", N3: "feels down or discouraged",
  N4: "feels self-conscious around others", N5: "finds cravings and urges hard to resist", N6: "feels overwhelmed under pressure",
  E1: "warm and friendly toward others", E2: "enjoys crowds and lots of company", E3: "takes charge and speaks up",
  E4: "busy, fast-paced, always on the go", E5: "seeks thrills and stimulation", E6: "cheerful and full of joy",
  O1: "rich imagination and daydreaming", O2: "moved by art, music and beauty", O3: "aware of and values own feelings",
  O4: "likes new experiences and variety", O5: "enjoys ideas, puzzles and theory",
  A1: "assumes the best of people", A2: "straightforward, doesn't manipulate", A3: "helps others and gives time freely",
  A4: "avoids confrontation, yields to keep peace", A5: "doesn't talk self up", A6: "moved by others' hardship",
  C1: "confident in getting things done", C2: "neat, tidy and orderly", C3: "keeps promises and follows rules",
  C4: "ambitious, works hard toward goals", C5: "starts and finishes tasks without procrastinating", C6: "thinks before acting",
};

// z: { O, C, E, A, N } in z units. Returns animals sorted by closeness, with a share that sums to 1.
export function rankAnimals(z) {
  const ranked = Object.entries(ANIMALS).map(([id, a]) => {
    const d2 = DOMAINS.reduce((s, d) => s + ((a.proto[d] || 0) - z[d]) ** 2, 0);
    return { id, d2 };
  }).sort((a, b) => a.d2 - b.d2);
  // Softmax over squared distance: a Gaussian likelihood around each prototype.
  const w = ranked.map(r => Math.exp(-(r.d2 - ranked[0].d2) / 2));
  const total = w.reduce((s, x) => s + x, 0);
  return ranked.map((r, i) => ({ ...r, share: w[i] / total }));
}
