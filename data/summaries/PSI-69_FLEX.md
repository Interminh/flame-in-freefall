---
psi_id: "PSI-69"
name: "FLEX"
full_name: "Flame Extinguishment Experiment"
doi: "10.60555/mbq8-0451"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-69"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "Combustion Integrated Rack (CIR)-Fluids and Combustion Facility (FCF), Multi-user Droplet Combustion Appartatus (MDCA)"
period: "2007-08-01 to 2016-07-31 (as listed)"
gravity: "microgravity"
fuel_type: "droplet"
materials: ["not stated in the source"]
geometry: ["liquid fuel droplets, about 3 mm for the basic tests"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": 50.7, "max": 152.0}, "flow_cm_s": {"min": null, "max": null}, "diluents": ["carbon dioxide", "helium", "SF6"], "note": "Test pressure 0.5 to 1.5 atm for the Limiting Oxygen Index procedure (kPa converted from atm)."}
measurements: ["Limiting Oxygen Index", "droplet burning rate", "extinction behavior", "heat radiation", "soot", "temperature profiles"]
n_tests: "not stated in the source"
files: [{"name": "PSI-69_Experimental table_FLEX.csv", "format": "csv", "size_bytes": 24776, "key_columns": "not stated in the source"}]
tags: ["droplet", "limiting oxygen index", "suppressant", "extinction limit", "pressure"]
relevance: {"airflow": "low", "oxygen": "high", "fuel_type": "medium", "partial_gravity_anchor": "low"}
caveats: ["No results are stated in the PSI record text.", "Specific fuels are not named in the objective, hypothesis or approach fields.", "Slow-flow flight tests had limited diagnostics according to the approach text."]
related: []
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-69", "https://doi.org/10.60555/mbq8-0451"]
publications_listed_on_psi_page: 51
psi_record_modified: "06-Jun-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

FLEX burned large liquid fuel droplets, about 3 mm for the basic tests, in the Multi-user Droplet Combustion Apparatus on the International Space Station. Its main goal was to find the Limiting Oxygen Index, the lowest oxygen level that sustains a flame, as a function of pressure (0.5 to 1.5 atm) and to see how gaseous suppressants such as carbon dioxide, helium and SF6 change it. It also measured burning rates, extinction behavior, radiation, soot and temperature. The hypothesis is that missing buoyant flow changes flammability limits and suppressant effectiveness. The record text gives no numerical results. Interpretation: strong on oxygen and suppressant limits for liquid fuels, not solids.
