# Current processing status

Approved downloads and cleaning are complete. 69 raw files, 155,808,304 bytes. The original Step-1 text below records earlier planning limitations and is superseded by this status, SOURCES.md and the generated audit. All scientific transformations and exclusions are recorded below.

# Data notes

## Current state

Step 1 only. Awaiting user OK for the download plan. No scientific source files downloaded, no raw rows ingested, no cleaned datasets or combined.csv created, no cleaning/verification claimed. Inventory inspected on 2026-11-14. All numeric sizes are portal display metadata, not measurements from downloaded files.

## Access and link findings

- All 24 supplied investigation URLs identify PSI investigation pages. The web text reader returned blank pages or fetch errors; the PSI browser interface subsequently exposed metadata and file inventories. These are not established dead links or login restrictions.
- The supplied NTRS citation 20210011385 resolves to **Burning and Suppression of Solids–II (BASS-II) Summary Report**, not s-Flame. The record offers TM-20210011385.pdf. Group it with PSI-25. Do not assume the PSI-hosted report and NTRS PDF are byte-identical. NTRS reports public distribution and “Use by or on behalf of the US Gov. Permitted.”; do not transfer the PSI dataset license to a separately hosted report.
- s3://nasa-psi is a public mirror root supplied by the user, not a separate investigation. Anonymous regional HTTPS listing failed in the web reader and was blocked by the browser client. Local urllib requests failed DNS resolution; AWS CLI is not installed. No S3 keys or exact byte counts have been verified. No access restriction was bypassed. Use individual PSI files if S3 remains unavailable.
- PSI-60 and PSI-62 file trees show only Investigation Metadata Files, with no experimental table. Eligible scientific source files are unavailable in the inspected interface. Skip them unless files become available. This does not prove data do not exist elsewhere.
- PSI-10 does not display a license field in the inspected investigation header. Other inspected selected PSI investigation pages display CC0-1.0; preserve file-specific notices where applicable.
- DOI identifiers were read from the official investigation pages. Newly discovered DOI redirects have not all been independently followed; the three priority DOI attempts in the web reader were inaccessible. No DOI-only links were supplied.

## Selection and size limits

DOWNLOAD_PLAN.md and source_inventory.json contain the exact proposed allowlist. 69 files, 22 investigations, sum of displayed sizes 148.765612 decimal MB. Largest proposed file: PSI-25_Reports_BASS-II Summary Report.pdf, displayed as 46.7 MB. Each proposed subset is below 200 MB using listed sizes; each proposed file is below 50 MB. Exact byte-size preflight is still required, especially for the BASS-II report. Whole-investigation packages are much larger and are not proposed. Never download a folder wholesale.

No videos, standalone images, archives, raw sensor streams, calibration time histories or large CFD fields/grids are selected. Saffire result workbooks may embed images; inspect only after approved download and do not separately fetch imagery. The paired raw/jpeg result workbooks must not be combined as independent trials.

## Schema and interpretation caveats

