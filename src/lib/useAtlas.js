import { useAsync } from '../components/ui.jsx'
import { getMeta, getAnalytics, getInvestigations } from './data.js'

// Meta, analytics and investigation records, loaded once and shared.
export const useAtlas = () => {
  const s = useAsync(() => Promise.all([getMeta(), getAnalytics(), getInvestigations()]))
  return s.data ? { meta: s.data[0], analytics: s.data[1], invs: s.data[2] } : s
}
