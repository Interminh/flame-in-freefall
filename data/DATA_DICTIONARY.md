# Data dictionary

Missing numeric measurements are empty strings, never zeros or fabricated defaults. `unknown` is an explicit categorical outcome. Original zeros are retained. Raw files remain untouched.

## Unified table (17 columns)

| Column | Meaning | Units / domain | Original source / conversion |
|---|---|---|---|
| `experiment` | NASA investigation name | text | Official PSI title/acronym |
| `test_id` | Source test identifier; may repeat; never a generated test | text | Test # / Test / FLEX Test # / As run test no. / Sample Number |
| `platform` | Actual test platform; ground comparisons separated from flight | ISS/Cygnus/ground/drop/aircraft | Official experiment description; explicit comparison designation |
| `gravity_g` | Source-supported Earth-gravity comparison = 1; missing numeric microgravity value remains empty | g/g0 | Explicit 1-g comparison; no artificial 0 or partial-gravity value |
| `fuel` | Material/fuel descriptor; canonical token only when explicit | text | Fuel / Material / Fuel Sample Material / material |
| `fuel_geometry` | Explicit geometry; no diameter-to-thickness substitution | text | Material descriptor; droplet apparatus; gas-burner configuration |
| `fuel_thickness_mm` | Explicit thickness; not sphere or rod diameter | mm | Source thickness cm ×10; micrometers ÷1000; mm unchanged |
| `o2_percent` | Exact reported initial ambient oxygen; inverse burner oxygen suppressed in combined only | mole/volume % | Source percent unchanged; mole/volume fraction ×100; qualified/interval values retained only in per-dataset extras |
| `pressure_kpa` | Exact scalar pressure; approximate CFI-G pressure remains an explicitly qualified extra | kPa | atm ×101.325; conventional mmHg ×101.325/760; bar ×100 when exact |
| `flow_velocity_cm_s` | Exact source ventilation/inlet speed; not fan display or mass-flow setting | cm/s | Air Flow (cm/s) / Air Rate (cm/s) / Inlet velocity (cm/s) |
| `flow_direction` | Explicit direction relative to flame spread | opposed/concurrent/quiescent | Source flow direction; BASS-II PDF explicit direction words |
| `outcome` | Conservative source-supported state; unknown includes unavailable or ambiguous terminal events | ignited/burned_out/extinguished/no_ignition/unknown | See per-dataset rules and literal evidence |
| `spread_rate_mm_s` | Numeric flame-spread rate only; qualitative descriptions remain source text | mm/s | SAFFIRE-II 1-g Spread Rate, explicit numeric mm/s only |
| `burning_rate` | Reserved; always empty because a common physical definition/unit was not specified | not established | Original rate quantities stay in explicitly labeled source or dataset-specific fields |
| `extinction_reason` | Only reported extinction category; no inferred chemical/transport cause | text | FLEX Test end=Extinction; CFI-G terminal event=SE |
| `source_file` | Exact unchanged raw filename | filename | Download manifest filename |
| `source_row_or_page` | 1-based logical CSV record; workbook sheet/row; PDF page/table/row where used | locator | Header=record 1; physical PDF page, not printed report page |

## Per-dataset columns

For PSI-47, PSI-117 and PSI-142, the main CSV is a compact numeric-cell table. Join its `series_id` to the same dataset’s `_series.csv` to obtain source_file, source column, original quantity/header/context and evidence type. A numeric-cell row is not an independent experiment. DAFT sessions are in `_sessions.csv`.

Every extra column below is listed once per dataset. `src_` columns preserve source text, including uncertain values, ranges, qualifiers and sentinel strings; no physical unit is imposed beyond the original header.

