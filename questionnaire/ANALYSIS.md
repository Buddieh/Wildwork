# Wildwork questionnaire research

Step 1 of the plan: pick the most accurate public questionnaires for personality and career interests, and turn them into files the site can use.

## The short version

- **Personality: IPIP-NEO-120**, 120 items, used word for word. It measures the Big Five and their 30 facets, it is public domain, and it comes with published age and sex norms. The 30 facets are what make the later steps accurate: the animal and the job matching can both use them.
- **Careers: O*NET Interest Profiler Short Form**, 60 items, used word for word. It is the US Department of Labor's own interest test and it plugs directly into O*NET's ratings of about 900 occupations.
- **The bridge between them: O*NET Work Styles.** Since release 30.1, O*NET rates every occupation on 21 work styles that are organised around the Big Five. That lets the site compare your personality with each job using real occupation data rather than guesswork. [workstyles-map.json](workstyles-map.json) maps the 30 facets onto those styles.
- **I did not write or rewrite any items.** "Make the best questionnaire" for accuracy means picking the best validated instrument and keeping it intact, because reworded items no longer match their norms or reliability figures. The improvements are in scoring and presentation instead (see "Accuracy features").
- **Length:** about 15 to 20 minutes for personality and 5 to 8 for careers. That is long for a fun site, but it is the shortest form that still measures facets reliably. A shorter mode can be added later if friends drop off.

## 1. Personality: what I compared

| Instrument | Items | Measures | Reliability | Norms | Free to use | Verdict |
|---|---|---|---|---|---|---|
| **IPIP-NEO-120** (Johnson 2014) | 120 | 5 domains, 30 facets | domains α .82-.90, facets mean α .78 | yes, by age and sex | public domain | **chosen** |
| IPIP-NEO-300 (Goldberg) | 300 | 5 domains, 30 facets | slightly higher | yes | public domain | too long for friends (45+ min) |
| BFAS (DeYoung et al. 2007) | 100 | 5 domains, 10 aspects | good | no large public norms | public domain | fewer sub-scores, no norms |
| BFI-2 (Soto & John 2017) | 60 | 5 domains, 15 facets | good | limited | free for non-commercial research only | licence unclear for a public site |
| HEXACO-PI-R | 60/100 | 6 factors incl. Honesty-Humility | good | some | free for non-commercial research only | licence; different model from O*NET |
| Mini-IPIP | 20 | 5 domains only | α about .6-.7 | partial | public domain | too unreliable for "accurate" |
| MBTI / 16Personalities | | 4 types | type changes on retest for many people | | proprietary | rejected (copyright and weak reliability) |

**Why IPIP-NEO-120 wins.** It is the only option that is public domain, has facet-level scores and has published norms. Facets matter here: for example, Assertiveness and Gregariousness are both "Extraversion" but point toward very different jobs (a manager versus an events host), and O*NET's work styles are defined at roughly that level of detail.

**Reliability by facet** (Kajonius & Johnson 2019, N = 320,128; stored in [personality.json](personality.json)):

- Domains: Neuroticism .90, Extraversion .89, Openness .82, Agreeableness .85, Conscientiousness .90.
- 26 of the 30 facets are at or above .70. The four below are Emotionality (.66), Dutifulness (.67), Cooperation (.69) and Liberalism (.69).

**Known weaknesses, and what I recommend doing about them**

1. **Liberalism uses US political items** ("Tend to vote for liberal political candidates", "Believe that we should be tough on crime"). They may read oddly for friends outside the US and the facet is the weakest link in Openness. Recommendation: keep the items so the Openness norms stay valid, but leave Liberalism out of the animal and job matching and don't show it as a headline result.
2. **Weak facets** (the four above): show them with their wider uncertainty band (scoring.js already does this) and give them less weight in matching.
3. **Modesty barely relates to Agreeableness** in the structural analysis. That is fine for us: O*NET has a separate Humility work style, and Modesty maps onto it directly.
4. **Norms come from volunteers online, mostly in the US.** Percentiles mean "compared with people who took this test online", which is the best public norm set available. The site should say so in one line.
5. **Self-report bias.** People describe their ideal selves. The standard IPIP instructions ("as you generally are now, not as you wish to be") are kept in the file to reduce this.

## 2. Careers: what I compared

| Instrument | Items | Reliability | Links to occupations | Free to use | Verdict |
|---|---|---|---|---|---|
| **O*NET Interest Profiler Short Form** | 60 | α .78-.87, retest .78-.86 | direct, about 900 O*NET occupations | CC BY 4.0 | **chosen** |
| O*NET Mini-IP | 30 | α .70-.81 | direct | CC BY 4.0 | noticeably less reliable, only saves 3 minutes |
| O*NET Interest Profiler (long) | 180 | higher | direct | CC BY 4.0 | too long |
| IPIP RIASEC markers (Armstrong et al. 2008) | 48 | good | indirect | public domain | no direct link to occupation data |
| Strong Interest Inventory | 291 | very good | own database | proprietary, paid | not possible |

**Why interests and not just personality?** For "which job will suit me", interests are the stronger predictor: they are what people's occupational choice and satisfaction track most closely. Personality adds the part interests miss, mostly how well someone fits the day-to-day demands of a job. The two overlap only moderately (Extraversion with Enterprising about .35-.48, Openness with Artistic about .24-.48, Openness with Investigative about .21-.42, Conscientiousness with Conventional about .19-.25), so asking both adds real information.

