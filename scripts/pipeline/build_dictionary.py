"""Writes public/data/dictionary.json from the unified-table section of data/DATA_DICTIONARY.md.
Run with the other pipeline scripts (npm run data). Fails if the table cannot be parsed."""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Columns added by scripts/pipeline/build_data.py (build_tests); not part of the NASA-sourced unified table.
DERIVED = [
    {'key': 'psi_id', 'meaning': 'PSI investigation id, read from the source file name', 'domain': 'text'},
    {'key': 'material', 'meaning': 'Canonical material name mapped from the raw fuel label (public/data/material_map.json)', 'domain': 'text'},
    {'key': 'form', 'meaning': 'Canonical fuel form (rod, film, droplet, gas burner, ...) mapped from the raw label and geometry', 'domain': 'text'},
    {'key': 'rod_diameter_mm', 'meaning': 'Rod diameter parsed from the raw label where stated', 'domain': 'mm'},
    {'key': 'ppo2_kpa', 'meaning': 'Oxygen partial pressure: o2_percent x pressure_kpa / 100; empty unless both are reported', 'domain': 'kPa'},
    {'key': 'outcome_class', 'meaning': 'Coarse outcome: ignited is flame; extinguished and no_ignition are no_flame; burned_out is burned_out; all else unknown', 'domain': 'flame / no_flame / burned_out / unknown'},
    {'key': 'pillar', 'meaning': 'Fire-safety pillar of the investigation (prevention, detection, suppression, context)', 'domain': 'category'},
]


def main():
    with open(os.path.join(ROOT, 'data', 'DATA_DICTIONARY.md'), encoding='utf-8') as f:
        text = f.read()
    m = re.search(r'## Unified table.*?\n\n(\|.*?)\n\n', text, re.S)
    if not m:
        raise SystemExit('unified table section not found in DATA_DICTIONARY.md')
    cols = []
    for line in m.group(1).splitlines()[2:]:
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 4:
            continue
        cols.append({'key': cells[0].strip('`'), 'meaning': cells[1], 'domain': cells[2], 'source': cells[3]})
    if len(cols) < 10:
        raise SystemExit(f'parsed only {len(cols)} columns')
    out = os.path.join(ROOT, 'public', 'data', 'dictionary.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'unified': cols, 'derived': DERIVED}, f, ensure_ascii=False, indent=1)
    print(f'dictionary.json: {len(cols)} columns')


if __name__ == '__main__':
    main()
