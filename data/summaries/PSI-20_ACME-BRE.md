---
psi_id: "PSI-20"
name: "ACME BRE"
full_name: "Advanced Combustion via Microgravity Experiments - Burning Rate Emulator"
doi: "10.60555/vb93-3y72"
psi_url: "https://psi.nasa.gov/physci/repo/data/investigations/PSI-20"
license: "CC0-1.0"
platform: "International Space Station (ISS)"
facility: "Combustion Integrated Rack (CIR), ACME"
period: "2010-01-01 to 2025-02-08 (as listed)"
gravity: "microgravity"
fuel_type: "gas"
materials: ["CH4/N2 mixtures", "C2H4/N2 mixtures"]
geometry: ["porous circular burners, 25 mm and 50 mm diameter"]
conditions: {"o2_pct": {"min": 21, "max": 34}, "pressure_kpa": {"min": 56.5, "max": 101.4}, "flow_cm_s": {"min": null, "max": null}, "diluents": ["nitrogen", "carbon dioxide (desired)"], "note": "Planned atmospheres: 21% O2 at 14.7 psia, 26.5% at 10.2 psia, 34% at 8.2 psia (kPa converted from psia). Quiescent ambient. Objectives are written in planning form."}
measurements: ["burning behavior", "burner surface temperature", "heat flux", "extinction limits"]
n_tests: "not stated in the source"
files: [{"name": "PSI-20_Experimental table_ACME BRE.csv", "format": "csv", "size_bytes": 1113, "key_columns": "not stated in the source"}]
tags: ["burner", "quiescent", "oxygen", "pressure", "extinction limit", "condensed-fuel emulation"]
relevance: {"airflow": "low", "oxygen": "high", "fuel_type": "medium", "partial_gravity_anchor": "low"}
caveats: ["Objectives use planning language ('will be examined', 'proposed').", "The burner is a gas burner that emulates condensed fuels, not a solid sample.", "Pressure and oxygen are the planned atmospheres, not confirmed test ranges."]
related: []
sources: ["https://psi.nasa.gov/physci/repo/data/investigations/PSI-20", "https://doi.org/10.60555/vb93-3y72"]
publications_listed_on_psi_page: 16
psi_record_modified: "05-Jun-2025"
retrieved_on: "2026-11-14"
verified: false
---

## Summary

The Burning Rate Emulator used porous circular gas burners, 25 mm and 50 mm across, to imitate burning solid fuels in the Combustion Integrated Rack on the International Space Station. Methane and ethylene mixed with nitrogen were burned in still air at several pressures and oxygen levels, including 21% at 14.7 psia, 26.5% at 10.2 psia and 34% at 8.2 psia. Carbon dioxide ambients and extinction limits were also planned. The record says quasi-steady burning was observed without airflow, notably in elevated-oxygen atmospheres. Interpretation: relevant to burning without ventilation, since cutting airflow is a standard step in putting out spacecraft fires, but the burner stands in for solids.
