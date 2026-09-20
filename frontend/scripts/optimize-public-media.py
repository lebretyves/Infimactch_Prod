"""Rebuild committed public media. Requires Pillow (WebP) and fonttools[woff].
Sources stay outside public/; crops reproduce the former CSS masks exactly.
Run from any directory: python frontend/scripts/optimize-public-media.py
"""
from pathlib import Path
from hashlib import sha256
import io, json
from PIL import Image
from fontTools.ttLib import TTFont
root = Path(__file__).resolve().parents[1]
source = root / 'assets-source'
output = root / 'public/images'
assets = {}
recipes = [
 ('accueil', 'maquette-accueil-source.png', (760, 230, 1392, 600), [320, 632], '(max-width: 599px) calc(100vw - 48px), (max-width: 899px) 92vw, (max-width: 1279px) 52vw, 646px'),
 ('soignantes', 'maquette-connexion-source.png', (56, 448, 712, 976), [320, 656], '(max-width: 767px) 300px, 480px'),
 ('coordination', 'coordination-soins-v1.jpg', None, [480, 960, 1536], '(max-width: 599px) calc(100vw - 48px), (max-width: 899px) 55vw, 560px'),
]
for key, filename, crop, widths, sizes in recipes:
 image = Image.open(source / filename).convert('RGB')
 if crop: image = image.crop(crop)
 variants = []
 for width in widths:
  height = round(image.height * width / image.width)
  resized = image.resize((width, height), Image.Resampling.LANCZOS)
  buffer = io.BytesIO(); resized.save(buffer, format='WEBP', quality=84, method=6)
  data = buffer.getvalue(); name = f'{key}-{width}-{sha256(data).hexdigest()[:12]}.webp'
  (output / name).write_bytes(data)
  variants.append({'src': '/images/' + name, 'width': width, 'height': height, 'bytes': len(data)})
 assets[key] = {'width': image.width, 'height': image.height, 'sizes': sizes, 'src': variants[-1]['src'], 'srcSet': ', '.join(f"{v['src']} {v['width']}w" for v in variants), 'variants': variants}
font = TTFont(source / 'PlusJakartaSans-Variable.ttf', recalcTimestamp=False)
font.flavor = 'woff2'; font.save(root / 'public/fonts/PlusJakartaSans-Variable.woff2')
(root / 'src/assets/public-media.json').write_text(json.dumps(assets, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: [{'width': v['width'], 'bytes': v['bytes']} for v in a['variants']] for key, a in assets.items()}))
