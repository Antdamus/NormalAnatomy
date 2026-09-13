from pathlib import Path
import csv,json,re,collections
B=Path(__file__).resolve().parent.parent
R=B/'_codex_review'
fields=['Clinical_Context','Image','Image_Annotated','Question','Most_Likely_Diagnosis','Entity_Label','Differential_Q','Differentials','Imaging_Differentiation','Original_Caption','Mechanism_Q','Mechanism','Boards_Trap_Q','Boards_Trap','High_Yield_Q','High_Yield_A','Radiopaedia_Link','Radiopaedia_Case_Context','Radiopaedia_Case_Summary','Radiopaedia_Case_Differential','summary','Tags']
txt=(B/'generated_cards.tsv').read_text(encoding='utf-8-sig')
rows=list(csv.reader(txt.splitlines(),delimiter='\t'))
print('Rows',len(rows),'widths',collections.Counter(map(len,rows)))
assert all(len(r)==22 for r in rows)
records=[dict(zip(fields,r)) for r in rows]
(R/'original_rows.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
out=[]
for i,r in enumerate(records,1):
    out.append(f'ROW {i}')
    out.extend(f'{k}: {v}' for k,v in r.items() if v and k!='summary')
    out.append('')
(R/'rows_for_review.txt').write_text('\n'.join(out),encoding='utf-8')
print('Trigger counts',{k:sum(bool(r[k]) for r in records) for k in ['Question','Differential_Q','Differentials','Mechanism_Q','Boards_Trap_Q','High_Yield_Q']})
print('Summary variants',len({r['summary'] for r in records}),'lengths',sorted({len(r['summary']) for r in records}))
for i,s in enumerate(dict.fromkeys(r['summary'] for r in records),1): (R/f'summary_{i}.html').write_text(s,encoding='utf-8')
print('Contexts',[(i,r['Clinical_Context']) for i,r in enumerate(records,1)])
m=json.loads((B/'metadata.json').read_text(encoding='utf-8-sig'))
for key in ['selectedImages','masterImageIds','sourceQualifiedImages','cases','downloadFiles','imageRegistry','masterSource']:
    value=m.get(key)
    print(key,'type',type(value).__name__,'length',len(value) if value else 0)
    print(json.dumps(value[:1] if isinstance(value,list) else value,ensure_ascii=False)[:2500])
s=(B/'source_package.txt').read_text(encoding='utf-8-sig')
print('Source markers',[(match.start(),match.group(0)) for match in re.finditer(r'^===.*?===$',s,re.M)])
print('Bookkeeping matches',[(i,k) for i,r in enumerate(records,1) for k,v in r.items() if re.search(r'Image references?:|Source image links?:|Source image link\(s\):|thumbnail|https?://|\.jpg',v,re.I) and k not in ['Image','Image_Annotated','summary','Radiopaedia_Link']])
