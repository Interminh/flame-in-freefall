# Data audit summary

Percent filled = nonempty cells / all cells in the **main per-dataset CSV**. This is structural completeness, not measurement coverage or label confidence. Numeric-cell files can be 100% structurally complete while lacking mapped cabin variables. Outcome `unknown` counts as a populated category. O2/flow ranges below use exact numeric source fields; approximate, interval, list and contextual values are not converted into point measurements. Series conditions are identified separately in DATA_NOTES.md.

| Dataset | Main rows | Columns filled | O2 % range | Flow cm/s range | Combined rows |
|---|---:|---:|---|---|---:|
| PSI-25 BASS-II | 129 | 80.9% | 13.6–22.2 | not available | 129 |
| PSI-26 BASS | 121 | 81.8% | 15.9–22.721982701616103 | not available | 121 |
| PSI-69 FLEX | 274 | 83.0% | 12–34 | not available | 274 |
| PSI-68 FLEX-2 | 8 | 64.3% | not available | not available | 0 |
| PSI-98 SAFFIRE-I | 2 | 82.4% | not available | 20–20 | 2 |
| PSI-99 SAFFIRE-II | 18 | 77.5% | not available | 20–20 | 18 |
| PSI-100 SAFFIRE-III | 2 | 76.7% | not available | 30–30 | 2 |
| PSI-39 CFI | 226 | 75.6% | 17–21 | not available | 226 |
| PSI-117 PSI-117 cool-flame analysis | 23882 | 100.0% | 10–21 | not available | 0 |
| PSI-142 PSI-142 counterflow analysis | 13478 | 100.0% | not available | not available | 0 |
| PSI-20 ACME BRE | 18 | 59.0% | not available | not available | 0 |
| PSI-159 ACME CFI-G | 332 | 70.1% | 12–85 | not available | 332 |
| PSI-22 ACME E-FIELD | 32 | 51.7% | not available | not available | 0 |
| PSI-107 SPICE | 469 | 67.2% | not available | 0.66–85.28 | 469 |
| PSI-10 ACME Flame Design | 327 | 71.4% | 19.8048193–84.9977932 | not available | 327 |
| PSI-21 ACME CLD Flame | 32 | 58.7% | not available | not available | 0 |
| PSI-23 ACME s-Flame | 18 | 60.6% | not available | not available | 0 |
| PSI-106 SLICE | 12 | 52.2% | not available | not available | 0 |
| PSI-102 SAME | 8 | 57.7% | not available | 5–10 | 0 |
| PSI-101 SAME-R | 109 | 67.3% | not available | 0–8.1 | 0 |
| PSI-47 DAFT / DAFT-2 | 23009 | 100.0% | not available | not available | 0 |
| PSI-115 PSI-115 smoke simulation | 266 | 52.1% | not available | not available | 0 |
| PSI-62 PSI-62 BASS modeling | 0 | N/A | not available | not available | 0 |
| PSI-60 PSI-60 SPICE analysis | 0 | N/A | not available | not available | 0 |
