import { useMemo, useState } from 'react'
import { capabilities } from '../lib/capabilities.js'
import { fmt } from '../lib/stats.js'
import { Stat } from './ui.jsx'

const N = (v) => v.toLocaleString()

function Bar({ share }) { return <span className="fillbar"><i style={{ width: `${Math.round(share * 100)}%` }} /></span> }

function describe(c, rows) {
  if (c.type === 'num') return <>{fmt(c.min, 3)} to {fmt(c.max, 3)} <span className="muted">· median {fmt(c.median, 3)}</span></>
  if (c.top?.length) {
    const shown = c.top.slice(0, 3)
    return <>{shown.map(([v, n], i) => <span key={i} className="val">{String(v).slice(0, 26)} <span className="muted">{n}</span></span>)}{c.nuniq > shown.length ? <span className="muted"> +{c.nuniq - shown.length} more</span> : null}</>
  }
  return <span className="muted">{c.nuniq} distinct</span>
}

function ColumnTable({ cols, rows }) {
  return (
    <div className="tbl-wrap flush"><table className="profile"><thead><tr><th>Column</th><th>Recorded in</th><th>Distinct</th><th>Values</th></tr></thead>
      <tbody>{cols.map((c) => {
        const share = c.n / rows
        return <tr key={c.key} className={c.nuniq <= 1 ? 'flat' : ''}>
          <td>{String(c.label).replace(/\bO2\b/g, 'O₂')}{c.unit ? <span className="muted"> ({c.unit})</span> : null}{c.nuniq === 1 && c.n > 0 ? <span className="chip warn tiny">one value</span> : null}</td>
          <td className="n"><Bar share={share} /> {Math.round(share * 100)}%</td>
          <td className="n">{c.nuniq}</td>
          <td>{describe(c, rows)}</td></tr>
      })}</tbody></table></div>
  )
}

function SeriesSummary({ ds }) {
  const groups = useMemo(() => {
    const m = new Map()
    for (const s of ds.series) {
      const k = s.meta?.quantity_original || 'unlabelled'
      const g = m.get(k) || { q: k, series: 0, points: 0, lo: Infinity, hi: -Infinity }
      g.series++; g.points += s.n
      if (s.stats) { g.lo = Math.min(g.lo, s.stats.min); g.hi = Math.max(g.hi, s.stats.max) }
      m.set(k, g)
    }
    return [...m.values()].sort((a, b) => b.points - a.points)
  }, [ds])
  const kinds = [...new Set(ds.series.map((s) => s.meta?.record_kind).filter(Boolean))]
  return (
    <>
      <p className="small" style={{ maxWidth: '80ch' }}>This dataset is a set of numeric series, not a table of tests. {kinds.length ? `Source record kind: ${kinds.join(', ')}. ` : ''}Each series is one list of x-y values; the quantity is the original header from the source file.</p>
      <div className="tbl-wrap flush"><table className="profile"><thead><tr><th>Quantity (original header)</th><th>Series</th><th>Points</th><th>Value range</th></tr></thead>
        <tbody>{groups.slice(0, 12).map((g) => <tr key={g.q}><td>{g.q}</td><td className="n">{g.series}</td><td className="n">{N(g.points)}</td><td className="n">{Number.isFinite(g.lo) ? `${fmt(g.lo, 3)} to ${fmt(g.hi, 3)}` : 'n/a'}</td></tr>)}</tbody></table></div>
      {groups.length > 12 && <p className="small">{groups.length - 12} more quantities not shown.</p>}
    </>
  )
}

