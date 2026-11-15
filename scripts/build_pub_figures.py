"""Crops publication figures into img/pubs/ and writes data/pub-figures.json.

Every figure comes from a document we may reuse:
  psi  = report or slides hosted on the PSI investigation page (investigation licence CC0-1.0)
  ntrs = NASA NTRS paper whose rights field reads public use permitted

Usage: python3 scripts/build_pub_figures.py <psi-raw-dir> <ntrs-pdf-dir>
  psi-raw-dir : the PSI-*/ folders downloaded from PSI (see data/DOWNLOAD_PLAN.md)
  ntrs-pdf-dir: folder holding NTRS PDFs named <ntrs id>.pdf
Needs PyMuPDF and Pillow (local tooling only). Captions are written by us from what each
figure and its caption show; they are not copied from the papers.
"""
import fitz, json, os, re, sys
from PIL import Image

RAW, NTRS = sys.argv[1], sys.argv[2]
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'img', 'pubs')
os.makedirs(OUT, exist_ok=True)

PSI_DOCS = {
    'bass2-report': ('PSI-25/PSI-25_Reports_BASS-II Summary Report.pdf', 'BASS-II Summary Report', 'PSI-25'),
    'bass-deck': ('PSI-26/PSI-26_Presentations_BASS_Overview of Recent ISS Results.pdf', 'BASS: An Overview of Recent ISS Results (slides)', 'PSI-26'),
    'flex-deck': ('PSI-69/PSI-69_Presentations_Cool Flames in Space, a Hot Prospect on Earth!.pdf', 'Cool Flames in Space, a Hot Prospect on Earth! (slides)', 'PSI-69'),
    'flex2-srd': ('PSI-68/PSI-68_Science Documents_FLEX-2 SRD Final.pdf', 'FLEX-2 Science Requirements Document', 'PSI-68'),
    'cfi-report': ('PSI-39/PSI-39_Reports_CFI Science Final Report.pdf', 'CFI Science Final Report', 'PSI-39'),
    'cfig-report': ('PSI-159/PSI-159_Reports_FinalRpt_ACME.CFI-G.pdf', 'ACME CFI-G Final Report', 'PSI-159'),
    'bre-report': ('PSI-20/PSI-20_Reports_Final_20220201.pdf', 'ACME BRE Final Report', 'PSI-20'),
    'efield-report': ('PSI-22/PSI-22_Reports_E-FIELD Flames Final Report.pdf', 'E-FIELD Flames Final Report', 'PSI-22'),
    'sflame-report': ('PSI-23/PSI-23_Reports_s_Flame_final_report_20210729.pdf', 's-Flame Final Report', 'PSI-23'),
    'design-report': ('PSI-10/PSI-10_Reports_FinalRpt_ACMEFlameDesign.pdf', 'ACME Flame Design Final Report', 'PSI-10'),
    'spice-report': ('PSI-107/PSI-107_Reports_SPICE_FinalReport.pdf', 'SPICE Final Report', 'PSI-107'),
    'daft-report': ('PSI-47/PSI-47_Reports_DAFT_30Day.PostFlightReport.pdf', 'DAFT 30-Day Post-Flight Report', 'PSI-47'),
    'same-report': ('PSI-102/PSI-102_Reports_SAME_Final Science Report.pdf', 'SAME Final Science Report', 'PSI-102'),
    'samer-report': ('PSI-101/PSI-101_Reports_SAME-R_Final Report.pdf', 'SAME-R Final Report', 'PSI-101'),
    'smoke-sim-report': ('PSI-115/PSI-115_Reports_NNX17AF08A_FinalReport.pdf', 'Final Report, grant NNX17AF08A (smoke simulation)', 'PSI-115'),
    'coolflame-thesis': ('PSI-117/PSI-117_Reports_Dissertation_Combustion Behavior Of Sub-Millimeter Sized Oxygenated And N-Alka.pdf', 'Dissertation: Combustion Behavior of Sub-Millimeter Sized Oxygenated and N-Alkane Droplets', 'PSI-117'),
}
NTRS_DOCS = {
    '20170008805': 'Results of Large-Scale Spacecraft Flammability Tests (slides)',
    '20140017780': 'An Experimental and Computational Study on Soot Formation in a Coflow Jet Flame Under Microgravity',
}

