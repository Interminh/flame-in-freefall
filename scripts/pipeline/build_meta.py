"""Writes public/data/meta.json: every count, scenario and threshold the interface displays.
Run after build_data.py and build_corpus.py (npm run data runs all three)."""
import json
import os
import re
import datetime

import config as C

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'public', 'data')


def load(name):
    with open(os.path.join(D, name)) as f:
        return json.load(f)


def main():
    invs, idx, an = load('investigations.json'), load('datasets/index.json'), load('analytics.json')
    lit, corpus, anchors, tests = load('literature.json'), load('corpus.json')['chunks'], load('anchors.json'), load('tests.json')
    by_src = {}
    for c in corpus:
        by_src[c['src']] = by_src.get(c['src'], 0) + 1
    ntrs_docs = {c['doc'] for c in corpus if c['src'] == 'ntrs'}
    ser = [d for d in idx if d['kind'] == 'series']
    pillars = {}
    for i in invs:
        pillars[i['pillar']] = pillars.get(i['pillar'], 0) + 1

    loc = []
    for spec in C.LOC_ANCHORS:
        a = next(x for x in anchors if x['anchor_id'] == spec['anchor_id'])
        m = re.search(r'(\d+(?:\.\d+)?)\s*%', str(a['value']))
        if not m:
            raise SystemExit(f"anchor {spec['anchor_id']} has no percent value: {a['value']!r}")
        loc.append({'id': spec['id'], 'label': spec['label'], 'o2_percent': float(m.group(1)), 'src': f"NTRS {a['ntrs_id']}, p. {a['pdf_page']}",
                    'url': a['ntrs_url'], 'quote': a['quote'], 'anchor_id': a['anchor_id']})

    scen = []
    for s in C.SCENARIOS:
        t = dict(s)
        t['ppo2_kpa'] = round(s['o2_percent'] * s['pressure_kpa'] / 100, 2)
        scen.append(t)

    meta = {
        'generated_on': datetime.date.today().isoformat(),
        'counts': {
            'investigations': len(invs), 'tables': sum(1 for d in idx if d['kind'] == 'table' and d['rows']),
            'series_datasets': len(ser), 'series_points': sum(d['rows'] for d in ser),
            'test_rows': tests['n'], 'rows_o2_and_pressure': an['facts']['rows_with_o2_and_pressure'],
            'literature_records': len(lit), 'literature_full_text': len(ntrs_docs), 'corpus_chunks': len(corpus),
            'corpus_chunks_ntrs': by_src.get('ntrs', 0), 'corpus_chunks_psi': by_src.get('psi', 0), 'corpus_chunks_analysis': by_src.get('analysis', 0),
            'anchors': len(anchors), 'pillars': pillars,
        },
        'scenarios': scen, 'loc_presets': loc, 'cabin_box': C.CABIN_BOX, 'solid_experiments': C.SOLID_EXPERIMENTS,
        'ranking': C.RANKING, 'theta_default_source': C.THETA_DEFAULT_SOURCE,
    }
    with open(os.path.join(D, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    print(json.dumps(meta['counts']))


if __name__ == '__main__':
    main()
