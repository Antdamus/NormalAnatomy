from pathlib import Path
from datetime import datetime, timezone
import csv, hashlib, json, re, shutil
from PIL import Image

B = Path(__file__).resolve().parent.parent
R = B / '_codex_review'
backup = R / 'before_caption_repair'
backup.mkdir(exist_ok=True)
for relative in ['corrected_cards.tsv', 'corrected_cards_anki_import.tsv', 'audit_report.md', '_codex_audit_done.txt',
                 '_codex_review/correction_data.json', '_codex_review/validation_results.json']:
    source = B / relative
    target = backup / source.name
    if not target.exists():
        shutil.copy2(source, target)

def read_rows(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.reader(f, delimiter='\t'))

data = json.loads((R / 'correction_data.json').read_text(encoding='utf-8-sig'))
fields = data['fields']
source_rows = [dict(zip(fields, row)) for row in read_rows(B / 'generated_cards.tsv')]
original_by_context = {row['Clinical_Context']: row for row in source_rows}
before = [dict(zip(fields, row)) for row in read_rows(backup / 'corrected_cards.tsv')]
repaired = [dict(row) for row in before]
metadata = json.loads((B / 'metadata.json').read_text(encoding='utf-8-sig'))
registry = {row['masterImageId']: row for row in metadata['imageRegistry']}
downloads = {row['filename']: row for row in metadata['downloadFiles']}
ledger = []
source_caption_count = 0
for old, row in zip(before, repaired):
    if not row['Image']:
        continue
    source = original_by_context[row['Clinical_Context']]
    for name in ['Image_Annotated', 'Original_Caption']:
        row[name] = source[name]
    assert row['Image'] == source['Image']
    blocks = re.findall(r'<div class="stackItem"><img src="([^"]+)"><div class="stackCap">(.*?)</div></div>', row['Image_Annotated'])
    assert len(blocks) == len(re.findall(r'<img\b', row['Image']))
    for filename, caption in blocks:
        mid = downloads[filename]['masterImageId']
        assert caption == registry[mid]['captionOriginal'], (mid, 'caption mismatch')
        assert caption in row['Original_Caption'], (mid, 'missing original caption')
        source_caption_count += 1
    changed = [name for name in fields if old[name] != row[name]]
    assert set(changed) <= {'Image_Annotated', 'Original_Caption'}
    ledger.append({'clinicalContext': row['Clinical_Context'], 'changedFields': changed,
                   'captionBlocks': len(blocks), 'rawSourceCaptionEquality': True})
assert len(ledger) == 26 and source_caption_count == 40
assert sum(not row['Image'] for row in repaired) == 38
assert all(old == new for old, new in zip(before, repaired) if not old['Image'])
data['rows'] = repaired
data['counts'].pop('unmappedArrowReferencesRemoved', None)
data['counts']['originalCaptionArrowReferencesPreserved'] = 122
for entry in data['rowAudit']:
    entry['changes'] = [change for change in entry['changes'] if 'unmapped arrow-icon' not in change['reason']]
data['captionRepair'] = {'scope': 'Only Image_Annotated and Original_Caption on the 26 image notes',
                         'sourceCaptionBlocksPreservedExactly': 40, 'nonImageNotesUnchanged': 38,
                         'arrowReferencesRestored': 122, 'captionIconFiles': 7}
(R / 'correction_data.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

media_dir = B / 'media'
media_dir.mkdir(exist_ok=True)
diagnostic = json.loads((R / 'media_audit.json').read_text(encoding='utf-8-sig'))
for entry in diagnostic:
    source = Path(entry['path'])
    if not source.exists():
        source = media_dir / source.name
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['sha256']
    if source.resolve() != (media_dir / source.name).resolve():
        shutil.copy2(source, media_dir / source.name)
caption_refs = re.findall(r'<img\b[^>]*\bsrc="(arrow_[^"]+)"', '\n'.join(row[name] for row in repaired for name in ['Image_Annotated', 'Original_Caption']))
assert len(caption_refs) == 122 and len(set(caption_refs)) == 7
icon_manifest = []
for filename in sorted(set(caption_refs)):
    asset = media_dir / filename
    with Image.open(asset) as icon:
        icon.load()
        assert icon.size == (16, 16) and icon.format == 'PNG'
        dimensions = list(icon.size)
    icon_manifest.append({'filename': filename, 'role': 'originalCaptionAnnotation',
                          'sourcePath': str(Path('C:/Users/josem.000/AppData/Roaming/Anki2/User 1/collection.media') / filename),
                          'bundlePath': 'media/' + filename, 'bytes': asset.stat().st_size,
                          'dimensions': dimensions, 'sha256': hashlib.sha256(asset.read_bytes()).hexdigest(),
                          'referenceCount': caption_refs.count(filename), 'modified': False})
(B / 'caption_icon_integrity.json').write_text(json.dumps(icon_manifest, indent=2) + '\n', encoding='utf-8', newline='\n')
(R / 'caption_repair_ledger.json').write_text(json.dumps({'repairedAt': datetime.now(timezone.utc).isoformat(),
    'scope': data['captionRepair'], 'notes': ledger}, indent=2) + '\n', encoding='utf-8', newline='\n')

# The archived audit helper must also preserve raw caption HTML on any later rerun.
script = R / 'prepare_corrections.py'
text = script.read_text(encoding='utf-8-sig')
start = text.index('glyph_re=')
end = text.index('output=[]; origins=[]', start)
text = text[:start] + text[end:]
start = text.index('    for field in fields:\n')
end = text.index("    row['summary']=summary", start)
text = text[:start] + '''    # Source captions and their inline annotation media are immutable.
    for field in fields:
        if field in {'summary', 'Original_Caption', 'Image_Annotated'}: continue
        row[field]=row[field].replace('<=','\u2264')
    for field in ['Original_Caption', 'Image_Annotated']:
        assert row[field] == original[n-1][field]
''' + text[end:]
text = text.replace("'unmappedArrowReferencesRemoved':glyphs_removed", "'originalCaptionArrowReferencesPreserved':122")
text = text.replace('assert glyphs_removed==122', "assert sum(len(re.findall(r'<img[^>]+arrow_', r[f])) for r in output for f in ['Image_Annotated','Original_Caption'])==122")
script.write_text(text, encoding='utf-8', newline='\n')
print(json.dumps(data['captionRepair']))