- An administrative “Ground Investigation” can contain microgravity simulations and reused ISS measurements. Set gravity_g=1 only for source-supported Earth-gravity rows. Preserve modeled/experimental/reused-flight provenance per dataset; do not relabel simulations as 1g or new independent flight evidence. Until this can be represented without ambiguity in the unified schema, retain modeled series separately.
- “Microgravity” is a gravity regime, not a measured exact gravity_g=0. Preserve the regime in per-dataset extras and do not invent a measured number. A later explicit nominal-gravity modeling convention would need its own documented field.
- Electric fields impose body forces; the supplied description does not establish a quantitative electric-field-to-lunar/Martian-gravity conversion. No synthetic partial-gravity observations will be created. Any later estimates must be kept separately from measured data with a documented model and validation domain.
- BASS-II fan display / air display / flow restrictor values are not cm/s. Use the calibration workbook and appropriate configuration if supported; otherwise leave flow_velocity_cm_s empty.
- BASS as-run and planned matrices are different. Only the as-run workbook is selected. Requirements documents describe planned/capable conditions and cannot establish tested ranges.
- SAFFIRE-II includes both ground and microgravity comparison fields. Source-supported terrestrial measurements should become separate rows with gravity_g=1 and independent provenance. Qualitative values like “Acceleratory” are not numeric spread rates.
- Saffire portal project headers can say ISS while the experiment approach states Cygnus after departure. Use the actual test platform and document the conflicting catalog metadata.
- Preserve O2 intervals and approximation flags in per-dataset extras. Leave the combined scalar empty when a single measured value is not available; do not take midpoints or turn “~21%” into an exact measurement.
- ACME E-FIELD, CLD Flame, s-Flame and SLICE summary tables describe days/campaigns, not one row per ignition. Keep their grain explicit; do not expand a count of ignited flames into invented test IDs/rows.
- PSI-142 CSV is a publication/figure index. Inspect its workbook before claiming numeric extinction observations.
- CFI-G normal/inverse and Flame Design normal/inverse refer to flame/burner configurations, not Earth-vs-microgravity. CFI-G self-extinction and commanded flow termination must remain distinct.
- SAME, SAME-R, DAFT and PSI-115 are smoke/particle/pyrolysis or instrument-validation studies. Their primary measurements do not fit the combined flammability outcome schema; retain own tidy CSVs. Do not label pyrolysis heating as ignition.
- FLEX/FLEX-2 experimental tables may contain conditions or indexes rather than measured extinction outcomes. Do not manufacture outcome classes from the experiment title. BASS-II sensor summary likewise does not guarantee every desired flame-spread label.
- Reused FLEX measurements in ground studies must not be double-counted as additional independent flight observations.
- The unified burning_rate column has no specified unit or physical definition. Droplet D² regression constants (mm²/s), liquid mass loss (mg/s), and linear regression (mm/s) are different quantities. Preserve explicit per-dataset columns and leave the unified field empty until a single definition is agreed.
- Duplicate-looking SPICE entries are visible in the portal. Do not silently discard them; inspect raw provenance and record any justified removals.

## Conversions to implement only when source units support them

cm thickness × 10 → mm; micrometers ÷ 1000 → mm; m/s × 100 → cm/s; mm/s ÷ 10 → cm/s; atm × 101.325 → kPa; bar × 100 → kPa; O2 mole/volume fraction × 100 → percent. Conversion constants are definitions, not missing-value imputations. Record original column, source unit, conversion and any qualifiers. Never substitute mass flow for ventilation speed without source-supported geometry and conditions.

## Pending dataset audit

No source rows have been fetched, so raw/cleaned counts, dropped rows, outcome class balance and actual tested ranges are **not assessed**, rather than zero. The portal's visible table counts are not raw-file audit counts.

| Dataset | Raw / clean rows | Dropped rows | Outcome balance | Tested O2 / pressure / flow / gravity |
|---|---|---|---|---|
| PSI-25 BASS-II | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-26 BASS | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-69 FLEX | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-68 FLEX-2 | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-98 SAFFIRE-I | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-99 SAFFIRE-II | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-100 SAFFIRE-III | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-39 CFI | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-117 Cool-flame thermo-convective CFD / FLEX analysis | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-142 Cool-flame transitions / counterflow modeling | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-20 ACME BRE | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-159 ACME CFI-G | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-22 ACME E-FIELD | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-107 SPICE | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-10 ACME Flame Design | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-21 ACME CLD Flame | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-23 ACME s-Flame | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-106 SLICE | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-102 SAME | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-101 SAME-R | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-47 DAFT / DAFT-2 | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-115 SAME-based smoke simulation | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-62 Concurrent flame spread modeling / BASS | Not assessed | Not assessed | Not assessed | Not assessed |
| PSI-60 SPICE computational and experimental analysis | Not assessed | Not assessed | Not assessed | Not assessed |

## Verification after approval

