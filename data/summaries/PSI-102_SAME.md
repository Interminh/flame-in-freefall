---
psi_id: "PSI-102"
name: "SAME"
full_name: "Smoke and Aerosol Measurement Experiment"
doi: "10.60555/gd4k-8h62"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-102"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "Comparitive Soot Diagnostic Hardware"
period: "2001-03-02 to 2008-02-28 (as listed)"
gravity: "microgravity"
fuel_type: "smoke"
materials: ["overheated spacecraft materials (not itemized in the text)"]
geometry: ["near-field hardware in the Glovebox", "Far Field Box"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": null, "max": null}, "flow_cm_s": {"min": null, "max": null}, "diluents": [], "note": "Igniter on for 15 to 60 seconds; each combustion event typically about 2 minutes."}
measurements: ["smoke particle size", "primary and aggregate particle dimensions (TEM)", "sample mass loss", "smoke detector response"]
n_tests: "not stated in the source"
files: [{"name": "PSI-102_Experimental table_SAME.csv", "format": "csv", "size_bytes": 331, "key_columns": "not stated in the source"}]
tags: ["smoke", "particle size", "fire detection", "thermophoretic sampling"]
relevance: {"airflow": "low", "oxygen": "low", "fuel_type": "low", "partial_gravity_anchor": "low"}
caveats: ["No results are stated in the PSI record text.", "Measures smoke, not flame spread or extinction.", "Post-flight microscope grids were reported contaminated in the SAME-R record (PSI-101)."]
related: ["PSI-101"]
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-102", "https://doi.org/10.60555/gd4k-8h62"]
publications_listed_on_psi_page: 16
psi_record_modified: "02-Jun-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

SAME measured the smoke particles produced by overheated spacecraft materials in microgravity on the International Space Station. Crew set up hardware in the Glovebox, ran an igniter for 15 to 60 seconds, each event lasting about 2 minutes, and sampled smoke with thermophoretic probes. Particles were later examined with a transmission electron microscope, and two smoke detectors were checked. The hypothesis is that without buoyancy, smoke particles grow larger than in normal gravity. A prediction code and data for future spacecraft fire detectors were the stated aims. The record text gives no numerical results. Interpretation: smoke detection evidence, not flame spread.
