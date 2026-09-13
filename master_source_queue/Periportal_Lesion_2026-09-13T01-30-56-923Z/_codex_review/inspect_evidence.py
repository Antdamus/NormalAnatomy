import hashlib
import json
from collections import defaultdict
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

B = Path(__file__).resolve().parent.parent
OUT = B / '_codex_review'
entries = json.loads((B / 'image_evidence_manifest.json').read_text(encoding='utf-8-sig'))['entries']
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
rows = []
for entry in entries:
    path = B / entry['evidenceFilename']
    with Image.open(path) as im:
        im.load()
        rgb = im.convert('RGB')
        gray = rgb.convert('L').resize((17, 16))
        pix = list(gray.getdata())
        bits = [pix[y*17+x] > pix[y*17+x+1] for y in range(16) for x in range(16)]
        dhash = sum(int(v) << i for i, v in enumerate(bits))
        rows.append({
            'masterImageId': entry['masterImageId'], 'imageId': entry['imageId'],
            'evidenceFilename': entry['evidenceFilename'], 'dimensions': list(im.size),
            'fileSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'decodedRgbSha256': hashlib.sha256(str(rgb.size).encode()+rgb.tobytes()).hexdigest(),
            'dhash256': f'{dhash:064x}', 'decodedSuccessfully': True,
        })
for source in ['RadPrimer', 'STATdx']:
    selected = [e for e in entries if e['sourceLabel'] == source]
    for page, start in enumerate(range(0, len(selected), 8), 1):
        batch = selected[start:start+8]
        sheet = Image.new('RGB', (1440, 410*((len(batch)+2)//3)), '#eeeef2')
        draw = ImageDraw.Draw(sheet)
        for i,e in enumerate(batch):
            x,y = (i%3)*480,(i//3)*410
            im = Image.open(B/e['evidenceFilename']).convert('RGB')
            im.thumbnail((470, 370))
            sheet.paste(im, (x+(480-im.width)//2,y+35+(370-im.height)//2))
            draw.text((x+10,y+6), f"{e['masterImageId']} | {source} image {e['sourceImageNumber']}", font=font, fill='black')
        sheet.save(OUT/f'{source}_contact_{page}.jpg',quality=95)
        print(OUT/f'{source}_contact_{page}.jpg')
identical = {}
for key in ['imageId','fileSha256','decodedRgbSha256']:
    grouped=defaultdict(list)
    for row in rows: grouped[row[key]].append(row['masterImageId'])
    identical[key]=[v for v in grouped.values() if len(v)>1]
distances=[]
for i,a in enumerate(rows):
    for b in rows[i+1:]:
        distance=(int(a['dhash256'],16)^int(b['dhash256'],16)).bit_count()
        distances.append({'a':a['masterImageId'],'b':b['masterImageId'],'distance':distance})
audit={'images':rows,'identicalGroups':identical,'nearestDhashPairs':sorted(distances,key=lambda x:x['distance'])[:25],
       'note':'Hashes and dHash screen candidates; no duplicate decision is made by this script. Visual review and case context are required.'}
(OUT/'image_evidence_audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'imageCount':len(rows),'identicalGroups':identical,'nearestDhashPairs':audit['nearestDhashPairs'][:12]},indent=2))
