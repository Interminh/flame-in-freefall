// Builds sources.html (MLA 9 works cited) from the site data.
// Run: node scripts/build-sources.mjs
// Reads: data/atlas/investigations.json, data/publications.json, data/atlas/literature.json,
//        data/pub-figures.json and img/nasa/images.json.
import { readFileSync, writeFileSync } from 'node:fs'

const MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.']
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Titles in the PSI data carry HTML entities such as &#x27;. Decode once, then escape for the page.
const decode = (s) =>
  String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
const fmt = (y, m, d) => `${d} ${MONTHS[m - 1]} ${y}`
// PSI dates look like "05-Jun-2025"
const psiDate = (s) => {
  const [d, mon, y] = s.split('-')
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mon) + 1
  return fmt(+y, m, +d)
}
const iso = (s) => fmt(+s.slice(0, 4), +s.slice(5, 7), +s.slice(8, 10))
const link = (url) => `<a href="${url}">${esc(url.replace(/^https?:\/\//, ''))}</a>`
const endDot = (s) => (/[.?!]$/.test(s) ? s : `${s}.`)
const psiRecord = (id) => `https://psi.nasa.gov/physci/repo/data/investigations/${id}`
const quoted = (title) => `"${esc(endDot(decode(title).trim()))}"`

const invs = JSON.parse(readFileSync('data/atlas/investigations.json', 'utf8'))
const investigations = invs.map((i) => {
  const title = i.full_name.endsWith(i.name) || i.full_name.includes(`(${i.name})`) ? i.full_name : `${i.full_name} (${i.name})`
  return {
    sort: title,
    html: `"${esc(title)}." <i>NASA Physical Sciences Informatics</i>, NASA, ${psiDate(i.psi_record_modified)}, ${link('https://doi.org/' + i.doi)}.`,
  }
})
const invById = new Map(invs.map((i) => [i.psi_id, i]))

// Authors come from the NTRS record for each report.
const reportRows = [
  ['Marcum, Jeremy W., et al.', 'Mixed Convection Blowoff Limits as a Function of Oxygen Concentration and Upward Forced Stretch Rate for Burning PMMA Rods of Various Sizes', '16 July 2017', '20170006615'],
  ['Ferkul, Paul V., et al.', 'Combustion of Solids in Microgravity: Results from the BASS-II Experiment', '23 Oct. 2014', '20160000593'],
  ['Olson, Sandra L., and Paul V. Ferkul.', 'Microgravity Flammability of PMMA Rods in Concurrent Flow', '17 May 2015', '20150008961'],
  ['Ferkul, Paul, et al.', 'SoFIE Design/Status', '20 May 2019', '20190030735'],
  ['Thomsen, Maria, et al.', 'Buoyancy Effects on Concurrent Flame Spread Over Thick PMMA', '5 Nov. 2018', '20200000557'],
  ['Ferkul, Paul V., et al.', 'Flammability Aspects of a Cotton-Fiberglass Fabric in Opposed and Concurrent Airflow in Microgravity', '28 Nov. 2012', '20130012832'],
]
const reportIds = new Set(reportRows.map((r) => r[3]))
const reports = reportRows.map(([a, t, d, id]) => ({
  sort: a + t,
  html: `${esc(a.replace(/\.$/, ''))}. "${esc(t)}." <i>NASA Technical Reports Server</i>, NASA, ${d}, ${link('https://ntrs.nasa.gov/citations/' + id)}.`,
}))

// ---- Publications listed on the PSI investigation pages (data/publications.json) ----
// PSI lists authors as "Last First M." separated by commas. The first token is taken as the surname, so a
// surname with several words may come out wrong. A list that does not follow that pattern is kept as listed.
function mlaAuthors(raw) {
  const names = decode(raw).split(',').map((s) => s.trim()).filter(Boolean)
  if (!names.length) return ''
  if (names.some((n) => n.split(/\s+/).length < 2)) return esc(endDot(decode(raw).trim()))
  const p = names.map((n) => {
    const [last, ...given] = n.split(/\s+/)
    return { last, given: given.join(' ') }
  })
  const first = `${p[0].last}, ${p[0].given}`
  if (p.length === 1) return esc(endDot(first))
  if (p.length === 2) return esc(endDot(`${first}, and ${p[1].given} ${p[1].last}`))
  return esc(`${first}, et al.`)
}

const pubsByPsi = JSON.parse(readFileSync('data/publications.json', 'utf8'))
const literature = JSON.parse(readFileSync('data/atlas/literature.json', 'utf8'))
const figures = JSON.parse(readFileSync('data/pub-figures.json', 'utf8'))
const litById = new Map(literature.map((l) => [String(l.id), l]))

// NTRS documents that the paper figures come from. They are cited in the figures section, not twice.
const figureNtrs = new Set(figures.filter((f) => f.ntrs_id).map((f) => String(f.ntrs_id)))

