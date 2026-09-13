import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

work = Path(__file__).resolve().parent
bundle = work.parent
meta = json.loads((bundle / 'metadata.json').read_text(encoding='utf-8-sig'))
downloads = Path('C:/Users/josem.000/Downloads/RadPrimer')
records = []
registry = {r['masterImageId']: r for r in meta['imageRegistry']}
for item in meta['downloadFiles']:
    p = downloads / item['filename']
    data = p.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        im.load()
        dimensions = list(im.size)
    expected = registry[item['masterImageId']]['visualEvidence']['sha256'] if item['variant'] == 'plain' else None
    if expected:
        assert digest == expected, (p.name, digest, expected)
    records.append(dict(filename=p.name, bytes=len(data), sha256=digest, dimensions=dimensions,
                        decodes=True, sourceVariant=item['variant'], masterImageId=item['masterImageId'],
                        matchesRegistryEvidence=(digest == expected) if expected else 'no annotated hash supplied'))
assert len(records) == 22
(work / 'download_media_integrity.json').write_text(json.dumps(records, indent=2)+'\n', encoding='utf-8')
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
for variant in ['plain', 'annotated']:
    subset = [r for r in records if r['sourceVariant'] == variant]
    out = Image.new('RGB', (1600, 1260), '#121212')
    draw = ImageDraw.Draw(out)
    for i, rec in enumerate(subset):
        x, y = (i % 4)*400, (i//4)*420
        draw.text((x+8, y+8), rec['masterImageId']+' '+variant, fill='white', font=font)
        with Image.open(downloads/rec['filename']) as im:
            im = im.convert('RGB')
            im.thumbnail((390,380))
            out.paste(im, (x+(400-im.width)//2, y+35))
    out.save(work/f'{variant}_contact_sheet.jpg', quality=94)
print(json.dumps({'verifiedDownloads':len(records),'plainHashesMatchingRegistry':sum(r['matchesRegistryEvidence'] is True for r in records),'contactSheets':2}))
