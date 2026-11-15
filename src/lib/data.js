// Static data loaders. Every file is produced by scripts/pipeline/*.py and cached in memory.
const BASE = import.meta.env.BASE_URL || '/'
const cache = new Map()

export function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`${BASE}data/${path}`).then((r) => {
        if (!r.ok) throw new Error(`${path}: ${r.status}`)
        return r.json()
      }),
    )
  }
  return cache.get(path)
}

export const getInvestigations = () => loadJson('investigations.json')
export const getAnalytics = () => loadJson('analytics.json')
export const getLiterature = () => loadJson('literature.json')
export const getCorpus = () => loadJson('corpus.json').then((c) => c.chunks)
export const getDatasetIndex = () => loadJson('datasets/index.json')
export const getDataset = (id) => loadJson(`datasets/${id}.json`)

// tests.json and dataset tables are column-major: data[i] holds column cols[i]. Transpose to row objects.
function transpose(cols, data) {
  const n = data.length ? data[0].length : 0
  const rows = new Array(n)
  for (let r = 0; r < n; r++) { const o = {}; for (let c = 0; c < cols.length; c++) o[cols[c]] = data[c][r]; rows[r] = o }
  return rows
}
export async function getTests() {
  const t = await loadJson('tests.json')
  return transpose(t.cols, t.data)
}
export function datasetRows(ds) {
  return ds && ds.cols && ds.cols.length ? transpose(ds.cols, ds.data) : []
}

export const PILLARS = {
  prevention: { label: 'Prevention', color: '#D55E00', blurb: 'Flammability and flame spread of materials' },
  detection: { label: 'Detection', color: '#0072B2', blurb: 'Smoke and fire signatures' },
  suppression: { label: 'Suppression', color: '#009E73', blurb: 'Extinguishment and flame-quenching limits' },
  context: { label: 'Context', color: '#7A7F88', blurb: 'Modeling and supporting studies' },
}
export const pillarColor = (p) => (PILLARS[p] || PILLARS.context).color
export const getAnchors = () => loadJson('anchors.json')
export const getMeta = () => loadJson('meta.json')
export const getDictionary = () => loadJson('dictionary.json')
