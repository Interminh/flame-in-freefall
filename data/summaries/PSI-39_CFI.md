---
psi_id: "PSI-39"
name: "CFI"
full_name: "Cool Flames Investigation"
doi: "10.60555/m6pj-a914"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-39"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "Multi-User Droplet Combustion Apparatus (MDCA), Combustion Integrated Rack (CIR)"
period: "2020-10-01 to 2021-10-20 (as listed)"
gravity: "microgravity"
fuel_type: "droplet"
materials: ["n-dodecane", "n-dodecane/iso-dodecane mixtures", "farnesane"]
geometry: ["droplets suspended between needles or on silicon-carbide fibers"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": 25.3, "max": 506.6}, "flow_cm_s": {"min": null, "max": null}, "diluents": ["oxygen", "nitrogen", "helium"], "note": "Objectives give 0.25 to 5 atm (converted to kPa) but the approach gives 0.25 to 0.5 atm. Diluents as written: 'molecular oxygen, atomic nitrogen, and helium'."}
measurements: ["droplet size", "OH* emission", "flame size", "flame radiation", "extinction diameter", "soot"]
n_tests: "not stated in the source"
files: [{"name": "PSI-39_Experimental table_CFI.csv", "format": "csv", "size_bytes": 7792, "key_columns": "not stated in the source"}]
tags: ["cool flames", "droplet", "helium dilution", "extinction diameter", "low-temperature chemistry"]
relevance: {"airflow": "low", "oxygen": "medium", "fuel_type": "medium", "partial_gravity_anchor": "low"}
caveats: ["No numerical results are stated in the PSI record text.", "The pressure range differs between the objective and approach fields.", "The hypothesis field spells farnesane as 'faresane'."]
related: ["PSI-69"]
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-39", "https://doi.org/10.60555/m6pj-a914"]
publications_listed_on_psi_page: 7
psi_record_modified: "03-Jun-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

CFI burned fuel droplets at low temperature, producing cool flames, in the Multi-User Droplet Combustion Apparatus inside the Combustion Integrated Rack on the International Space Station. Fuels were n-dodecane, n-dodecane and iso-dodecane mixtures, and farnesane, diluted with oxygen, nitrogen and helium. Droplets hung between needles or on silicon-carbide fibers and were lit with a hot wire. Cameras, including an ultraviolet camera for OH* emission, and radiometers tracked droplet size and flame behavior. Goals were droplet extinction diameters, pressure and helium effects, and soot. The record gives pressures of 0.25 to 5 atm in the objectives but 0.25 to 0.5 atm in the approach, and no numerical results. Interpretation: fuel chemistry, not material fire safety.
