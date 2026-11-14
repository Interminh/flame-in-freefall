---
psi_id: "PSI-21"
name: "ACME CLD Flame"
full_name: "Advanced Combustion via Microgravity Experiments / Coflow Laminar Diffusion Flame"
doi: "10.60555/23e1-9950"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-21"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "Combustion Integrated Rack (CIR), ACME"
period: "2006-10-01 to 2022-05-31 (as listed)"
gravity: "microgravity"
fuel_type: "gas"
materials: ["methane", "ethylene"]
geometry: ["weak coflow diffusion flames"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": null, "max": null}, "flow_cm_s": {"min": null, "max": null}, "diluents": ["fuel dilution (diluent not named in the text)"], "note": "Coflow velocity and fuel dilution are the variables; no numeric ranges are given."}
measurements: ["flame shape", "lift-off height", "temperature (thin-filament pyrometry)", "extinction limits", "soot luminosity", "soot volume fraction", "OH* and CH* chemiluminescence"]
n_tests: "not stated in the source"
files: [{"name": "PSI-21_Experimental table_CLD Flame.csv", "format": "csv", "size_bytes": 2454, "key_columns": "not stated in the source"}]
tags: ["coflow", "diffusion flame", "soot", "model validation"]
relevance: {"airflow": "medium", "oxygen": "low", "fuel_type": "medium", "partial_gravity_anchor": "low"}
caveats: ["No numerical results are stated in the PSI record text.", "Text is written in planning form ('we plan to study')."]
related: []
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-21", "https://doi.org/10.60555/23e1-9950"]
publications_listed_on_psi_page: 18
psi_record_modified: "22-Jan-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

ACME CLD Flame studied weak coflow diffusion flames of methane and ethylene in microgravity on the International Space Station, to give computer models benchmark data. It varied coflow velocity and fuel dilution, and measured flame shape, lift-off height, temperatures and extinction limits for dilute flames. For sooting flames it measured soot luminosity, soot temperatures and soot volume fractions, using OH* and CH* chemiluminescence, thin-filament pyrometry and laser extinction. The results are meant to improve models, including soot sub-models, across low to high soot loading. The record text states no numerical results. Interpretation: model validation data for gas flames, with little link to solid fuels.