Re-fetch into an independent directory and rebuild through the same scripts; compare raw hashes and processed output hashes, distinguish upstream version changes from nondeterminism, and never overwrite the untouched original raw tree. Spot-check five reproducibly randomly selected records per dataset, or every record if fewer than five exist. Check each transformed field against its original workbook sheet/row, CSV row or PDF page. For PDF numbers use scripted table extraction and record page numbers; do not read graph coordinates as table observations. Produce dataset row counts, per-column completeness and overall schema completeness, actual measured ranges, outcome counts, reasons for exclusion and data/ total byte size (<10 MB). No such verification has yet run.

## Open questions

- Is a particular GitHub repository intended? Current workspace is empty of a Git repository and has no remote. Local per-dataset commits can begin after approval and initialization; no external push is implied.
- What physical quantity/unit should unified burning_rate represent? Proposed safe default is leave it empty and use explicitly named per-dataset rate columns until decided.
- Should a later combined schema add evidence_type and gravity_regime? These would prevent simulations, reused measurements and nominal gravity assumptions being mistaken for measured flight observations. Until then, retain ambiguous records separately.
- Can source-defined outcome and spread/extinction results be obtained from the approved small sources? Some investigations provide only summary tables within the current selection. Report gaps rather than expanding downloads silently.

<!-- GENERATED AUDIT BELOW -->

## Actual row counts, exclusions, class balance and supported ranges

Counts refer to the chosen numerical source grain. Overlapping source copies and workbook tabs are not appended. A raw worksheet row is not necessarily a test; numeric-cell output can contain multiple values per raw row. Complete dropped-record locators and reasons are in audit/psi_ID.json.

### PSI-25: BASS-II

Clean main records: 129; explicitly excluded source records: 0. Source input counts: PSI-25_Reports_BASS-II Summary Report.pdf: 126; PSI-25_Experimental table_BASS-II.csv: 129.
Outcome counts: {"extinguished": 56, "unknown": 55, "burned_out": 2, "ignited": 15, "no_ignition": 1}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: 13.6–22.2 %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Fan/air display remains source text. Calibration workbook contains estimated conversion examples; no interpolation or calibration estimates were applied.
- Test-matrix workbook overlaps CSV; not appended as independent observations.
- Report section 3.1.1 says Nomex samples did not ignite, whereas row F1 reports brief ignition then extinction. Row-level table used, conflict retained here.
- PDF page means physical PDF page, not printed report page. No values were read from plotted curves.

### PSI-26: BASS

Clean main records: 121; explicitly excluded source records: 10. Source input counts: as run matrix: 131.
Outcome counts: {"burned_out": 10, "unknown": 53, "extinguished": 33, "ignited": 20, "no_ignition": 5}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: 15.9–22.721982701616103 %; pressure: 98.28525–102.207594078947360955 kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Only canonical as run matrix sheet ingested; 2012/2013 and TP-without-Data sheets overlap and are not appended.
- CSV is a less detailed overlapping index; workbook chosen as authoritative source.
- O2 source header says percent but values are fractions (e.g. 0.221); converted explicitly to 22.1%. Fan/air displays are not taken as calibrated ventilation.

### PSI-69: FLEX

Clean main records: 274; explicitly excluded source records: 0. Source input counts: PSI-69_Experimental table_FLEX.csv: 274.
Outcome counts: {"unknown": 88, "extinguished": 186}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: 12–34 %; pressure: 0–309.2945625 kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Completion does not prove fuel burnout; Disruption does not prove a combustion extinction cause. Both retain outcome=unknown.
- Burning rate source header reads mm, which is dimensionally ambiguous; preserve in src_burning_rate_mm, do not populate unified burning_rate.
- Pressure conversion uses 1 conventional mmHg = 101.325/760 kPa. Calibration-identified rows retained with test_kind flag.

### PSI-68: FLEX-2

Clean main records: 8; explicitly excluded source records: 0. Source input counts: PSI-68_Experimental table_Flex2.csv: 8.
Outcome counts: {"unknown": 8}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-98: SAFFIRE-I

