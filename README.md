# flame-in-freefall
NASA Space Apps 2026

## Partial-gravity flammability simulation

The Simulation tab (`simulation.html`) estimates whether a solid fuel keeps burning as a function of oxygen, airflow,
material and gravity, and compares the Moon (0.165 g) and Mars (0.38 g) with 1 g and microgravity.

**It is an estimate from a simplified model. It is not a prediction of a real fire and it is not NASA-endorsed.**

### Run it

```
npm install
npm run dev          # then open http://127.0.0.1:5173/simulation.html
npm run test:sim     # 36 unit and data-integrity tests, no extra dependencies
npm run sim:calibrate  # refit, rewrite data/derived/*.json and fm2-predictions.csv (about 10 s, seeded, reproducible)
```

The page needs a server because it loads JSON, the same as the Ranking page.

### What is in it

| Path | Role |
| --- | --- |
| `src/sim/model.js` | The model. Pure functions, every constant in `PARAMS` with its status. |
| `src/sim/fm2.js` | Builds the lunar prediction table. Used by the page and by the CSV script. |
| `scripts/sim/calibrate.mjs` | Fits the model, runs validation, writes `sim-params.json` and `sim-validation.json`. |
| `scripts/sim/fm2.mjs` | Writes `data/derived/fm2-predictions.csv`. |
| `data/derived/bass2_flow_points.csv` | 59 flow points read from the BASS-II notes, each with a verbatim quote, what event it describes, and whether it is used in the fit. 54 are used. |
| `data/derived/nasa_1g_anchors.csv` | 17 numbers and statements from NASA-hosted documents, each with a verbatim quote, the NTRS record and the page. |
| `data/derived/saffire2_ground_checks.csv` | Three SAFFIRE-II cases from `data/psi_99.csv` where the whole sample burned, used as a 1 g check. |
| `data/derived/literature_loc_checks.csv` | The figures from the task brief and two non-NASA references, kept for the record and no longer used. |
| `tests/sim/model.test.mjs` | Unit tests for the physics, plus checks that every quote, thickness and oxygen value matches the raw table. |
| `simulation.html`, `js/simulation.js`, `src/styles/simulation.css` | The page. Three views: Simulator, FM2 predictions, and How it works and limits. |

Raw data in `data/psi_*.csv` is only read, never changed. Everything the simulation writes goes to `data/derived/`.

### The model

1. **Buoyant flow.** `U_b = U_1g * sqrt(g)`, with g in units of Earth gravity and `U_1g` about 20 cm/s (range 15 to 25).
   Both the square-root scaling and the size come from NASA papers on PMMA rods (anchors A1, A2).
2. **Combining flows.** `U_eff = (U_forced^n + U_b^n)^(1/n)`. One NASA paper derives n = 4 by equating boundary-layer
   thicknesses (NTRS 20200000557, Eq. 6, anchor S1). Another uses a plain sum, n = 1 (NTRS 20170006615, anchor S2).
   The central value is 4 and the uncertainty bands sample 1 to 4.
3. **Burn window.** The flame starves below a quench flow `U_q` and blows off above `U_bo`.
   - `ln U_q = lnUq0[material] + gamma*(21 - O2e) + dirShift*[concurrent]`, fitted to the BASS-II points. NASA describes this
     branch as an exponential (anchor S3).
   - `U_bo = (O2e - 13.4) / 0.13`, a straight line in oxygen, as NASA reports (anchor A4). It reaches zero flow at 13.4% O2
     (anchors A5, A6) and passes through 16% O2 at the 1 g buoyant flow (anchor A3). The slope, 0.13 points of oxygen per
     cm/s, follows from those two.
   - `P(burn) = sigmoid(sq * ln(U_eff/U_q)) * sigmoid(sb * ln(U_bo/U_eff))`, U-shaped in flow. Below the intercept
     nothing burns.
4. **Limiting oxygen concentration (LOC).** The O2 at which `P(burn) = 0.5`, found by bisection. The margin is the LOC at
   1 g minus the LOC here, at the same forced flow.
5. **Uncertainty.** 200 draws. Each refits the quench side on a cluster bootstrap of the tests (resampling whole tests),
   samples the NASA-anchored constants over the ranges those sources support, samples `sb`, and adds a log-normal spread to
   `U_b` that grows with gravity.

