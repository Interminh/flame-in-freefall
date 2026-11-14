// Reads data/summaries/*.md and writes data/investigations.json for the Ranking page.
// Front matter lines are "key: value" with JSON values, so each value is parsed as JSON.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const dir = 'data/summaries'
const files = readdirSync(dir).filter((f) => /^PSI-.*\.md$/.test(f))

function parse(text) {
  const [, front, body] = text.replaceAll('\r\n', '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const out = {}
  for (const line of front.split('\n')) {
    const i = line.indexOf(': ')
    if (i < 0) continue
    const raw = line.slice(i + 2)
    try { out[line.slice(0, i)] = JSON.parse(raw) } catch { out[line.slice(0, i)] = raw }
  }
  const summary = body.replace(/^\s*## Summary\s*/, '').trim()
  // The last sentence is flagged as interpretation in the source. Keep it apart.
  const cut = summary.indexOf('Interpretation:')
  out.summary = (cut < 0 ? summary : summary.slice(0, cut)).trim()
  out.interpretation = cut < 0 ? null : summary.slice(cut + 'Interpretation:'.length).trim()
  return out
}

const items = files.map((f) => parse(readFileSync(`${dir}/${f}`, 'utf8')))
items.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
writeFileSync('data/investigations.json', JSON.stringify(items, null, 2) + '\n')
console.log(`${items.length} investigations written`)