Clean main records: 2; explicitly excluded source records: 2. Source input counts: PSI-98_Experimental table_SAFFIRE-1.csv: 4.
Outcome counts: {"unknown": 2}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: 20–20 cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- MergeResult workbooks are media-delivery/file catalogs, not flame-growth measurements. Excluded from tidy scientific rows after header inspection.
- Approximate O2 and O2 ranges remain in source fields; scalar combined O2 is empty. No midpoint imputation.
- Ignition power/time and burn time do not determine a terminal outcome class; unknown retained absent explicit evidence.

### PSI-99: SAFFIRE-II

Clean main records: 18; explicitly excluded source records: 6. Source input counts: PSI-99_Experimental table_SAFFIRE-2.csv: 15.
Outcome counts: {"unknown": 18}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: 20–20 cm/s; numeric gravity: 1–1. Nominal microgravity is not represented as a measured exact zero.
- MergeResult workbooks are media-delivery/file catalogs, not flame-growth measurements. Excluded from tidy scientific rows after header inspection.
- Approximate O2 and O2 ranges remain in source fields; scalar combined O2 is empty. No midpoint imputation.
- Ignition power/time and burn time do not determine a terminal outcome class; unknown retained absent explicit evidence.

### PSI-100: SAFFIRE-III

Clean main records: 2; explicitly excluded source records: 0. Source input counts: PSI-100_Experimental table_SAFFIRE-3.csv: 2.
Outcome counts: {"unknown": 2}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: 30–30 cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- MergeResult workbooks are media-delivery/file catalogs, not flame-growth measurements. Excluded from tidy scientific rows after header inspection.
- Approximate O2 and O2 ranges remain in source fields; scalar combined O2 is empty. No midpoint imputation.
- Ignition power/time and burn time do not determine a terminal outcome class; unknown retained absent explicit evidence.

### PSI-39: CFI

Clean main records: 226; explicitly excluded source records: 773. Source input counts: Master Sheet: 999; DATA: 999.
Outcome counts: {"unknown": 226}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: 17–21 %; pressure: 50.6625–506.625 kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Workbook DATA sheet joined to Master Sheet by exact FLEX Number; no row-position join.
- Hot/cool extinction diameters do not uniquely establish a terminal outcome; outcome remains unknown.
- CSV duplicates Master Sheet and is not appended. Trailing formatted workbook rows are excluded.

### PSI-117: PSI-117 cool-flame analysis

Clean main records: 23882; explicitly excluded source records: 1. Source input counts: PSI-117_Analyzed Data_MST_2024_Burning_history_Flame_diameter.csv: 683; PSI-117_Analyzed Data_MST_2024_Dext.csv: 9; PSI-117_Analyzed Data_MST_2024_Kavg.csv: 19; PSI-117_Analyzed Data_MST_2024_Radiance_Flame_Diameter.csv: 683; PSI-117_Analyzed Data_PROCI_2019_Oscillatory_Cool_Flame.csv: 640; PSI-117_Analyzed Data_PROCI_2019_Stable_Cool.csv: 243; PSI-117_Analyzed Data_PROCI_2023_Alkane_Extinction_Diameter_1atm.csv: 6; PSI-117_Analyzed Data_PROCI_2023_C12_Extinction_Diameter_vs_pressure.csv: 6; PSI-117_Analyzed Data_PROCI_C12_2019_Three_Stage.csv: 571.
Outcome counts: {"unknown": 23882}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: 10–21 %; pressure: 101.325–278.64375 kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Tidy cell-series representation: panel_id + source row identify related axes; different panels have independent time vectors.
- Readme XN2 values 74 and 85 conflict with fractional notation elsewhere; retained raw, never corrected or used to infer oxygen.
- O2 and pressure are readme series conditions, not newly measured per-cell observations. No unified flammability outcomes or partial-gravity observations created.
- Zeros in extinction fields retained as source values; not assumed to mean no extinction.
- Reported-experimental panels may reuse FLEX observations and are not additional independent flight tests.
- Compact points join psi_117_series.csv by exact series_id for filename, source column, units/labels and evidence type. Points are numeric cells, not independent tests.