# doc, page, crop, trim(top,bottom), psi ids, file, heading, shows, why
# crop: "cap:<caption prefix>" finds the figure above that caption; "box:x0,y0,x1,y1" uses page fractions
F = [
 ('bass2-report', 16, 'cap:Figure 1.4', (0, .27), ['PSI-25', 'PSI-26'], 'bass2-co-vs-co2',
  'Carbon monoxide made against carbon dioxide made',
  'Each point is one BASS-II test: how much CO and CO2 the burn added to the glovebox air, grouped by sample shape.',
  'Concurrent-flow rods made the most CO for their CO2. The report notes the CO to CO2 ratio is well above what an efficient fire gives, so these small microgravity flames burn less completely and release more toxic CO.'),
 ('bass2-report', 15, 'cap:Figure 1.3', (.05, 0), ['PSI-25', 'PSI-26'], 'bass2-o2-vs-co2',
  'Oxygen used against carbon dioxide made',
  'Change in oxygen and in carbon dioxide over each test. The dashed line is the ratio expected from the chemistry.',
  'The readings follow the expected line, which is a check that the gas sensors and the tests agree. It also lets oxygen use stand in for how much heat a flame released.'),
 ('bass2-report', 17, 'cap:Figure 1.6', (.06, 0), ['PSI-25', 'PSI-26'], 'bass2-heat-release',
  'Heat released against starting oxygen',
  'Heat release rate of each test, worked out from oxygen use, against the oxygen level at the start.',
  'Heat release generally rises with oxygen but stays small for these samples. The scatter shows how much the sample shape matters.'),
 ('bass2-report', 59, 'cap:Figure 4.3', (0, .06), ['PSI-25', 'PSI-26'], 'bass2-rod-spread',
  'Flame spread rate against rod diameter',
  'Spread rate along black PMMA rods of three diameters, in microgravity at about 17.6 to 20.8% oxygen and in normal gravity at 19% and 21%.',
  'In this comparison the microgravity flames spread faster than the normal-gravity ones at similar oxygen, and smaller rods spread faster in both. Normal-gravity results do not simply carry over.'),
 ('bass2-report', 67, 'cap:Figure 5.5', (0, 0), ['PSI-25', 'PSI-26'], 'bass2-extinction-limits',
  'Oxygen level at which flames went out',
  'Oxygen at extinction against the flow speed just before extinction, for sheets of PMMA of different width and thickness. Circle size and number reflect sheet thickness.',
  'Extinction happened between roughly 17 and 22% oxygen depending on flow and sample. There is no single safe oxygen number: it depends on the airflow past the fuel.'),
 ('bass2-report', 51, 'cap:Figure 2.22', (0, .15), ['PSI-25', 'PSI-26'], 'bass2-thickness',
  'Spread rate against fuel thickness',
  'Flame spread rate over PMMA from microgravity, downward-burning and other experiments, over fuel thicknesses from tens of micrometres to centimetres. Lines show the thermally thin and thermally thick limits.',
  'Thin fuels spread fast and the rate falls steeply as thickness grows, then levels off for thick fuel. Fuel thickness is one of the strongest controls on how a fire spreads.'),
 ('bass-deck', 3, 'box:0.55,0.10,0.99,0.80', (0, 0), ['PSI-26', 'PSI-25'], 'bass-boundary-idea',
  'What a flammability boundary is',
  'A sketch from the BASS team: oxygen fraction against flow speed. Inside the curve a fuel can burn, outside it cannot. The red band is the buoyant flow of normal gravity.',
  'The curve turns up at both high and low flow, so a fuel can be safe in a breeze and flammable in still air, or the reverse. BASS tested this at constant oxygen while changing the flow.'),
 ('bass-deck', 25, 'box:0.0,0.0,0.99,0.88', (0, 0), ['PSI-26'], 'bass-thin-fuel-spread',
  'Thin fuel: spread rate against flow speed',
  'Flame spread rate over thin fabric against forced flow velocity. Negative velocities are opposed flow, positive are concurrent flow (flow in the direction of spread).',
  'In concurrent flow the spread rate rises roughly linearly with flow. In opposed flow it is fastest at an intermediate speed, and the flame goes out when the flow falls too low.'),
 ('bass-deck', 57, 'box:0,0,1,1', (0, 0), ['PSI-26'], 'bass-nitrogen',
  'Nitrogen flow on a burning sphere',
  'Image grid of a PMMA sphere burning in a wake configuration in air, with a nitrogen flow switched on and then off.',
  'A nitrogen flow of 500 cc/min weakened the flame but did not put it out. Suppression by inert gas needs more than a gentle flow.'),
 ('bass-deck', 60, 'box:0,0,1,1', (0, 0), ['PSI-26'], 'bass-candle',
  'A candle as airflow is reduced',
  'Image sequence of a candle burning in microgravity at 17% oxygen while the flow is stepped from 5 down to below 1 cm/s. Times are shown on the images.',
  'The flame changes shape and size as the flow drops, which shows how sensitive a small fire is to ventilation.'),
 ('flex-deck', 4, 'box:0.02,0.06,0.98,0.95', (0, 0), ['PSI-69', 'PSI-68', 'PSI-39'], 'flex-two-extinction',
  'Two ways a droplet flame goes out',
  'Droplet and flame size over time for n-heptane in 30 to 70% oxygen-helium at 1 atm, marked with radiative and diffusive extinction.',
  'A flame can die because it loses heat by radiation (large droplet, low oxygen) or because it runs out of fuel and oxidiser supply (small droplet). FLEX measured both in space.'),
 ('flex-deck', 8, 'box:0.02,0.06,0.98,0.95', (0, 0), ['PSI-69', 'PSI-39', 'PSI-159'], 'flex-second-stage',
  'A droplet that keeps burning after the flame seems to go out',
  'Droplet size over time for three examples of second-stage (cool flame) burning: heptane in air, and in oxygen-nitrogen and oxygen-nitrogen-carbon dioxide mixes.',
  'After the visible hot flame ends, the droplet keeps shrinking, because a cool flame continues burning. This was first seen in the FLEX experiments.'),
 ('flex-deck', 15, 'box:0.02,0.06,0.98,0.95', (0, 0), ['PSI-69', 'PSI-117', 'PSI-142'], 'flex-model-two-stage',
  'A model that reproduces the cool flame',
  'Computed peak flame temperature over time for an n-heptane droplet (3.91 mm) in air at 1 atm, showing a hot-flame stage, then a lower-temperature cool-flame stage, then pure evaporation.',
  'Models that include low-temperature chemistry capture the second stage. The slide says how well they predict extinction is still open.'),
 ('flex2-srd', 12, 'cap:Figure 1', (0, 0), ['PSI-68'], 'flex2-droplet-history',
  'How a burning droplet shrinks',
  'Representative data from a microgravity droplet experiment: square of droplet diameter (left axis) and of flame diameter (right axis) against time since ignition. The figure shows droplet swelling, flame contraction and different burning-rate constants (K).',
  'The droplet size squared falls along nearly straight lines, and the slope is the burning rate. This is the basic measurement FLEX-2 repeats. Data in the figure are credited in the source to Aharon and Shaw (1998).'),
 ('flex2-srd', 17, 'cap:Figure 5', (0, 0), ['PSI-68'], 'flex2-burning-rate',
  'Burning rate against starting droplet size',
  'Measured burning rate against initial droplet diameter, with three model lines: no radiation, non-luminous radiation, and soot radiation. Points come from drop-tower tests.',
  'The model that includes radiation from soot tracks the measured fall in burning rate for larger droplets. This is the kind of comparison FLEX-2 was designed to extend in space.'),
 ('cfi-report', 9, 'cap:Figure 4', (0, .1), ['PSI-39', 'PSI-159'], 'cfi-cool-vs-pressure',
  'Cool-flame extinction size against pressure',
  'Droplet diameter when the cool flame went out, for n-dodecane in 21% oxygen and 79% nitrogen, against pressure. Triangles are droplets held on a fibre, circles are free floating.',
  'The cool flame lasts down to small droplets at low pressure. By about 2 atm no cool-flame extinction is plotted in air.'),
 ('cfi-report', 10, 'cap:Figure 5', (0, .05), ['PSI-39', 'PSI-159'], 'cfi-helium',
  'Does swapping helium for nitrogen change it?',
  'The same measurement for four atmospheres: 17% O2 in nitrogen, 21% O2 in nitrogen, and 21% O2 with helium in place of some nitrogen.',
  'Helium-rich mixes show cool-flame extinction at pressures where the nitrogen mixes show none, so the gas that dilutes the oxygen matters as well as the oxygen level.'),
 ('cfig-report', 46, 'box:0.0,0.60,1.0,0.77', (0, 0), ['PSI-159'], 'cfig-hot-cool',
  'A hot flame and a cool flame, same burner',
  'Images of an n-butane flame at test point 21174C3: (a) hot flame, (b) cool flame. The dashed circle marks the gas-fed porous sphere burner, and colours are added from grayscale.',
  'The cool flame is dimmer and has a different structure. CFI-G was built to find where cool flames exist as oxygen and fuel mix change.'),
 ('bre-report', 31, 'cap:Figure 15', (0, 0), ['PSI-20'], 'bre-flammability-map',
  'Heat needed to gasify the fuel, in space and on Earth',
  'Preliminary flammability map from the burning-rate emulator: heat of gasification against fuel mixture mass flux, microgravity data against normal-gravity data, each with a fitted line.',
  'The microgravity points sit well below the normal-gravity line, so the burner flames behave differently without buoyancy. This is the quantity needed to relate a gas burner to a burning solid.'),
 ('bre-report', 125, 'cap:Figure 12', (.3, .06), ['PSI-20'], 'bre-radiant-fraction',
  'How much of the flame heat is radiated',
  'Flame radiant fraction against fuel mixture mass flux (a) and flame height (b) for the steady tests.',
  'The radiant fraction rises with flame height. A larger share of radiation means more heat reaches the surroundings, which is what ignites nearby materials.'),
 ('efield-report', 53, 'cap:Figure 3.', (0, .1), ['PSI-22'], 'efield-ion-current',
  'Electric current through a flame',
  'Ion current against field strength for a methane jet at 15 cm/s (left) and 19 cm/s (right), with no coflow.',
  'The current rises to a peak near 1.4 to 1.5 kV/cm and then falls and levels off. It is how the experiment measures the way a flame responds to an electric field.'),
 ('efield-report', 26, 'cap:Figure 11', (0, .16), ['PSI-22'], 'efield-flame-coflow',
  'Flame shape as the field is raised, with coflow',
  'Flame images at field strengths from 0.06 to 2.00 kV/cm with a 3.1 cm/s coflow, for two methane jet speeds.',
  'The yellow soot glow at the flame tip fades and the flame changes shape as the field grows, so an electric field can be used to steer how much soot a flame makes.'),
 ('efield-report', 27, 'cap:Figure 12', (0, .16), ['PSI-22'], 'efield-flame-nocoflow',
  'Flame shape as the field is raised, no coflow',
  'Flame images at field strengths from 0.14 to 2.60 kV/cm with no coflow.',
  'Without coflow the flame is blue and changes from a wide dome to a compact shape as the field increases.'),
 ('design-report', 71, 'box:0.05,0.125,0.95,0.58', (0, 0), ['PSI-10'], 'design-inverse-flame',
  'An inverse flame in time steps',
  'Time sequence of the final Flame Design inverse flame, where oxygen flows from the burner into the surrounding fuel. The top picture is a false-colour measurement of the flame temperature using a ceramic fibre.',
  'Flame Design uses inverse flames to study how soot forms and is controlled. Without gravity the flame is round and easy to measure.'),
 ('sflame-report', 79, 'box:0.05,0.28,0.95,0.52', (0, 0), ['PSI-23'], 'sflame-hydrogen-tests',
  'Four s-Flame tests as the fuel flow rises',
  'Flames from four tests (GMT 013) in which the hydrogen and methane fuel flow rises from left to right while the nitrogen flow stays constant, in about 19% oxygen at about 1 atm.',
  'The flame grows and changes shape as the fuel flow rises, so s-Flame can follow how a nearly spherical flame responds.'),
 ('sflame-report', 77, 'box:0.05,0.57,0.95,0.865', (0, 0), ['PSI-23'], 'sflame-methane-tests',
  'Spherical flames as the fuel supply changes',
  'Three s-Flame tests of methane (45%) burning in 30% oxygen, with the fuel flow changing between tests.',
  'The flame shell shrinks and opens as fuel flow falls. This is how the experiment finds where a sooty and a soot-free flame turn into one another.'),
 ('spice-report', 22, 'cap:Figure 18.', (0, 0), ['PSI-107'], 'spice-smoke-point',
  'How long a flame is when it starts to smoke',
  'Smoke point flame length against coflow velocity for several fuels and burner sizes (0.41, 0.76 and 1.6 mm).',
  'The longer the flame can get before it smokes, the less sooty the fuel. Coflow speed changes the smoke point, and the fuels separate clearly.'),
 ('spice-report', 23, 'cap:Figure 19.', (0, 0), ['PSI-107'], 'spice-smoke-collapse',
  'One line through many fuels',
  'Smoke point length against fuel mass flow divided by the stoichiometric mixture fraction, for all the fuels and burners. A straight line through the origin is fitted (y = 1.6097x, R2 = 0.9514).',
  'When the flow is scaled this way, the many fuels fall on one line, a simple rule for predicting smoke point length.'),
 ('spice-report', 21, 'cap:Figure 17.', (0, 0), ['PSI-107'], 'spice-flames',
  'Flames at four coflow speeds',
  'Photographs of a 75% propylene flame from a 1.6 mm burner at coflow speeds of 28.2, 32.9, 37.6 and 42.3 cm/s.',
  'Faster coflow shortens the flame, which is how the smoke point is reached by changing air speed.'),
 ('daft-report', 9, 'cap:Figure 1', (0, 0), ['PSI-47'], 'daft-ptrak',
  'Particle counts in the first DAFT test',
  'P-Trak particle count against time for test point 1. Marks show when the HEPA filter was on and off.',
  'The counter spikes when smoke is released and falls back when the air is filtered, showing how quickly a particle detector responds on the station.'),
 ('daft-report', 12, 'cap:Figure 7', (0, 0), ['PSI-47'], 'daft-ground',
  'Particle count against mass reading, ground test',
  'DustTrak mass concentration against P-Trak particle count, from DAFT ground tests. Each colour is one run.',
  'The two readings rise together, so the count of tiny particles and the mass of larger ones can be compared to judge smoke type.'),
 ('same-report', 40, 'cap:Figure 4', (0, 0), ['PSI-102', 'PSI-101'], 'same-detector-types',
  'The same smoke, four different detectors',
  'Normalised mass concentration needed for an alarm, against smoke particle size, for four smoke detector technologies. The alarm level was set at 2 mg/m3 for 500 nm particles.',
  'Particle counters and two other designs need very different smoke amounts as particles get bigger, while a scattering detector stays flat. Detector choice depends on the particle size a fire makes in space.'),
 ('same-report', 65, 'cap:Figure 6', (0, 0), ['PSI-102', 'PSI-101'], 'same-smoke-spread',
  'How smoke spreads through an enclosure',
  'Simulated smoke distribution 177 s after a smoke source of 8.5 mg/s was switched on at location 4 on the floor of an enclosure with obstructions.',
  'Smoke takes time to reach a detector and obstructions change how long it takes. Detector placement matters as much as detector type.'),
 ('samer-report', 15, 'cap:Fig. 18', (0, 0), ['PSI-101'], 'samer-size-distribution',
  'Aged smoke particle sizes',
  'Number and volume distributions of smoke particles from aged lamp wick, measured by two methods (SMPS and TEM).',
  'The two methods give different average sizes (248 nm against 131 nm by number), so how particles are measured changes what detectors are told to look for.'),
 ('smoke-sim-report', 22, 'cap:Figure 8', (0, 0), ['PSI-115'], 'smokesim-size-mg-eg',
  'Simulated smoke particle sizes, with and without gravity',
  'Top: average-mass diameter fields for two simulated cases. Bottom: the particle size distributions for Case 1MG and Case 1EG. Interpretation: MG and EG appear to stand for microgravity and Earth gravity.',
  'The distribution shifts between the two cases, so smoke made in space is not the same size as smoke made on the ground.'),
 ('smoke-sim-report', 25, 'cap:Figure 16', (0, 0), ['PSI-115'], 'smokesim-fields',
  'Simulated smoke plumes, four cases',
  'Visualisation of simulated smoke fields for four cases (1MG, 1EG, 2MG, 2EG) behind a bluff body.',
  'Without gravity the plume spreads evenly behind the body, while the gravity cases rise. The same smoke is easier or harder to detect depending on where it goes.'),
 ('coolflame-thesis', 69, 'cap:Figure 3.2 Numerical', (0, 0), ['PSI-117'], 'coolflame-methanol-model',
  'Modelled methanol droplet at different oxygen levels',
  'Predicted droplet size, peak gas temperature and flame stand-off ratio over time for methanol droplets of 1 mm (top) and 2 mm (bottom) in 7%, 10% and 21% oxygen at 1 atm.',
  'Less oxygen shortens the burn and lowers the peak temperature. These model results are not measurements.'),
 ('coolflame-thesis', 107, 'cap:Figure 4.6 Comparison', (0, 0), ['PSI-117'], 'coolflame-fsr',
  'Flame stand-off for an n-butanol droplet',
  'Flame stand-off ratio (flame diameter over droplet diameter) against time, measured and predicted, for a 0.56 mm n-butanol droplet in air.',
  'The stand-off ratio grows as the droplet shrinks, and the model follows the measurement closely until the flame goes out.'),
 ('coolflame-thesis', 181, 'cap:Figure 6.9 Effect', (0, 0), ['PSI-117'], 'coolflame-ozone',
  'Adding ozone to a droplet flame',
  'Predicted droplet size and peak gas temperature for n-heptane droplets with 1 to 7% ozone added, for 0.1 mm and 0.5 mm droplets.',
  'Ozone speeds up ignition and changes the cool-flame stage. This is a model result for tiny droplets, not a measurement.'),
]
N = [
 ('20170008805', 20, 'box:0.0,0.05,1,0.97', (0, 0), ['PSI-98', 'PSI-99', 'PSI-100'], 'saffire-fabric-spread',
  'Saffire-I: flame spread over fabric',
  'Left: flame base and pyrolysis front position over time, in concurrent and opposed flow. Right: spread rate against air flow speed for fabric samples of two widths.',
  'This is the first large (40 cm by 94 cm) fabric fire burned in space. Concurrent-flow flames spread faster as flow rose, and quenched at low flow.'),
 ('20170008805', 30, 'box:0.0,0.05,1,0.97', (0, 0), ['PSI-98', 'PSI-99', 'PSI-100'], 'saffire-oxygen',
  'Saffire-I: oxygen during the burn',
  'Oxygen measured during the Saffire-I burns, plotted against time with several instrument traces.',
  'Oxygen was one of the module\'s own measurements of the fire. The axis values are small at this size, so open the slides for the detail.'),
 ('20170008805', 19, 'box:0.0,0.05,1,0.97', (0, 0), ['PSI-98', 'PSI-99', 'PSI-100'], 'saffire-montage',
  'Saffire-I: a 40 cm wide flame, frame by frame',
  'Montage of images from the 40.6 cm wide concurrent-flow test, with each image 40 s apart, compared with concurrent and opposed images.',
  'The flame grew slowly and steadily across the sample over several minutes, a pattern that small tests cannot reproduce.'),
 ('20140017780', 15, 'cap:Fig. 3.', (.07, 0), ['PSI-106'], 'slice-soot-temperature',
  'Soot in a flame with and without gravity',
  'Measured soot temperature and soot volume fraction for matching methane flames in normal gravity and microgravity, with computed results.',
  'The microgravity flame is wider and taller, produces about eight times more peak soot, and runs about 200 K cooler than the normal-gravity flame.'),
]



