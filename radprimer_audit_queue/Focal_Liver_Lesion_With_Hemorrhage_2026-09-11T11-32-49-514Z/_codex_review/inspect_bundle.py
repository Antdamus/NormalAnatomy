from pathlib import Path
import json,re,collections
B=Path(__file__).resolve().parent.parent
fields='Clinical_Context Image Image_Annotated Question Most_Likely_Diagnosis Entity_Label Differential_Q Differentials Imaging_Differentiation Original_Caption Mechanism_Q Mechanism Boards_Trap_Q Boards_Trap High_Yield_Q High_Yield_A Radiopaedia_Link Radiopaedia_Case_Context Radiopaedia_Case_Summary Radiopaedia_Case_Differential summary Tags'.split()
rows=[r.split('\t') for r in (B/'generated_cards.tsv').read_text(encoding='utf-8-sig').splitlines() if r]
assert all(len(r)==22 for r in rows)
m=json.loads((B/'metadata.json').read_text(encoding='utf-8-sig'))
print(json.dumps({'rows':len(rows),'fieldCounts':{f:sum(bool(r[i]) for r in rows) for i,f in enumerate(fields)},'uniqueSummaries':len({r[20] for r in rows}),'cases':m['cases'],'imageRegistryCount':len(m['imageRegistry'])}))
out=[]
for n,r in enumerate(rows,1):
    out.append({'row':n,**{f:v for f,v in zip(fields,r) if v and f not in ['Image','Image_Annotated','Original_Caption','summary']},'imageIds':re.findall(r'SDX-\d+',r[1]),'originalCaptionChars':len(r[9])})
(B/'_codex_review'/'rows_for_review.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
reg={e['plainFilename']:e for e in m['imageRegistry']}
caption_checks=[]
for n,r in enumerate(rows,1):
    imgs=re.findall(r'<img src="([^"]+)"',r[1]); caps=re.findall(r'<div class="stackCap">(.*?)</div>',r[2],re.S)
    if not imgs:continue
    expected=[reg[p]['caption'] for p in imgs]
    caption_checks.append({'row':n,'imageCount':len(imgs),'stackCaptionCount':len(caps),'allStackCaptionsExact':caps==expected,'originalCaptionEmpty':not r[9],'originalCaptionEqualsSingle':len(expected)==1 and r[9]==expected[0]})
print(json.dumps({'captionChecks':caption_checks},indent=2))
