# Sources

| Name | Link | License | Use |
| --- | --- | --- | --- |
| Newsreader (@fontsource/newsreader) | https://fontsource.org/fonts/newsreader | SIL OFL 1.1 | Reading text and headings |
| IBM Plex Sans Condensed (@fontsource/ibm-plex-sans-condensed) | https://fontsource.org/fonts/ibm-plex-sans-condensed | SIL OFL 1.1 | Tables, numbers, controls |
| React | https://react.dev | MIT | UI |
| React Router | https://reactrouter.com | MIT | Page routing |
| Vite | https://vite.dev | MIT | Dev server and build |
| PSI-25 BASS-II experimental table | https://psi.nasa.gov/physci/repo/data/investigations/PSI-25 | CC0-1.0 | Test outcomes and crew notes behind `data/derived/bass2_flow_points.csv`, which fits the Simulation model |
| PSI-26 BASS experimental data | https://psi.nasa.gov/physci/repo/data/investigations/PSI-26 | CC0-1.0 | Only the recorded pressure range (98.3 to 102.2 kPa), used for the pressure warning |
| Link et al. 2018, Scientific Reports | https://link.springer.com/10.1038/s41598-017-18398-4 | Not checked | Not used. Not NASA-hosted, so outside the agreed scope. Kept in `literature_loc_checks.csv` for the record |
| Halli and Tien, downward-burning limit for PMMA rods | Not found (named in a search excerpt) | Not checked | Not used. Not NASA-hosted, so outside the agreed scope |
| NTRS 20170006615: Marcum, Ferkul, Olson. Mixed convection blowoff limits for burning PMMA rods (ICES-2017-370) | https://ntrs.nasa.gov/citations/20170006615 | Hosted on NTRS. Some authors are at universities or contractors. Distribution notice not checked on each record | 1 g buoyant flow, linear blow-off boundary, 13.4% O2 limit, linear flow rule. Quotes and pages in `data/derived/nasa_1g_anchors.csv` |
| NTRS 20160000593: Ferkul et al. Combustion of Solids in Microgravity: Results from the BASS-II Experiment (poster, 2014) | https://ntrs.nasa.gov/citations/20160000593 | Hosted on NTRS. Some authors are at universities or contractors. Distribution notice not checked on each record | 1 g blow-off limit of 16% O2, 13.6% O2 minimum, margin of 2.4%, film quench and blow-off flows. Quotes and pages in `data/derived/nasa_1g_anchors.csv` |
| NTRS 20150008961: Olson and Ferkul. Microgravity flammability of PMMA rods in concurrent flow (2015) | https://ntrs.nasa.gov/citations/20150008961 | Hosted on NTRS. Some authors are at universities or contractors. Distribution notice not checked on each record | Blow-off intercept 13.3% O2, exponential quench branch. Quotes and pages in `data/derived/nasa_1g_anchors.csv` |
| NTRS 20190030735: Ferkul. SoFIE Design/Status (2019) | https://ntrs.nasa.gov/citations/20190030735 | Hosted on NTRS. Some authors are at universities or contractors. Distribution notice not checked on each record | Reduced-gravity flows of 5 to 20 cm/s, margin of 1.4% O2. Quotes and pages in `data/derived/nasa_1g_anchors.csv` |
| NTRS 20200000557: Buoyancy Effects on Concurrent Flame Spread Over Thick PMMA | https://ntrs.nasa.gov/citations/20200000557 | Hosted on NTRS. Some authors are at universities or contractors. Distribution notice not checked on each record | Mixed-flow rule combining forced and buoyant flow (Eq. 6). Quotes and pages in `data/derived/nasa_1g_anchors.csv` |
| NTRS 20130012832: Ferkul. Flammability Aspects of a Cotton-Fiberglass Fabric in Opposed and Concurrent Airflow in Microgravity (2013) | https://ntrs.nasa.gov/citations/20130012832 | Hosted on NTRS. Some authors are at universities or contractors. Distribution notice not checked on each record | Downward spread over SIBAL not possible in 1 g air. Quotes and pages in `data/derived/nasa_1g_anchors.csv` |
| IBM Plex Sans (@fontsource/ibm-plex-sans) | https://fontsource.org/fonts/ibm-plex-sans | SIL OFL 1.1 | Interface text |
| IBM Plex Mono (@fontsource/ibm-plex-mono) | https://fontsource.org/fonts/ibm-plex-mono | SIL OFL 1.1 | Numbers and code |
| Plotly.js (plotly.js-dist-min) | https://plotly.com/javascript/ | MIT | All charts in the Flame Atlas |
| NASA PSI, all 24 investigations in `data/` | https://psi.nasa.gov/physci/repo | CC0-1.0 (PSI-10 states no license) | Harmonised into `public/data/` by `scripts/pipeline/build_data.py` |
| NASA NTRS API records and PDFs (85 records used) | https://ntrs.nasa.gov/api | Hosted on NTRS. Distribution notice not checked on each record | Page-level retrieval corpus built by `scripts/pipeline/build_corpus.py`. Metadata in `data/external/ntrs_records.json`; PDFs are not stored in the repository |
| OpenAlex | https://openalex.org | CC0 | Live literature search in the Research Studio, through the server proxy `/api/ext` |
| Crossref REST API | https://www.crossref.org/documentation/retrieve-metadata/rest-api/ | Metadata free to reuse | Live literature search in the Research Studio |
| Zenodo REST API | https://developers.zenodo.org | Record licences vary | Dataset discovery in the Data page and Research Studio |
| arXiv API | https://info.arxiv.org/help/api/ | arXiv terms of use | Live preprint search in the Research Studio |
| Hugging Face Hub API | https://huggingface.co/docs/hub/api | Dataset licences vary | Dataset discovery in the Data page |
| Claude (Anthropic), used through Claude Code | https://claude.com/claude-code | Not applicable | AI tool. Wrote and refactored the Flame Atlas code, data pipelines and text under human direction. Numbers are produced by scripts and checked against source files |
| Claude Code (Anthropic), earlier work | https://claude.com/claude-code | Not applicable | AI tool. Drafted the simulation code, tests, page and the flow-point extraction. A person still has to check the flow points and the constants |
| gpt-oss-120b (OpenAI) | https://huggingface.co/openai/gpt-oss-120b | Apache 2.0 | Open-weight AI model that scores investigations on the Ignis AI page. AI use to be credited in project credits |
| Groq | https://groq.com | Service terms | Hosts the model for the Ignis AI function |
| Ollama | https://ollama.com | MIT | Runs the model on a laptop for local testing and as a demo backup |
| Vercel | https://vercel.com | Service terms | Hosts the site and the Ignis AI function |