### PSI-68

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_ambient_gas_mixture` | Ambient Gas Mixture | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_ambient_pressure_atm` | Ambient Pressure (atm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_ambient_temperature_c` | Ambient Temperature (C) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flow_velocity_cm_s` | Flow Velocity (cm/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_initial_droplet_diameter_mm` | Initial Droplet Diameter (mm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_oxygen_mole_fraction` | Oxygen Mole Fraction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_fuel_type` | Sample (Fuel Type) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-100

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_air_flow` | Air Flow | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_camera_1` | Camera 1 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_camera_2` | Camera 2 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_direction` | Direction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_material` | Material | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_length` | Sample Length | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_number` | Sample Number | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_thickness` | Sample Thickness | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_width` | Sample Width | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-25

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `observations` | PDF Appendix A, final table column | pdfplumber extraction; continuation text joined |
| `outcome_evidence` | Literal phrase or original test fields supporting outcome; Source observations / Hot ignition / terminal event | text |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `secondary_source_file` | Additional source used for the same record; BASS-II PDF or CFI DATA sheet workbook | filename |
| `secondary_source_location` | Exact additional page/table/row or sheet/row; Scripted extraction or exact identifier join | locator |
| `src_air_display` | Air display | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_calibrated_final_o2_by_vol` | Calibrated final O2 % by vol | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_calibrated_initial_o2_by_vol` | Calibrated  initial O2 % by vol | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_date` | Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fan_display` | Fan display | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_final_co2_by_vol` | Final CO2 % by vol | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_final_co_ppm` | Final CO (ppm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flow_restrictor` | Flow restrictor | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_sample_material` | Fuel Sample Material | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_gmt` | GMT | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_initial_co2_by_vol` | Initial CO2 % by vol | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_initial_co_ppm` | Initial CO (ppm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_pi` | PI | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_radiometer_gain_1000_250_50_10` | Radiometer gain   (1000   250   50   10) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample` | Sample # | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test` | Test # | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_total_frames_shot` | Total Frames Shot | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-117

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `condition_source_file` | Workbook supplying series-level conditions; Original readme workbook filename | filename |
| `condition_source_location` | Readme condition row, not a new measurement; Original readme row | sheet/row |
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `panel_id` | Horizontal source block separated by blank header cells; CSV header layout | index |
| `panel_labels` | Original Expt/Sim/pressure/etc. labels in the block; Source labels; never an invented gravity value | text |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `quantity_original` | Original column/header label; may change across source blocks; Exact source header or most recent textual cell in same column | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `series_file` | Figure-data filename stem; Exact source filename stem | text |
| `series_id` | Deterministic join key to matching _series.csv; not a test ID; Generated from exact shared source metadata in first-seen order | text |
| `source_column_index` | 1-based original column index; Raw CSV/XLS/XLSX column | index |
| `value` | CSV cell at source_column_index / source row | as labeled in quantity_original; Numeric source token retained; quantity_original supplies physical label; no resampling |

### PSI-101

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_date` | Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_description` | Description | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_duration_sec` | Duration (sec) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_inlet_velocity_cm_s` | Inlet velocity (cm/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_net_aging_time_sec` | Net aging time (sec) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_primary_aging_time_sec` | Primary aging time (sec) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_primary_mixing_time_sec` | Primary mixing time (sec) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_rt_r0` | Rt/R0 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_same_test` | SAME Test # | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_type` | Sample Type | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-69

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `burn_time_s` | Burn time; s | s; identity |
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `initial_droplet_diameter_mm` | Droplet initial diameter; mm | mm; identity |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_ambient_pressure_mmhg` | Ambient pressure; mmHg | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_burn_time_s` | Burn time; s | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_burning_rate_mm` | Burning rate; mm | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_co_initial_ambient_composition_mole_fraction` | CO initial ambient composition; mole fraction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_droplet_initial_diameter_mm` | Droplet initial diameter; mm | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flex_identifier` | FLEX Identifier | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flex_test` | FLEX Test # | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel` | Fuel | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_he_initial_ambient_composition_mole_fraction` | He initial ambient composition; mole fraction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_n_initial_ambient_composition_mole_fraction` | N initial ambient composition; mole fraction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_o_initial_ambient_composition_mole_fraction` | O initial ambient composition; mole fraction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_date` | Test Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_end` | Test end | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_gmt` | Test GMT | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_visible_flame_extinction_diameter_mm` | Visible flame extinction diameter; mm | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `test_end_original` | Original FLEX termination category; FLEX Test end | text |
| `test_kind` | Source identifier contains CAL, or regular combustion identifier; FLEX Identifier; CAL flag only | category |
| `visible_flame_extinction_diameter_mm` | Visible flame extinction diameter; mm | mm; identity |

### PSI-106

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_fuel_type` | Fuel Type | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_date` | Test Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-23

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_atmosphere` | Atmosphere* | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_date` | Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flames_ignited` | Flames Ignited* | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_bottle` | Fuel Bottle | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_month` | Month | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_notes` | Notes | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_day` | Test Day* | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_type` | Test Type | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_year` | Year | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-62

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|

### PSI-39

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `cool_d2_burning_constant_mm2_s` | kcool ( mm^2/s ) | mm²/s; identity; DATA sheet joined by FLEX Number |
| `cool_extinction_diameter_mm` | Dext,cool ( mm ) | mm; identity; DATA sheet joined by FLEX Number |
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `hot_d2_burning_constant_mm2_s` |  khot ( mm^2/s ) | mm²/s; identity; DATA sheet joined by FLEX Number |
| `hot_extinction_diameter_mm` | Dext, hot ( mm ) | mm; identity; DATA sheet joined by FLEX Number |
| `initial_droplet_diameter_mm` | D0 ( mm ) | mm; identity; DATA sheet joined by FLEX Number |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `secondary_source_file` | Additional source used for the same record; BASS-II PDF or CFI DATA sheet workbook | filename |
| `secondary_source_location` | Exact additional page/table/row or sheet/row; Scripted extraction or exact identifier join | locator |
| `src_cir` | CIR | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fiber` | Fiber | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flex_number` | Flex Number | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel` | Fuel | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_helium` | Helium | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_local_time` | Local Time | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_nitrogen` | Nitrogen | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_oxygen` | Oxygen | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_pressure` | Pressure | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_date` | Test Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-22

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_date` | Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flames_ignited` | Flames Ignited | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_bottle` | Fuel Bottle | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_conc` | Fuel Conc | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_mesh_polarity` | Mesh Polarity | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_month` | Month | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_notes` | Notes | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_day` | Test Day | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_type` | Test Type | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_year` | Year | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-107

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `flow_quality_flag` | Unresolved source-quality issue; original negative speed is preserved; SPICE source Air Rate (cm/s); no absolute-value correction | text |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_air_rate_cm_s` | Air Rate (cm/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel` | Fuel | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_rate_mg_s` | Fuel Rate (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_rate_sccm` | Fuel Rate (sccm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_gmt_date` | GMT date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_gmt_flame_off` | GMT  Flame Off | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_gmt_ignition` | GMT ignition | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_hc_fuel_rate_mg_s` | HC Fuel Rate (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_nozzle_mm` | Nozzle (mm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-60

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|

### PSI-21

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_flames_ignited` | Flames ignited | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_bottle` | Fuel Bottle | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_conc_range` | Fuel conc. Range | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_mfc` | Fuel MFC | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_n2_mfc` | N2 MFC | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_notes` | Notes | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_day` | Test Day | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_type` | Test Type | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-99

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `comparison_burn_length` | Original ground-comparison burn length, including qualitative values; SAFFIRE-II 1-g Burn Length | as supplied |
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_1_g_burn_length` | 1-g Burn Length | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_1_g_spread_rate` | 1-g Spread Rate | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_air_flow_cm_s` | Air Flow (cm/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_burn_time_s` | Burn Time (s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_camera_1` | Camera 1 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_camera_2` | Camera 2 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flow_direction` | Flow Direction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_g_burn_length` | ?-g Burn Length | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_g_spread_length` | ?-g Spread Length | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_ignition_power_w` | Ignition Power (W) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_ignition_time_s` | Ignition Time (s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_material` | Material | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_percent_o2_note_1` | Percent O2 (Note 1) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_samle_thickness` | Samle Thickness | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_length` | Sample Length | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_number` | Sample Number | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_width_cm` | Sample Width (cm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-98

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_air_flow_cm_s` | Air Flow (cm/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_burn_time_s` | Burn Time (s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_camera_1` | Camera 1 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_camera_2` | Camera 2 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flow_direction` | Flow Direction | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_ignition_power_w` | Ignition Power (W) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_ignition_time_s` | Ignition Time (s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_material` | Material | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_percent_o2` | Percent O2 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_length_cm` | Sample Length (cm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_number` | Sample Number | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_thickness_cm` | Sample Thickness (cm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_width_cm` | Sample Width (cm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-20

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_burner_size_mm` | Burner Size (mm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_date` | Date | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flames_ignited` | Flames Ignited | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel_bottle` | Fuel Bottle | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_month` | Month | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_notes` | Notes | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_oxygen_conc_percent` | Oxygen Conc (percent) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_year` | Year | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-159

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `flame_configuration` | Normal/inverse burner configuration; unrelated to gravity; Filename and Flame Type | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `outcome_evidence` | Literal phrase or original test fields supporting outcome; Source observations / Hot ignition / terminal event | text |
| `oxygen_location` | Distinguishes ambient oxidizer from inverse burner oxidizer stream; Normal/inverse apparatus configuration | text |
| `pressure_kpa_reported_approx` | Converted pressure retaining source approximation; CFI-G approx p (bar) ×100; excluded from exact scalar combined field | kPa, approximate |
| `pressure_qualifier` | Explicit approximation qualifier; CFI-G source pressure header | text |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_approx_p_bar` | approx p (bar) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_burn_time_sec` | burn time (sec) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_color` | Color | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_comments` | Comments | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_cool_flame` | Cool flame? | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_day` | Day | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flame_type` | Flame Type | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel` | Fuel | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_hc_burnrate_mg_s` | HC burnrate (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_hot_ignition` | Hot ignition | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_mhc_mg_s` | mHC (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_o2_flow_rate_mg_s` | O2 flow rate (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_peak_burner_t_c` | Peak burner T (C ) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_peak_burner_temp_c` | Peak burner Temp (C) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_peak_burner_temp_k` | Peak burner temp (K) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_self_ext_or_flow_term` | Self -ext or flow term; Self-ext or flow term | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header.; as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_tad_k` | Tad (K) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test` | Test | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_tfp` | TFP | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xf` | Xf | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xf_after_test` | Xf  after test | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xf_before_test` | Xf  before test | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xo2` | XO2 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xo2_after_test` | XO2  after test | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xo2_before_test` | XO2 before test | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_zst` | Zst | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `terminal_event_original` | Original terminal event such as SE or FT; CFI-G Self-ext or flow term | text |

### PSI-102

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_aging_duration_minutes` | Aging Duration (minutes) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_air_flow_cm_s` | Air Flow (cm/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample` | Sample # | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_material` | Sample Material | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_weight_loss_rate_mg_min` | Weight loss rate (mg/min) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-115

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `distribution_value` | DAT column 2 | not established; identity; units unresolved pending report validation |
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `model_case` | Original particle model case and modifiers; DAT filename stem | text |
| `node_index` | DAT column 1 | source index; identity; no guessed offset join to diameter list |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |

### PSI-142

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `data_id` | Original worksheet data ID; Source sheet title | text |
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `header_context` | Original most recent textual labels by column; preserves changing panels; Source sheet text; no forward filling of numerical values | text |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `quantity_original` | Original column/header label; may change across source blocks; Exact source header or most recent textual cell in same column | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `series_id` | Deterministic join key to matching _series.csv; not a test ID; Generated from exact shared source metadata in first-seen order | text |
| `source_column_index` | 1-based original column index; Raw CSV/XLS/XLSX column | index |
| `value` | Workbook numeric cell at source_column_index / source row | as labeled in quantity_original; Numeric cells retained; original header/context retained without semantic correction |

### PSI-26

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `observations` | Original observations; PDF line wraps joined; no scientific paraphrase; BASS as-run observations or BASS-II Appendix A last column | text |
| `outcome_evidence` | Literal phrase or original test fields supporting outcome; Source observations / Hot ignition / terminal event | text |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_actual_date_for_spice_display_date_add_1_for_leap_year` | Actual Date  (for SPICE Display Date, add 1 for Leap Year) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_air_display` | Air display | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_approx_start_time_with_gmt` | Approx Start Time ( with GMT) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_as_run_test_no` | As run test no. | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_bracket_frames_and_exposure_bracket_f_1_0` | Bracket frames and exposure bracket (#F/ 1.0) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_co2_mm_hg` | CO2, mm Hg | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_exposure_compensation_ev` | Exposure compensation   (-#EV) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_exposure_mode_m_a` | Exposure Mode (M/A) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_f_stop` | F stop | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fan_display` | Fan display | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_filter_y_n` | Filter y/n | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flow_restrictor` | Flow restrictor | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_gn2_display` | GN2 display | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_gn2_pot` | GN2 Pot | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_igniter` | Igniter | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_iso` | ISO | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_material` | material | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_o2_by_volume` | O2 % by volume | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_pressure_atm` | pressure, atm | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_radiometer_display` | Radiometer display | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_radiometer_gain_1000_250_50_10` | Radiometer gain ( 1000, 250, 50, 10) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_release_mode_ch_cl` | Release Mode (CH/CL) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_distance` | Sample distance | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_no` | Sample no. | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sd_card_s_n` | SD card S/N | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_shutter_hold_s_cont` | shutter hold s /cont | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_shutter_speed_1_s` | shutter speed (1/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_no` | Test no. | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test_observations_and_anomalies_ignited_spread_extinguished_burn_time_color_etc` | Test Observations and Anomalies (ignited, spread, extinguished, burn time, color, etc.) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_total_frames_shot` | total frames shot | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-10

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `flame_configuration` | Normal/inverse burner configuration; unrelated to gravity; Filename and Flame Type | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `oxygen_location` | Distinguishes ambient oxidizer from inverse burner oxidizer stream; Normal/inverse apparatus configuration | text |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `src_day` | Day | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_flame_type` | Flame Type | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_fuel` | Fuel | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_mean_zst` | mean Zst | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_mfuel_mg_s` | mfuel (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_mn2_mg_s` | mN2 (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_mo2_mg_s` | mO2 (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_mtot_mg_s` | mtot (mg/s) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_pfinal_atm` | pfinal (atm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_pinit_atm` | pinit (atm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_pmean_atm` | pmean (atm) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_tad_k` | Tad (K) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_test` | Test | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xc2h4_final` | XC2H4 final | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xc2h4_initial` | XC2H4 initial | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xfuel` | Xfuel | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xo2` | XO2 | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xo2_final` | XO2 (final) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_xo2_init` | XO2 (init) | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |

### PSI-47

| Extra column | Meaning / source column | Units / conversion |
|---|---|---|
| `evidence_type` | Flight, ground, simulation, reported series, or unresolved provenance; Source table/series labels; never administrative ground project → 1g | category |
| `gravity_regime` | Qualitative source gravity regime; not a numeric measurement; Official platform description or explicit model-case label | category |
| `psi_id` | Official PSI identifier; Official PSI page | text |
| `quantity_original` | Original column/header label; may change across source blocks; Exact source header or most recent textual cell in same column | text |
| `record_kind` | Source grain: test, campaign summary, numeric cell, particle distribution, etc.; Source table structure | category |
| `series_id` | Deterministic join key to matching _series.csv; not a test ID; Generated from exact shared source metadata in first-seen order | text |
| `source_column_index` | 1-based original column index; Raw CSV/XLS/XLSX column | index |
| `src_actual_day` | Actual Day | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_hardware_description` | Hardware Description | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sample_material` | Sample Material | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_sampled_location` | Sampled Location | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `src_session_name` | Session Name | as supplied; Source text/value, unchanged except outer whitespace; units remain in original header. |
| `value` | XLS numeric cell at source_column_index / source row | as labeled in quantity_original; identity; changing original column label retained |

