from pathlib import Path
from datetime import datetime, timezone
from copy import deepcopy
import csv, hashlib, io, json, re, shutil
from PIL import Image

B=Path(__file__).resolve().parent.parent; R=B/'_codex_review'; ROOT=B.parent.parent
BACKUP=R/'before_caption_repair'; BACKUP.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def writejson(p,data):p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for filename in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md','_codex_audit_done.txt']:
    if not (BACKUP/filename).exists():shutil.copy2(B/filename,BACKUP/filename)
for filename in ['validation_results.json','corrected_rows.json']:
    if not (BACKUP/filename).exists():shutil.copy2(R/filename,BACKUP/filename)
m=json.loads((B/'metadata.json').read_text(encoding='utf-8'))
master=ROOT/'master_source_queue/Widespread_Low_Attenuation_Within_Liver_2026-09-09T02-43-21-860Z'
sd=json.loads((master/'STATdx_metadata.json').read_text(encoding='utf-8'))
source={e['masterImageId']:e for e in sd['imageRegistry']}
reg={e['plainFilename']:e for e in m['imageRegistry']}
baseline=list(csv.reader((BACKUP/'corrected_cards.tsv').open(encoding='utf-8',newline=''),delimiter='\t'))
assert len(baseline)==43 and all(len(r)==22 for r in baseline)
rows=deepcopy(baseline);ledger=[];icon_counts={}
stack_re=re.compile(r'(<div class="stackItem"><img src="([^"]+)"><div class="stackCap">)(.*?)(</div></div>)',re.S)
for index,row in enumerate(rows):
    names=re.findall(r'<img\b[^>]*src="([^"]+)"',row[1])
    if not names:continue
    entries=[reg[n] for n in names];caps=[]
    for e in entries:
        cap=source[e['masterImageId']]['caption']
        assert cap==e.get('captionOriginal',e['caption'])
        caps.append(cap)
        for name in re.findall(r'<img\b[^>]*src="([^"]+)"',cap):icon_counts[name]=icon_counts.get(name,0)+1
    stacks=list(stack_re.finditer(row[2]));assert len(stacks)==len(caps)
    replacement=[];cursor=0
    for match,e,cap in zip(stacks,entries,caps):
        assert match[2]==e['annotatedFilename']
        replacement.extend([row[2][cursor:match.start()],match[1],cap,match[4]])
        cursor=match.end()
    replacement.append(row[2][cursor:]);row[2]=''.join(replacement)
    row[9]='<br>'.join(caps)
    assert stack_re.findall(row[2]) and [s[2] for s in stack_re.findall(row[2])]==caps
    assert row[9]=='<br>'.join(caps)
    ledger.append({'outputRow':index+1,'context':row[0],'imageIds':[e['masterImageId'] for e in entries],
      'changedFields':['Image_Annotated','Original_Caption'],'sourceCaptionSha256':[hashlib.sha256(c.encode('utf-8')).hexdigest() for c in caps]})
    assert all(a==b for i,(a,b) in enumerate(zip(row,baseline[index])) if i not in [2,9])
assert len(ledger)==18
assert all(row==baseline[i] for i,row in enumerate(rows) if not row[1])

# Recover exact original auxiliary media from a verified prior bundle; never redraw icons.
prior=ROOT/'radprimer_audit_queue/Focal_Hypervascular_Liver_Lesion_2026-09-09T01-07-48-422Z'
trusted={e['filename']:e for e in json.loads((prior/'caption_icon_integrity.json').read_text(encoding='utf-8'))}
media=B/'media';media.mkdir(exist_ok=True);integrity=[];icons=[]
for name,count in sorted(icon_counts.items()):
    src=prior/'media'/name;assert sha(src)==trusted[name]['sha256']
    shutil.copy2(src,media/name);im=Image.open(media/name);im.load()
    entry={'filename':name,'role':'originalCaptionAnnotation','sourcePath':str(src),
      'originalAssetProvenance':trusted[name]['sourcePath'],'bundlePath':'media/'+name,'sha256':sha(media/name),
      'dimensions':list(im.size),'bytes':(media/name).stat().st_size,'referenceCountPerCaptionField':count,
      'referenceCountInFullTSV':count*2,'modified':False}
    icons.append(entry);integrity.append(entry)
download=Path('C:/Users/josem.000/Downloads/RadPrimer')
old_media={e['filename']:e for e in json.loads((R/'media_audit.json').read_text(encoding='utf-8'))}
anki_media=Path('C:/Users/josem.000/AppData/Roaming/Anki2/User 1/collection.media')
for f in m['downloadFiles']:
    candidates=[download/f['filename'],media/f['filename'],anki_media/f['filename']]
    src=next((p for p in candidates if p.is_file() and sha(p)==old_media[f['filename']]['sha256']),None)
    assert src is not None, 'Exact original image not found: '+f['filename']
    if src.resolve()!=(media/f['filename']).resolve():shutil.copy2(src,media/f['filename'])
    im=Image.open(media/f['filename']);im.load()
    assert sha(src)==sha(media/f['filename'])
    integrity.append({'filename':f['filename'],'role':'diagnosticImage','variant':f['variant'],'masterImageId':f['masterImageId'],
      'sourcePath':str(src),'bundlePath':'media/'+f['filename'],'sha256':sha(src),'dimensions':list(im.size),'modified':False})
