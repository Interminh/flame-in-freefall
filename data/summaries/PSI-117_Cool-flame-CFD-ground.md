---
psi_id: "PSI-117"
name: "Cool flame CFD"
full_name: "Effect of External Thermo-Convective Perturbation on Cool Flame Dynamics: A Multidimensional Multi-Physics CFD Analysis"
doi: "10.60555/gz0q-b577"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-117"
license: "CC0-1.0"
platform: "not stated in the source"
facility: "not stated in the source"
period: "2017-02-15 to 2022-02-14 (as listed)"
gravity: "microgravity"
fuel_type: "droplet"
materials: ["n-alkane droplets"]
geometry: ["droplets of 1 to 4 mm", "sub-millimeter droplets, about 0.5 mm"]
conditions: {"o2_pct": {"min": null, "max": null}, "pressure_kpa": {"min": null, "max": null}, "flow_cm_s": {"min": null, "max": null}, "diluents": ["ozone-assisted cases"], "note": "Sweeps of forcing amplitude and frequency, ambient composition and pressure; no numeric ranges are given."}
measurements: ["ignition delay", "oscillation frequency and amplitude", "stand-off diameter", "extinction diameter"]
n_tests: "not stated in the source"
files: []
tags: ["cool flames", "CFD", "FLEX", "droplet", "stability map"]
relevance: {"airflow": "medium", "oxygen": "low", "fuel_type": "low", "partial_gravity_anchor": "low"}
caveats: ["No numerical results are stated in the PSI record text.", "Flight program and hardware are blank in the record.", "Model study checked against FLEX, not new measurements."]
related: ["PSI-69", "PSI-142"]
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-117", "https://doi.org/10.60555/gz0q-b577"]
publications_listed_on_psi_page: 10
psi_record_modified: "09-Jun-2026"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

This ground study used a 3-D CFD model, built in OpenFOAM and checked against ISS FLEX measurements, to see how outside heating and drifting airflow affect established cool flames around n-alkane droplets in microgravity. It tested convection alone, heat flux alone, and both together, for droplets of 1 to 4 mm and about 0.5 mm, sweeping forcing strength, ambient composition including ozone-assisted cases, and pressure. The outputs are stability maps for ignition, oscillation, transition to hot ignition and extinction. It also aims to explain run-to-run variability in the flight data. The record gives no numerical results. Interpretation: a model study that supports FLEX interpretation, not new measurements.
