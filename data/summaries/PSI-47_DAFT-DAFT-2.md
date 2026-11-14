---
psi_id: "PSI-47"
name: "DAFT / DAFT-2"
full_name: "Dust and Aerosol Measurement Feasibility Test / Dust and Aerosol Measurement Feasibility Test-2"
doi: "10.60555/ztgj-d202"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-47"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "TSI P-Trak"
period: "2003-03-01 to 2009-06-01 (as listed)"
gravity: "microgravity"
fuel_type: "not applicable (aerosol standard, not a fuel)"
materials: ["Arizona Red Dust aerosol, dispersed with nitrogen"]
geometry: ["15-liter Mylar bags"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": null, "max": null}, "flow_cm_s": {"min": null, "max": null}, "diluents": [], "note": "This is an instrument test, not a combustion test."}
measurements: ["particle counts from the modified TSI P-Trak", "comparison with DustTrak"]
n_tests: "not stated in the source"
files: [{"name": "PSI-47_Experimental table_DAFT.csv", "format": "csv", "size_bytes": 518, "key_columns": "not stated in the source"}]
tags: ["instrument test", "aerosol", "fire detection", "feasibility"]
relevance: {"airflow": "low", "oxygen": "low", "fuel_type": "low", "partial_gravity_anchor": "low"}
caveats: ["No numerical results are stated in the PSI record text.", "Not a combustion experiment; it supported the SAME smoke experiment."]
related: ["PSI-102"]
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-47", "https://doi.org/10.60555/ztgj-d202"]
publications_listed_on_psi_page: 2
psi_record_modified: "02-Jun-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

DAFT and DAFT-2 were instrument tests on the International Space Station, not fire tests. They checked that a modified TSI P-Trak particle counter works in microgravity, to reduce risk for the SAME smoke experiment. The original counter relies on gravity to recycle isopropyl alcohol, so it was redesigned to use capillary action and its orientation switch was removed. Arizona Red Dust, dispersed with nitrogen into 15-liter Mylar bags, served as the test aerosol, and the P-Trak was compared with a DustTrak counter. It was hypothesized that the unmodified counter could clog or over-count. The record states no numerical results. Interpretation: not usable for flame or fuel comparisons.