Pressure acts only through oxygen partial pressure, `O2e = O2 * p / 101.325`. NTRS 20200000557 also scales the mixed flow by
`P/P0`. That factor is not in this model, and it cannot be tested with BASS-II, which has no pressure data.

Constants and where each comes from:

| Constant | Status | Value (range sampled) | Source |
| --- | --- | --- | --- |
| Buoyant flow at 1 g | NASA source | 20 cm/s (15 to 25) | A1, A2 |
| Flow combination exponent n | NASA sources | 4 (1 to 4) | S1, S2 |
| Blow-off intercept | NASA source | 13.4% O2 (13.3 to 13.6) | A5, A6 |
| Oxygen at the 1 g limit | NASA source | 16% O2, fixed | A3 |
| Blow-off edge sharpness `sb` | assumed | 2.5 (1 to 4) | |
| `gamma`, `sq`, quench flow per material, `dirShift`, `beta` | fitted to BASS-II | see below | |
| Gravity spread, label thresholds, flow floor | assumed | 0.5 and 0.1 g, 0.65 and 0.35, 0.3 cm/s | |

An earlier version assumed two constants, `theta = 0.3` and `L = 5 cm`, which gave a 1 g buoyant flow of 38 cm/s, about
twice what NASA reports, combined flows as a root-sum-square with no source, and rejected blow-off parameters against
three notes. All of that is replaced. The quench-side fit hardly moved, since it uses only microgravity data.

### The search for NASA 1 g data

Scope, as agreed: NASA-hosted sources only (PSI, NTRS, nasa.gov, standards.nasa.gov). I read the publication lists of
PSI-25, PSI-26 and PSI-62, ran NASA-restricted searches, and downloaded and read the documents that looked relevant.

**Not found:** a table of 1 g outcomes across oxygen and flow levels. The PSI-25 raw files are mostly video and images, and the 1 g blow-off data in NTRS 20170006615 is in plots only. I do not read numbers off plots. The only 1 g outcomes are the SAFFIRE-II ground comparisons already in `data/psi_99.csv`, at one condition. I missed them on the first pass and said there were none. That was wrong.

**Found, and used** (each is a row in `data/derived/nasa_1g_anchors.csv`, with the quote and page, checked against the PDF
text when the file was built):
- NTRS 20170006615 (Marcum, Ferkul, Olson, 2017): normal-gravity blow-off of PMMA rods, a buoyant flow of about 20 cm/s and
  17 cm/s for the smallest rod, a linear blow-off boundary, and a zero-stretch limit of 13.4% O2.
- NTRS 20160000593 (Ferkul et al., 2014 poster): a 1 g blow-off limit of 16% O2 for a quarter-inch rod against steady
  spreading down to 13.6% in BASS-II (a "negative oxygen margin of safety of 2.4% O2"), and film quench and blow-off flows.
- NTRS 20150008961 (Olson and Ferkul, 2015): the blow-off line intercept of 13.3% O2 and an exponential quench branch.
- NTRS 20190030735 (Ferkul, 2019 briefing): reduced-gravity flows of 5 to 20 cm/s and a margin of 1.4% O2.
- NTRS 20200000557: the mixed-flow rule `U_m = U_f (P/P0) [g^2 l^2 / U_f^4 + 1]^(1/4)`. The equation was read from the
  rendered page, because text extraction garbled it.
- NTRS 20130012832 (Ferkul, 2013): downward flame spread over SIBAL "is not possible in normal air".
- PSI-99 (SAFFIRE-II, already in `data/`): 1 g ground comparisons at 20 cm/s concurrent flow and about 22% O2, used as a check.

**Found, not used:** NTRS 20070018178 (WSTF oxygen thresholds, upward burning of aerospace materials, no PMMA). Downloaded but
not read: NTRS 20170004702 (NASA-STD-6001B Test 1 method) and 20150004099. One PDF (NTRS 20140011099) did not extract.

**Next places to look:** the BASS-II Summary Report (NTRS 20210011385, about 47 MB, not downloaded) may have test tables, and
the SIBAL and thin-film tests may have 1 g counterparts in the narrow-channel papers (NTRS 20140004923).

### Data it is fitted to

