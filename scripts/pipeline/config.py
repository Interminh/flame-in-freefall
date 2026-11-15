"""Analysis inputs shared by the pipeline scripts. Everything the app shows that is a choice, not a measurement, lives here."""

# Lunar-cabin box used to count how much of the proposed atmosphere space has been tested.
CABIN_BOX = {'o2_min_percent': 26.0, 'pressure_max_kpa': 75.0}

# Experiments whose fuels are solids. All other experiments are gases, liquids or modelling.
SOLID_EXPERIMENTS = ['BASS', 'BASS-II', 'SAFFIRE-I', 'SAFFIRE-II', 'SAFFIRE-III']

# Reference atmospheres. 'src' says where the numbers come from.
SCENARIOS = [
    {'id': 'earth_air', 'label': 'Earth air', 'short': 'Earth air', 'o2_percent': 20.9, 'pressure_kpa': 101.325,
     'src': 'Sea-level air'},
    {'id': 'moon_cabin_10p2psi', 'label': 'Moon cabin, 30% O2 at 10.2 psi', 'short': 'Moon cabin 30% / 10.2 psi',
     'o2_percent': 30.0, 'pressure_kpa': 70.33, 'src': 'Challenge brief'},
    {'id': 'moon_cabin_26_5', 'label': 'Cabin, 26.5% O2 at 10.2 psi', 'short': '26.5% / 10.2 psi',
     'o2_percent': 26.5, 'pressure_kpa': 70.33, 'src': 'PSI-20 ACME BRE record'},
    {'id': 'moon_cabin_8p2psi', 'label': 'Cabin, 34% O2 at 8.2 psia', 'short': '34% / 8.2 psia',
     'o2_percent': 34.0, 'pressure_kpa': 56.54, 'src': 'PSI-20 ACME BRE record'},
    {'id': 'suit_4p3psi', 'label': 'Suit, 100% O2 at 4.3 psi', 'short': 'Suit 100% / 4.3 psi',
     'o2_percent': 100.0, 'pressure_kpa': 29.65, 'src': 'Challenge brief'},
]

# Literature anchors offered as flammability thresholds in the Atlas. Values are parsed from anchors.json.
LOC_ANCHORS = [
    {'anchor_id': 'A6', 'id': 'pmma_rod_ug', 'label': 'PMMA rod, zero-stretch limit'},
    {'anchor_id': 'A3', 'id': 'pmma_rod_1g', 'label': 'PMMA rod, 1 g blow-off limit'},
]

# Candidate grid for the experiment ranking, and the window used to count nearby solid-fuel tests.
RANKING = {'o2_range': [24, 40, 2], 'pressure_range_kpa': [50, 76, 2], 'near_o2_percent': 3, 'near_pressure_kpa': 8}
THETA_DEFAULT_SOURCE = 'flex'
