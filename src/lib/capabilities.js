// Which analyses a table can support, decided from its variable fingerprint (analytics.json) and nothing else.
const v = (fp, k) => fp?.[k]?.status
const varies = (fp, k) => v(fp, k) === 'varies'
const why = (fp, ks) => ks.map((k) => `${k} ${v(fp, k) || 'missing'}`).join(', ')

export function capabilities(fp) {
  if (!fp) return []
  const outcomeAndCond = varies(fp, 'Outcome') && ['O₂', 'Flow speed', 'Pressure', 'Thickness'].some((k) => varies(fp, k))
  return [
    { id: 'map', label: 'Flammability map', ok: outcomeAndCond, need: 'Outcome and at least one condition vary', reason: why(fp, ['Outcome', 'O₂', 'Flow speed', 'Pressure']) },
    { id: 'o2', label: 'Oxygen effect', ok: varies(fp, 'O₂'), need: 'O₂ varies', reason: why(fp, ['O₂']) },
    { id: 'theta', label: 'Pressure scaling', ok: varies(fp, 'O₂') && varies(fp, 'Pressure'), need: 'O₂ and pressure both vary', reason: why(fp, ['O₂', 'Pressure']) },
    { id: 'flow', label: 'Flow effect', ok: varies(fp, 'Flow speed'), need: 'Flow speed varies', reason: why(fp, ['Flow speed']) },
    { id: 'thick', label: 'Thickness effect', ok: varies(fp, 'Thickness'), need: 'Thickness varies', reason: why(fp, ['Thickness']) },
    { id: 'grav', label: 'Gravity comparison', ok: varies(fp, 'Gravity'), need: 'Gravity varies', reason: why(fp, ['Gravity']) },
    { id: 'fuel', label: 'Fuel comparison', ok: varies(fp, 'Fuel'), need: 'Fuel varies', reason: why(fp, ['Fuel']) },
  ]
}
