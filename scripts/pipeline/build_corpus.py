#!/usr/bin/env python3
"""Build the literature corpus for retrieval from NASA NTRS records.

Inputs
  data/external/ntrs_records.json   NTRS API records (metadata). Fetched with scripts/pipeline/fetch_ntrs.py
  $NTRS_PDF_DIR/<id>.pdf            PDFs downloaded from the links in those records (not committed)
Outputs (public/data/)
  literature.json   one entry per document: metadata, mapped investigations, topics
  corpus.json       page-level text chunks with source ids, plus PSI record chunks and analysis chunks

Every chunk keeps its document id and PDF page number, so any retrieved passage can be cited and checked.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'data')
PDF_DIR = os.environ.get('NTRS_PDF_DIR', '/home/claude/work/external/ntrs/pdf')

# Bulk conference proceedings and off-topic records are listed in the records file but not chunked.
EXCLUDE = {
    '20150022260', '20220014681', '20260009884', '20160009024', '20190032657', '20050245285', '20020064975',
    '20050215648', '19960008386', '19990053965', '20010073993', '20040053504', '20040161185', '20120016855',
}

INV_RULES = {
    'PSI-25': r'bass[-– ]?ii|burning and suppression of solids',
    'PSI-26': r'\bbass\b|burning and suppression of solids',
    'PSI-98': r'saffire|spacecraft fire experiment',
    'PSI-99': r'saffire|spacecraft fire experiment',
    'PSI-100': r'saffire|spacecraft fire experiment',
    'PSI-69': r'flame extinguishment experiment|\bflex\b|methanol droplet|droplet extinction',
    'PSI-68': r'flame extinguishment experiment|\bflex[-– ]?2\b',
    'PSI-39': r'cool flame',
    'PSI-159': r'cool flame',
    'PSI-101': r'smoke aerosol measurement|\bsame[-– ]r\b',
    'PSI-102': r'smoke aerosol measurement',
    'PSI-47': r'dust and aerosol|\bdaft\b',
    'PSI-107': r'smoke point in coflow|\bspice\b',
    'PSI-106': r'structure and liftoff|\bslice\b',
    'PSI-10': r'flame design|advanced combustion via microgravity',
    'PSI-20': r'burning rate emulator',
}
TOPICS = {
    'partial gravity': r'partial[- ]gravity|lunar gravity|martian gravity|moon|lunar',
    'exploration atmosphere': r'exploration atmosphere|10\.2 psi|8\.2 psi|30 ?% oxygen|34 ?% oxygen|normoxic',
    'flammability limits': r'limiting oxygen|oxygen index|flammability limit|flammability threshold|loc\b',
    'flame spread': r'flame spread|flame spreading',
    'smoke detection': r'smoke detect|fire detect|smoke particulate|smoke aerosol|particulate',
    'suppression': r'extinguish|suppress|carbon dioxide|helium dilut',
    'material selection': r'nasa-std-6001|material flammability|materials flammability|test 1\b|upward',
    'modeling': r'numerical|computational|model(?:ing|ling)? ',
}


def clean(s):
    s = s.replace('­', '')
    s = re.sub(r'-\n(?=[a-z])', '', s)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{2,}', '\n\n', s)
    return s.strip()


def chunk_page(text, size=1100, overlap=160):
    paras = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    flat = ' '.join(' '.join(p.split()) for p in paras)
    if len(flat) < 160:
        return []
    out, i = [], 0
    while i < len(flat):
        j = min(len(flat), i + size)
        if j < len(flat):
            k = flat.rfind('. ', i + size // 2, j)
            if k != -1:
                j = k + 1
        out.append(flat[i:j].strip())
        if j >= len(flat):
            break
        i = max(j - overlap, i + 1)
    return out


def pdf_pages(path):
    r = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True)
    return r.stdout.split('\f')


def authors_of(r):
    out = []
    for a in sorted(r.get('authorAffiliations') or [], key=lambda x: x.get('sequence', 0)):
        n = ((a.get('meta') or {}).get('author') or {}).get('name')
        if n and n not in out:
            out.append(n)
    return out


def year_of(r):
    for src in ((r.get('publications') or [{}])[0].get('publicationDate'), r.get('distributionDate'), r.get('created')):
        if src:
            return int(src[:4])
    return None


def main():
    recs = json.load(open(os.path.join(ROOT, 'data', 'external', 'ntrs_records.json')))
    docs, chunks = [], []
    for r in recs:
        i = str(r['id'])
        if i in EXCLUDE:
            continue
        pdf = os.path.join(PDF_DIR, f'{i}.pdf')
        have_pdf = os.path.exists(pdf)
        head = (r['title'] + ' ' + (r.get('abstract') or '')).lower()
        pages = pdf_pages(pdf) if have_pdf else []
        body_head = ' '.join(pages[:3]).lower() if pages else ''
        hay = head + ' ' + body_head[:4000]
        invs = [k for k, pat in INV_RULES.items() if re.search(pat, hay)]
        topics = [k for k, pat in TOPICS.items() if re.search(pat, hay)]
        doc = {
            'id': i, 'title': r['title'].strip(), 'year': year_of(r), 'authors': authors_of(r)[:12],
            'center': (r.get('center') or {}).get('name'), 'abstract': (r.get('abstract') or '').strip(),
            'keywords': r.get('keywords') or [], 'report_numbers': r.get('otherReportNumbers') or [],
            'url': f'https://ntrs.nasa.gov/citations/{i}', 'pages': len([p for p in pages if p.strip()]),
            'investigations': invs, 'topics': topics, 'in_corpus': bool(have_pdf),
        }
        docs.append(doc)
        for pn, txt in enumerate(pages, start=1):
            for k, c in enumerate(chunk_page(clean(txt))):
                chunks.append({'id': f'ntrs:{i}:p{pn}:{k}', 'src': 'ntrs', 'doc': i, 'p': pn, 't': c})
    docs.sort(key=lambda d: (d['year'] or 0, d['id']))
    json.dump(docs, open(os.path.join(OUT, 'literature.json'), 'w'), separators=(',', ':'))

    inv = json.load(open(os.path.join(OUT, 'investigations.json')))
    an = json.load(open(os.path.join(OUT, 'analytics.json')))
    for r in inv:
        parts = [f"{r['name']} ({r['psi_id']}), {r['full_name']}. Pillar: {r['pillar']}. Hardware: {r['hardware']}."]
        for key in ('summary', 'interpretation'):
            v = r.get(key)
            if v and 'not stated' not in str(v).lower()[:20]:
                parts.append(f"{key.capitalize()}: {v}")
        for key in ('materials', 'geometry', 'measurements', 'caveats'):
            v = r.get(key)
            if v:
                parts.append(f"{key.capitalize()}: {'; '.join(v) if isinstance(v, list) else v}")
        c = r.get('conditions')
        if isinstance(c, dict):
            parts.append('Conditions: ' + json.dumps(c))
        chunks.append({'id': f"psi:{r['psi_id']}", 'src': 'psi', 'doc': r['psi_id'], 'p': None, 't': ' '.join(parts)[:2600]})

    f = an['facts']; th = an['theta']
    facts = [
        ('analysis:cabin-gap',
         f"Coverage of the Moon cabin condition in PSI. Of {f['rows_total']} unified test rows, {f['rows_with_o2_and_pressure']} record both "
         f"oxygen fraction and total pressure and {f['rows_with_o2_pressure_and_outcome']} of those also have an outcome label. "
         f"In the cabin box ({f['cabin_box_definition']}) there are {f['cabin_box_rows']} rows, all from {', '.join(f['cabin_box_experiments'])} "
         f"droplet tests, with {f['cabin_box_with_outcome']} outcome labels. Solid-fuel rows ({f['solid_rows']}) reach at most "
         f"{f['solid_max_o2_percent']} percent O2 at {f['solid_pressure_min_kpa']} to {f['solid_pressure_max_kpa']} kPa; "
         f"{f['solid_rows_at_or_above_24pct_o2']} solid rows are at or above 24 percent O2."),
        ('analysis:theta',
         f"Pressure scaling of the oxygen effect (theta; 1 means partial pressure of O2 governs, 0 means O2 mole fraction governs). "
         f"FLEX droplet extinction diameter, n={th['flex']['n']}: theta = {th['flex']['pooled_with_diluent_terms']['theta']} "
         f"(95 percent bootstrap interval {th['flex']['pooled_with_diluent_terms']['ci95'][0]} to {th['flex']['pooled_with_diluent_terms']['ci95'][1]}). "
         f"CFI hot-flame extinction diameter, n={th['cfi']['hot_flame']['n']}: theta = {th['cfi']['hot_flame']['theta']} "
         f"({th['cfi']['hot_flame']['ci95'][0]} to {th['cfi']['hot_flame']['ci95'][1]}). "
         f"Pure-N2 FLEX subset cannot identify theta (interval {th['flex']['pure_n2_only']['ci95'][0]} to {th['flex']['pure_n2_only']['ci95'][1]}). "
         + ' '.join(th['caveats'])),
    ]
    for cid, t in facts:
        chunks.append({'id': cid, 'src': 'analysis', 'doc': cid, 'p': None, 't': t})

    json.dump({'chunks': chunks}, open(os.path.join(OUT, 'corpus.json'), 'w'), separators=(',', ':'))
    mb = os.path.getsize(os.path.join(OUT, 'corpus.json')) / 1e6
    print(f'docs {len(docs)}  in_corpus {sum(d["in_corpus"] for d in docs)}  chunks {len(chunks)}  corpus.json {mb:.1f} MB')
    from collections import Counter
    print(Counter(i for d in docs for i in d['investigations']).most_common())


if __name__ == '__main__':
    main()
