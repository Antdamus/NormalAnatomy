from pathlib import Path
import json, hashlib
from PIL import Image, ImageOps, ImageDraw, ImageFont

B = Path(__file__).resolve().parent.parent
W = B / '_codex_review'
def read(name): return json.loads((B / name).read_text(encoding='utf-8-sig'))
meta = read('metadata.json')
rp, sd = [read(n + '_metadata.json') for n in ('RadPrimer', 'STATdx')]
ev = read('image_evidence_manifest.json')
assert meta['imageEvidence'] == ev
for source, single in zip(meta['sources'], (rp, sd)):
    assert source['metadata'] == single
    assert source['imageRegistry'] == single['imageRegistry']
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
records = {}
images = {}
for entry in ev['entries']:
    p = B / entry['evidenceFilename']
    with Image.open(p) as src:
        src.load()
        im = src.convert('RGB')
    images[entry['masterImageId']] = im
    records[entry['masterImageId']] = {
        'masterImageId': entry['masterImageId'], 'imageId': entry['imageId'],
        'evidenceFilename': entry['evidenceFilename'], 'dimensions': list(im.size),
        'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
        'rgbPixelSha256': hashlib.sha256(im.tobytes()).hexdigest(), 'decodedSuccessfully': True
    }
by_id = {e['imageId']: e for e in sd['imageRegistry']}
pairs = []
for r in rp['imageRegistry']:
    s = by_id.get(r['imageId'])
    if s:
        a, b = records[r['masterImageId']], records[s['masterImageId']]
        pairs.append({'radPrimerImageId':r['masterImageId'],'statdxImageId':s['masterImageId'],
                      'stableImageId':r['imageId'],'sameFileHash':a['sha256']==b['sha256'],
                      'sameRgbPixelHash': a['dimensions']==b['dimensions'] and a['rgbPixelSha256']==b['rgbPixelSha256']})
def sheet(ids, name, cols=2):
    tw, th = 550, 420
    rows = (len(ids) + cols - 1) // cols
    canvas = Image.new('RGB',(cols*tw, rows*th),(25,25,25))
    draw = ImageDraw.Draw(canvas)
    for i, mid in enumerate(ids):
        x,y = (i%cols)*tw,(i//cols)*th
        im=ImageOps.contain(images[mid],(tw-12,th-42))
        canvas.paste(im,(x+(tw-im.width)//2,y+36+(th-42-im.height)//2))
        draw.text((x+10,y+7),f'{mid}   {records[mid]["dimensions"][0]} x {records[mid]["dimensions"][1]}',font=font,fill='white')
    canvas.save(W/name)
for start in range(0,len(pairs),4):
    name=f'comparison_{start//4+1:02}.jpg'
    batch=pairs[start:start+4]
    sheet([mid for p in batch for mid in (p['radPrimerImageId'],p['statdxImageId'])],name)
    for pair in batch: pair['contactSheet']='_codex_review/'+name
sheet(['SDX-02','SDX-03','SDX-06','SDX-07','SDX-21','SDX-22','SDX-23'],'supplement_context.jpg')
result={'metadataConsistency':'passed','files':list(records.values()),'stableIdCandidatePairs':pairs,
        'supplementalStatdxImages':[e['masterImageId'] for e in sd['imageRegistry'] if e['imageId'] not in {r['imageId'] for r in rp['imageRegistry']}]}
(W/'image_file_audit.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'filesDecoded':len(records),'stableIdCandidatePairs':len(pairs),'byteIdenticalPairs':sum(p['sameFileHash'] for p in pairs),'pixelIdenticalPairs':sum(p['sameRgbPixelHash'] for p in pairs),'supplements':result['supplementalStatdxImages'],'dimensions':{k:r['dimensions'] for k,r in records.items()}},indent=2))