BASS-II (PSI-25) has **no usable airflow column**. `flow_velocity_cm_s`, pressure, gravity and spread rate are all
empty in the cleaned table, and the data notes say the fan and air display values are not calibrated cm/s. The
only flow evidence is the crew notes and the air-display column. So the quench side is fitted to points read from those,
in `data/derived/bass2_flow_points.csv`: 59 points from 39 tests, of which **54 points from 36 tests are used**.
Each point carries the quote it came from, and tests check every quote, test ID, oxygen value, direction and
thickness against `data/psi_25.csv`. A person has not yet checked the readings by eye.

Material classes and points used: thin PMMA film (11), thick PMMA slab (16), PMMA rod (16) and SIBAL fabric (11).
Not offered, because no flow-linked outcomes exist: Nomex, Ultem and wax. Spread rate is not shown because the raw
tables contain none for BASS-II.

**How points were read, and the second pass.** The air-display column is in time order. A first pass put every
stated burn and every stated extinction in as equals. That mixed different things: flames that went out while flow
was being reduced (a real starvation limit) and flames that went out for other reasons. A second pass gave every
point an `event` and a `use_in_fit` flag:

| Event | Meaning | Used |
| --- | --- | --- |
| `burning_sustained` | The notes say the flame burned or spread at this flow. | yes |
| `quench_ramp_down` | The flame went out while flow was being reduced. | yes |
| `blowoff` | Blown off by high flow. | yes, blow-off side only |
| `burning_at_ignition` | Only the flow at ignition is stated. | no |
| `extinct_not_flow_limited` | The flame went out but the notes do not tie it to a flow reduction. | no |

Five points are left out, each with its reason in the file: M2 (flame already dying, flow was raised), M3 (flow rose
before it went out, cause unclear), M9 twice (ignition only, then the flame weakened and flow was raised) and P21a
(went out when the sample end flattened). Thickness was also filled in from the raw sample description for five
tests where the cleaned column is blank (B6, B8, B9, B15 and M15), and a test checks each against that text.

The repo has **almost no 1 g outcome data**. The Earth panel rests on the NASA numbers above, which are for PMMA rods. The one exception is SAFFIRE-II (PSI-99), whose ground comparisons are used as a check, not to fit.

### Validation

Run by `scripts/sim/calibrate.mjs`, numbers in `data/derived/sim-validation.json`. Brier score: lower is better.
The baseline is always predicting the training prevalence. A "leave one test out" fold hides every point from one
test, so points from the same test never help predict each other. These three checks use microgravity data only.

| Check | Accuracy | Brier | Baseline Brier | Verdict |
| --- | --- | --- | --- | --- |
| In-sample (54 points) | 0.85 | 0.115 | 0.209 | Fits |
| Leave one test out (36 folds) | 0.80 | 0.141 | 0.213 | Beats the baseline |
| **Leave one material out** (4 folds) | 0.69 | 0.258 | 0.217 | **Does not beat the baseline** |

Per material. "Wrong side" is how many fitted points the model calls the opposite of what was seen. The last column is
the accuracy of always guessing the commoner outcome for that material.

| Material | Points | Wrong side (in-sample) | Right on unseen tests | Always guessing commoner |
| --- | --- | --- | --- | --- |
| PMMA film | 11 | 0 | 1.00 | 0.82 |
| PMMA rod | 16 | 1 | 0.88 | 0.75 |
| SIBAL fabric | 11 | 2 | 0.82 | 0.73 |
| **PMMA thick slab** | 16 | 5 | **0.56** | **0.56** |

**Thick slab is still the weak case.** In-sample, 5 of 16 points are on the wrong side. On unseen tests the model is
no better than guessing the commoner outcome (0.56 against 0.56, Brier 0.258 against 0.272). Slab extinctions at 5
to 12 cm/s happened at oxygen levels from 18 to 22% with no clear oxygen trend, and the model has no term that
explains that. Leave one material out, by held-out material: film 1.00, rod 0.75, SIBAL 0.55, slab 0.50 (Brier 0.452
against 0.286). **Do not use the tab for a material outside the four offered.**

**Thickness.** Tested as a model term shared by film and slab, `ln U_q += beta * ln(thickness)`. The rule was set before
the test: keep it only if it lowers the leave-one-test-out Brier score on the same points.