export default function DatasetSummary({ ds, inv, fp, docs, rowCount }) {
  const [showRaw, setShowRaw] = useState(false)
  const isSeries = ds.kind === 'series'
  const std = (ds.columns || []).filter((c) => !c.key.startsWith('src_') && c.n > 0)
  const raw = (ds.columns || []).filter((c) => c.key.startsWith('src_') && c.n > 0)
  const empty = (ds.columns || []).filter((c) => !c.key.startsWith('src_') && c.n === 0)
  const out = std.find((c) => c.key === 'outcome')
  const stated = out ? out.n - (out.top?.find(([v]) => v === 'unknown')?.[1] || 0) : null
  const idCol = std.find((c) => c.nuniq === rowCount)
  const files = ds.provenance?.file ? [...new Set(ds.provenance.file)] : []
  const caps = fp ? capabilities(fp) : []
  const names = (st) => fp ? Object.keys(fp).filter((k) => fp[k]?.status === st) : []
  const varied = names('varies'), never = names('empty'), cant = caps.filter((q) => !q.ok)
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 18 }}>
        <Stat k={isSeries ? 'Points' : 'Rows'} v={N(rowCount)} n={isSeries ? `${ds.series.length} series` : idCol ? `one per ${idCol.label.toLowerCase()}` : 'one per record'} />
        <Stat k={isSeries ? 'Quantities' : 'Columns recorded'} v={isSeries ? new Set(ds.series.map((s) => s.meta?.quantity_original)).size : std.length} n={isSeries ? 'distinct original headers' : `${raw.length} raw source columns kept${empty.length ? `; ${empty.length} empty` : ''}`} />
        <Stat k="Outcome stated" v={stated == null ? 'no outcome column' : `${Math.round((100 * stated) / rowCount)}%`} n={stated == null ? 'this table records no outcome' : `${N(stated)} of ${N(rowCount)} rows`} />
        <Stat k="Linked NASA reports" v={docs} n="in the Atlas corpus" />
      </div>

      {fp && <div className="inshort">
        <b>In short</b>
        <ul className="clean">
          <li><span>Changes</span>{varied.length ? varied.join(', ') : 'none of the nine tracked variables'}</li>
          {never.length > 0 && <li><span>Never records</span>{never.join(', ')}</li>}
          {isSeries ? null : <li><span>Outcome</span>{stated == null ? 'not recorded' : `stated for ${Math.round((100 * stated) / rowCount)}% of rows`}</li>}
          {cant.length > 0 && <li><span>Cannot answer</span>{cant.map((q) => q.label.toLowerCase()).join(', ')}</li>}
        </ul>
      </div>}

      {caps.length > 0 && <div className="card flat" style={{ marginBottom: 18 }}>
        <h4>What this table can answer</h4>
        <div className="caps-grid">{caps.map((q) => <div key={q.id} className={`cap ${q.ok ? 'yes' : 'no'}`} title={`${q.need}. ${q.reason}`}><span className="mark">{q.ok ? '✓' : '–'}</span>{q.label}</div>)}</div>
        <p className="small" style={{ margin: '8px 0 0' }}>A check mark means the variable takes more than one value in this table, so its effect can be read from the rows.</p>
      </div>}

      <h3 style={{ marginTop: 6 }}>{isSeries ? 'What the series contain' : 'What was recorded'}</h3>
      {isSeries ? <SeriesSummary ds={ds} /> : <>
        <p className="small" style={{ maxWidth: '80ch' }}>
          {idCol ? <>Each row is identified by <b>{idCol.label}</b>. </> : null}
          {files.length ? <>Rows come from {files.length} source file{files.length > 1 ? 's' : ''}. </> : null}
          "Recorded in" is the share of rows with a value; an empty cell means the source did not state it.
        </p>
        <ColumnTable cols={std} rows={rowCount} />
        {raw.length > 0 && <div style={{ marginTop: 10 }}>
          <button className="btn sm" onClick={() => setShowRaw(!showRaw)}>{showRaw ? 'Hide' : 'Show'} {raw.length} raw source columns</button>
          {showRaw && <div style={{ marginTop: 10 }}><ColumnTable cols={raw} rows={rowCount} /></div>}
        </div>}
      </>}
    </>
  )
}
