---
psi_id: "PSI-101"
name: "SAME-R"
full_name: "Smoke Aerosol Measurement Experiment-Reflight"
doi: "10.60555/2np7-jv14"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-101"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "Comparitive Soot Diagnostic Hardware; Refer to final report"
period: "2010-07-01 to 2010-09-30 (as listed)"
gravity: "microgravity"
fuel_type: "smoke"
materials: ["Pyrell (intumescent fire-retardant foam)", "DBP samples (replaced)"]
geometry: ["SAME hardware"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": null, "max": null}, "flow_cm_s": {"min": null, "max": null}, "diluents": [], "note": "Higher heating temperatures and a no-flow heating condition were added. 66 test points completed."}
measurements: ["smoke particle size", "smoke detector response", "post-flight data-reduction checks"]
n_tests: "not stated in the source"
files: [{"name": "PSI-101_Experimental table_SAME-R.csv", "format": "csv", "size_bytes": 5674, "key_columns": "not stated in the source"}]
tags: ["smoke", "particle size", "fire detection", "reflight"]
relevance: {"airflow": "low", "oxygen": "low", "fuel_type": "medium", "partial_gravity_anchor": "low"}
caveats: ["No numerical results are stated in the PSI record text.", "Measures smoke, not flame spread or extinction."]
related: ["PSI-102"]
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-101", "https://doi.org/10.60555/2np7-jv14"]
publications_listed_on_psi_page: 6
psi_record_modified: "02-Jun-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

SAME-R repeated the SAME smoke experiment on the International Space Station after the first flight's electron-microscope grids were found contaminated and unusable. It used the same hardware with changes: a new test material, Pyrell (an intumescent fire-retardant foam), replaced DBP samples, heating temperatures went higher and included no-flow heating, and a new in-house instrument, M-pass, replaced one detector enclosure. Flight tests ran from 16 July to 9 September 2010 and completed 66 test points. Post-flight ground tests checked the data reduction. The record text gives no numerical particle results. Interpretation: smoke detector relevance, with broader test conditions than SAME.
