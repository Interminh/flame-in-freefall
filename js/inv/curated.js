// Hand-picked charts per investigation. Each one answers a fire-safety question the
// table can actually support. Values come from data/atlas/datasets/PSI-*.json and
// nothing is typed in here. Investigations with no entry get a table or an honest note.

const COLORS = {
  ignited: '#C73512',
  extinguished: '#1B5FA8',
  burned_out: '#E3A400',
  no_ignition: '#111111',
}
const PALETTE = ['#C73512', '#1B5FA8', '#E3A400', '#2E8B57', '#8E44AD', '#111111', '#E07BB0']
const LABEL = { ignited: 'Ignited / burning', extinguished: 'Went out', burned_out: 'Burned out', no_ignition: 'Did not ignite' }

const stated = (r) => r.outcome && r.outcome !== 'unknown'
const groupBy = (rows, f) => {
  const m = new Map()
  for (const r of rows) { const k = f(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r) }
  return m
}
const levels = (rows) => ['ignited', 'burned_out', 'extinguished', 'no_ignition'].filter((l) => rows.some((r) => r.outcome === l))
const note = (n, total, what) => `${n} of ${total} rows plotted${what ? `; ${what}` : ''}.`

// Outcome counts across oxygen levels. Rows whose outcome is "unknown" are left out
// because the source does not say what happened.
function o2Outcome(rows, { title, why }) {
  const use = rows.filter((r) => stated(r) && r.o2_percent != null)
  return {
    title, why, n: use.length,
    foot: note(use.length, rows.length, 'rows with no stated outcome are left out'),
    data: levels(use).map((l) => ({
      type: 'histogram', name: LABEL[l], x: use.filter((r) => r.outcome === l).map((r) => r.o2_percent),
      xbins: { size: 1 }, marker: { color: COLORS[l], line: { color: '#111', width: 1.5 } },
    })),
    layout: { barmode: 'stack', xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Tests' } },
  }
}

function outcomeBy(rows, key, { title, why, xLabel, top = 8 }) {
  const use = rows.filter((r) => stated(r) && r[key] != null)
  const order = [...groupBy(use, (r) => r[key]).entries()].sort((a, b) => b[1].length - a[1].length).slice(0, top).map(([k]) => k)
  return {
    title, why, n: use.length,
    foot: note(use.length, rows.length, 'rows with no stated outcome are left out'),
    data: levels(use).map((l) => ({
      type: 'bar', name: LABEL[l], x: order.map(String),
      y: order.map((k) => use.filter((r) => r[key] === k && r.outcome === l).length),
      marker: { color: COLORS[l], line: { color: '#111', width: 1.5 } },
    })),
    layout: { barmode: 'stack', xaxis: { title: xLabel, tickangle: -25 }, yaxis: { title: 'Tests' }, margin: { b: 90 } },
  }
}

const SPEC = {
  'PSI-25': (rows, ds) => [
    o2Outcome(rows, {
      title: 'Oxygen level and what the flame did',
      why: 'Shows the oxygen range in which these solid fuels kept burning in microgravity and where they went out. The lowest-oxygen flame is the number a spacecraft atmosphere has to stay clear of.',
    }),
    (() => {
      const use = rows.filter((r) => stated(r) && r.o2_percent != null && r.fuel_thickness_mm != null)
      return {
        title: 'Fuel thickness against oxygen',
        why: 'Thin fuels preheat faster, so thickness moves the flammability limit. Each point is one test with a stated outcome and a recorded thickness.',
        n: use.length,
        foot: note(use.length, rows.length, 'only tests with a recorded thickness and a stated outcome'),
        data: levels(use).map((l) => ({
          type: 'scatter', mode: 'markers', name: LABEL[l], x: use.filter((r) => r.outcome === l).map((r) => r.o2_percent), y: use.filter((r) => r.outcome === l).map((r) => r.fuel_thickness_mm),
          text: use.filter((r) => r.outcome === l).map((r) => r.test_id), hovertemplate: '%{text}<br>O₂ %{x}%<br>%{y} mm<extra></extra>',
          marker: { color: COLORS[l], size: 11, line: { color: '#111', width: 1.5 } },
        })),
        layout: { xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Fuel thickness (mm)', type: 'log' } },
      }
    })(),
  ],

  'PSI-26': (rows) => [
    o2Outcome(rows, {
      title: 'Oxygen level and what the flame did',
      why: 'BASS tested fuels in a narrow band around air. This shows how close to 21% O₂ flames still went out.',
    }),
    outcomeBy(rows, 'fuel_geometry', {
      title: 'Outcome by fuel shape', xLabel: 'Fuel shape',
      why: 'Compares spheres, candles and slabs, so you can see whether the fuel shape changes how often a flame survives.',
    }),
  ],

  'PSI-159': (rows) => {
    const use = rows.filter((r) => stated(r) && r.o2_percent != null && r.pressure_kpa_reported_approx != null)
    return [
      {
        title: 'Oxygen and pressure at ignition',
        why: 'A flammability map for gas flames. It shows which atmospheres burned and which went out, across the range from lean to oxygen-rich.',
        n: use.length,
        foot: note(use.length, rows.length, 'pressure is approximate as stated in the source; rows with no stated outcome are left out'),
        data: levels(use).map((l) => ({
          type: 'scatter', mode: 'markers', name: LABEL[l], x: use.filter((r) => r.outcome === l).map((r) => r.o2_percent), y: use.filter((r) => r.outcome === l).map((r) => r.pressure_kpa_reported_approx),
          marker: { color: COLORS[l], size: 9, opacity: 0.8, line: { color: '#111', width: 1 } },
        })),
        layout: { xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Pressure (kPa, approximate)' } },
      },
      outcomeBy(rows, 'fuel', {
        title: 'Outcome by fuel', xLabel: 'Fuel',
        why: 'Shows whether the fuel changes how often the flame survives. Fuel names are as written in the source table.',
      }),
    ]
  },

  'PSI-10': (rows) => {
    const use = rows.filter((r) => r.o2_percent != null && r.pressure_kpa != null)
    return [{
      title: 'Atmospheres that were tested',
      why: 'The source states no outcome for this table, so the useful picture is coverage: which oxygen and pressure levels were run, and for which flame set-up.',
      n: use.length,
      foot: note(use.length, rows.length, 'no outcome is stated in the source'),
      data: [...groupBy(use, (r) => r.flame_configuration).entries()].map(([k, rs], i) => ({
        type: 'scatter', mode: 'markers', name: `${k} flame`, x: rs.map((r) => r.o2_percent), y: rs.map((r) => r.pressure_kpa),
        marker: { color: PALETTE[i], size: 8, opacity: 0.75, line: { color: '#111', width: 1 } },
      })),
      layout: { xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Pressure (kPa)' } },
    }]
  },

  'PSI-39': (rows) => {
    const fuels = [...groupBy(rows, (r) => r.fuel).keys()]
    const box = (key, name, color) => ({
      type: 'box', name, x: rows.filter((r) => r[key] != null).map((r) => r.fuel), y: rows.filter((r) => r[key] != null).map((r) => r[key]),
      marker: { color }, line: { color: '#111', width: 1.5 }, boxpoints: false,
    })
    const pts = (key, name, color, sym) => {
      const u = rows.filter((r) => r[key] != null && r.pressure_kpa != null)
      return { type: 'scatter', mode: 'markers', name, x: u.map((r) => r.pressure_kpa), y: u.map((r) => r[key]), marker: { color, symbol: sym, size: 8, opacity: 0.7, line: { color: '#111', width: 1 } } }
    }
    return [
      {
        title: 'Burning rate: hot flame against cool flame',
        why: 'Droplets in this experiment burned with a hot flame and, after it went out, a cool flame. This compares how fast the droplet shrank in each, for each fuel.',
        n: rows.filter((r) => r.hot_d2_burning_constant_mm2_s != null || r.cool_d2_burning_constant_mm2_s != null).length,
        foot: 'Burning-rate constant is the rate at which droplet diameter squared shrinks. Box shows the middle half of the values.',
        data: [box('hot_d2_burning_constant_mm2_s', 'Hot flame', '#C73512'), box('cool_d2_burning_constant_mm2_s', 'Cool flame', '#1B5FA8')],
        layout: { boxmode: 'group', yaxis: { title: 'Burning-rate constant (mm²/s)' }, xaxis: { tickangle: -15, automargin: true }, margin: { b: 110 } },
        _fuels: fuels,
      },
      {
        title: 'Droplet size at extinction against pressure',
        why: 'Shows how large a droplet still is when its flame goes out, for hot and cool flames, across 0.5 to 5 atmospheres.',
        n: rows.filter((r) => r.pressure_kpa != null && (r.hot_extinction_diameter_mm != null || r.cool_extinction_diameter_mm != null)).length,
        foot: 'Rows with a pressure and an extinction diameter. Outcome is not stated in the source table.',
        data: [pts('hot_extinction_diameter_mm', 'Hot flame', '#C73512', 'circle'), pts('cool_extinction_diameter_mm', 'Cool flame', '#1B5FA8', 'diamond')],
        layout: { xaxis: { title: 'Pressure (kPa)' }, yaxis: { title: 'Droplet diameter at extinction (mm)' } },
      },
    ]
  },

  'PSI-69': (rows) => {
    const use = rows.filter((r) => r.initial_droplet_diameter_mm != null && r.visible_flame_extinction_diameter_mm != null)
    const burn = rows.filter((r) => r.burn_time_s != null && r.o2_percent != null)
    return [
      {
        title: 'Droplet size when the flame goes out',
        why: 'The core FLEX result for suppression: how large a droplet is at extinction, given how large it started. The dashed line marks extinction at the starting size; a point near the bottom burned down almost fully.',
        n: use.length,
        foot: note(use.length, rows.length, 'tests with both diameters recorded'),
        data: [
          ...[...groupBy(use, (r) => r.fuel).entries()].map(([k, rs], i) => ({
            type: 'scatter', mode: 'markers', name: k, x: rs.map((r) => r.initial_droplet_diameter_mm), y: rs.map((r) => r.visible_flame_extinction_diameter_mm),
            marker: { color: PALETTE[i], size: 8, opacity: 0.75, line: { color: '#111', width: 1 } },
          })),
          { type: 'scatter', mode: 'lines', name: 'Extinguished at start size', x: [0, 5], y: [0, 5], line: { color: '#111', dash: 'dash', width: 2 }, hoverinfo: 'skip' },
        ],
        layout: { xaxis: { title: 'Initial droplet diameter (mm)' }, yaxis: { title: 'Flame extinction diameter (mm)' } },
      },
      {
        title: 'How long the flame lasted at each oxygen level',
        why: 'Shows how long each droplet flame lasted as the oxygen level changed, for each fuel.',
        n: burn.length,
        foot: note(burn.length, rows.length, 'tests with burn time and oxygen recorded'),
        data: [...groupBy(burn, (r) => r.fuel).entries()].map(([k, rs], i) => ({
          type: 'scatter', mode: 'markers', name: k, x: rs.map((r) => r.o2_percent), y: rs.map((r) => r.burn_time_s),
          marker: { color: PALETTE[i], size: 8, opacity: 0.75, line: { color: '#111', width: 1 } },
        })),
        layout: { xaxis: { title: 'Oxygen (% by volume)' }, yaxis: { title: 'Burn time (s)' } },
      },
    ]
  },

  'PSI-101': (rows) => {
    const use = rows.filter((r) => r.flow_velocity_cm_s != null)
    const speeds = [...new Set(use.map((r) => r.flow_velocity_cm_s))].sort((a, b) => a - b)
    const fuels = [...groupBy(use, (r) => r.fuel).keys()]
    return [{
      title: 'Which materials were smoked, and at what air speed',
      why: 'SAME-R made smoke from five materials at several air speeds. The related SAME-2 paper reports that particle size depends on air velocity, so the test matrix is what the particle results hang on.',
      n: use.length,
      foot: note(use.length, rows.length, 'one row per test; the source table states no outcome or particle result'),
      data: speeds.map((s, i) => ({
        type: 'bar', name: `${s} cm/s`, x: fuels, y: fuels.map((f) => use.filter((r) => r.fuel === f && r.flow_velocity_cm_s === s).length),
        marker: { color: PALETTE[i % PALETTE.length], line: { color: '#111', width: 1.5 } },
      })),
      layout: { barmode: 'stack', xaxis: { title: 'Material' }, yaxis: { title: 'Tests' } },
    }]
  },

  'PSI-107': (rows) => {
    const use = rows.filter((r) => r.flow_velocity_cm_s != null)
    const fuels = [...groupBy(use, (r) => r.fuel).entries()].sort((a, b) => b[1].length - a[1].length)
    return [{
      title: 'Air speeds run for each fuel',
      why: 'SPICE looked for the point where a flame starts to smoke. The table only records the test conditions, so this shows how widely airspeed was varied for each fuel.',
      n: use.length,
      foot: note(use.length, rows.length, 'the smoke-point result itself is not in this table'),
      data: fuels.map(([k, rs], i) => ({ type: 'box', name: k, y: rs.map((r) => r.flow_velocity_cm_s), marker: { color: PALETTE[i % PALETTE.length] }, line: { color: '#111', width: 1.5 }, boxpoints: 'outliers' })),
      layout: { yaxis: { title: 'Air speed (cm/s)' }, showlegend: false, xaxis: { tickangle: -20, automargin: true } },
    }]
  },
}

// DAFT / DAFT-2: one paired run of smoke particle counts and mass readings.
function daft(ds) {
  const find = (id) => ds.series.find((s) => s.id.endsWith(id))
  const a = find('series-0053'), b = find('series-0054')
  if (!a || !b) return []
  return [{
    title: 'Smoke readings from one run',
    why: 'Shows what the two smoke instruments saw at the same time: a count of tiny particles and a mass reading for larger ones. Detectors rely on this kind of signal.',
    n: a.n,
    foot: 'First of three paired P-Trak and DustTrak runs in the table. The source gives no time units, so the horizontal axis is the stored sample index. Long runs are thinned to about 240 points for display.',
    data: [
      { type: 'scatter', mode: 'lines', name: 'P-Trak (particle count)', x: a.x, y: a.y, line: { color: '#C73512', width: 2 } },
      { type: 'scatter', mode: 'lines', name: 'DustTrak (mass)', x: b.x, y: b.y, yaxis: 'y2', line: { color: '#1B5FA8', width: 2 } },
    ],
    layout: { xaxis: { title: 'Sample index (time units not stated)' }, yaxis: { title: 'P-Trak reading' }, yaxis2: { title: 'DustTrak reading', overlaying: 'y', side: 'right' } },
  }]
}

export function curatedCharts(id, ds, rows) {
  if (id === 'PSI-47') return daft(ds)
  const f = SPEC[id]
  if (!f || !rows.length) return []
  return f(rows, ds).filter((c) => c.n >= 3)
}

// Tables with a handful of rows are better read than plotted.
export const SMALL_TABLE_MAX = 20
