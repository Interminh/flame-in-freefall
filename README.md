# Flame in Freefall
NASA Space Apps 2026, Flame in Freefall.

A database of NASA microgravity combustion data with the analysis built in. It holds all 24 NASA Physical Sciences Informatics (PSI) investigations, 1,900 of their tests harmonised into one table, and 85 NASA technical reports. A researcher can ask a question in plain words (Ignis AI), filter and chart the tests (Explore), read an automatic summary and chart suite for any dataset, and then use the Atlas and screening model for fire-safety questions.

## Run it

```
npm install
npm run dev            # http://127.0.0.1:5173
npm run build          # production bundle in dist/
npm test               # screening-model tests and data/query tests
```

Optional, for LLM synthesis in Ignis AI and Research Studio: copy `.env.example` to `.env` and set `LLM_API_KEY`. Keys stay on the server (`server/`, `api/`). Without a key every feature works in extractive mode.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Ignis AI. Ask in plain words: a rule-based parser turns the sentence into filters over the harmonised table (exact counts, ranges, outcome bar, chart, CSV), and BM25 retrieval returns cited NASA passages. Optional LLM synthesis with number checking. |
| `/explore` | The database. Faceted filters with live counts, sortable paginated table with column picker and CSV export, record panel with column definitions, automatic charts, a chart builder, column profile and Spearman matrix. Filter state is in the URL. |
| `/guide` | How the data is structured: pillar, investigation, dataset, row, column; one real row; completeness of every field. |
| `/compare` | Up to three investigations side by side. |
| `/atlas` | Place any atmosphere on the map of tested conditions. Verdict under a pressure-scaling exponent range, break-even theta, experiment ranking. |
| `/investigations`, `/i/:id` | The 24 investigations. Each datasheet has an auto-generated chart suite, data table, provenance and linked reports with literature benchmarks. |
| `/analytics` | Cross-dataset coverage, outcomes, scaling-exponent estimates, literature statistics. |
| `/models` | The PMMA and SIBAL screening model with its validation. |
| `/literature` | Passage-level search over NTRS reports. |
| `/studio` | Question to cited brief, with OpenAlex, Crossref, Zenodo and arXiv context. |
| `/data`, `/method` | Catalogue of files and live dataset discovery; methods and limits. |

## Rebuild the data

```
npm run data                                # build_data, build_dictionary, build_corpus, build_meta
python3 scripts/pipeline/build_data.py      # public/data/*.json from data/
python3 scripts/pipeline/build_corpus.py    # literature.json and corpus.json from NTRS (set NTRS_PDF_DIR)
npm run sim:calibrate                       # refit the screening model
```

## Layout

`src/pages`, `src/components`, `src/lib` (data, query layer, scaling framework, retrieval), `src/sim` (screening model), `server` and `api` (LLM and external-API proxy), `scripts/pipeline`, `public/data`, `legacy/` (earlier static site, kept for history), `docs/simulation.md` (earlier README).

## Rules this project follows

Every number comes from a file or a cited source; judgement is labelled interpretation; AI calls run server-side only; sources are logged in `SOURCES.md`. Nothing here is flight-certified.
