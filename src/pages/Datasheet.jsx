import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getInvestigations, getDataset, datasetRows, getLiterature, getAnchors, getTests, getAnalytics } from '../lib/data.js'
import { autoCharts } from '../lib/autoCharts.js'
import { ChartCard, PageHead, PillarChip, Tabs, useAsync, Loading, Stat } from '../components/ui.jsx'

const FP_COLOR = { varies: 'ok', constant: 'warn', empty: 'bad' }

function DataTable({ ds, rows }) {
  const cols = ds.columns.filter((c) => !c.key.startsWith('src_')).slice(0, 14)
  const [all, setAll] = useState(false)
  const show = all ? ds.columns.slice(0, 40) : cols
  const [sort, setSort] = useState(null)
  const [limit, setLimit] = useState(100)
  const sorted = useMemo(() => {
    if (!sort) return rows
    return [...rows].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * sort.d })
  }, [rows, sort])
  const csv = () => {
    const head = ds.cols.join(','), body = rows.map((r) => ds.cols.map((c) => JSON.stringify(r[c] ?? '')).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([head + '\n' + body], { type: 'text/csv' })); a.download = `${ds.id}.csv`; a.click()
  }
  return (
    <>
      <div className="row spread" style={{ marginBottom: 8 }}><span className="small">{rows.length} rows, {ds.columns.length} columns. Columns prefixed src_ are source columns kept verbatim.</span>
        <span className="row"><button className="btn sm" onClick={() => setAll(!all)}>{all ? 'Standard columns' : 'Include source columns'}</button><button className="btn sm" onClick={csv}>Download CSV</button></span></div>
      <div className="tbl-wrap"><table><thead><tr>{show.map((c) => <th key={c.key} onClick={() => setSort({ k: c.key, d: sort?.k === c.key ? -sort.d : 1 })}>{c.label}{c.unit ? ` (${c.unit})` : ''}</th>)}</tr></thead>
        <tbody>{sorted.slice(0, limit).map((r, i) => <tr key={i}>{show.map((c) => <td key={c.key} className={c.type === 'num' ? 'n' : ''}>{r[c.key] == null ? '' : String(r[c.key]).slice(0, 60)}</td>)}</tr>)}</tbody></table></div>
      {limit < rows.length && <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setLimit(limit + 200)}>Show more ({rows.length - limit} left)</button>}
    </>
  )
}

