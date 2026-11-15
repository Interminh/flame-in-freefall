// Builds sources.html (MLA 9 works cited) from data/atlas/investigations.json.
// Run: node scripts/build-sources.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmt = (y, m, d) => `${d} ${MONTHS[m - 1]} ${y}`
// PSI dates look like "05-Jun-2025"
const psiDate = (s) => {
  const [d, mon, y] = s.split('-')
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mon) + 1
  return fmt(+y, m, +d)
}
const iso = (s) => fmt(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10))
const link = (url) => `<a href="${url}">${esc(url.replace(/^https?:\/\//, ''))}</a>`
const ACCESSED = '15 Nov. 2026'

const invs = JSON.parse(readFileSync('data/atlas/investigations.json', 'utf8'))
const investigations = invs.map((i) => {
  const title = i.full_name.endsWith(i.name) || i.full_name.includes(`(${i.name})`) ? i.full_name : `${i.full_name} (${i.name})`
  return {
    sort: title,
    html: `"${esc(title)}." <i>NASA Physical Sciences Informatics</i>, NASA, ${psiDate(i.psi_record_modified)}, ${link('https://doi.org/' + i.doi)}. Accessed 14 Nov. 2026.`,
  }
})

// Authors come from the NTRS record for each report.
const reports = [
  ['Marcum, Jeremy W., et al.', 'Mixed Convection Blowoff Limits as a Function of Oxygen Concentration and Upward Forced Stretch Rate for Burning PMMA Rods of Various Sizes', '16 July 2017', '20170006615'],
  ['Ferkul, Paul V., et al.', 'Combustion of Solids in Microgravity: Results from the BASS-II Experiment', '23 Oct. 2014', '20160000593'],
  ['Olson, Sandra L., and Paul V. Ferkul.', 'Microgravity Flammability of PMMA Rods in Concurrent Flow', '17 May 2015', '20150008961'],
  ['Ferkul, Paul, et al.', 'SoFIE Design/Status', '20 May 2019', '20190030735'],
  ['Thomsen, Maria, et al.', 'Buoyancy Effects on Concurrent Flame Spread Over Thick PMMA', '5 Nov. 2018', '20200000557'],
  ['Ferkul, Paul V., et al.', 'Flammability Aspects of a Cotton-Fiberglass Fabric in Opposed and Concurrent Airflow in Microgravity', '28 Nov. 2012', '20130012832'],
].map(([a, t, d, id]) => ({
  sort: a + t,
  html: `${esc(a.replace(/\.$/, ''))}. "${esc(t)}." <i>NASA Technical Reports Server</i>, NASA, ${d}, ${link('https://ntrs.nasa.gov/citations/' + id)}. Accessed ${ACCESSED}.`,
}))

const tools = [
  ['@fontsource/newsreader', `"Newsreader." Version 5.3.0, <i>Fontsource</i>, ${link('https://fontsource.org/fonts/newsreader')}. Accessed ${ACCESSED}.`],
  ['@fontsource/ibm-plex', `"IBM Plex Sans Condensed." Version 5.3.0, <i>Fontsource</i>, ${link('https://fontsource.org/fonts/ibm-plex-sans-condensed')}. Accessed ${ACCESSED}.`],
  ['React', `<i>React</i>. Version 19.3.1, Meta Platforms, ${link('https://react.dev')}. Accessed ${ACCESSED}.`],
  ['React Router', `<i>React Router</i>. Version 7.18.5, ${link('https://reactrouter.com')}. Accessed ${ACCESSED}.`],
  ['Vite', `<i>Vite</i>. Version 8.3.8, ${link('https://vite.dev')}. Accessed ${ACCESSED}.`],
  ['Plotly', `<i>Plotly.js</i>. Version 4.3.0, Plotly, ${link('https://plotly.com/javascript/')}. Accessed ${ACCESSED}.`],
].map(([sort, html]) => ({ sort, html }))

const ai = [
  ['Claude Code', `<i>Claude Code</i>. Anthropic, ${link('https://claude.com/claude-code')}. Accessed ${ACCESSED}.`],
  ['gpt-oss-120b', `<i>gpt-oss-120b</i>. OpenAI, <i>Hugging Face</i>, ${link('https://huggingface.co/openai/gpt-oss-120b')}. Accessed ${ACCESSED}.`],
  ['Groq', `<i>Groq</i>. Groq, ${link('https://groq.com')}. Accessed ${ACCESSED}.`],
  ['Ollama', `<i>Ollama</i>. Ollama, ${link('https://ollama.com')}. Accessed ${ACCESSED}.`],
  ['Vercel', `<i>Vercel</i>. Vercel, ${link('https://vercel.com')}. Accessed ${ACCESSED}.`],
].map(([sort, html]) => ({ sort, html }))

const list = (items) =>
  `<ul class="works-cited">\n${[...items].sort((a, b) => a.sort.localeCompare(b.sort)).map((x) => `          <li>${x.html}</li>`).join('\n')}\n        </ul>`

const html = `<!doctype html>
<html lang="en" data-theme="anthropic">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Our sources | Flame in freefall</title>
    <link rel="stylesheet" href="fonts/fonts.css" />
    <link rel="stylesheet" href="src/styles/tokens.css" />
    <link rel="stylesheet" href="src/styles/base.css" />
    <link rel="stylesheet" href="src/styles/layout.css" />
    <link rel="stylesheet" href="src/styles/themes.css" />
    <link rel="stylesheet" href="src/styles/sources.css" />
  </head>
  <body>
    <div id="nav"></div>
    <main class="page">
      <section>
        <h1>Our sources</h1>
        <p>Works cited in MLA format. Investigation entries cite the NASA PSI record, with the date PSI last modified it. Dates after "Accessed" are when we retrieved the page. Authors are left out where the PSI record does not list one.</p>

        <h2>NASA investigations</h2>
        ${list(investigations)}

        <h2>NASA technical reports</h2>
        ${list(reports)}

        <h2>Software and fonts</h2>
        ${list(tools)}

        <h2>AI tools and hosting</h2>
        <p>AI summaries were checked by a person against the PSI record.</p>
        ${list(ai)}

        <h2>Images</h2>
        <p>This site uses no photographs or third-party images. Charts are drawn from the data above with Plotly.js, and the diagrams are our own SVG.</p>
      </section>
    </main>
    <script src="js/nav.js"></script>
  </body>
</html>
`
writeFileSync('sources.html', html)
