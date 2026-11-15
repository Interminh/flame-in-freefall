import { useEffect, useState } from 'react'
import { getCorpus, getLiterature, getInvestigations } from './data.js'
import { buildIndex } from './rag.js'

let p
export const loadIndex = () => (p ||= Promise.all([getCorpus(), getLiterature(), getInvestigations()]).then(([c, l, i]) => buildIndex(c, l, i)))
export function useIndex() {
  const [ix, setIx] = useState(null)
  useEffect(() => { loadIndex().then(setIx) }, [])
  return ix
}