# How each figure connects to each investigation it appears on.
# direct  = results, hardware or analysis from that investigation itself
# related = from a sister, predecessor or follow-on experiment, shown for context
D, R = 'direct', 'related'
BASS2_ON_BASS = 'BASS-II is the follow-on to BASS: the same question (when does a solid fuel burn in a slow flow) with new hardware. Read it as context, not as BASS data.'
BASS_ON_BASS2 = 'These slides report BASS, the experiment before BASS-II. The method and fuels overlap, but the numbers are from BASS.'
REL = {
 'bass2-co-vs-co2': {'PSI-25': (D, 'From the BASS-II Summary Report, which reports this investigation’s own tests.'), 'PSI-26': (R, BASS2_ON_BASS)},
 'bass2-o2-vs-co2': {'PSI-25': (D, 'From the BASS-II Summary Report, which reports this investigation’s own tests.'), 'PSI-26': (R, BASS2_ON_BASS)},
 'bass2-heat-release': {'PSI-25': (D, 'From the BASS-II Summary Report, which reports this investigation’s own tests.'), 'PSI-26': (R, BASS2_ON_BASS)},
 'bass2-rod-spread': {'PSI-25': (D, 'From the BASS-II Summary Report, which reports this investigation’s own tests.'), 'PSI-26': (R, BASS2_ON_BASS)},
 'bass2-extinction-limits': {'PSI-25': (D, 'From the BASS-II Summary Report, which reports this investigation’s own tests.'), 'PSI-26': (R, BASS2_ON_BASS)},
 'bass2-thickness': {'PSI-25': (D, 'From the BASS-II Summary Report, which reports this investigation’s own tests.'), 'PSI-26': (R, BASS2_ON_BASS)},
 'bass2-flammability-boundary': {'PSI-25': (D, 'Poster by the BASS-II team showing BASS-II rod tests.'), 'PSI-26': (R, BASS2_ON_BASS)},
 'bass-boundary-idea': {'PSI-26': (D, 'From the BASS team’s own overview slides.'), 'PSI-25': (R, BASS_ON_BASS2)},
 'bass-thin-fuel-spread': {'PSI-26': (D, 'From the BASS team’s own overview slides.'), 'PSI-25': (R, BASS_ON_BASS2)},
 'bass-nitrogen': {'PSI-26': (D, 'From the BASS team’s own overview slides.'), 'PSI-25': (R, BASS_ON_BASS2)},
 'bass-candle': {'PSI-26': (D, 'From the BASS team’s own overview slides.'), 'PSI-25': (R, BASS_ON_BASS2)},
 'flex-two-extinction': {'PSI-69': (D, 'From the FLEX science team’s slides on FLEX results.'), 'PSI-68': (R, 'FLEX-2 repeats FLEX droplet burning with new fuels; this shows the FLEX behaviour it builds on.'), 'PSI-39': (R, 'CFI used the same droplet hardware to study the cool flames FLEX first saw.')},
 'flex-second-stage': {'PSI-69': (D, 'From the FLEX science team’s slides on FLEX results.'), 'PSI-39': (R, 'CFI studies the cool-flame stage that FLEX first observed.'), 'PSI-159': (R, 'CFI-G looks for the same cool flames, on a gas burner instead of a droplet.')},
 'flex-model-two-stage': {'PSI-69': (D, 'From the FLEX science team’s slides on FLEX results.'), 'PSI-117': (R, 'PSI-117 holds the modelling of this cool-flame behaviour; the slide shows the model it descends from.')},
 'flex2-droplet-history': {'PSI-68': (D, 'From the FLEX-2 science requirements document.'), 'PSI-69': (R, 'The same droplet measurement FLEX makes; shown to explain the burning rate in the FLEX table.')},
 'flex2-burning-rate': {'PSI-68': (D, 'From the FLEX-2 science requirements document.'), 'PSI-69': (R, 'Drop-tower and model data for the same burning-rate quantity FLEX measures.')},
 'cfi-cool-vs-pressure': {'PSI-39': (D, 'From the CFI Science Final Report.'), 'PSI-159': (R, 'CFI-G follows CFI in the search for cool flames, using gases.')},
 'cfi-helium': {'PSI-39': (D, 'From the CFI Science Final Report.'), 'PSI-159': (R, 'CFI-G follows CFI in the search for cool flames, using gases.')},
 'cfig-hot-cool': {'PSI-159': (D, 'From the CFI-G Final Report: test point 21174C3.')},
 'bre-flammability-map': {'PSI-20': (D, 'From the BRE Final Report.')},
 'bre-radiant-fraction': {'PSI-20': (D, 'From the BRE Final Report.')},
 'efield-ion-current': {'PSI-22': (D, 'From the E-FIELD Flames Final Report.')},
 'efield-flame-coflow': {'PSI-22': (D, 'From the E-FIELD Flames Final Report.')},
 'efield-flame-nocoflow': {'PSI-22': (D, 'From the E-FIELD Flames Final Report.')},
 'design-inverse-flame': {'PSI-10': (D, 'From the Flame Design Final Report.')},
 'sflame-hydrogen-tests': {'PSI-23': (D, 'From the s-Flame Final Report.')},
 'sflame-methane-tests': {'PSI-23': (D, 'From the s-Flame Final Report.')},
 'spice-smoke-point': {'PSI-107': (D, 'From the SPICE Final Report.')},
 'spice-smoke-collapse': {'PSI-107': (D, 'From the SPICE Final Report.')},
 'spice-flames': {'PSI-107': (D, 'From the SPICE Final Report.')},
 'daft-ptrak': {'PSI-47': (D, 'From the DAFT 30-day post-flight report.')},
 'daft-ground': {'PSI-47': (D, 'From the DAFT 30-day post-flight report (ground test data).')},
 'same-detector-types': {'PSI-102': (D, 'From the SAME Final Science Report.'), 'PSI-101': (R, 'SAME-R repeats SAME with new hardware; this is the SAME conclusion it builds on.')},
 'same-smoke-spread': {'PSI-102': (D, 'From the SAME Final Science Report.'), 'PSI-101': (R, 'SAME-R repeats SAME with new hardware; this is the SAME conclusion it builds on.')},
 'same-lampwick-particle-size': {'PSI-102': (D, 'From the SAME-2 results paper; the SAME samples include lamp wick.'), 'PSI-101': (R, 'SAME-R repeats SAME; the paper reports the earlier SAME-2 run.')},
 'samer-size-distribution': {'PSI-101': (D, 'From the SAME-R Final Report.')},
 'smokesim-size-mg-eg': {'PSI-115': (D, 'From the final report behind this simulation record.')},
 'smokesim-fields': {'PSI-115': (D, 'From the final report behind this simulation record.')},
 'coolflame-methanol-model': {'PSI-117': (D, 'From the dissertation hosted on this record; the model results are not measurements.')},
 'coolflame-fsr': {'PSI-117': (D, 'From the dissertation hosted on this record; the model results are not measurements.')},
 'coolflame-ozone': {'PSI-117': (D, 'From the dissertation hosted on this record; the model results are not measurements.')},
 'saffire-fabric-spread': {'PSI-98': (D, 'Saffire-I results, from NASA’s large-scale flammability test slides.'), 'PSI-99': (R, 'Saffire-II burned different samples in the same module; this is the Saffire-I fabric result.'), 'PSI-100': (R, 'Saffire-III reuses the Saffire design; this is the Saffire-I fabric result.')},
 'saffire-oxygen': {'PSI-98': (D, 'Saffire-I measurements, from NASA’s large-scale flammability test slides.'), 'PSI-99': (R, 'Same module and instruments flew on Saffire-II; this is the Saffire-I record.'), 'PSI-100': (R, 'Same module and instruments flew on Saffire-III; this is the Saffire-I record.')},
 'saffire-montage': {'PSI-98': (D, 'Saffire-I images, from NASA’s large-scale flammability test slides.'), 'PSI-99': (R, 'Saffire-II used smaller samples in the same module; this is the Saffire-I flame.'), 'PSI-100': (R, 'Saffire-III reuses the Saffire design; this is the Saffire-I flame.')},
 'saffire2-spread-vs-pressure': {'PSI-99': (D, 'Includes the Saffire-II flight point, with ground tests at several pressures.'), 'PSI-98': (R, 'Saffire-II result with ground comparisons; the same fuel type (PMMA) is not in Saffire-I.'), 'PSI-100': (R, 'Saffire-II result with ground comparisons, for context.')},
 'flex-methanol-extinction': {'PSI-69': (D, 'Paper built on FLEX droplet tests.'), 'PSI-68': (R, 'FLEX-2 repeats FLEX droplet burning; these are FLEX results.')},
 'cool-flame-extinction-o2': {'PSI-69': (D, 'Paper built on FLEX droplet tests.'), 'PSI-39': (R, 'CFI studies the same cool-flame extinction with the same droplet hardware.'), 'PSI-159': (R, 'CFI-G looks for the same cool flames on a gas burner.')},
 'slice-soot-temperature': {'PSI-106': (D, 'Paper on the SLICE flames and models.')},
}

