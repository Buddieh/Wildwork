# Wildwork

**Find your animal, then find your work.**

Wildwork is a two-part quiz for friends:

1. **Personality.** 116 multiple-choice questions from the IPIP-NEO-120, a public-domain Big Five inventory (its 4 US-politics items are left out), scored against published norms for your age and sex. Your profile across the five traits and 29 facets assigns you one of 16 animals, drawn as a constellation whose five brightest stars are your traits.
2. **Career.** 60 questions from the O*NET Interest Profiler (RIASEC). Your interest profile, combined with your personality facets, is matched against O*NET occupations to suggest jobs that fit.

Both questionnaires use the original validated items word for word, so the scores mean what the research says they mean.

**Website:** https://buddieh.github.io/Wildwork/

## How it's built

A static site with no build step and no server: everything runs in the browser and answers never leave it.

- `index.html`, `app/`: the site. `app/match.js` is the job matching, `app/animals.js` the animals, `app/constellations/` their drawings.
- `questionnaire/`: items, norms and scoring, with the research notes in [ANALYSIS.md](questionnaire/ANALYSIS.md).
- `data/jobs.json`: O*NET occupations, rebuilt monthly by `.github/workflows/job-data.yml`.
- `.github/workflows/pages.yml` publishes the site to the `gh-pages` branch whenever any of this changes on `main`.

To run it locally, serve the repository root, for example `python3 -m http.server`, and open http://localhost:8000.
