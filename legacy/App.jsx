import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
import Ranking from './pages/Ranking.jsx'
import Novelty from './pages/Novelty.jsx'
import Presentation from './pages/Presentation.jsx'
import Sources from './pages/Sources.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="novelty" element={<Novelty />} />
        <Route path="presentation" element={<Presentation />} />
        <Route path="sources" element={<Sources />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