# For figures from this experiment, say which part of the PSI data they line up with.
DIRECT_HOW = {
 'bass2-co-vs-co2': 'BASS-II’s own tests. The CO and CO2 values come from the before-and-after gas readings that sit in the “Initial/Final CO” and “CO2” columns of the BASS-II table.',
 'bass2-o2-vs-co2': 'BASS-II’s own tests. The oxygen and carbon dioxide changes are the “Initial/Final O2” and “CO2” columns of the BASS-II table.',
 'bass2-heat-release': 'BASS-II’s own tests, plotted against the initial oxygen column of the BASS-II table.',
 'bass2-rod-spread': 'BASS-II’s own rod tests (the rod samples in the BASS-II table). Spread rates are not in the table, so this figure is where they are.',
 'bass2-extinction-limits': 'BASS-II’s own tests: the oxygen and flow settings are the “O2” and “Fan/Air display” columns of the BASS-II table.',
 'bass2-thickness': 'The BASS-II report’s comparison of its thin and thick fuels with other experiments. Thickness is a column in the BASS-II table for 34 tests.',
 'bass2-flammability-boundary': 'BASS-II’s own PMMA rod tests. Each mark is one test, with its oxygen and outcome, as in the BASS-II table.',
 'bass-boundary-idea': 'The BASS team’s own explanation of what BASS was testing: oxygen against flow, which are the main columns of the BASS table.',
 'bass-thin-fuel-spread': 'BASS’s own thin-fuel (fabric) tests. Spread rates are not in the PSI table, so this figure is where they are.',
 'bass-nitrogen': 'BASS’s own suppression tests: the nitrogen-flow tests listed in the BASS matrix.',
 'bass-candle': 'BASS’s own candle tests: the “candle” fuel in the BASS table.',
 'flex-two-extinction': 'FLEX’s own tests. Droplet size over time is how the “extinction diameter” and “burn time” columns of the FLEX table were measured.',
 'flex-second-stage': 'FLEX’s own tests, showing the cool-flame stage that follows the “Extinction” entries in the FLEX table.',
 'flex-model-two-stage': 'Model results from the FLEX team, drawn from FLEX data. They are predictions, not rows of the table.',
 'flex2-droplet-history': 'FLEX-2’s own science document. It explains the burning-rate constant that FLEX-2 measures for each droplet.',
 'flex2-burning-rate': 'FLEX-2’s own science document. It shows the burning rate against droplet size that FLEX-2 sets out to measure.',
 'cfi-cool-vs-pressure': 'CFI’s own tests. The extinction diameter and pressure are the “Dext,cool” and “Pressure” columns of the CFI table.',
 'cfi-helium': 'CFI’s own tests with helium in the air. The mixes are the oxygen, nitrogen and helium columns of the CFI table.',
 'cfig-hot-cool': 'An example from CFI-G’s own tests: the same burner shown with a hot flame and with a cool flame.',
 'bre-flammability-map': 'BRE’s own tests. The heat of gasification is not in the BRE table (it logs flames lit per day), so this figure is where that result is.',
 'bre-radiant-fraction': 'BRE’s own tests. Radiant fraction is not in the BRE table, so this figure is where that result is.',
 'efield-ion-current': 'E-FIELD’s own tests. The table logs field polarity and flames lit; the ion-current curves are not in it.',
 'efield-flame-coflow': 'E-FIELD’s own tests. The table logs the fuel and polarity; the flame images are not in it.',
 'efield-flame-nocoflow': 'E-FIELD’s own tests. The table logs the fuel and polarity; the flame images are not in it.',
 'design-inverse-flame': 'Flame Design’s own tests: an inverse flame, like those in the “Inverse flames” sheet of the Flame Design table.',
 'sflame-hydrogen-tests': 'The hydrogen and methane flames of s-Flame’s own tests, as logged in the s-Flame table.',
 'sflame-methane-tests': 'The methane flames of s-Flame’s own tests, as logged in the s-Flame table.',
 'spice-smoke-point': 'SPICE’s own tests. The fuels, burner sizes and air speeds are the SPICE table’s columns; the measured flame length is not in the table.',
 'spice-smoke-collapse': 'SPICE’s own tests: the fuel flow rate is a column of the SPICE table; the flame length is from the report.',
 'spice-flames': 'SPICE’s own flames at the coflow speeds listed in the SPICE table.',
 'daft-ptrak': 'DAFT’s own test: the P-Trak instrument records that the DAFT sheets hold.',
 'daft-ground': 'DAFT’s own ground test, comparing the same two instruments (P-Trak and DustTrak) that are in the DAFT sheets.',
 'same-detector-types': 'SAME’s own conclusions about detectors, based on the smoke particle sizes it measured from the samples in the SAME table.',
 'same-smoke-spread': 'SAME’s own report: a simulation of how the smoke it measured would spread.',
 'same-lampwick-particle-size': 'SAME’s lamp-wick samples (a sample type in the SAME and SAME-R tables), at the air speeds those tables list.',
 'samer-size-distribution': 'SAME-R’s own aged lamp-wick smoke. Aging time is the “Net aging time” column of the SAME-R table.',
 'smokesim-size-mg-eg': 'The report behind this record’s simulation files: the size distributions match the PSD .dat files on this record.',
 'smokesim-fields': 'The report behind this record’s simulation files: smoke fields for the same cases.',
 'coolflame-methanol-model': 'The dissertation hosted on this record. These model results use the same kind of droplets as the FLEX data it analyses.',
 'coolflame-fsr': 'The dissertation hosted on this record. Model against measurement for a droplet like those in the FLEX tests it analyses.',
 'coolflame-ozone': 'The dissertation hosted on this record. A model result for the ozone effect, not a measurement.',
 'saffire-fabric-spread': 'Saffire-I’s own results: the fabric sample listed in the Saffire-I table.',
 'saffire-oxygen': 'Saffire-I’s own measurements from the same flight.',
 'saffire-montage': 'Saffire-I’s own images from the same flight.',
 'saffire2-spread-vs-pressure': 'Saffire-II’s own result (the orange point) next to ground tests at different pressures.',
 'flex-methanol-extinction': 'FLEX’s own tests. The plotted quantities are the “Initial droplet diameter” and “Visible flame extinction diameter” columns of the FLEX table.',
 'cool-flame-extinction-o2': 'FLEX droplet tests analysed by the FLEX team; the same extinction diameter as in the FLEX table.',
 'slice-soot-temperature': 'SLICE’s own flames; the table lists only their dates and fuels.',
}

