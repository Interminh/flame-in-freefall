---
psi_id: "PSI-107"
name: "SPICE"
full_name: "Smoke Point In Co-flow Experiment"
doi: "10.60555/9kbh-e962"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-107"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "Microgravity Science Glovebox (MSG)"
period: "not stated in the source"
gravity: "microgravity"
fuel_type: "gas"
materials: ["methane", "ethylene", "propane", "propylene", "propylene mixtures"]
geometry: ["burner diameters 0.41 mm, 0.76 mm and 1.6 mm", "flow duct with integrated nozzles"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": null, "max": null}, "flow_cm_s": {"min": 5.4, "max": 65}, "diluents": [], "note": "Co-flow air velocity 5.4 to 65 cm/s. 526 flames studied in total."}
measurements: ["smoke point", "luminous flame length", "flame height", "radiative heat losses", "co-flow velocity distributions"]
n_tests: 526
files: [{"name": "PSI-107_Experimental table_Spice.csv", "format": "csv", "size_bytes": 31205, "key_columns": "not stated in the source"}]
tags: ["smoke point", "soot", "coflow", "jet flame"]
relevance: {"airflow": "high", "oxygen": "low", "fuel_type": "high", "partial_gravity_anchor": "low"}
caveats: ["No numerical smoke-point results are stated in the PSI record text.", "Start and end dates are blank in the record."]
related: []
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-107", "https://doi.org/10.60555/9kbh-e962"]
publications_listed_on_psi_page: 9
psi_record_modified: "02-Jun-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

SPICE looked for the smoke point, where a flame starts emitting soot, of laminar gas jet flames in microgravity inside the Microgravity Science Glovebox on the International Space Station. Fuels were methane, ethylene, propane, propylene and propylene mixtures, burned from 0.41, 0.76 and 1.6 mm burners in an air coflow of 5.4 to 65 cm/s. Fuel flow was adjusted to find the smoke point, and cameras recorded flame lengths and heights, with radiative heat losses also measured. In total 526 flames were studied. The record states no numerical smoke-point results. Interpretation: sooting evidence for gas fuels, not solid-material flammability.
