# Flame Atlas
NASA Space Apps 2026, Flame in Freefall.

Flame Atlas reads all 24 NASA Physical Sciences Informatics (PSI) microgravity combustion investigations and 85 NASA technical reports together. It maps which oxygen and pressure conditions have been tested, shows how a lunar-cabin fire-safety verdict depends on how oxygen scales with pressure, and lets a researcher query the corpus with cited retrieval.

## Run it

```
npm install
npm run dev            # http://127.0.0.1:5173
npm run build          # production bundle in dist/
npm run test:sim       # 34 tests for the legacy screening model
```

Optional, for LLM synthesis in the Ask drawer and Research Studio: copy `.env.example` to `.env` and set `LLM_API_KEY`. Keys stay on the server (`server/`, `api/`). Without a key every feature works in extractive mode.

## Pages

| Route | What it does |
| --- | --- |
| `/atlas` | Place any atmosphere on the map of tested conditions. Verdict under a pressure-scaling exponent range, break-even theta, experiment ranking. |
| `/investigations`, `/i/:id` | The 24 investigations. Each datasheet has an auto-generated chart suite, data table, provenance and linked reports with literature benchmarks. |
| `/analytics` | Cross-dataset coverage, outcomes, scaling-exponent estimates, literature statistics. |
| `/models` | The PMMA and SIBAL screening model with its validation. |
| `/literature` | Passage-level search over NTRS reports. |
| `/studio` | Question to cited brief, with OpenAlex, Crossref, Zenodo and arXiv context. |
| `/data`, `/method` | Catalogue of files and live dataset discovery; methods and limits. |

## Rebuild the data

```
python3 scripts/pipeline/build_data.py      # public/data/*.json from data/
python3 scripts/pipeline/build_corpus.py    # literature.json and corpus.json from NTRS (set NTRS_PDF_DIR)
npm run sim:calibrate                       # refit the screening model
```

## Layout

`src/pages`, `src/components`, `src/lib` (data, scaling framework, retrieval), `src/sim` (screening model), `server` and `api` (LLM and external-API proxy), `scripts/pipeline`, `public/data`, `legacy/` (earlier static site, kept for history), `docs/simulation.md` (earlier README).

## Rules this project follows

Every number comes from a file or a cited source; judgement is labelled interpretation; AI calls run server-side only; sources are logged in `SOURCES.md`. Nothing here is flight-certified.
