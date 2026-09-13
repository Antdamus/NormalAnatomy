from pathlib import Path
import json, hashlib, difflib
from PIL import Image, ImageOps, ImageDraw, ImageFont

B = Path(__file__).resolve().parent.parent
R = B / '_codex_review'
def read(name): return json.loads((B/name).read_text(encoding='utf-8-sig'))
m = read('metadata.json')
rp = read('RadPrimer_metadata.json')
sd = read('STATdx_metadata.json')
ev = read('image_evidence_manifest.json')
assert m['canonicalHierarchy'] == rp['breadcrumbTrail']
print('Canonical:', m['canonicalHierarchy'], m['canonicalDeckPath'])
for label, s in [('RadPrimer', rp), ('STATdx', sd)]:
    embedded = next(x for x in m['sources'] if x['sourceLabel'] == label)
    print(label, 'registry count', len(s['imageRegistry']), 'embedded registry equal', embedded['imageRegistry'] == s['imageRegistry'], 'embedded metadata equal', embedded['metadata'] == s)
    print(label, 'source:', embedded['sourceUrl'], 'anki:', s['anki'])
rptext = (B/'RadPrimer_source_package.txt').read_text(encoding='utf-8-sig')
sdtext = (B/'STATdx_source_package.txt').read_text(encoding='utf-8-sig')
def article(t): return t.split('=== ARTICLE ===')[1].split('=== IMAGES')[0].strip()
print('Article body equal:', article(rptext) == article(sdtext))
print('\n'.join(difflib.unified_diff(article(rptext).splitlines(), article(sdtext).splitlines(), fromfile='RadPrimer article', tofile='STATdx article')))
audit=[]
for e in rp['imageRegistry']+sd['imageRegistry']:
    p=B/e['visualEvidence']['evidenceFilename']
    manifest=next(x for x in ev['entries'] if x['masterImageId']==e['masterImageId'])
    assert manifest['evidenceFilename']==e['visualEvidence']['evidenceFilename'] and manifest['imageId']==e['imageId']
    with Image.open(p) as im:
        im.load()
        audit.append({'masterImageId':e['masterImageId'],'imageId':e['imageId'],'evidenceFilename':e['visualEvidence']['evidenceFilename'], 'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pixelSha256':hashlib.sha256(im.convert('RGB').tobytes()).hexdigest(),'width':im.width,'height':im.height,'format':im.format,'bytes':p.stat().st_size})
am={x['masterImageId']:x for x in audit}
pairs=[]
for e in rp['imageRegistry']:
    matches=[s for s in sd['imageRegistry'] if s['imageId']==e['imageId']]
    pairs.append((e,matches))
    print('PAIR', e['masterImageId'], [(s['masterImageId'], am[e['masterImageId']]['sha256']==am[s['masterImageId']]['sha256'], (am[e['masterImageId']]['width'],am[e['masterImageId']]['height']), (am[s['masterImageId']]['width'],am[s['masterImageId']]['height'])) for s in matches])
supp=[s for s in sd['imageRegistry'] if s['imageId'] not in {e['imageId'] for e in rp['imageRegistry']}]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
def sheet(entries,name,cols=2):
    cw,ch=640,430
    rows=(len(entries)+cols-1)//cols
    out=Image.new('RGB',(cols*cw,rows*ch),(22,24,29)); d=ImageDraw.Draw(out)
    for n,e in enumerate(entries):
        x,y=(n%cols)*cw,(n//cols)*ch
        a=am[e['masterImageId']]
        d.text((x+10,y+6),f"{e['masterImageId']} | {e['sourceLabel']} image {e['sourceImageNumber']} | {a['width']} x {a['height']}",font=font,fill='white')
        with Image.open(B/e['visualEvidence']['evidenceFilename']) as im:
            thumb=ImageOps.contain(im.convert('RGB'),(cw-20,ch-66))
            out.paste(thumb,(x+(cw-thumb.width)//2,y+38+(ch-66-thumb.height)//2))
        d.text((x+10,y+ch-24),e['imageId'],font=small,fill=(175,180,190))
    out.save(R/name)
for i in range(0,len(pairs),4):
    entries=[]
    for e,ms in pairs[i:i+4]:
        assert len(ms)==1
        entries.extend([e,ms[0]])
    sheet(entries,f'paired_{i//4+1:02}.jpg')
for i in range(0,len(supp),6): sheet(supp[i:i+6],f'supplemental_{i//6+1:02}.jpg')
(R/'image_file_audit.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
print('Supplemental:', [e['masterImageId'] for e in supp])
print('All',len(audit),'evidence files decoded; contact sheets',len(list(R.glob('*.jpg'))))
