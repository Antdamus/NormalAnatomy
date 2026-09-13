import json, pathlib, hashlib, re, shutil
from PIL import Image, ImageDraw, ImageOps
import numpy as np

B = pathlib.Path(__file__).resolve().parents[1]
M = json.loads((B/'metadata.json').read_text(encoding='utf-8'))
S = json.loads((B/'corebook_snapshot.json').read_text(encoding='utf-8'))
LIVE = pathlib.Path(r'C:\Users\josem.000\AppData\Roaming\Anki2\User 1\collection.media')
DOWNLOAD = pathlib.Path(r'C:\Users\josem.000\Downloads\RadPrimer')
OUT = B/'media'; OUT.mkdir(exist_ok=True)
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def dh(im):
    a=np.array(im.convert('L').resize((17,16)))
    return int(''.join('1' if v else '0' for v in (a[:,1:]>a[:,:-1]).flatten()),2)
assets=[]
for f in M['downloadFiles']:
    p=DOWNLOAD/f['filename']; im=Image.open(p); im.load()
    dest=OUT/p.name; shutil.copy2(p,dest)
    assert sha(p)==sha(dest)
    assets.append(dict(filename=p.name,source=str(p),sha256=sha(p),dimensions=list(im.size),decoded=True,role=f['variant'],masterImageId=f['masterImageId']))
icons=sorted({n for x in M['imageRegistry'] for n in re.findall(r'<img\s+src="([^"]+)"',x['caption'])})
missing=[]
for n in icons:
    candidates=[LIVE/n,DOWNLOAD/n]
    p=next((p for p in candidates if p.is_file()),None)
    if p is None: missing.append(n); continue
    im=Image.open(p);im.load();shutil.copy2(p,OUT/n); assert sha(p)==sha(OUT/n)
    assets.append(dict(filename=n,source=str(p),sha256=sha(p),dimensions=list(im.size),decoded=True,role='auxiliaryCaptionIcon'))
refs={}
for e in S['entries']:
    for n in e['imageSources']:refs.setdefault(n,[]).append(e['entryId'])
old=[]
for n,ids in refs.items():
    p=LIVE/n
    if not p.is_file():continue
    try:
        im=Image.open(p);im.load()
        if min(im.size)<100:continue
        old.append(dict(filename=n,entryIds=ids,hash=dh(im),dimensions=list(im.size)))
    except Exception:pass
comparisons=[]
for x in M['imageRegistry']:
    p=OUT/x['plainFilename'];h=dh(Image.open(p)); nearest=sorted(old,key=lambda a:(h^a['hash']).bit_count())[:2]
    comparisons.append(dict(masterImageId=x['masterImageId'],filename=p.name,nearest=[dict(filename=a['filename'],entryIds=a['entryIds'],dimensions=a['dimensions'],dhashDistance=(h^a['hash']).bit_count()) for a in nearest]))
close=[c for c in comparisons if c['nearest'][0]['dhashDistance']<=35]
for start in range(0,len(close),6):
    chunk=close[start:start+6]; canvas=Image.new('RGB',(1350,430*len(chunk)),'#eeeeee');d=ImageDraw.Draw(canvas)
    for r,c in enumerate(chunk):
        paths=[OUT/c['filename']]+[LIVE/a['filename'] for a in c['nearest']]
        labels=[c['masterImageId']]+[a['filename'][:45]+'\nd='+str(a['dhashDistance'])+' '+','.join(a['entryIds'])[:45] for a in c['nearest']]
        for col,(p,label) in enumerate(zip(paths,labels)):
            im=Image.open(p).convert('RGB');im.thumbnail((440,370));canvas.paste(im,(col*450,r*430+50));d.text((col*450+4,r*430+5),label,fill='black')
    canvas.save(B/'_codex_review'/f'live_comparison_{start//6+1}.jpg')
for start in range(0,48,12):
    canvas=Image.new('RGB',(1440,390*3),'#eeeeee');d=ImageDraw.Draw(canvas)
    for j,x in enumerate(M['imageRegistry'][start:start+12]):
        r,c=divmod(j,4);im=Image.open(OUT/x['annotatedFilename']).convert('RGB');im.thumbnail((350,350));canvas.paste(im,(c*360,r*390+30));d.text((c*360+5,r*390+5),x['displayLabel'],fill='black')
    canvas.save(B/'_codex_review'/f'annotated_sheet_{start//12+1}.jpg')
(B/'_codex_review/media_audit.json').write_text(json.dumps(dict(assets=assets,missingCaptionIcons=missing,diagnosticCount=96,iconCount=len(icons),nearestLiveComparisons=comparisons),indent=2),encoding='utf-8')
print(json.dumps(dict(assets=len(assets),missingIcons=missing,liveImageCount=len(old),comparisonSheets=(len(close)+5)//6,close=close),indent=2))