assert len(integrity)==50
def serialize(records):
    buf=io.StringIO(newline='');csv.writer(buf,delimiter='\t',lineterminator='\n').writerows(records);return buf.getvalue()
tsv=serialize(rows);assert list(csv.reader(io.StringIO(tsv),delimiter='\t'))==rows
image_rows=[r for r in rows if r[1]]
header='\n'.join(['#separator:tab','#html:true','#notetype:'+m['anki']['noteType'],'#deck:'+m['anki']['deckName'],'#tags column:22'])+'\n'
for name,content in [('corrected_cards.tsv',tsv),('corrected_cards_anki_import.tsv',header+tsv),
 ('corrected_image_cards.tsv',serialize(image_rows)),('corrected_image_cards_anki_import.tsv',header+serialize(image_rows))]:
    (B/name).write_text(content,encoding='utf-8',newline='\n')
fields=json.loads((R/'row_audit.json').read_text(encoding='utf-8'))['fields']
writejson(R/'corrected_rows.json',[dict(zip(fields,r)) for r in rows])
writejson(R/'caption_repair_ledger.json',ledger);writejson(B/'caption_icon_integrity.json',icons);writejson(B/'media_integrity.json',integrity)

now=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
report=f'''# Caption repair: Widespread Low Attenuation Within Liver

Only the two caption fields on the 18 image notes were repaired. All 25 non-image notes, every Clinical_Context/ID, the front images, image grouping/order, questions, answers, differentials and repeated summaries are unchanged.

The prior audit incorrectly stripped inline arrow icons and altered caption spacing and wording. The earlier master-source teachingCaption also differed from the original. This repair uses the raw original STATdx caption, verified character-for-character against the source metadata and the audit metadata. It does not use the cleaned teachingCaption or the already damaged generated TSV.

All 23 individual captions now match the original source exactly in each Image_Annotated stackCap, including HTML, spaces, punctuation and arrow tags. Original_Caption contains those same untouched captions in source image order, separated only by <br> for grouped images. There are {sum(icon_counts.values())} arrow references in each caption field ({sum(icon_counts.values())*2} total across both fields).

All four required original icons ({', '.join(sorted(icon_counts))}) were copied unchanged from the previously repaired Focal Hypervascular Liver Lesion bundle. Its recorded provenance identifies the original Anki collection.media assets; hashes were checked against that record before copying. All 46 diagnostic images were also copied unchanged into this bundle's media folder. No icon was redrawn or substituted. See caption_icon_integrity.json and media_integrity.json.

Use corrected_image_cards_anki_import.tsv for the 18-note image-only update. The complete 43-note corrected exports have also been updated consistently. The TSV alone does not copy media into Anki; the media folder contains every referenced diagnostic image and original arrow icon. No live Anki import or collection write was performed.

The pathology image rules, generated FULL_PROMPT and extension audit instructions were already fixed on September 9 to preserve original caption HTML exactly. This older audit preceded that fix. The local correction helper was also repaired so rerunning it cannot strip captions again; the validator now distinguishes auxiliary icons from diagnostic images and checks raw caption equality.

Completed: {now}. Exact-caption, unchanged-field, TSV-round-trip and media-hash checks passed. Browser preview validation is recorded separately in _codex_review/caption_preview_validation.json after rendering.
'''
(B/'caption_repair_report.md').write_text(report,encoding='utf-8',newline='\n')
prefix='# Caption repair completed\n\nOnly caption fields on the 18 image notes were repaired. All 25 non-image notes are unchanged. The initial caption cleanup was incorrect and is superseded. Use [corrected_image_cards_anki_import.tsv](corrected_image_cards_anki_import.tsv) for the image-only update. See [caption_repair_report.md](caption_repair_report.md) for exact-caption and original-arrow validation.\n\n---\n\n'
(B/'audit_report.md').write_text(prefix+(BACKUP/'audit_report.md').read_text(encoding='utf-8'),encoding='utf-8',newline='\n')
writejson(R/'caption_repair_validation.json',{'status':'passed','checkedAt':now,'totalNotes':43,'imageNotesRepaired':18,'nonImageNotesUnchanged':25,
 'originalCaptionsVerified':23,'captionArrowReferencesPerField':sum(icon_counts.values()),'captionArrowReferencesTotal':sum(icon_counts.values())*2,
 'originalIconFiles':4,'diagnosticFiles':46,'allNonCaptionFieldsUnchanged':True,'source':'Raw STATdx caption strings; source and audit metadata agree.'})
print(json.dumps({'imageNotesRepaired':18,'nonImageNotesUnchanged':25,'captionsPreservedExactly':23,'arrowReferencesPerField':sum(icon_counts.values()),'mediaFiles':len(integrity)}))
