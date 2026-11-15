// External scholarly APIs, reached through the allowlisted server proxy at /api/ext so keys never reach the browser.
const via = (u) => fetch(`/api/ext?u=${encodeURIComponent(u)}`)
async function json(u) { const r = await via(u); if (!r.ok) throw new Error(`${new URL(u).hostname} returned ${r.status}`); return r.json() }
const clean = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export async function openalex(q) {
  const base = 'https://api.openalex.org/works'
  const [top, recent] = await Promise.all([
    json(`${base}?search=${encodeURIComponent(q)}&per-page=6&sort=cited_by_count:desc&select=id,doi,title,publication_year,cited_by_count,primary_location,abstract_inverted_index`),
    json(`${base}?search=${encodeURIComponent(q)}&per-page=6&filter=from_publication_date:2022-01-01&sort=publication_date:desc&select=id,doi,title,publication_year,cited_by_count,primary_location,abstract_inverted_index`),
  ])
  const map = (w) => ({ id: w.id, title: clean(w.title), year: w.publication_year, cites: w.cited_by_count, url: w.doi || w.id, venue: w.primary_location?.source?.display_name || '', abstract: invert(w.abstract_inverted_index) })
  return { total: top.meta?.count ?? null, top: (top.results || []).map(map), recent: (recent.results || []).map(map), source: 'OpenAlex' }
}
function invert(ix) {
  if (!ix) return ''
  const w = []
  for (const [t, pos] of Object.entries(ix)) for (const p of pos) w[p] = t
  return w.filter(Boolean).join(' ').slice(0, 600)
}
export async function crossref(q) {
  const j = await json(`https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=6&select=DOI,title,issued,container-title,is-referenced-by-count`)
  return { total: j.message?.['total-results'] ?? null, items: (j.message?.items || []).map((w) => ({ title: clean(w.title?.[0]), year: w.issued?.['date-parts']?.[0]?.[0], venue: w['container-title']?.[0] || '', url: `https://doi.org/${w.DOI}`, cites: w['is-referenced-by-count'] })), source: 'Crossref' }
}
export async function zenodo(q) {
  const j = await json(`https://zenodo.org/api/records?q=${encodeURIComponent(q)}&size=6&sort=bestmatch`)
  return { total: j.hits?.total ?? null, items: (j.hits?.hits || []).map((h) => ({ title: clean(h.metadata?.title), year: (h.metadata?.publication_date || '').slice(0, 4), type: h.metadata?.resource_type?.title, url: h.links?.self_html || h.links?.html, doi: h.doi })), source: 'Zenodo' }
}
export async function arxiv(q) {
  const r = await via(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=6&sortBy=relevance`)
  if (!r.ok) throw new Error(`arXiv returned ${r.status}`)
  const doc = new DOMParser().parseFromString(await r.text(), 'text/xml')
  return { items: [...doc.querySelectorAll('entry')].map((e) => ({ title: clean(e.querySelector('title')?.textContent), year: (e.querySelector('published')?.textContent || '').slice(0, 4), url: e.querySelector('id')?.textContent, abstract: clean(e.querySelector('summary')?.textContent).slice(0, 500) })), source: 'arXiv' }
}
export const settle = async (name, fn) => { try { return { name, ok: true, data: await fn() } } catch (e) { return { name, ok: false, error: e.message } } }
export async function huggingface(q) {
  const j = await json(`https://huggingface.co/api/datasets?search=${encodeURIComponent(q)}&limit=8&sort=downloads&direction=-1`)
  return { items: (Array.isArray(j) ? j : []).map((d) => ({ title: d.id, year: (d.createdAt || '').slice(0, 4), url: `https://huggingface.co/datasets/${d.id}`, cites: undefined, venue: `${d.downloads ?? 0} downloads` })), source: 'Hugging Face' }
}
