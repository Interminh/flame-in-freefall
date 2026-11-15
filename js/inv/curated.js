// Hand-picked charts per investigation. Each one answers a question the data can support.
// Two sources: the harmonised atlas table (data/atlas/datasets) and the raw PSI tables
// (data/inv/PSI-*.json, original headers). Every plotted value is read from those files.
// Investigations with no chart here get a table or an honest note on the page.

const COLORS = { ignited: '#C73512', extinguished: '#1B5FA8', burned_out: '#E3A400', no_ignition: '#111111' }
const PALETTE = ['#C73512', '#1B5FA8', '#E3A400', '#2E8B57', '#8E44AD', '#111111', '#E07BB0', '#6B7A8F']
const LABEL = { ignited: 'Ignited / burning', extinguished: 'Went out', burned_out: 'Burned out', no_ignition: 'Did not ignite' }
const OUTLINE = { color: '#111', width: 1.2 }

const stated = (r) => r.outcome && r.outcome !== 'unknown'
const groupBy = (rows, f) => {
  const m = new Map()
  for (const r of rows) { const k = f(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r) }
  return m
}
const levels = (rows) => ['ignited', 'burned_out', 'extinguished', 'no_ignition'].filter((l) => rows.some((r) => r.outcome === l))
const note = (n, total, what) => `${n} of ${total} rows plotted${what ? `; ${what}` : ''}.`
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

// ---- raw table helpers ----
// A raw table is {name, cols[], rows[][]}. Rows become objects keyed by trimmed header.
function asRows(t) {
  const keys = t.cols.map((c, i) => (String(c).trim() || `col${i}`))
  return t.rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? null])))
}
const pick = (raw, re) => raw?.tables?.find((t) => re.test(t.name))
const col = (rows, re) => (rows.length ? Object.keys(rows[0]).find((k) => re.test(k)) : null)
// YYDDD test day to a date label.
const dayLabel = (v) => {
  if (!isNum(v)) return String(v ?? '')
  const d = new Date(Date.UTC(2000 + Math.floor(v / 1000), 0, v % 1000))
  return d.toISOString().slice(0, 10)
}