const pubKey = (p) => (p.doi ? `doi:${p.doi.toLowerCase()}` : p.ntrs_id ? `ntrs:${p.ntrs_id}` : `t:${decode(p.title).toLowerCase().replace(/\W+/g, '')}`)
const pubMap = new Map()
for (const [psi, list] of Object.entries(pubsByPsi)) {
  for (const p of list) {
    const k = pubKey(p)
    if (!pubMap.has(k)) pubMap.set(k, { p, psi: [] })
    pubMap.get(k).psi.push(psi)
  }
}

const authorsByNtrs = new Map()
for (const { p } of pubMap.values()) if (p.ntrs_id && p.authors && !/^https?:/.test(p.authors)) authorsByNtrs.set(String(p.ntrs_id), p.authors)

const publications = []
const seenNtrs = new Set()
for (const { p, psi } of pubMap.values()) {
  const ntrs = p.ntrs_id ? String(p.ntrs_id) : null
  if (ntrs && (reportIds.has(ntrs) || figureNtrs.has(ntrs))) continue
  if (ntrs) seenNtrs.add(ntrs)
  // One PSI entry has a link where the authors should be. Use it as the link and list no authors.
  const authorsAreUrl = /^https?:\/\//.test(p.authors || '')
  const authors = authorsAreUrl ? '' : mlaAuthors(p.authors || '')
  const url = p.url || (authorsAreUrl ? p.authors : ntrs ? `https://ntrs.nasa.gov/citations/${ntrs}` : null)
  const where = url ? link(url) : `listed on the NASA PSI record for ${[...new Set(psi)].join(', ')}, ${link(psiRecord(psi[0]))}`
  const title = decode(p.title)
  publications.push({
    sort: (authors ? decode(authors) : title) + title,
    html: `${authors ? `${authors} ` : ''}${quoted(title)} ${p.year ? `${p.year}, ` : ''}${where}.`,
  })
}
// NTRS records the site links to that PSI does not list with authors.
for (const l of literature) {
  const id = String(l.id)
  if (reportIds.has(id) || figureNtrs.has(id) || seenNtrs.has(id)) continue
  publications.push({
    sort: decode(l.title),
    html: `${quoted(l.title)} <i>NASA Technical Reports Server</i>, NASA, ${l.year}, ${link(l.url || 'https://ntrs.nasa.gov/citations/' + id)}.`,
  })
}

// ---- Documents the paper figures are cropped from ----
const figureDocs = new Map()
for (const f of figures) {
  const fromNtrs = f.source === 'ntrs' || f.ntrs_id
  if (fromNtrs && reportIds.has(String(f.ntrs_id))) continue // already cited under technical reports
  const k = fromNtrs ? `ntrs:${f.ntrs_id}` : `psi:${f.psi_home}:${f.paper}`
  if (figureDocs.has(k)) continue
  if (fromNtrs) {
    const id = String(f.ntrs_id)
    const l = litById.get(id)
    const au = authorsByNtrs.get(id)
    const title = l?.title || f.paper
    figureDocs.set(k, {
      sort: (au ? decode(mlaAuthors(au)) : '') + title,
      html: `${au ? `${mlaAuthors(au)} ` : ''}${quoted(title)} <i>NASA Technical Reports Server</i>, NASA, ${l?.year ? `${l.year}, ` : ''}${link('https://ntrs.nasa.gov/citations/' + id)}.`,
    })
  } else {
    const rec = invById.get(f.psi_home)
    const where = rec ? `${psiDate(rec.psi_record_modified)}, ${link('https://doi.org/' + rec.doi)}` : link(psiRecord(f.psi_home))
    figureDocs.set(k, {
      sort: f.paper,
      html: `${quoted(f.paper)} <i>NASA Physical Sciences Informatics</i>, record ${esc(f.psi_home)}, NASA, ${where}.`,
    })
  }
}
const figureSources = [...figureDocs.values()]

// Photos on the investigations page. Credit is "NASA" or "NASA / [GRC /] Name".
const NOTE = ' (NASA title is the image id)'
const photos = JSON.parse(readFileSync('img/nasa/images.json', 'utf8')).map((p) => {
  const parts = p.credit.split(' / ').filter((x) => !['NASA', 'GRC'].includes(x))
  let author = ''
  if (parts[0]) {
    const w = parts[0].split(' ')
    author = `${esc(w.slice(1).join(' '))}, ${esc(w[0])}. `
  }
  // Where NASA's own title is just the image id, ours is a description, so it goes unquoted.
  const described = p.nasa_title.endsWith(NOTE)
  const t = esc(p.nasa_title.replace(NOTE, ''))
  const title = described ? `${t}.` : `"${t}."`
  return {
    sort: (author || t) + t,
    html: `${author}${title} <i>NASA Image and Video Library</i>, NASA, ${iso(p.date)}, ${link('https://images.nasa.gov/details/' + p.id)}.`,
  }
})

