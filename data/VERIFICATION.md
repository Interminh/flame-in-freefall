# Verification

Status: **PASS**.

Raw files: 69; bytes: 155808304; SHA-256 and exact byte sizes verified. All selected files ≤50,000,000 bytes; every dataset subset ≤200,000,000 bytes.

Combined records: 1900; requested 17-column schema checked. Ground comparison rows carry gravity_g=1. No negative speed or out-of-range oxygen is allowed in combined.

Random source spot checks: 104 rows; seed 2026 + PSI numeric ID; five per nonempty dataset, all rows when fewer than five. Detailed original/clean values and source locators are in verification.json.

| Dataset | Spot checks | Result |
|---|---:|---|
| PSI-25 | 5 | PASS |
| PSI-26 | 5 | PASS |
| PSI-69 | 5 | PASS |
| PSI-68 | 5 | PASS |
| PSI-98 | 2 | PASS |
| PSI-99 | 5 | PASS |
| PSI-100 | 2 | PASS |
| PSI-39 | 5 | PASS |
| PSI-117 | 5 | PASS |
| PSI-142 | 5 | PASS |
| PSI-20 | 5 | PASS |
| PSI-159 | 5 | PASS |
| PSI-22 | 5 | PASS |
| PSI-107 | 5 | PASS |
| PSI-10 | 5 | PASS |
| PSI-21 | 5 | PASS |
| PSI-23 | 5 | PASS |
| PSI-106 | 5 | PASS |
| PSI-102 | 5 | PASS |
| PSI-101 | 5 | PASS |
| PSI-47 | 5 | PASS |
| PSI-115 | 5 | PASS |
| PSI-62 | 0 | N/A: no available science rows |
| PSI-60 | 0 | N/A: no available science rows |

## Fresh replay

```json
{
  "raw_files_compared": 69,
  "raw_differences": [],
  "processed_files_compared": 53,
  "processed_differences": []
}
```

Processed comparison includes all per-dataset CSVs, auxiliary series/session tables, combined.csv and audit JSON. A cached fetch alone does not count as a fresh replay.

data/ size before this report: 4,427,169 bytes, below 10 MB.

## Limits

Spot checks establish that sampled transformed values and source references match their raw files. They do not validate scientific models, resolve ambiguous source units, establish exact microgravity accelerations, or turn figure cells into independent tests. No partial-gravity estimates were generated.