| Variant | In-sample acc. / Brier | Leave one test out acc. / Brier | Leave one material out acc. / Brier |
| --- | --- | --- | --- |
| Without thickness | 0.85 / 0.115 | 0.80 / 0.141 | 0.69 / 0.258 |
| With thickness | 0.89 / 0.109 | 0.82 / 0.153 | 0.59 / 0.312 |

It improved the fit to the data it was trained on and slightly raised held-out accuracy, but the held-out Brier got worse
and leave-one-material-out got much worse. By the rule it is **not in the model** (`beta = 0`). The thickness box on the
page picks similar experiments and warns when thickness is outside the fitted range, and says it does not change the
chance of burning. To switch the term on anyway, run `node scripts/sim/calibrate.mjs --thickness=on`. The direction term
(concurrent versus opposed) changed sign between versions of the fit, from about -0.1 to +0.4, so treat it as unreliable.

**Checks against NASA numbers that were not used to build the model.** The pass rules were fixed in the code before the
results were seen.

| Check | NASA says | Model | Result |
| --- | --- | --- | --- |
| Lowest oxygen that burns, PMMA rod | 13.3 to 13.6% | 14.1% (5 to 95%: 13.7 to 14.7) | Passes, but 0.5 points high |
| 1 g limit minus that minimum | 1.4 to 2.4 points | 1.9 (0.4 to 5.8) | Passes |
| Buoyant flow at 0.165 g (Moon) | 5 to 20 cm/s | 8.1 (3.7 to 16.2) | Passes |
| Buoyant flow at 0.38 g (Mars) | 5 to 20 cm/s | 12.3 (5.0 to 27.9) | Passes |
| Quench flow, 0.1 mm film, 21% O2 | below 2 cm/s | 0.9 | Passes |
| Blow-off flow, 0.1 mm film | about 40 cm/s | 35 to 58 across 18 to 21% O2 | Passes (loose, oxygen not stated) |
| BASS-II note: no blow-off at 29 cm/s | burned | P(burn) 0.70, right in 100% of draws | Passes |
| BASS-II note: no blow-off at 22 cm/s | burned | P(burn) 0.61, right in 82% of draws | Passes |
| BASS-II note: blow-off at an air display of 47 | blown off | P(burn) 0.23, right in 100% of draws | Passes |
| **Downward spread over SIBAL in 1 g air** | **not possible** | **P(burn) 0.94 (0.87 mean over draws)** | **Fails** |
| SAFFIRE-II 2-5, SIBAL, 1 g, 20 cm/s concurrent, 22.1% O2 | whole sample burned | P(burn) 0.84 (0.61 to 0.98) | Passes |
| SAFFIRE-II 2-5, SIBAL, 0 g, same conditions | whole 29 cm burned | P(burn) 0.93 (0.80 to 0.99) | Passes |
| SAFFIRE-II 2-8, PMMA, 1 g, 20 cm/s concurrent, 22.0% O2 | whole sample burned | P(burn) 0.72 (0.00 to 0.95) | Passes, but the band spans 0 to 95% |

The 1 g limit of 16% oxygen for rods is not a check, because it was used to place the blow-off line. The three BASS-II
notes used to constrain the blow-off side in the earlier version are now independent checks, and they pass.

**The SIBAL failure is real.** NASA says downward flame spread over SIBAL does not happen in normal air, and the model
says it does. It is the only 1 g outcome found for opposed flow, and it shows that letting gravity act only
through the buoyant flow is too simple, at least for thin fabric. I did not tune the model to fix it. The page shows a
warning when a SIBAL opposed-flow case at high gravity comes up. The film and slab 1 g results are untested for opposed flow.

**The SAFFIRE-II cases are a weak test.** All three are concurrent flow at 20 cm/s and about 22% oxygen, where nearly everything burns, so passing says little. The PMMA band spans 0 to 95%. The pass rule was written after I had seen the model's numbers once, so unlike the other checks it was not set blind. Not scored: silicone and Nomex (not offered), tests 2-6 and 2-9 (material blank in the data) and PMMA in microgravity (about 10 cm burned, neither a clear burn nor a clear failure). The source column `1_g_burn_length` reads "Complete", which I take to mean the flame burned the whole sample.

