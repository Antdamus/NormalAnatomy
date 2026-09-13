from pathlib import Path
import json, re, hashlib, sqlite3, shutil, sys
sys.stdout.reconfigure(encoding='utf-8')
from pypdf import PdfReader
from PIL import Image
B=Path(__file__).resolve().parent.parent
R=B/'_codex_review'
pdf=Path('C:/Users/josem.000/Documents/junzi-shi-core-radiology-a-visual-approach-to.pdf')
doc=PdfReader(pdf).pages
terms=['hepatocellular carcinoma','hepatic adenoma','AAST liver','polycystic liver','HIDA','sulfur colloid','sulfur-colloid','amyloidosis']
pages=json.loads((R/'core_pages.json').read_text(encoding='utf-8')) if (R/'core_pages.json').exists() else []
if not pages:
    for i in list(range(81,170))+list(range(441,min(520,len(doc)))):
        t=doc[i].extract_text()
        if any(x in t.lower() for x in [q.lower() for q in terms]) and (80<i<170 or 440<i<520):
            pages.append({'pdfPage':i+1,'text':t})
(R/'core_pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pdfPageCount':len(doc),'candidatePages':[{'pdfPage':p['pdfPage'],'start':p['text'][:110]} for p in pages]},ensure_ascii=False))
m=json.loads((B/'metadata.json').read_text(encoding='utf-8-sig'))
rows=[r.split('\t') for r in (B/'generated_cards.tsv').read_text(encoding='utf-8-sig').splitlines() if r]
names=sorted(set(re.findall(r'<img\s+src="([^"]+)"',' '.join(v for r in rows for v in r))))
dirs=[B/'media',Path('C:/Users/josem.000/Downloads/RadPrimer'),Path('C:/Users/josem.000/AppData/Roaming/Anki2/User 1/collection.media')]
df={f['filename']:f for f in m['downloadFiles']}
media=[]
for n in names:
    hits=[]
    for d in dirs:
        p=d/n
        try:
            exists=p.is_file()
        except PermissionError as err:
            hits.append({'path':str(p),'decoded':False,'error':'accessDenied'})
            continue
        if exists:
            try:
                with Image.open(p) as im: im.load(); size=list(im.size); fmt=im.format
                hits.append({'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'dimensions':size,'format':fmt,'decoded':True})
            except Exception as err: hits.append({'path':str(p),'decoded':False,'error':str(err)})
    record={'filename':n,'role':'captionIcon' if n.startswith('arrow_') else 'diagnosticImage','inDownloadFiles':n in df,'files':hits,'available':any(h['decoded'] for h in hits)}
    if record['role']=='captionIcon' and record['available']:
        src=Path(next(h['path'] for h in hits if h['decoded']))
        dest=B/'media'/n
        dest.parent.mkdir(exist_ok=True)
        if src.resolve()!=dest.resolve(): shutil.copy2(src,dest)
        record['recoveredFile']='media/'+n
        record['recoveredSha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
    media.append(record)
(R/'media_audit.json').write_text(json.dumps(media,indent=2),encoding='utf-8')
print(json.dumps({'mediaReferences':len(media),'available':sum(e['available'] for e in media),'missing':[e['filename'] for e in media if not e['available']],'diagnosticMatches':sum(e['inDownloadFiles'] for e in media)}))
try:
    con=sqlite3.connect('file:C:/Users/josem.000/AppData/Roaming/Anki2/User 1/collection.anki2?mode=ro',uri=True)
    models=json.loads(con.execute('SELECT models FROM col').fetchone()[0])
    matching=[v for v in models.values() if v.get('name')=='core_rad_notetype_v2']
    data={'status':'read','models':matching}
    if not matching:
        data['schema']=con.execute("SELECT name,sql FROM sqlite_master WHERE name IN ('notetypes','templates','fields')").fetchall()
    (R/'anki_notetype_check.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
except Exception as err:
    (R/'anki_notetype_check.json').write_text(json.dumps({'status':'unavailable','error':str(err)},indent=2),encoding='utf-8')
