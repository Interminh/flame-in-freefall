"""Renders the presentation PDF to one image per slide for presentation.html.

Usage (from the repo root):  python scripts/build-deck.py
Reads presentation/IGNIS_0G-presentation.pdf and writes presentation/slide-1.jpg, slide-2.jpg and so on,
plus presentation/tile-flame.jpg, a crop of the third flame photo on slide 2 for the home page tile.
Needs PyMuPDF (pip install pymupdf). Local build tooling only, not shipped with the site.
"""
import io
import pymupdf
from PIL import Image

PDF = 'presentation/IGNIS_0G-presentation.pdf'
WIDTH = 1600  # pixels, enough for a full-width slide on a large screen

doc = pymupdf.open(PDF)
for i, page in enumerate(doc, start=1):
    zoom = WIDTH / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
    pix.save(f'presentation/slide-{i}.jpg', jpg_quality=82)
    print(f'slide-{i}.jpg  {pix.width}x{pix.height}')
print(f'{doc.page_count} slides')

# Home page tile: the third flame photo on slide 2 (image xref 106), cropped to 4:5 from its native size.
pix = pymupdf.Pixmap(doc, 106)
if pix.n - pix.alpha > 3:
    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
photo = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
w, h = photo.size
target_w = round(h * 4 / 5)
left = (w - target_w) // 2
photo = photo.crop((left, 0, left + target_w, h)).resize((580, 725), Image.LANCZOS)
photo.save('presentation/tile-flame.jpg', quality=86)
print('tile-flame.jpg  580x725')
