// Runs the heavy part of the simulator off the page thread: the shaded grid, the limiting-oxygen lines and the
// summaries, over every refit. Two passes per request. A quick pass on a thin sample of refits answers at once, and a
// full pass over all refits replaces it. A newer request cancels an older one between the two passes.
import { burnProbability, locO2, quantile, thetaFromPacked } from '../src/sim/model.js'

let draws = []
let job = null
let busy = false

const FLOW_MAX = 50
const O2_MIN = 10
const O2_MAX = 30
const REF_G = [0, 0.165, 0.38, 1]

self.onmessage = (e) => {
  const m = e.data
  if (m.type === 'init') { draws = m.draws.map(thetaFromPacked); return }
  job = m
  if (!busy) setTimeout(pump, 0)
}

function thin(list, n) {
  if (n >= list.length) return list
  const step = list.length / n
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)])
}

function heat(inp, set, nx, ny) {
  const out = new Float32Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    const o2 = O2_MAX - ((j + 0.5) * (O2_MAX - O2_MIN)) / ny
    for (let i = 0; i < nx; i++) {
      const uForced = ((i + 0.5) * FLOW_MAX) / nx
      let s = 0
      for (let k = 0; k < set.length; k++) s += burnProbability({ ...inp, uForced, o2 }, set[k])
      out[j * nx + i] = s / set.length
    }
  }
  return out
}

// Limiting oxygen against flow for one gravity. Returns flow values and the 5th, 50th and 95th percentile.
function limit(inp, g, set, step) {
  const f = [], lo = [], mid = [], hi = []
  for (let u = 0; u <= FLOW_MAX + 1e-9; u += step) {
    const locs = set.map((d) => locO2({ ...inp, g, uForced: u }, d)).sort((a, b) => a - b)
    f.push(u)
    lo.push(quantile(locs, 0.05))
    mid.push(quantile(locs, 0.5))
    hi.push(quantile(locs, 0.95))
  }
  return { f, lo, mid, hi }
}

function pass(m, quality) {
  const full = quality === 'full'
  const set = full ? draws : thin(draws, 60)
  const heatSet = full ? thin(draws, 400) : thin(draws, 40)
  const nx = full ? 160 : 64
  const ny = full ? 112 : 44
  const step = full ? 1 : 2.5
  const inp = m.inp
  const res = {
    type: 'result', id: m.id, quality, draws: set.length, heatDraws: heatSet.length, nx, ny,
    heat: heat(inp, heatSet, nx, ny),
    own: limit(inp, inp.g, set, step),
    refs: REF_G.map((g) => ({ g, ...limit(inp, g, thin(draws, full ? 300 : 40), step * 2) })),
  }
  return res
}

function pump() {
  if (!job) return
  busy = true
  const m = job
  job = null
  const quick = pass(m, 'fast')
  self.postMessage(quick)
  setTimeout(() => {
    if (job) { busy = false; pump(); return }
    const done = pass(m, 'full')
    self.postMessage(done)
    busy = false
    if (job) pump()
  }, 0)
}
