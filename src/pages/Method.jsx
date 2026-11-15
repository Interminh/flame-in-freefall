import { Link } from 'react-router-dom'
import { PageHead } from '../components/ui.jsx'

export default function Method() {
  return (
    <div style={{ maxWidth: 880 }}>
      <PageHead eyebrow="Methods" title="How the Atlas is built and what it does not claim" lede="Every number on this site is read from a file produced by a script in the repository, or from a cited NASA source. Judgement is labelled interpretation." />
      <h2>Data</h2>
      <p>Twenty-four NASA Physical Sciences Informatics investigations (CC0) were converted to typed tables by <code>scripts/pipeline/build_data.py</code>. Raw labels (59 distinct fuel strings) are mapped to canonical materials. Outcomes follow the conservative rules in <code>data/DATA_DICTIONARY.md</code>: a row is labelled only when its source states the result, and &ldquo;extinguished&rdquo; is never read as a limiting-oxygen outcome because flow blow-off also extinguishes flames.</p>
      <h2>Pressure scaling</h2>
      <p>Effective O₂ = x (p / 101.325)<sup>θ</sup>. Under θ = 0 the O₂ fraction governs; under θ = 1 the partial pressure does. For a threshold L, the break-even θ* = ln(L/x) / ln(p/101.325) says where a verdict flips. θ is estimated by bootstrap regression of droplet extinction diameter on ln x, ln p, and droplet size (FLEX, n = 158) and by CFI (n = 143). Limits: both responses are liquid droplets; FLEX pressure leverage rests on two clusters (70 and 100 kPa); CFI has two O₂ levels; the bootstrap resamples rows as independent. The Atlas applies θ to solids only as a labelled assumption.</p>
      <h2>Verdict labels</h2>
      <ul><li><b>Robust</b>: the conclusion holds for every θ in the chosen range.</li><li><b>Assumption-dependent</b>: it flips inside the range; θ* is reported.</li><li><b>Contested by the data</b>: it survives only at a θ the bootstrap rejects.</li><li><b>Outside the tested range</b>: no tested row lies near the condition.</li></ul>
      <h2>Experiment ranking</h2>
      <p>Candidate (O₂, pressure) points are ranked by the binary entropy of P(more flammable than the reference), with θ uniform over the chosen interval. This is an interpretation: a bootstrap interval is not a posterior. It identifies where a single solid-fuel run would remove the most assumption.</p>
      <h2>Retrieval and the LLM</h2>
      <p>Pages of 77 NTRS PDFs (3,681 chunks), 24 PSI records and 2 Atlas analysis notes are indexed with BM25 in your browser. Answers always show the passages. If the server has an LLM key, the model sees only the retrieved passages, must cite them, may not compute numbers, and every number in its output is checked against those passages; unmatched numbers are flagged. API keys stay on the server (<code>/api/chat</code>).</p>
      <h2>Screening model</h2>
      <p>The <Link to="/models">Models</Link> page keeps the earlier PMMA/SIBAL model with its validation: it does not generalise to a new material and has no outcome data above 0 g.</p>
      <h2>What would change our mind</h2>
      <p>A solid-fuel flammability run in the cabin box (O₂ of at least 26% at 75 kPa or less) would replace the extrapolation in the Atlas. Any such result outside the predicted θ range falsifies the droplet-to-solid assumption.</p>
      <h2>AI use and sources</h2>
      <p>Code and drafts were written with AI assistance (Claude). All figures were checked against source files by scripts. See <code>SOURCES.md</code> for datasets, libraries, fonts and AI tools.</p>
    </div>
  )
}