LEVEL_NOTE = {D: 'From this experiment', R: 'From a related experiment'}


def render(pdf_path, page, crop, trim, out):
    d = fitz.open(pdf_path)
    pg = d[page - 1]
    W, H = pg.rect.width, pg.rect.height
    if crop.startswith('box:'):
        x0, y0, x1, y1 = [float(v) for v in crop[4:].split(',')]
        reg = fitz.Rect(x0 * W, y0 * H, x1 * W, y1 * H)
    else:
        prefix = crop[4:]
        blocks = pg.get_text('blocks')
        cap = [fitz.Rect(b[:4]) for b in blocks if b[4].strip().replace('\n', ' ').startswith(prefix)]
        if not cap:
            raise SystemExit(f'caption not found: {prefix} on page {page} of {pdf_path}')
        cap = cap[0]
        rects = [fitz.Rect(r) for r in pg.cluster_drawings()] + [fitz.Rect(i['bbox']) for i in pg.get_image_info()]
        above = [fitz.Rect(r.x0, r.y0, r.x1, min(r.y1, cap.y0)) for r in rects if r.y0 < cap.y0 - 20 and r.y1 <= cap.y1 + 4 and r.height > 50 and r.width > 90]
        if not above:
            raise SystemExit(f'no figure above caption {prefix}')
        fig = max(above, key=lambda r: r.y1)
        for r in above:
            if r.y1 > fig.y0 - 4 and r.y0 < fig.y1 + 4:
                fig |= r
        big = fig + (-30, -14, 30, 20)
        for b in blocks:
            br = fitz.Rect(b[:4])
            if br.intersects(big) and br.y1 < cap.y0 - 1 and br.height < 60:
                fig |= br
        reg = fitz.Rect(min(fig.x0, cap.x0) - 6, fig.y0 - 6, max(fig.x1, cap.x1) + 6, cap.y1 + 6) & pg.rect
    reg = fitz.Rect(reg.x0, reg.y0 + trim[0] * reg.height, reg.x1, reg.y1 - trim[1] * reg.height)
    z = min(1500 / reg.width, 4)
    pix = pg.get_pixmap(matrix=fitz.Matrix(z, z), clip=reg)
    im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    im.thumbnail((1400, 1400))
    im.save(out, quality=86)