const tools = [
  ['@fontsource/newsreader', `"Newsreader." Version 5.3.0, <i>Fontsource</i>, ${link('https://fontsource.org/fonts/newsreader')}.`],
  ['@fontsource/ibm-plex', `"IBM Plex Sans Condensed." Version 5.3.0, <i>Fontsource</i>, ${link('https://fontsource.org/fonts/ibm-plex-sans-condensed')}.`],
  ['@fontsource/jetbrains-mono', `"JetBrains Mono." Version 5.2.1, <i>Fontsource</i>, ${link('https://fontsource.org/fonts/jetbrains-mono')}.`],
  ['@fontsource/archivo-black', `"Archivo Black." Version 5.2.1, <i>Fontsource</i>, ${link('https://fontsource.org/fonts/archivo-black')}.`],
  ['React', `<i>React</i>. Version 19.3.1, Meta Platforms, ${link('https://react.dev')}.`],
  ['React Router', `<i>React Router</i>. Version 7.18.5, ${link('https://reactrouter.com')}.`],
  ['Vite', `<i>Vite</i>. Version 8.3.8, ${link('https://vite.dev')}.`],
  ['Plotly', `<i>Plotly.js</i>. Version 4.3.0, Plotly, ${link('https://plotly.com/javascript/')}.`],
  ['NumPy', `<i>NumPy</i>. Version 1.26.4, NumPy Developers, ${link('https://numpy.org')}. Used only to render the logo, not shipped with the site.`],
  ['Pillow', `<i>Pillow</i>. Version 11.3.0, Python Pillow contributors, ${link('https://python-pillow.org')}. Used only to render the logo, not shipped with the site.`],
].map(([sort, html]) => ({ sort, html }))

const ai = [
  ['Claude Code', `<i>Claude Code</i>. Anthropic, ${link('https://claude.com/claude-code')}.`],
  ['gpt-oss-120b', `<i>gpt-oss-120b</i>. OpenAI, <i>Hugging Face</i>, ${link('https://huggingface.co/openai/gpt-oss-120b')}.`],
  ['Groq', `<i>Groq</i>. Groq, ${link('https://groq.com')}.`],
  ['Ollama', `<i>Ollama</i>. Ollama, ${link('https://ollama.com')}.`],
  ['Vercel', `<i>Vercel</i>. Vercel, ${link('https://vercel.com')}.`],
].map(([sort, html]) => ({ sort, html }))

const sorted = (items) => [...items].sort((a, b) => a.sort.localeCompare(b.sort))
const list = (items) => `<ul class="works-cited">\n${sorted(items).map((x) => `          <li>${x.html}</li>`).join('\n')}\n        </ul>`

const html = `<!doctype html>
<html lang="en" data-theme="brutal">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/png" href="img/logo.png" />
    <title>Our sources | Flame in freefall</title>
    <script src="js/prefs.js"></script>
    <link rel="stylesheet" href="fonts/fonts.css" />
    <link rel="stylesheet" href="src/styles/tokens.css" />
    <link rel="stylesheet" href="src/styles/base.css" />
    <link rel="stylesheet" href="src/styles/layout.css" />
    <link rel="stylesheet" href="src/styles/themes.css" />
    <link rel="stylesheet" href="src/styles/sources.css" />
    <link rel="stylesheet" href="src/styles/brutal.css" />
  </head>
  <body>
    <div id="nav"></div>
    <main class="page">
      <section>
        <h1>Our sources</h1>
        <p>Works cited in MLA format. Investigation entries cite the NASA PSI record, with the date PSI last modified it. Authors are left out where the PSI record does not list one.</p>

        <h2>NASA investigations</h2>
        <p>The charts and raw data tables on each investigation page are drawn from the data files of the investigation's PSI record, which PSI releases under the license stated on that record.</p>
        ${list(investigations)}

        <h2>NASA technical reports</h2>
        ${list(reports)}

        <h2>Publications listed on the PSI pages</h2>
        <p>Every publication that PSI lists for an investigation is shown on that investigation's page and cited here once, even if it is listed for several investigations. PSI does not give the journal or conference name, so each entry gives the authors as PSI lists them, the title, the year where PSI states one, and a link. Entries without a link point to the PSI record that lists them.</p>
        <details class="works-fold">
          <summary><h3>${publications.length} publications</h3></summary>
          ${list(publications)}
        </details>

        <h2>Documents the paper figures come from</h2>
        <p>Each paper figure on the investigation pages is a cropped page from a NASA document, unaltered, with the document named under the figure. Documents already cited above are not repeated.</p>
        ${list(figureSources)}

        <h2>Software and fonts</h2>
        ${list(tools)}

        <h2>AI tools and hosting</h2>
        <p>Claude supported the development of this project through coding and analysis. AI work was reviewed by people on our team, and AI summaries were checked against the PSI record.</p>
        ${list(ai)}

        <h2>Images</h2>
        <p>Photos on the investigations page are from NASA. They show related hardware or sessions, not data from the investigation. Charts are drawn from the data above with Plotly.js. The logo is our own render, made with scripts/make-logo.py.</p>
        ${list(photos)}
      </section>
    </main>
    <script src="js/nav.js"></script>
    <script defer src="js/chat.js"></script>
  </body>
</html>
`
writeFileSync('sources.html', html)
console.log(`sources.html: ${investigations.length} investigations, ${reports.length} reports, ${publications.length} publications, ${figureSources.length} figure documents, ${photos.length} photos`)
