# Ignis_0G

Our project for the NASA Space Apps Challenge 2026, "Flame in Freefall".

NASA has a lot of experiments on how fire behaves in microgravity, and reading through all of them takes a while. Ignis_0G is a website that summarizes and ranks 24 of these investigations from NASA's Physical Sciences Informatics (PSI) database, with fire safety in mind. We built it for people with a technical background who don't have much time.

We tried to link every fact back to a PSI page, dataset, or the challenge text. If the source doesn't say something, the site says "not stated in the source" instead of guessing.

## What's on the site

| Page | What it does |
| --- | --- |
| Investigations | All 24 PSI investigations. Each one has a summary, graphs made from its PSI data, figures from NASA papers, and the raw tables. |
| Simulation | A rough estimate of whether a solid fuel keeps burning at 0 g, on the Moon, on Mars, or on Earth. It's fitted to BASS-II test notes. |
| Ignis AI | You type a question and it ranks the investigations and explains the top three. It only uses fields from our own data file. |
| Presentation | Our slides, which you can read in the browser or download as a PDF. |
| About, Our sources | What the project is, plus everything we used (datasets, libraries, fonts, images). |

## Things to know before trusting it

- **The simulation is only an estimate.** It's a simplified model, not a prediction of a real fire, and NASA hasn't endorsed it. It also does badly on materials it wasn't fitted to, so please don't use it for anything outside the four it offers. The full validation is in [docs/simulation.md](docs/simulation.md).
- **The AI output is a draft.** Ignis AI only sees fields from our data file, and we check each summary against the source by hand. We tried to label anything that's our own inference as "interpretation" so it stays separate from measured results. We might have missed some.
- **BASS-II doesn't have a usable airflow column.** Because of that, the flow values in the simulation were read from the crew notes, not from measurements. That's a real weak spot.

## Running it locally

You'll need Node 20.19 or newer (Vite 8 asks for it).

```bash
npm install
npm run dev
```

Then open the address Vite prints in the terminal. The pages load JSON files, so opening the HTML directly won't work. It needs the dev server.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm run build` | Makes a production build |
| `npm run test:sim` | Runs the simulation tests and data checks |
| `npm run sim:calibrate` | Refits the model and rewrites `data/derived/`. Takes a few minutes. |

### Setting up Ignis AI

The AI calls run in serverless functions in `api/`, not in the front end, so your key never ends up in the browser. To turn it on:

```bash
cp .env.example .env
```

Then put your provider key in `.env`. That file is gitignored, so it won't get committed. We use Groq with an open-weight model by default. `.env.example` also shows how to point it at a local Ollama instead, which doesn't need a key. If you deploy on Vercel, set the same variables in the project settings.

## How the repo is laid out

```
api/            Serverless functions (rank, explain, chat)
data/           PSI tables, cleaned data, per-investigation JSON, audit notes
data/derived/   Everything the simulation writes
docs/           Technical notes
js/, src/       Page scripts, React components, the simulation model, styles
scripts/        Data building and model calibration
tests/          Simulation and data checks
presentation/   Slide deck PDF and images
```

The raw `data/psi_*.csv` files are only read, never changed. If you want to know what's messy about the data, see [data/DATA_NOTES.md](data/DATA_NOTES.md). Field definitions are in [data/DATA_DICTIONARY.md](data/DATA_DICTIONARY.md) and the audit is in [data/VERIFICATION.md](data/VERIFICATION.md).

## Sources and credits

The data comes from NASA PSI (CC0-1.0) and papers on NTRS. Everything else we used, like fonts, libraries, and photos, is listed with its license in [SOURCES.md](SOURCES.md).

We used AI tools on this project. Claude Code (Anthropic) helped us write code, tests, and pages, and gpt-oss-120b does the scoring on the Ignis AI page. Both are in SOURCES.md.

## License

Apache 2.0. See [LICENSE](LICENSE).