def rels(fn):
    return {p: {'level': lv, 'how': DIRECT_HOW.get(fn, how) if lv == D else how} for p, (lv, how) in REL[fn].items()}


def main():
    manifest = []
    for doc, page, crop, trim, psi, fn, heading, shows, why in F:
        path, title, home = PSI_DOCS[doc]
        render(os.path.join(RAW, path), page, crop, trim, os.path.join(OUT, fn + '.jpg'))
        manifest.append({'file': fn + '.jpg', 'source': 'psi', 'paper': title, 'page': page, 'psi_home': home, 'psi': list(REL[fn]),
                         'heading': heading, 'shows': shows, 'why': why, 'alt': heading + '. ' + shows, 'relations': rels(fn)})
    for nid, page, crop, trim, psi, fn, heading, shows, why in N:
        render(os.path.join(NTRS, nid + '.pdf'), page, crop, trim, os.path.join(OUT, fn + '.jpg'))
        manifest.append({'file': fn + '.jpg', 'source': 'ntrs', 'ntrs_id': nid, 'paper': NTRS_DOCS[nid], 'page': page, 'psi': list(REL[fn]),
                         'heading': heading, 'shows': shows, 'why': why, 'alt': heading + '. ' + shows, 'relations': rels(fn)})
    # Figures added earlier by hand from NTRS papers are kept as they are.
    path = os.path.join(ROOT, 'data', 'pub-figures.json')
    old = json.load(open(path)) if os.path.exists(path) else []
    new_files = {m['file'] for m in manifest}
    keep = [o for o in old if o['file'] not in new_files and o.get('ntrs_id')]
    for o in keep:
        o.setdefault('source', 'ntrs')
        stem = o['file'][:-4]
        o['psi'] = list(REL[stem])
        o['relations'] = rels(stem)
    json.dump(keep + manifest, open(path, 'w'), indent=1, ensure_ascii=False)
    print(len(keep), 'kept,', len(manifest), 'built')


main()
