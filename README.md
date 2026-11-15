# Ignis_0G

**Flame in Freefall** · NASA Space Apps Challenge 2026

Ignis_0G is a web dashboard that summarizes and ranks NASA's microgravity combustion investigations for fire safety. It is built for technical readers who don't have time to dig through 24 separate PSI records.

Every fact links back to a NASA Physical Sciences Informatics (PSI) page, dataset, or the challenge text. Where the source doesn't say, the site says "not stated in the source".

## What's in it

| Page | What it does |
| --- | --- |
| Investigations | All 24 PSI investigations. Each has a summary, graphs drawn from its PSI data, figures from NASA papers, and the raw tables. |
| Simulation | Estimates whether a solid fuel keeps burning at 0 g, on the Moon, on Mars, or on Earth. Fitted to BASS-II test notes. |
| Ignis AI | Ranks the investigations against your question and explains the top three, using only fields from our data file. |
| Presentation | Our slides, to read in the browser or download as a PDF. |
| About, Our sources | What the project is, and every dataset, library, and image it uses. |

## Read this first

- **The simulation is an estimate.** It comes from a simplified model, not a real fire, and NASA has not endorsed it. It does not beat a naive baseline for materials outside the four it was fitted to. Details and validation are in [docs/simulation.md](docs/simulation.md).
- **AI output is a draft.** Ignis AI only sees fields from our data file, and a person checks each summary against the source. Inferences are labeled "interpretation" and kept apart from measured results.
- **BASS-II has no usable airflow column.** The simulation's flow points were read from crew notes, not measured values.

## Run it locally

You need Node 20.19 or newer (Vite 8 requires it).

```bash
npm install
npm run dev
```

Then open the address Vite prints. The pages load JSON, so they need the dev server and won't work from a `file://` path.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run test:sim` | Simulation unit and data-integrity tests |
| `npm run sim:calibrate` | Refit the model and rewrite `data/derived/` (a few minutes, seeded) |

### Ignis AI setup

AI calls run in serverless functions under `api/`, never in front-end code. To enable them:

```bash
cp .env.example .env
```

Add your provider key to `.env`. It is gitignored. The defaults use Groq with an open-weight model, and `.env.example` shows how to point at a local Ollama instead. On Vercel, set the same variables under Project Settings.

## Project layout

```
api/            Serverless functions: rank, explain, chat
data/           PSI tables, cleaned data, per-investigation JSON, audit notes
data/derived/   Everything the simulation writes
docs/           Technical notes
js/, src/       Page scripts, React components, simulation model, styles
scripts/        Data build and model calibration
tests/          Simulation and data checks
presentation/   Slide deck PDF and images
```

Raw `data/psi_*.csv` files are read-only. Data caveats are in [data/DATA_NOTES.md](data/DATA_NOTES.md), field definitions in [data/DATA_DICTIONARY.md](data/DATA_DICTIONARY.md), and the audit in [data/VERIFICATION.md](data/VERIFICATION.md).

## Sources and credits

Datasets come from NASA PSI (CC0-1.0) and papers hosted on NTRS. Fonts, libraries, and photos are logged with their licenses in [SOURCES.md](SOURCES.md).

AI tools were used on this project: Claude Code (Anthropic) helped draft code, tests, and pages, and gpt-oss-120b scores investigations on the Ignis AI page. Both are listed in SOURCES.md.

## License

Apache 2.0. See [LICENSE](LICENSE).