**Weaknesses and how they are handled**

1. **Some items feel dated or US-specific** ("Perform jazz or tap dance", "Operate a calculator", "Record rent payments"). I kept them, because each type's score depends on all ten items together. If friends find any of them confusing, swapping a single item is possible but should be labelled as a change, as the licence requires.
2. **The official test asks about education separately.** I added a "how much more training are you willing to do" question (O*NET Job Zones 1-5) as a filter, not a score, which is how the official profiler narrows results.
3. **Order.** Items rotate through R, I, A, S, E, C so the same type never clusters. This does not change scoring.

## 3. How the two combine (plan for step 3, not built yet)

1. **Interest fit (main weight).** Correlate the person's six RIASEC scores with each occupation's six O*NET interest ratings. Using the full profile is more accurate than matching only the top three letters.
2. **Personality fit (secondary weight).** Turn facet scores into the 21 work-style scores using [workstyles-map.json](workstyles-map.json), then compare them with each occupation's work-style impact ratings (O*NET 30.1, scale -3 to +3).
3. **Filter by Job Zone** from the training question.
4. Suggested starting weights: about 70% interests and 30% personality, to be checked against example profiles once the occupation data are loaded.

Caveats to keep in mind: the facet-to-work-style map is my content-based judgement and has not been tested; O*NET's new work-style ratings were produced with a mixed AI and expert method; and O*NET describes the US labour market.

## 4. Accuracy features in the scoring

All in [scoring.js](scoring.js), checked against an independent implementation (five-factor-e, which follows Johnson's own scoring program): identical T-scores on a test case.

- **Norms by age band and sex**, with averaged norms when sex isn't given. Raw score becomes a T-score (mean 50, SD 10) and a percentile.
- **Uncertainty bands.** Every score carries a 95% range based on its reliability, so a weak facet shows a wide range instead of false precision.
- **Careless-answering checks** following Johnson (2005): individual reliability (do your answers agree with themselves across matching item halves?) plus the longest run of identical answers. In a test, random answers scored .04 and were flagged; a consistent responder scored 1.00. Flagged results should be shown with a gentle "your answers looked inconsistent, want to retake?".
- **Ties are shown as ties.** Interest scores within 3 points are marked as tied, and a flat profile (all six close together) is flagged instead of forcing a top letter. The 3-point threshold is a heuristic.
- **Missing answers.** A facet with one missing item is prorated; more than one leaves it unscored.

## 5. Choices I made for you

- **Age and sex questions:** ask both as optional, because the norms differ by them. Without them the site uses averaged norms for ages 21-40.
- **Answer scales:** kept exactly as published (5 points for both tests).

## Files

| File | What it is |
|---|---|
| [personality.json](personality.json) | 120 items with domain, facet and keying; scale labels; instructions; reliabilities |
| [norms-ipip-neo-120.json](norms-ipip-neo-120.json) | Means and SDs for 5 domains and 30 facets, 12 groups (male, female, combined × 4 age bands) |
| [interests.json](interests.json) | 60 items with RIASEC type; scale labels; instructions; reliabilities; Job Zone filter |
| [workstyles-map.json](workstyles-map.json) | Facets → O*NET work styles bridge |
| [scoring.js](scoring.js) | Reference scoring for both tests, plus quality checks |

## Sources

- Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. *Journal of Research in Personality, 51*, 78-89. Item list checked against Table 1 ([copy](https://bpb-us-e1.wpmucdn.com/sites.psu.edu/dist/1/163537/files/2023/07/IPIPNEO120.pdf)).
- Kajonius, P. J., & Johnson, J. A. (2019). Assessing the structure of the Five Factor Model of Personality (IPIP-NEO-120) in the public domain. *Europe's Journal of Psychology, 15*(2). [PMC7871748](https://pmc.ncbi.nlm.nih.gov/articles/PMC7871748)
- Johnson, J. A. (2005). Ascertaining the validity of individual protocols from Web-based personality inventories. *Journal of Research in Personality, 39*, 103-129.
- Norm tables: Johnson's IPIP-NEO-120 scoring program, as reproduced in [five-factor-e](https://pypi.org/project/five-factor-e/) (MIT). Item keys cross-checked against both that package and the [bigfive-test.com item set](https://github.com/Alheimsins/b5-johnson-120-ipip-neo-pi-r).
- O*NET Interest Profiler Short Form: [items](https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf), [psychometrics](https://www.onetcenter.org/dl_files/IPSF_Psychometric.pdf), [Mini-IP report](https://www.onetcenter.org/dl_files/Mini-IP.pdf), [answer scale](https://services.onetcenter.org/reference/mnm/ip/ip_questions).
- O*NET Work Styles revision: [report](https://www.onetcenter.org/reports/Higher_Order_Styles.html), [draft taxonomy](https://onetcenter.org/dl_files/Work_Styles_New.pdf), [30.1 file format](https://www.onetcenter.org/dictionary/30.1/text/work_styles.html).
- Personality-interest overlap: ACT, [Relationship among traits relevant to readiness](https://www.act.org/content/act/en/research/reports/act-publications/beyond-academics/toward-an-integrated-framework-of-education-and-work-readiness/relationship-among-traits-relevant-to-readiness.html), summarising Larson, Rottinghaus & Borgen (2002) and related meta-analyses.

Credit line the site must show: *This site incorporates information from the O\*NET Interest Profiler by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O\*NET® is a trademark of USDOL/ETA.*
