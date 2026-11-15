# Ignis_0G

Dashboard that summarizes and ranks NASA's microgravity combustion investigations for fire safety. Built for the NASA Space Apps Challenge 2026, "Flame in Freefall".

It covers 24 investigations from NASA's Physical Sciences Informatics (PSI) database. Every fact links to a PSI page, dataset, or the challenge text. 

## Features

- **Investigations:** summaries, graphs from PSI data, figures from NASA papers, and raw tables for each investigation.
- **Simulation:** estimates whether a solid fuel keeps burning at 0 g, lunar, Mars, and Earth gravity.
- **Ignis AI:** ranks investigations against a question and explains the top three, using only fields from our data file.
- **Presentation:** project slides, viewable in the browser or as a PDF.

## Limitations

- The simulation is a simplified model, not a fire prediction, and is not endorsed by NASA. It does not generalize beyond the four materials it was fitted to. See [docs/simulation.md](docs/simulation.md).
- BASS-II has no usable airflow column, so the simulation's flow inputs were read from crew notes.
- AI summaries are drafts. Each one is checked by hand against its source, and inferences are labeled "interpretation".

## Getting started

Requires Node 20.19 or newer.

```bash
npm install
npm run dev
```

The pages load JSON, so they need the dev server and will not work from `file://`.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run test:sim` | Run simulation and data-integrity tests |
| `npm run sim:calibrate` | Refit the model and rewrite `data/derived/` |

## Configuration

Ignis AI calls run in the serverless functions under `api/`, never in the browser. Copy the example file and add a provider key:

```bash
cp .env.example .env
```

`.env` is gitignored. The default provider is Groq; `.env.example` also shows how to use a local Ollama instance, which needs no key. On Vercel, set the same variables in the project settings.

## Project structure

```
api/            Serverless functions (rank, explain, chat)
data/           PSI tables, cleaned data, per-investigation JSON
data/derived/   Simulation outputs
docs/           Technical notes
js/, src/       Page scripts, React components, simulation model, styles
scripts/        Data build and model calibration
tests/          Simulation and data checks
presentation/   Slide deck
```

Raw `data/psi_*.csv` files are read-only. See [data/DATA_NOTES.md](data/DATA_NOTES.md), [data/DATA_DICTIONARY.md](data/DATA_DICTIONARY.md), and [data/VERIFICATION.md](data/VERIFICATION.md) for data caveats, field definitions, and the audit.

## Sources and credits

Data comes from NASA PSI (CC0-1.0) and papers hosted on NTRS. All datasets, libraries, fonts, and images are logged with licenses in [SOURCES.md](SOURCES.md).

AI tools used: Claude Code (Anthropic) for code, tests, and pages; gpt-oss-120b for scoring on the Ignis AI page.

## License

[Apache 2.0](LICENSE)