// ---- atlas-based builders ----
function o2Outcome(rows, { title, why }) {
  const use = rows.filter((r) => stated(r) && r.o2_percent != null)
  return {
    title, why, n: use.length,
    foot: note(use.length, rows.length, 'rows with no stated outcome are left out'),
    data: levels(use).map((l) => ({ type: 'histogram', name: LABEL[l], x: use.filter((r) => r.outcome === l).map((r) => r.o2_percent), xbins: { size: 1 }, marker: { color: COLORS[l], line: OUTLINE } })),
    layout: { barmode: 'stack', xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Tests' } },
  }
}

function outcomeBy(rows, key, { title, why, xLabel, top = 8 }) {
  const use = rows.filter((r) => stated(r) && r[key] != null)
  const order = [...groupBy(use, (r) => r[key]).entries()].sort((a, b) => b[1].length - a[1].length).slice(0, top).map(([k]) => k)
  return {
    title, why, n: use.length,
    foot: note(use.length, rows.length, 'rows with no stated outcome are left out'),
    data: levels(use).map((l) => ({ type: 'bar', name: LABEL[l], x: order.map(String), y: order.map((k) => use.filter((r) => r[key] === k && r.outcome === l).length), marker: { color: COLORS[l], line: OUTLINE } })),
    layout: { barmode: 'stack', xaxis: { title: xLabel, tickangle: -25 }, yaxis: { title: 'Tests' }, margin: { b: 90 } },
  }
}

// ---- raw-table builders ----
function scatterBy(rows, xk, yk, gk, o) {
  const use = rows.filter((r) => isNum(r[xk]) && isNum(r[yk]))
  const groups = gk ? [...groupBy(use, (r) => r[gk] ?? 'not stated').entries()] : [['', use]]
  return {
    title: o.title, why: o.why, n: use.length, foot: note(use.length, rows.length, o.foot),
    data: groups.map(([g, rs], i) => ({ type: 'scatter', mode: 'markers', name: String(g), x: rs.map((r) => r[xk]), y: rs.map((r) => r[yk]), marker: { color: PALETTE[i % PALETTE.length], size: o.size || 8, opacity: 0.75, line: OUTLINE } })),
    layout: { xaxis: { title: o.xt, ...(o.xlog ? { type: 'log' } : {}) }, yaxis: { title: o.yt, ...(o.ylog ? { type: 'log' } : {}) }, showlegend: !!gk },
  }
}

function boxBy(rows, vk, gk, o) {
  const use = rows.filter((r) => isNum(r[vk]) && r[gk] != null)
  const groups = [...groupBy(use, (r) => r[gk]).entries()].sort((a, b) => b[1].length - a[1].length).slice(0, o.top || 8)
  return {
    title: o.title, why: o.why, n: use.length, foot: note(use.length, rows.length, o.foot),
    data: groups.map(([g, rs], i) => ({ type: 'box', name: String(g).slice(0, 24), y: rs.map((r) => r[vk]), marker: { color: PALETTE[i % PALETTE.length] }, line: { color: '#111', width: 1.5 }, boxpoints: 'all', jitter: 0.4, pointpos: 0, opacity: 0.9 })),
    layout: { yaxis: { title: o.yt, ...(o.ylog ? { type: 'log' } : {}) }, showlegend: false, xaxis: { tickangle: -20, automargin: true } },
  }
}

// Bars of a value per row of a short campaign log, in the order the source lists them.
function logBars(rows, labelOf, vk, gk, o) {
  const use = rows.filter((r) => isNum(r[vk]))
  const groups = [...groupBy(use, (r) => r[gk] ?? 'not stated').entries()]
  return {
    title: o.title, why: o.why, n: use.length, foot: note(use.length, rows.length, o.foot),
    data: groups.map(([g, rs], i) => ({ type: 'bar', name: String(g), x: rs.map(labelOf), y: rs.map((r) => r[vk]), marker: { color: PALETTE[i % PALETTE.length], line: OUTLINE } })),
    layout: { barmode: 'stack', xaxis: { title: o.xt, type: 'category', tickangle: -35 }, yaxis: { title: o.yt }, margin: { b: 100 } },
  }
}

function lineSets(sets, o) {
  const n = sets.reduce((a, s) => a + s.x.length, 0)
  return {
    title: o.title, why: o.why, n, foot: o.foot,
    data: sets.map((s, i) => ({ type: 'scatter', mode: s.mode || 'lines', name: s.name, x: s.x, y: s.y, line: { color: s.color || PALETTE[i % PALETTE.length], width: 2.5, dash: s.dash }, marker: { color: s.color || PALETTE[i % PALETTE.length], size: 8, line: OUTLINE } })),
    layout: { xaxis: { title: o.xt, ...(o.xlog ? { type: 'log' } : {}) }, yaxis: { title: o.yt, ...(o.ylog ? { type: 'log' } : {}) } },
  }
}

const SPEC = {
  'PSI-25': (rows, ds, raw) => {
    const out = [
      o2Outcome(rows, { title: 'Oxygen level and what the flame did', why: 'Shows the oxygen range in which these solid fuels kept burning in microgravity and where they went out. The lowest-oxygen flame is the number a spacecraft atmosphere has to stay clear of.' }),
      (() => {
        const use = rows.filter((r) => stated(r) && r.o2_percent != null && r.fuel_thickness_mm != null)
        return {
          title: 'Fuel thickness against oxygen', why: 'Thin fuels preheat faster, so thickness moves the flammability limit. Each point is one test with a stated outcome and a recorded thickness.', n: use.length,
          foot: note(use.length, rows.length, 'only tests with a recorded thickness and a stated outcome'),
          data: levels(use).map((l) => ({ type: 'scatter', mode: 'markers', name: LABEL[l], x: use.filter((r) => r.outcome === l).map((r) => r.o2_percent), y: use.filter((r) => r.outcome === l).map((r) => r.fuel_thickness_mm), text: use.filter((r) => r.outcome === l).map((r) => r.test_id), hovertemplate: '%{text}<br>O₂ %{x}%<br>%{y} mm<extra></extra>', marker: { color: COLORS[l], size: 11, line: OUTLINE } })),
          layout: { xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Fuel thickness (mm)', type: 'log' } },
        }
      })(),
    ]
    const g = asRows(pick(raw, /cabin gas/i) || { cols: [], rows: [] })
    if (g.length) {
      const mat = col(g, /Fuel Sample Material/i), c0 = col(g, /Initial CO \(ppm\)/i), c1 = col(g, /Final CO \(ppm\)/i)
      const d = g.map((r) => ({ ...r, dCO: isNum(r[c0]) && isNum(r[c1]) ? r[c1] - r[c0] : null }))
      out.push(boxBy(d, 'dCO', mat, { title: 'Carbon monoxide added, by material', yt: 'CO added to the glovebox air (ppm)', why: 'Each test measured CO before and after the burn. This shows which materials released the most toxic gas, which matters for crew exposure after a real fire.', foot: 'CO after the test minus CO before; the 8 most-tested materials' }))
    }
    return out
  },

  'PSI-26': (rows, ds, raw) => {
    const out = [
      o2Outcome(rows, { title: 'Oxygen level and what the flame did', why: 'BASS tested fuels in a narrow band around air. This shows how close to 21% O₂ flames still went out.' }),
      outcomeBy(rows, 'fuel_geometry', { title: 'Outcome by fuel shape', xLabel: 'Fuel shape', why: 'Compares spheres, candles and slabs, so you can see whether the fuel shape changes how often a flame survives.' }),
    ]
    const m = asRows(pick(raw, /as-run/i) || { cols: [], rows: [] })
    const mk = col(m, /^material$/i)
    if (mk) {
      const counts = [...groupBy(m.filter((r) => r[mk]), (r) => String(r[mk]).toLowerCase().trim()).entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12)
      out.push({
        title: 'What BASS burned', why: 'Number of test points scheduled for each sample material in the as-run test matrix, which is a record of the plan rather than of outcomes.', n: counts.reduce((a, [, r]) => a + r.length, 0),
        foot: 'Material names as written in the as-run matrix; the 12 most frequent.',
        data: [{ type: 'bar', orientation: 'h', y: counts.map(([k]) => k.slice(0, 34)).reverse(), x: counts.map(([, r]) => r.length).reverse(), marker: { color: '#1B5FA8', line: OUTLINE } }],
        layout: { xaxis: { title: 'Test points' }, margin: { l: 220 }, showlegend: false },
      })
    }
    return out
  },

  'PSI-159': (rows, ds, raw) => {
    const use = rows.filter((r) => stated(r) && r.o2_percent != null && r.pressure_kpa_reported_approx != null)
    const out = [{
      title: 'Oxygen and pressure at ignition', why: 'A flammability map for gas flames. It shows which atmospheres burned and which went out, from lean to oxygen-rich.', n: use.length,
      foot: note(use.length, rows.length, 'pressure is approximate as stated in the source; rows with no stated outcome are left out'),
      data: levels(use).map((l) => ({ type: 'scatter', mode: 'markers', name: LABEL[l], x: use.filter((r) => r.outcome === l).map((r) => r.o2_percent), y: use.filter((r) => r.outcome === l).map((r) => r.pressure_kpa_reported_approx), marker: { color: COLORS[l], size: 9, opacity: 0.8, line: OUTLINE } })),
      layout: { xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Pressure (kPa, approximate)' } },
    }, outcomeBy(rows, 'fuel', { title: 'Outcome by fuel', xLabel: 'Fuel', why: 'Shows whether the fuel changes how often the flame survives. Fuel names are as written in the source table.' })]
    const n = asRows(pick(raw, /normal/i) || { cols: [], rows: [] }), v = asRows(pick(raw, /inverse/i) || { cols: [], rows: [] })
    const bt = (r) => r['burn time (sec)']
    const all = [...n.map((r) => ({ ...r, cfg: 'Normal flame', o2: r['XO2 before test'] })), ...v.map((r) => ({ ...r, cfg: 'Inverse flame', o2: r['XO2'] }))].map((r) => ({ ...r, bt: bt(r), tad: r['Tad (K)'] }))
    const s = scatterBy(all, 'o2', 'bt', 'cfg', { title: 'How long each flame lasted', xt: 'Oxygen fraction', yt: 'Burn time (s)', ylog: true, size: 7, why: 'Burn time shows how long each flame stayed lit. Normal flames have air outside and fuel inside; inverse flames the reverse.', foot: 'normal and inverse flame tables combined' })
    if (s.n > 5) out.push(s)
    const cf = n.filter((r) => r['Cool flame?'] != null)
    if (cf.length > 3) {
      const g = [...groupBy(cf, (r) => r['Fuel']).entries()]
      const yes = (r) => /^y/i.test(String(r['Cool flame?']))
      out.push({
        title: 'Which fuels showed a cool flame', why: 'A cool flame is a faint, low-temperature flame that can persist where a normal flame has gone out. This counts the normal-flame tests logged for each fuel.', n: cf.length, foot: `Only ${cf.length} of ${n.length} normal-flame tests have the "Cool flame?" field filled in.`,
        data: [{ type: 'bar', name: 'Cool flame seen', x: g.map(([k]) => k), y: g.map(([, rs]) => rs.filter(yes).length), marker: { color: '#1B5FA8', line: OUTLINE } }, { type: 'bar', name: 'No cool flame', x: g.map(([k]) => k), y: g.map(([, rs]) => rs.filter((r) => !yes(r)).length), marker: { color: '#E3A400', line: OUTLINE } }],
        layout: { barmode: 'stack', yaxis: { title: 'Tests' }, xaxis: { tickangle: -20, automargin: true } },
      })
    }
    return out
  },

  'PSI-10': (rows, ds, raw) => {
    const n = asRows(pick(raw, /normal/i) || { cols: [], rows: [] }), v = asRows(pick(raw, /inverse/i) || { cols: [], rows: [] })
    const all = [...n.map((r) => ({ cfg: `Normal flame, ${r.Fuel || 'fuel'}`, o2: r['XO2 (init)'], tad: r['Tad (K)'], p: r['pmean (atm)'], z: r['mean Zst'] })),
      ...v.map((r) => ({ cfg: 'Inverse flame, C2H4', o2: r.XO2, tad: r['Tad (K)'], p: r['pmean (atm)'], z: r['mean Zst'] }))]
    return [
      scatterBy(all, 'o2', 'tad', 'cfg', { title: 'Calculated flame temperature against oxygen', xt: 'Oxygen fraction', yt: 'Adiabatic flame temperature (K)', size: 7, why: 'Flame Design varied oxygen and pressure across its test points. This is the calculated temperature (no heat loss) for each point, by flame type and fuel.', foot: 'Tad is calculated by the investigators; it is not a measurement' }),
      scatterBy(all, 'o2', 'p', 'cfg', { title: 'Oxygen and pressure of every test point', xt: 'Oxygen fraction', yt: 'Mean pressure (atm)', size: 7, why: 'Coverage map. It shows which atmospheres were tested, which is where results can be trusted.', foot: 'no outcome is stated in the source' }),
    ]
  },

  'PSI-39': (rows, ds, raw) => {
    const d = asRows(pick(raw, /Per-test/i) || { cols: [], rows: [] }), m = asRows(pick(raw, /master/i) || { cols: [], rows: [] })
    const fuel = new Map(m.map((r) => [r['Flex Number'], r.Fuel]))
    const all = d.map((r) => ({ ...r, fuel: fuel.get(r['Flex Number']) ?? 'not stated', kh: r['khot ( mm^2/s )'], kc: r['kcool ( mm^2/s )'], p: r['Pressure (atm)'], d0: r['D0 ( mm )'], dh: r['Dext, hot ( mm )'], bt: r['HF Burn Time'], dc: r['Dext,cool ( mm )'] }))
    const out = []
    const a = scatterBy(all, 'kh', 'kc', 'fuel', { title: 'Burning rate: cool flame against hot flame', xt: 'Hot-flame burning-rate constant (mm²/s)', yt: 'Cool-flame burning-rate constant (mm²/s)', why: 'In many tests the droplet burned first with a hot flame and then with a cool flame. Points near the diagonal burned at the same speed in both stages.', foot: 'tests with both rates' })
    a.data.push({ type: 'scatter', mode: 'lines', name: 'Equal rates', x: [0, 1], y: [0, 1], line: { color: '#111', dash: 'dash', width: 2 }, hoverinfo: 'skip' })
    out.push(a)
    out.push(scatterBy(all, 'p', 'bt', 'fuel', { title: 'How long the hot flame lasted against pressure', xt: 'Pressure (atm)', yt: 'Hot-flame burn time (s)', why: 'How long the visible (hot) flame lasted in each test, at each pressure.', foot: 'tests with a hot-flame burn time' }))
    out.push(scatterBy(all, 'd0', 'dh', 'fuel', { title: 'Droplet size when the hot flame went out', xt: 'Starting droplet diameter (mm)', yt: 'Hot-flame extinction diameter (mm)', why: 'How large the droplet still was when its hot flame went out, for each starting size.', foot: 'tests with both diameters' }))
    const reign = all.filter((r) => isNum(r.Reignitions))
    if (reign.length > 5) {
      const g = [...groupBy(reign, (r) => r.Reignitions).entries()].sort((a, b) => a[0] - b[0])
      out.push({ title: 'Flames that came back', why: 'Reignition is when a flame that had gone out lights again. In a spacecraft this is the case where a fire thought to be out comes back, so it counts how many tests did this.', n: reign.length, foot: note(reign.length, d.length, 'tests with a reignition count'), data: [{ type: 'bar', x: g.map(([k]) => `${k} reignition${k === 1 ? '' : 's'}`), y: g.map(([, r]) => r.length), marker: { color: '#C73512', line: OUTLINE } }], layout: { yaxis: { title: 'Tests' }, showlegend: false } })
    }
    return out
  },

  'PSI-69': (rows, ds, raw) => {
    const use = rows.filter((r) => r.initial_droplet_diameter_mm != null && r.visible_flame_extinction_diameter_mm != null)
    const burn = rows.filter((r) => r.burn_time_s != null && r.o2_percent != null)
    const out = [
      {
        title: 'Droplet size when the flame goes out', why: 'The core FLEX result for suppression: how large a droplet is at extinction, given how large it started. The dashed line marks extinction at the starting size; a point near the bottom burned down almost fully.', n: use.length,
        foot: note(use.length, rows.length, 'tests with both diameters recorded'),
        data: [...[...groupBy(use, (r) => r.fuel).entries()].map(([k, rs], i) => ({ type: 'scatter', mode: 'markers', name: k, x: rs.map((r) => r.initial_droplet_diameter_mm), y: rs.map((r) => r.visible_flame_extinction_diameter_mm), marker: { color: PALETTE[i], size: 8, opacity: 0.75, line: OUTLINE } })), { type: 'scatter', mode: 'lines', name: 'Extinguished at start size', x: [0, 5], y: [0, 5], line: { color: '#111', dash: 'dash', width: 2 }, hoverinfo: 'skip' }],
        layout: { xaxis: { title: 'Initial droplet diameter (mm)' }, yaxis: { title: 'Flame extinction diameter (mm)' } },
      },
      {
        title: 'How long the flame lasted at each oxygen level', why: 'Shows how long each droplet flame lasted as the oxygen level changed, for each fuel.', n: burn.length,
        foot: note(burn.length, rows.length, 'tests with burn time and oxygen recorded'),
        data: [...groupBy(burn, (r) => r.fuel).entries()].map(([k, rs], i) => ({ type: 'scatter', mode: 'markers', name: k, x: rs.map((r) => r.o2_percent), y: rs.map((r) => r.burn_time_s), marker: { color: PALETTE[i], size: 8, opacity: 0.75, line: OUTLINE } })),
        layout: { xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Burn time (s)' } },
      },
    ]
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    const kk = col(t, /burning rate/i), ok = col(t, /^O initial/i), fk = col(t, /^Fuel$/i)
    if (kk && ok) out.push(scatterBy(t.map((r) => ({ ...r, o2: isNum(r[ok]) ? r[ok] * (r[ok] <= 1 ? 100 : 1) : null })), 'o2', kk, fk, { title: 'Burning rate against oxygen', xt: 'Oxygen (% by volume)', yt: 'Burning rate (mm²/s)', why: 'The burning rate is how fast the droplet shrinks (diameter squared per second). The plot shows how it varies with the oxygen level for each fuel.', foot: 'tests with a recorded burning rate and oxygen' }))
    return out
  },

  'PSI-101': (rows, ds, raw) => {
    const use = rows.filter((r) => r.flow_velocity_cm_s != null)
    const speeds = [...new Set(use.map((r) => r.flow_velocity_cm_s))].sort((a, b) => a - b)
    const fuels = [...groupBy(use, (r) => r.fuel).keys()]
    const out = [{
      title: 'Which materials were smoked, and at what air speed', why: 'SAME-R made smoke from five materials at several air speeds. The related SAME-2 paper reports that particle size depends on air velocity, so the test matrix is what the particle results hang on.', n: use.length,
      foot: note(use.length, rows.length, 'one row per test'),
      data: speeds.map((s, i) => ({ type: 'bar', name: `${s} cm/s`, x: fuels, y: fuels.map((f) => use.filter((r) => r.fuel === f && r.flow_velocity_cm_s === s).length), marker: { color: PALETTE[i % PALETTE.length], line: OUTLINE } })),
      layout: { barmode: 'stack', xaxis: { title: 'Material' }, yaxis: { title: 'Tests' } },
    }]
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    out.push(boxBy(t, 'Net aging time (sec)', 'Sample Type', { title: 'How long the smoke aged before it was measured', yt: 'Net aging time (s)', ylog: true, why: 'SAME-R varied how long the smoke aged before it was measured, because aged smoke has different particle sizes (see the aged-smoke figure below).', foot: 'tests with a net aging time' }))
    return out
  },

  'PSI-102': (rows, ds, raw) => {
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    const use = t.filter((r) => isNum(r['Weight loss rate (mg/min)']))
    return [{
      title: 'How fast each sample lost mass while smoking', why: 'The mass the material loses per minute is the rate the smoke is made. Air speed is shown in the label.', n: use.length, foot: 'the eight SAME samples',
      data: [{ type: 'bar', x: use.map((r) => `${r['Sample Material']}${isNum(r['Air Flow (cm/s)']) ? `, ${r['Air Flow (cm/s)']} cm/s` : ''}`), y: use.map((r) => r['Weight loss rate (mg/min)']), marker: { color: '#C73512', line: OUTLINE } }],
      layout: { yaxis: { title: 'Weight loss rate (mg/min)' }, xaxis: { tickangle: -25, automargin: true }, showlegend: false },
    }]
  },

  'PSI-107': (rows, ds, raw) => {
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    const out = [scatterBy(t, 'Air Rate (cm/s)', 'HC Fuel Rate (mg/s)', 'Fuel', { title: 'Fuel flow and air speed for every test', xt: 'Coflow air speed (cm/s)', yt: 'Hydrocarbon fuel rate (mg/s)', size: 6, why: 'SPICE looked for the point where a flame starts to smoke. Each test is one fuel flow and air speed; the SPICE report relates flame length at the smoke point to these two settings.', foot: 'tests with both values' })]
    const air = rows.filter((r) => r.flow_velocity_cm_s != null)
    const g = [...groupBy(air, (r) => r.fuel).entries()].sort((a, b) => b[1].length - a[1].length)
    out.push({ title: 'Air speeds run for each fuel', why: 'How widely airspeed was varied for each fuel.', n: air.length, foot: note(air.length, rows.length, 'the smoke-point result itself is not in this table'), data: g.map(([k, rs], i) => ({ type: 'box', name: k, y: rs.map((r) => r.flow_velocity_cm_s), marker: { color: PALETTE[i % PALETTE.length] }, line: { color: '#111', width: 1.5 }, boxpoints: 'outliers' })), layout: { yaxis: { title: 'Air speed (cm/s)' }, showlegend: false, xaxis: { tickangle: -20, automargin: true } } })
    return out
  },

  'PSI-20': (rows, ds, raw) => {
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    return [logBars(t, (r) => `${r.Year}-${r.Month}-${r.Date}`, 'Flames Ignited', 'Fuel Bottle', { title: 'Flames lit on each test day', xt: 'Test day (year-month-date)', yt: 'Flames ignited', why: 'The BRE log counts how many burner flames were lit each day, by fuel. Oxygen and pressure were varied within each day, so a day is a block of tests rather than one condition.', foot: 'campaign summary; no outcome per test is in the table' })]
  },
  'PSI-21': (rows, ds, raw) => {
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    return [logBars(t, (r) => dayLabel(r['Test Day']), 'Flames ignited', 'Fuel Bottle', { title: 'Flames lit on each test day', xt: 'Test day (from the YYDDD code)', yt: 'Flames ignited', why: 'The CLD Flame log counts how many coflow flames were lit each day, by fuel mix. The fuel concentration was lowered during tests to find where the flame went out.', foot: 'campaign summary; the notes column gives the fuel-dilution range for each day' })]
  },
  'PSI-22': (rows, ds, raw) => {
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    const out = [logBars(t, (r) => dayLabel(r['Test Day']), 'Flames Ignited', 'Mesh Polarity', { title: 'Flames lit on each test day, by field polarity', xt: 'Test day (from the YYDDD code)', yt: 'Flames ignited', why: 'The E-FIELD log shows how many flames were lit on each day, and whether the high-voltage mesh was positive or negative. The polarity was changed between tests.', foot: 'campaign summary' })]
    const use = t.filter((r) => isNum(r['Flames Ignited']) && r['Fuel Bottle'])
    const g = [...groupBy(use, (r) => r['Fuel Bottle']).entries()]
    out.push({ title: 'Flames lit for each fuel bottle', why: 'The experiment burned methane and ethylene, pure and diluted with nitrogen. This totals the flames lit for each fuel mix.', n: use.length, foot: 'sum over the test days in the log', data: [{ type: 'bar', x: g.map(([k]) => k), y: g.map(([, rs]) => rs.reduce((a, r) => a + r['Flames Ignited'], 0)), marker: { color: '#1B5FA8', line: OUTLINE } }], layout: { yaxis: { title: 'Flames ignited' }, xaxis: { tickangle: -20, automargin: true }, showlegend: false } })
    return out
  },
  'PSI-23': (rows, ds, raw) => {
    const t = asRows(pick(raw, /Experimental/i) || { cols: [], rows: [] })
    const fk = col(t, /Flames Ignited/i), dk = col(t, /Test Day/i), ak = col(t, /Atmosphere/i)
    return [logBars(t, (r) => dayLabel(r[dk]), fk, 'Fuel Bottle', { title: 'Flames lit on each test day', xt: 'Test day (from the YYDDD code)', yt: 'Flames ignited', why: 'The s-Flame log counts how many nearly spherical flames were lit each day, for hydrogen, methane and ethylene mixes. Later days switch from nitrogen to helium dilution.', foot: `campaign summary; atmosphere column: ${[...new Set(t.map((r) => r[ak]).filter(Boolean))].slice(0, 3).join('; ')}` })]
  },

  'PSI-47': (rows, ds, raw) => {
    const t = pick(raw, /P-Trak against/i)
    if (!t) return []
    const pts = []
    for (const r of t.rows.slice(1)) for (let b = 0; b < 3; b++) { const x = r[b * 2], y = r[b * 2 + 1]; if (isNum(x) && isNum(y) && (x > 0 || y > 0)) pts.push({ bag: `Bag ${b + 1}`, x, y }) }
    const g = [...groupBy(pts, (p) => p.bag).entries()]
    return [{
      title: 'Particle count against particle mass', why: 'The P-Trak counts tiny particles and the DustTrak weighs larger ones. Plotting one against the other shows whether the smoke from a test was mostly small particles or a few big ones.', n: pts.length,
      foot: 'Readings paired by position for each sample bag; points where both are zero are left out. The source does not label units on this sheet.',
      data: g.map(([k, ps], i) => ({ type: 'scatter', mode: 'markers', name: k, x: ps.map((p) => p.x), y: ps.map((p) => p.y), marker: { color: PALETTE[i], size: 7, opacity: 0.7, line: OUTLINE } })),
      layout: { xaxis: { title: 'P-Trak reading' }, yaxis: { title: 'DustTrak reading' } },
    }]
  },

  'PSI-115': (rows, ds, raw) => {
    const t = asRows(pick(raw, /particle size/i) || { cols: [], rows: [] })
    const dk = col(t, /Diameter/i), vk = col(t, /Distribution/i)
    const use = t.filter((r) => isNum(r[dk]) && isNum(r[vk]) && r[vk] > 0)
    const g = [...groupBy(use, (r) => r.Case).entries()]
    return [{
      title: 'Modelled smoke particle size, by case', why: 'The simulation computed how many smoke particles of each size form behind a heated body, with and without gravity (the case names carry Gravity and NoGravity). Compare the two kinds of curve to see how gravity changes the size distribution.', n: use.length,
      foot: 'Diameter is paired with nodes by position, which the source does not confirm; the units of the distribution value are not established. Read the shape, not the numbers.',
      data: g.map(([k, rs], i) => ({ type: 'scatter', mode: 'lines', name: k, x: rs.map((r) => r[dk]), y: rs.map((r) => r[vk]), line: { color: PALETTE[i % PALETTE.length], width: 2.5, dash: /NoGravity/.test(k) ? 'solid' : 'dash' } })),
      layout: { xaxis: { title: 'Particle diameter (m)', type: 'log' }, yaxis: { title: 'Distribution value (units not established)', type: 'log' } },
    }]
  },

  'PSI-117': (rows, ds, raw) => {
    const out = []
    const ex = pick(raw, /vs pressure/i)
    if (ex) {
      const r = ex.rows, c = (i) => r.map((x) => x[i]).filter(isNum)
      out.push(lineSets([
        { name: 'Hot flame, experiment', x: c(0), y: c(1), mode: 'lines+markers', color: '#C73512' },
        { name: 'Hot flame, model', x: c(2), y: c(3), color: '#C73512', dash: 'dash' },
        { name: 'Cool flame, experiment', x: c(4), y: c(5), mode: 'lines+markers', color: '#1B5FA8' },
        { name: 'Cool flame, model', x: c(6), y: c(7), color: '#1B5FA8', dash: 'dash' },
      ], { title: 'Droplet size at extinction against pressure, n-dodecane', xt: 'Pressure (atm)', yt: 'Droplet diameter at extinction (mm)', foot: 'Experiment from the FLEX tests; model from the investigators’ simulation', why: 'The measured and modelled size at which the hot and cool flames go out. Where the model line follows the measured line, the model can be trusted to predict extinction.' }))
    }
    const st = pick(raw, /Stable Cool/i), os = pick(raw, /Oscillatory/i)
    if (st && os) {
      const get = (t, i) => t.rows.map((r) => r[i]).filter(isNum)
      out.push(lineSets([
        { name: 'Stable cool flame', x: get(st, 0), y: get(st, 6), color: '#1B5FA8' },
        { name: 'Oscillatory cool flame', x: get(os, 0), y: get(os, 6), color: '#C73512' },
      ], { title: 'Droplet size over time, two cool-flame behaviours', xt: 'Time (s)', yt: 'Droplet diameter squared, relative to the start', foot: 'Computed results for a 0.5 mm n-heptane droplet; not measurements', why: 'The cool flame can burn steadily or flicker. The computed droplet shrinks differently in the two cases.' }))
      out.push(lineSets([
        { name: 'Stable cool flame', x: get(st, 0), y: get(st, 3), color: '#1B5FA8' },
        { name: 'Oscillatory cool flame', x: get(os, 0), y: get(os, 3), color: '#C73512' },
      ], { title: 'Peak gas temperature over time', xt: 'Time (s)', yt: 'Peak gas temperature (K)', xlog: true, foot: 'Computed results; not measurements', why: 'Computed peak gas temperature over time for the same two cases.' }))
    }
    const kv = pick(raw, /Kavg/i)
    if (kv) {
      const c = (i) => kv.rows.map((x) => x[i]).filter(isNum)
      out.push(lineSets([
        { name: 'Cool-flame burning rate, experiment', x: kv.rows.filter((x) => isNum(x[1]) && isNum(x[2])).map((x) => x[1]), y: kv.rows.filter((x) => isNum(x[1]) && isNum(x[2])).map((x) => x[2]), mode: 'markers', color: '#1B5FA8' },
        { name: 'Model', x: kv.rows.filter((x) => isNum(x[4]) && isNum(x[5])).map((x) => x[4]), y: kv.rows.filter((x) => isNum(x[4]) && isNum(x[5])).map((x) => x[5]), mode: 'lines+markers', color: '#C73512', dash: 'dash' },
      ], { title: 'Cool-flame burning rate against pressure', xt: 'Pressure (atm)', yt: 'Burning-rate constant (mm²/s)', foot: 'Experiment and model as listed in the MST 2024 Kavg table', why: 'How fast a droplet is consumed in the cool-flame stage across pressures, measured and modelled.' }))
    }
    return out
  },

  'PSI-142': (rows, ds, raw) => {
    const parse = (name) => {
      const t = pick(raw, new RegExp(`^data ID ${name}$`, 'i')) // sheet names are "data ID 2"
      if (!t) return []
      const sets = []; let cur = null
      for (const r of t.rows) {
        const head = r.find((v) => typeof v === 'string' && /^nC\d+$/.test(v))
        if (head) { cur = { name: head, x: [], y: [] }; sets.push(cur); continue }
        if (cur) { const nums = r.filter(isNum); if (nums.length >= 2) { cur.x.push(nums[0]); cur.y.push(nums[1]) } }
      }
      return sets
    }
    const out = []
    const mk = (id, title, yt, why) => {
      const s = parse(id)
      if (!s.length) return
      out.push({ title, why, n: s.reduce((a, x) => a + x.x.length, 0), foot: 'Data from the Princeton counterflow experiments, as listed in the data summary sheet', data: s.map((x, i) => ({ type: 'scatter', mode: 'markers', name: x.name.replace('nC', 'n-C'), x: x.x, y: x.y, marker: { color: PALETTE[i % PALETTE.length], size: 8, opacity: 0.8, line: OUTLINE } })), layout: { xaxis: { title: 'Fuel mass fraction at the burner (Yf)' }, yaxis: { title: yt } } })
    }
    mk(2, 'Cool-flame extinction limit', 'Strain rate at extinction (1/s)', 'A counterflow flame is squeezed between a fuel jet and an air jet. The strain rate is how hard it is squeezed, and this is the highest strain rate each fuel mix survived with a cool flame. More fuel means a stronger flame.')
    mk(3, 'Hot-flame extinction limit', 'Strain rate at extinction (1/s)', 'The same measurement for the hot flame. The hot flame needs far less fuel than the cool flame to resist the same strain rate.')
    return out
  },
}

export function curatedCharts(id, ds, rows, raw) {
  const f = SPEC[id]
  if (!f) return []
  try { return f(rows || [], ds, raw).filter((c) => c && c.n >= 3) } catch (e) { console.error(id, e); return [] }
}

export const SMALL_TABLE_MAX = 20