function Benchmarks({ id, docs, anchors, tests }) {
  const mine = anchors.filter((a) => docs.some((d) => String(d.id) === String(a.ntrs_id)))
  const rods = id === 'PSI-25' ? tests.filter((t) => t.psi_id === 'PSI-25' && t.form === 'rod' && (t.material || '').startsWith('PMMA') && t.o2_percent != null) : []
  const minO2 = rods.length ? Math.min(...rods.map((t) => t.o2_percent)) : null
  if (!mine.length) return <p className="muted">No curated benchmark from the literature is attached to this investigation yet.</p>
  return (
    <>
      {minO2 != null && <div className="callout ok"><b>Reproduction check</b>The lowest O&#8322; among the {rods.length} PMMA rod rows in this table is <b className="num">{minO2}%</b>. NASA reports its lowest BASS-II test point at 13.6% O&#8322; (NTRS 20160000593, p. 18). The match shows the repository table carries the paper's headline number; it does not by itself verify any outcome label.</div>}
      <div className="tbl-wrap"><table><thead><tr><th>Quantity</th><th>Value</th><th>Quote</th><th>Source</th></tr></thead><tbody>
        {mine.map((a) => <tr key={a.anchor_id}><td>{a.quantity}</td><td className="n">{a.value}</td><td className="small">&ldquo;{a.quote}&rdquo;{a.caveat ? <><br /><i>Caveat: {a.caveat}</i></> : null}</td><td><a href={a.ntrs_url} target="_blank" rel="noreferrer">NTRS {a.ntrs_id}, p. {a.pdf_page}</a>{a.quote_verified ? <span className="chip ok" style={{ marginLeft: 4 }}>quote checked</span> : null}</td></tr>)}
      </tbody></table></div>
    </>
  )
}

export default function Datasheet() {
  const { id } = useParams()
  const st = useAsync(() => Promise.all([getInvestigations(), getDataset(id), getLiterature(), getAnchors(), getTests(), getAnalytics()]), [id])
  const [tab, setTab] = useState('charts')
  const { inv, ds, docs, anchors, tests, fp, rows, charts } = useMemo(() => {
    if (!st.data) return {}
    const [invs, d, lit, anch, t, an] = st.data
    const r = datasetRows(d)
    return { inv: invs.find((i) => i.psi_id === id), ds: d, docs: lit.filter((l) => (l.investigations || []).includes(id)), anchors: anch, tests: t, fp: an.fingerprint.by_investigation[id], rows: r, charts: autoCharts(d, r) }
  }, [st.data, id])
  if (st.loading) return <Loading />
  if (st.error || !inv) return <div className="callout bad">Investigation {id} was not found.</div>
  const tabs = [{ id: 'charts', label: `Charts (${charts.length})` }, { id: 'table', label: 'Data' }, { id: 'lit', label: `Literature (${docs.length})` }, { id: 'prov', label: 'Provenance' }]
  return (
    <>
      <PageHead eyebrow={`${inv.psi_id} · ${inv.facility || ''}`} title={inv.name} lede={inv.summary}>
        <div className="row"><PillarChip pillar={inv.pillar} />{inv.hardware && <span className="chip">{inv.hardware}</span>}<span className="chip">{inv.platform}</span><span className="chip">{inv.period}</span><span className="chip">{inv.license}</span>
          <a className="btn sm" href={inv.psi_url} target="_blank" rel="noreferrer">PSI record</a><a className="btn sm" href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer">DOI {inv.doi}</a><button className="btn sm primary" onClick={() => window.faAsk(`What do we know from ${inv.name} (${inv.psi_id})?`)}>Ask about this</button></div>
      </PageHead>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat k="Rows" v={(ds.rows || 0).toLocaleString()} n={ds.kind === 'series' ? `${ds.series?.length} series` : `${ds.columns.length} columns`} />
        <Stat k="Publications on PSI" v={inv.publications_listed_on_psi_page ?? 'n/a'} n="as listed" />
        <Stat k="Linked NTRS reports" v={docs.length} n="in the Atlas corpus" />
        <Stat k="Materials" v={(inv.materials || []).length} n={(inv.materials || []).slice(0, 3).join(', ')} />
      </div>
      {fp && <div className="card flat" style={{ marginBottom: 18 }}><h4>Variable fingerprint</h4><div className="row" style={{ gap: 6 }}>{Object.entries(fp).map(([k, v]) => <span key={k} className={`chip ${FP_COLOR[v.status]}`} title={`${v.n_unique} distinct values`}>{k}: {v.status}</span>)}</div><p className="small" style={{ marginTop: 6 }}>varies = more than one value recorded; constant = one value; empty = not recorded in this table. This is what a table can and cannot answer.</p></div>}
      {inv.caveats?.length > 0 && <div className="callout neutral"><b>Caveats recorded for this investigation</b>{inv.caveats.map((c, i) => <div key={i}>{c}</div>)}</div>}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'charts' && (charts.length ? <div className="grid g2">{charts.map((c) => <ChartCard key={c.id} {...c} source={`${inv.psi_id} table`} />)}</div> : <div className="card">This investigation has no tabular rows in the repository; see its summary and the literature tab.</div>)}
      {tab === 'table' && (rows.length ? <DataTable ds={ds} rows={rows} /> : <div className="card">No table to show.</div>)}
      {tab === 'lit' && (
        <>
          <h3>Benchmarks against the literature</h3>
          <Benchmarks id={id} docs={docs} anchors={anchors} tests={tests} />
          <h3 style={{ marginTop: 22 }}>Linked NASA reports</h3>
          {docs.length ? <ul className="clean">{docs.map((d) => <li key={d.id}><a href={d.url} target="_blank" rel="noreferrer">{d.title}</a> <span className="small">{d.year}, {d.center}{d.pages ? `, ${d.pages} pp.` : ''}</span></li>)}</ul> : <p className="muted">No NTRS report in the corpus is mapped to this investigation.</p>}
        </>
      )}
      {tab === 'prov' && (
        <div className="grid g2">
          <div className="card"><h4>Source files</h4><ul className="clean">{(inv.files || []).map((f) => <li key={f.name}><code>{f.name}</code> <span className="small">{f.format}, {(f.size_bytes / 1024).toFixed(0)} KB</span></li>)}</ul></div>
          <div className="card"><h4>Record</h4><p className="small">Retrieved {inv.retrieved_on}; PSI record modified {inv.psi_record_modified}. Verified by a second person: {inv.verified ? 'yes' : 'no'}.</p>{(inv.sources || []).map((s) => <div key={s}><a href={s} target="_blank" rel="noreferrer">{s}</a></div>)}<p className="small" style={{ marginTop: 8 }}>Table rows carry <code>source_file</code> and <code>source_row_or_page</code> in <code>public/data/tests.json</code>.</p></div>
        </div>
      )}
    </>
  )
}
