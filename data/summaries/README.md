# Investigation summaries

One file per investigation (24 files), written from the PSI record only.

## Naming

`PSI-<number>_<label>.md`

- `<number>` is the PSI accession number, not padded (PSI-25, PSI-107).
- `<label>` is the acronym with spaces and slashes turned into hyphens (`ACME-BRE`, `DAFT-DAFT-2`).
- Ground analysis and modeling records have no acronym, so the label is a short description ending in `-ground` (`Cool-flame-CFD-ground`).

## What is in each file

Front matter in the agreed template, then an 80 to 120 word `## Summary`.

- Identity fields (`psi_id`, `full_name`, `doi`, `psi_url`, `license`, `platform`, `facility`, `period`, `files`, `related`, `psi_record_modified`) are copied from the PSI record.
- Everything else comes from the record's objective, hypothesis, approach and research-impact text.
- Anything the record does not say is `null` or `not stated in the source`.
- Pressure is converted to kPa from the atm or psia in the record text, and the note field says so.
- `n_tests` is filled only when the record text gives a count (PSI-107). Row counts of the experimental tables are not used here.
- Each summary ends with a sentence starting "Interpretation:". That sentence is a judgment, not a source statement.

## Relevance ratings are interpretation

`relevance` values are not in the PSI record. Rubric used:

- `airflow`, `oxygen`: high if the text names it as a main variable or objective, medium if it is fixed at one stated value, low if not mentioned.
- `fuel_type`: high if several fuels or materials are compared, medium if one class is varied or tested, low otherwise.
- `partial_gravity_anchor`: low for every file, because no PSI text states a partial-gravity condition.

## Status

All files have `verified: false`. A human must check each against its PSI page before the flag changes, per AGENTS.md. The summaries were drafted by Claude (AI use to be credited in the project credits).

## Record oddities worth a look when verifying

- PSI-98 (SAFFIRE-I) lists the same dates as PSI-102 (SAME), 2001-03-02 to 2008-02-28, which look wrong for a Cygnus experiment.
- PSI-39 (CFI) gives 0.25 to 5 atm in the objectives but 0.25 to 0.5 atm in the approach.
- PSI-10 (ACME Flame Design) has no license listed.
- PSI-106, PSI-107 and PSI-159 have blank dates, and PSI-100 has no end date. Several records have blank hardware.
