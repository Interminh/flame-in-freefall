# Derived data

Files here are produced for the Simulation tab. They are separate from the PSI data in the parent folder, which is never changed.

| File | Made by | Contents |
| --- | --- | --- |
| `bass2_flow_points.csv` | Read by hand from `psi_25.csv` | 59 flow points, 54 used in the fit. Columns include material class, thickness and where it came from (`table` or `sample_text`), oxygen, direction, flow in cm/s, how the flow was read, label, `event`, `use_in_fit`, `reading_note` (why a point is left out) and a verbatim quote. `evidence` starts with `obs:` (quote from the notes) or `air:` (the air-display column). |
| `nasa_1g_anchors.csv` | By hand, quotes checked by script | 17 numbers and statements from NASA-hosted documents. Columns: quote, NTRS record, PDF page, what it says, whether it builds the model (`calibration`), is only a check, or is context, and a caution. `quote_verified` is `yes` when the quote was found in the PDF text while the file was built. The PDFs are not stored here, so use the NTRS link. |
| `saffire2_ground_checks.csv` | Copied from `psi_99.csv` by script | Three SAFFIRE-II cases where the whole sample burned: SIBAL at 1 g and 0 g, PMMA at 1 g. Scored in `sim-validation.json`. Tests check each value against `psi_99.csv`. |
| `literature_loc_checks.csv` | By hand | Figures from the task brief and two non-NASA references. Kept for the record and not used by the model. |
| `sim-params.json` | `scripts/sim/calibrate.mjs` | Fitted values, 200 bootstrap draws, data ranges, the constants with their status, and the points. Do not edit. |
| `sim-validation.json` | `scripts/sim/calibrate.mjs` | Validation numbers quoted in the root README. |
| `fm2-predictions.csv` | `scripts/sim/fm2.mjs` | Eight testable predictions at 0.165 g. Film and slab rows carry the default thickness. |

Regenerate everything with `npm run sim:calibrate`. The seed is fixed, so a rerun gives identical files.

The flow points were read from free-text notes and have not been checked by a second person.
`npm run test:sim` verifies that each quote, test ID, oxygen value, direction and thickness matches `psi_25.csv`.