### PSI-142: PSI-142 counterflow analysis

Clean main records: 13478; explicitly excluded source records: 0. Source input counts: data ID 1: 53; data ID 2: 40; data ID 3: 36; data ID 4: 8; data ID 5: 252; data ID 6: 1063; data ID 7: 969; data ID 8: 27.
Outcome counts: {"unknown": 13478}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Tidy numeric-cell table preserves source row/column and changing block labels. Measurement/simulation classification is unresolved at some blocks; not pooled into combined.csv.
- Publication index CSV is not appended to measurements. Inspect source figure references before assigning units or interpreting profile axes.
- Some data ID 6 columns appear inconsistent with axis headers; values are preserved without swapping columns.
- Compact points join psi_142_series.csv by exact series_id for filename, source column, units/labels and evidence type. Points are numeric cells, not independent tests.

### PSI-20: ACME BRE

Clean main records: 18; explicitly excluded source records: 0. Source input counts: PSI-20_Experimental table_ACME BRE.csv: 18.
Outcome counts: {"unknown": 18}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-159: ACME CFI-G

Clean main records: 332; explicitly excluded source records: 862. Source input counts: PSI-159_Experimental table_CFI-G_Inverse Flames.csv: 1015; PSI-159_Experimental table_CFI-G_Normal Flames.csv: 179.
Outcome counts: {"no_ignition": 1, "ignited": 87, "unknown": 61, "extinguished": 183}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: 12–85 %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Normal/inverse are burner configurations, not gravity labels. Inverse burner O2 is not crew-cabin ambient O2; dashboard must filter oxygen_location.
- No inference of extinction from flow termination or flame-off timestamps. Duplicates retained with original row provenance.
- SPICE negative source air-speed values are preserved in source text and flagged; unified speed left empty rather than taking an invented absolute value.

### PSI-22: ACME E-FIELD

Clean main records: 32; explicitly excluded source records: 0. Source input counts: PSI-22_Experimental table_ACME E-FIELD Flames.csv: 32.
Outcome counts: {"unknown": 32}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-107: SPICE

Clean main records: 469; explicitly excluded source records: 0. Source input counts: PSI-107_Experimental table_Spice.csv: 469.
Outcome counts: {"unknown": 469}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: 0.66–85.28 cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Normal/inverse are burner configurations, not gravity labels. Inverse burner O2 is not crew-cabin ambient O2; dashboard must filter oxygen_location.
- No inference of extinction from flow termination or flame-off timestamps. Duplicates retained with original row provenance.
- SPICE negative source air-speed values are preserved in source text and flagged; unified speed left empty rather than taking an invented absolute value.

### PSI-10: ACME Flame Design

Clean main records: 327; explicitly excluded source records: 0. Source input counts: PSI-10_Experimental table_Flame Design_Inverse Flame.csv: 120; PSI-10_Experimental table_Flame Design_Normal Flame.csv: 207.
Outcome counts: {"unknown": 327}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: 19.8048193–84.9977932 %; pressure: 43.161203547–305.81712193725 kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Normal/inverse are burner configurations, not gravity labels. Inverse burner O2 is not crew-cabin ambient O2; dashboard must filter oxygen_location.
- No inference of extinction from flow termination or flame-off timestamps. Duplicates retained with original row provenance.
- SPICE negative source air-speed values are preserved in source text and flagged; unified speed left empty rather than taking an invented absolute value.

### PSI-21: ACME CLD Flame

Clean main records: 32; explicitly excluded source records: 0. Source input counts: PSI-21_Experimental table_CLD Flame.csv: 32.
Outcome counts: {"unknown": 32}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-23: ACME s-Flame

Clean main records: 18; explicitly excluded source records: 0. Source input counts: PSI-23_Experimental table_ACME s-Flame.csv: 18.
Outcome counts: {"unknown": 18}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-106: SLICE