Figures from the task brief (15.6% at 1 g falling to 13 to 14% at 0.05 to 0.1 g) have no citation and are not used.
For reference, with no forced airflow the model gives 16.0% for a rod at 1 g and 14.1% to 14.3% at 0.05 to 0.1 g.

Fitted values, central fit: quench flow at 21% oxygen is 0.9 cm/s for film, 0.6 for rod, 0.9 for SIBAL and 6.5 for
slab. The O2 sensitivity is 0.15 per percentage point.

### The page

The Simulator view takes the inputs and shows the chance of burning with its 5 to 95% range bar, warning labels, and one
flammability map drawn for exactly those inputs (the gravity from the slider, not a fixed set of panels). Shading is the
chance of burning, the solid line is the limiting oxygen at your gravity with its 5 to 95% band, and dashed lines show
the middle estimate of the same line at 0 g, Moon, Mars and 1 g for comparison. A key above the map names each line, so the plot itself has no text labels, and the oxygen axis stops at 30%. Hatching marks the area outside the
BASS-II oxygen and flow range. Every real microgravity test of the chosen material is a dot: filled for burned, open
circle for went out, open diamond for blown off, a dark ring where the 0 g model is on the wrong side, and a grey cross
for points that were read but left out. Clicking a dot (or a row of the nearest-experiments table) fills a small details box beside the map
with the PSI link, conditions, what happened, how the flow was read, the quote, whether it was used in the fit and what
the 0 g model says. A fit-quality sentence for the chosen material sits under the map.

A "Warnings for these inputs" box is always shown and lists every case-specific warning (rules in `src/sim/warnings.js`,
tested in `tests/sim/warnings.test.mjs`): known miss, outside the data, extrapolated gravity, weak fit (held-out accuracy
no better than guessing the commoner outcome), wide range (5 to 95% range wider than 50 points), no clear difference
from 1 g, hidden risk and the weakly supported flow direction term. It sits beside the map and result, so the graph, the range bar and the warnings share one screen on a laptop.

The **How it works and limits** view (also reachable at `simulation.html#how`) explains the method in plain language:
how a result is calculated, how to read each output, every constant with its status, a table of the NASA numbers with
their quotes and links, the data and what was excluded, per-material fit quality, the table of NASA checks (including the
one that fails), the limitations and a glossary. The tables and counts in it are filled from `sim-params.json` and
`sim-validation.json`, so they cannot drift from the numbers above.

### FM2 predictions

The second view lists seven predictions at 0.165 g that a Flammability of Materials on the Moon (FM2) experiment could
confirm or refute, and exports them as CSV (`data/derived/fm2-predictions.csv`). Each material gets up to one hidden-risk
case, where it burns on the Moon but would not at 1 g, and one near-boundary case at a different oxygen level. Thick slab
has no hidden-risk case, because its quench flow is above the Moon's buoyant flow. Conditions stay inside the BASS-II
oxygen and flow range. Film and slab rows carry the default thickness. They are model outputs with wide bands. The table
says nothing about the real FM2 hardware or plans.

### Known limits

- Gravity enters only through buoyant flow. The SIBAL miss shows this is too simple for thin fabric. Radiation, ignition,
  sample size and geometry are ignored.
- Solid-fuel flame spread only.
- All fitted outcome data is microgravity. Every other gravity level rests on NASA numbers for PMMA rods, applied to all materials, and is checked against one set of 1 g ground tests (SAFFIRE-II, concurrent flow near 22% oxygen).
- NASA papers disagree on how forced and buoyant flow combine. The bands cover a plain sum to a fourth-power rule.
- Pressure was not recorded in BASS-II. The fit assumes about 101.3 kPa, and the NASA `P/P0` factor is not modelled.
- The flow readings are hand-read from notes. They have not been double-checked by a second person.
- Many burns lasted 10 to 30 minutes while the sample heated and shrank. The model treats each observation as a steady
  condition. Width, one-sided versus two-sided burning and sample length also vary and are not modelled.
- The thick slab fit is weak, and the model does not carry over to materials it has not seen.
- The rod minimum is 0.5 points above NASA's figure, so the model is a little cautious there.
- The page was checked in headless Chrome: no JavaScript errors, every control changes the output, and there is no
  horizontal overflow at 390 px. The only console message is a missing favicon, which every page here has. It was not
  tested in Safari or Firefox.
