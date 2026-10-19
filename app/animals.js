// The 16 animals. Each one is a prototype pattern of Big Five scores (z units: +1 = one SD above
// average); names and descriptions live in i18n/. A person gets the animal whose prototype is closest
// to their own five domain scores. Raccoon sits at the centre and catches balanced profiles, so nobody
// is forced into an extreme. Expected shares under realistic trait correlations range from about 3%
// (Meerkat) to 11% (Elephant).

export const DOMAINS = ["O", "C", "E", "A", "N"];

export const ANIMALS = {
  lion: { proto: { E: 1, A: -1, N: -1 } },
  dolphin: { proto: { E: 1, A: 1, O: 1 } },
  wolf: { proto: { E: 1, C: 1 } },
  otter: { proto: { E: 1, C: -1, N: -1 } },
  hummingbird: { proto: { E: 1, N: 1 } },
  cat: { proto: { E: -1, A: -1 } },
  deer: { proto: { N: 1, A: 1, E: -1 } },
  owl: { proto: { O: 1, E: -1 } },
  octopus: { proto: { O: 1, C: -1 } },
  fox: { proto: { O: 1, A: -1 } },
  beaver: { proto: { C: 1, O: -1 } },
  elephant: { proto: { A: 1, N: -1, C: 1 } },
  panda: { proto: { C: -1, E: -1 } },
  meerkat: { proto: { N: 1, C: 1 } },
  hedgehog: { proto: { N: 1, A: -1 } },
  raccoon: { proto: {} },
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

// Familiar type labels derived from the same five scores.
// MBTI-style letters are an estimate: E/I from Extraversion, N/S from Openness, F/T from Agreeableness,
// J/P from Conscientiousness, and -T/-A from Neuroticism (the correlations reported by McCrae & Costa, 1989).
// Letters within 0.25 SD of average are flagged as borderline.
export function typeCodes(z) {
  const pick = (v, hi, lo) => ({ letter: v >= 0 ? hi : lo, borderline: Math.abs(v) < 0.25 });
  const mbti = [pick(z.E, "E", "I"), pick(z.O, "N", "S"), pick(z.A, "F", "T"), pick(z.C, "J", "P")];
  const identity = pick(z.N, "T", "A");
  // SLOAN (the Big Five's own type notation): Social/Reserved, Limbic/Calm, Organized/Unstructured,
  // Accommodating/Egocentric, Inquisitive/Non-curious. Lowercase marks a score within 0.5 SD of average.
  const sloan = [["E", "S", "R"], ["N", "L", "C"], ["C", "O", "U"], ["A", "A", "E"], ["O", "I", "N"]].map(([d, hi, lo]) => {
    const letter = z[d] >= 0 ? hi : lo;
    return { domain: d, high: z[d] >= 0, letter: Math.abs(z[d]) < 0.5 ? letter.toLowerCase() : letter };
  });
  return { mbti, identity, sloan };
}
