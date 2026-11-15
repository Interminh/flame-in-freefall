import { useState } from 'react'
import { Link } from 'react-router-dom'
import { loadJson, getDatasetIndex, getInvestigations, getLiterature, getMeta } from '../lib/data.js'
import { zenodo, huggingface, settle } from '../lib/ext.js'
import { PageHead, PillarChip, useAsync, Loading } from '../components/ui.jsx'

const files = (c, draws) => [
  ['investigations.json', `${c.investigations} investigation records with pillar, hardware, conditions and sources`, 'NASA PSI (CC0)'],
  ['tests.json', `Harmonised test table: ${c.test_rows.toLocaleString()} rows, canonical material, outcome class, pressure and ppO₂`, 'Derived from PSI tables'],
  ['analytics.json', 'Facts, scaling-exponent estimates, leave-one-out gate, variable fingerprint', 'Derived, scripts/pipeline/build_data.py'],
  ['meta.json', 'Counts, scenarios, literature anchors as presets, cabin box and ranking settings used by every page', 'Derived, scripts/pipeline/build_meta.py'],
  ['dictionary.json', 'Meaning, units and source of every harmonised column, parsed from data/DATA_DICTIONARY.md', 'Derived, scripts/pipeline/build_dictionary.py'],
  ['literature.json', `${c.literature_records} NTRS records with topics and investigation mapping`, 'NASA NTRS'],
  ['corpus.json', `${c.corpus_chunks.toLocaleString()} page-level text chunks used for retrieval`, 'NASA NTRS PDFs, PSI records'],
  ['anchors.json', `${c.anchors} literature anchors with quote, page and source`, 'NASA NTRS'],
  ['sim-params.json', `Calibrated screening-model parameters and ${draws} draws`, 'Derived, scripts/sim/calibrate.mjs'],
]

export default function Data() {
  const st = useAsync(() => Promise.all([getDatasetIndex(), getInvestigations(), getMeta(), loadJson('sim-params.json')]))
  const [q, setQ] = useState('combustion microgravity flame')
  const [ext, setExt] = useState(null)
  const [busy, setBusy] = useState(false)
  if (st.loading) return <Loading />
  const [idx, invs, meta, sim] = st.data
  const byId = Object.fromEntries(invs.map((i) => [i.psi_id, i]))
  const discover = async () => { setBusy(true); setExt(await Promise.all([settle('Zenodo', () => zenodo(q)), settle('Hugging Face', () => huggingface(q))])); setBusy(false) }
  return (
    <>
      <PageHead eyebrow="Catalogue" title="Data" lede="Everything the Atlas uses, with its source, and a live search for related datasets outside NASA PSI." />
      <h2>PSI tables ({idx.length})</h2>
      <div className="tbl-wrap" style={{ maxHeight: 460 }}><table><thead><tr><th>PSI id</th><th>Investigation</th><th>Pillar</th><th>Kind</th><th>Rows</th><th>Columns</th><th>Get</th></tr></thead><tbody>
        {idx.map((d) => <tr key={d.id}><td className="mono">{d.id}</td><td><Link to={`/i/${d.id}`}>{d.name}</Link></td><td>{byId[d.id] && <PillarChip pillar={byId[d.id].pillar} />}</td><td>{d.kind}</td><td className="n">{d.rows.toLocaleString()}</td><td className="n">{d.columns || d.series}</td><td><a href={`/data/datasets/${d.id}.json`} download>JSON</a></td></tr>)}</tbody></table></div>
      <h2 style={{ marginTop: 26 }}>Derived and corpus files</h2>
      <div className="tbl-wrap"><table><thead><tr><th>File</th><th>Contents</th><th>Origin</th></tr></thead><tbody>{files(meta.counts, sim.draws.length).map(([f, d, o]) => <tr key={f}><td><a href={`/data/${f}`} download className="mono">{f}</a></td><td>{d}</td><td>{o}</td></tr>)}</tbody></table></div>
      <h2 style={{ marginTop: 26 }}>Discover datasets beyond PSI</h2>
      <div className="row" style={{ flexWrap: 'nowrap' }}><input type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && discover()} /><button className="btn dark" onClick={discover} disabled={busy}>{busy ? 'Searching...' : 'Search'}</button></div>
      {ext && <div className="grid g2" style={{ marginTop: 14 }}>{ext.map((r) => <div className="card flat" key={r.name}><h4>{r.name}{r.ok && r.data.total != null ? ` (${r.data.total.toLocaleString()} matches)` : ''}</h4>{!r.ok ? <p className="small" style={{ color: 'var(--bad)' }}>{r.error}</p> : <ul className="clean">{r.data.items.map((w, i) => <li key={i}><a href={w.url} target="_blank" rel="noreferrer">{w.title}</a> <span className="small">{[w.year, w.type, w.venue].filter(Boolean).join(', ')}</span></li>)}</ul>}</div>)}</div>}
      <p className="small" style={{ marginTop: 10 }}>Queries run through a server proxy restricted to a fixed allowlist of scholarly hosts. External datasets are not ingested into the Atlas analyses unless added to SOURCES.md.</p>
    </>
  )
}