Clean main records: 12; explicitly excluded source records: 0. Source input counts: PSI-106_Experimental table_Slice.csv: 12.
Outcome counts: {"unknown": 12}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-102: SAME

Clean main records: 8; explicitly excluded source records: 0. Source input counts: PSI-102_Experimental table_SAME.csv: 8.
Outcome counts: {"unknown": 8}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: 5–10 cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-101: SAME-R

Clean main records: 109; explicitly excluded source records: 0. Source input counts: PSI-101_Experimental table_SAME-R.csv: 109.
Outcome counts: {"unknown": 109}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: 0–8.1 cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.

### PSI-47: DAFT / DAFT-2

Clean main records: 23009; explicitly excluded source records: 0. Source input counts: PSI-47_Experimental table_DAFT.csv: 2; Raw PTrak Data: 2331; Raw DustTrak Data: 2427; Headers: 24; Voice Down Data Summary: 41; Logged Data Summary: 25; P-Trak vs. DustTrak Data: 566.
Outcome counts: {"unknown": 23009}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- Retained at source grain; no synthetic test IDs, no Cartesian expansion of ranges or ignition counts.
- Excluded from combined.csv because source grain/measurement type is not a compatible individual flammability test.
- Legacy XLS read with xlrd; long numeric-cell representation preserves instrument data without treating sessions as combustion trials.
- Compact points join psi_47_series.csv by exact series_id for filename, source column, units/labels and evidence type. Points are numeric cells, not independent tests.

### PSI-115: PSI-115 smoke simulation

Clean main records: 266; explicitly excluded source records: 0. Source input counts: PSI-115_Analyzed Data_10cmGravityPSD.dat: 44; PSI-115_Analyzed Data_10cmNoGravityPSD.dat: 44; PSI-115_Analyzed Data_8cmGravityNS_PSD.dat: 45; PSI-115_Analyzed Data_8cmGravityPSD.dat: 44; PSI-115_Analyzed Data_8cmNoGravityNoTF_PSD.dat: 45; PSI-115_Analyzed Data_8cmNoGravityPSD.dat: 44.
Outcome counts: {"unknown": 266}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: 1–1. Nominal microgravity is not represented as a measured exact zero.
- Particle distributions remain separate from flammability rows. Do not interpret node 1 as a diameter without validating vapor-bin indexing.
- nodeDiameters.dat is preserved raw; no speculative join or diameter conversion. Distribution-value units not established in file headers.

### PSI-62: PSI-62 BASS modeling

Clean main records: 0; explicitly excluded source records: 0. Source input counts: .
Outcome counts: {}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- No scientific source files available; no fabricated rows.

### PSI-60: PSI-60 SPICE analysis

Clean main records: 0; explicitly excluded source records: 0. Source input counts: .
Outcome counts: {}. For series/smoke/campaign tables these are not terminal combustion classes.
Exact supported O2: not available %; pressure: not available kPa; flow: not available cm/s; numeric gravity: not available. Nominal microgravity is not represented as a measured exact zero.
- No scientific source files available; no fabricated rows.

## Remaining scientific gaps

- PSI-60 and PSI-62 have no available scientific files in the inspected portal; zero output rows, not fabricated measurements.
- Partial-gravity estimates have not been generated. E-FIELD forcing is not a calibrated lunar/Martian g value.
- Exact microgravity acceleration values were not supplied. Keep gravity_g empty for these observations and use actual platform/provenance.
- Source-required rate units and some profile axes remain unresolved; see DATA_DICTIONARY.md and dataset notes.
- The largest selected BASS-II report is 48,972,416 bytes. Exact preflight resolved the portal’s rounded sizes; portal KB/MB display values do not use the decimal interpretation used in the preliminary plan.
- Git commits use work/git-metadata because .git writes are protected. Use bash scripts/git_data.sh. No remote has been configured or pushed.
- Verification results are in VERIFICATION.md; verification must not be inferred merely from successful cleaning.
