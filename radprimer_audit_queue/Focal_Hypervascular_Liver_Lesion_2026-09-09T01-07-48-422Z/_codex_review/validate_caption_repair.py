from pathlib import Path
from datetime import datetime, timezone
from html.parser import HTMLParser
import csv, hashlib, json, re
from PIL import Image

B = Path(__file__).resolve().parent.parent
R = B / '_codex_review'
backup = R / 'before_caption_repair'
data = json.loads((R / 'correction_data.json').read_text(encoding='utf-8-sig'))
metadata = json.loads((B / 'metadata.json').read_text(encoding='utf-8-sig'))
fields = data['fields']

def load(path, skip=0):
    with path.open(encoding='utf-8-sig', newline='') as f:
        for _ in range(skip): next(f)
        return list(csv.reader(f, delimiter='\t'))

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

matrix = load(B / 'corrected_cards.tsv')
before = load(backup / 'corrected_cards.tsv')
assert len(matrix) == len(before) == 64 and {len(row) for row in matrix} == {22}
assert matrix == [[row[field] for field in fields] for row in data['rows']]
headers = ['#separator:tab', '#html:true', '#notetype:' + metadata['anki']['noteType'],
           '#deck:' + metadata['anki']['deckName'], '#tags column:22']
for filename in ['corrected_cards_anki_import.tsv', 'corrected_image_cards_anki_import.tsv']:
    assert (B / filename).read_text(encoding='utf-8-sig').splitlines()[:5] == headers
assert load(B / 'corrected_cards_anki_import.tsv', 5) == matrix
image_index = fields.index('Image')
image_rows = [row for row in matrix if row[image_index]]
assert len(image_rows) == 26
assert load(B / 'corrected_image_cards_anki_import.tsv', 5) == image_rows
original = {row[0]: dict(zip(fields, row)) for row in load(B / 'generated_cards.tsv')}
registry = {row['masterImageId']: row for row in metadata['imageRegistry']}
downloads = {row['filename']: row for row in metadata['downloadFiles']}
caption_fields = {'Image_Annotated', 'Original_Caption'}
changed_notes = 0
source_caption_count = 0
for previous, current in zip(before, matrix):
    assert previous[0] == current[0]
    row = dict(zip(fields, current))
    changed = {fields[i] for i, (a, b) in enumerate(zip(previous, current)) if a != b}
    if row['Image']:
        assert changed <= caption_fields
        changed_notes += bool(changed)
        source = original[row['Clinical_Context']]
        for name in caption_fields:
            assert row[name] == source[name], (row['Clinical_Context'], name)
        blocks = re.findall(r'<div class="stackItem"><img src="([^"]+)"><div class="stackCap">(.*?)</div></div>', row['Image_Annotated'])
        for filename, caption in blocks:
            assert caption == registry[downloads[filename]['masterImageId']]['captionOriginal']
            assert caption in row['Original_Caption']
            source_caption_count += 1
    else:
        assert not changed
    assert re.search(r'\b[A-Z2-7]{12}$', row['Clinical_Context'])
assert source_caption_count == 40 and changed_notes == 26
assert len({row[0] for row in matrix}) == 64
old_lines = (backup / 'corrected_cards.tsv').read_bytes().splitlines()
new_lines = (B / 'corrected_cards.tsv').read_bytes().splitlines()
assert len(old_lines) == len(new_lines) == 64
assert all(old_lines[i] == new_lines[i] for i, row in enumerate(matrix) if not row[image_index])

class ImageRefs(HTMLParser):
    def __init__(self): super().__init__(); self.refs = []
    def handle_starttag(self, tag, attrs):
        if tag == 'img': self.refs.append(dict(attrs)['src'])

parser = ImageRefs()
for row in matrix:
    for field in row: parser.feed(field)
icons = json.loads((B / 'caption_icon_integrity.json').read_text(encoding='utf-8'))
icon_names = {entry['filename'] for entry in icons}
assert len(parser.refs) == 202
assert set(parser.refs) == set(downloads) | icon_names
assert sum(name in icon_names for name in parser.refs) == 122
assert len(icon_names) == 7
diagnostic = json.loads((R / 'media_audit.json').read_text(encoding='utf-8-sig'))
integrity = []
for entry in diagnostic:
    filename = Path(entry['path']).name
    asset = B / 'media' / filename
    assert sha(asset) == entry['sha256']
    with Image.open(asset) as im: im.load(); dimensions = list(im.size)
    integrity.append({'filename': filename, 'role': 'diagnosticImage', 'sha256': sha(asset), 'dimensions': dimensions,
                      'sourcePath': str(Path('C:/Users/josem.000/AppData/Roaming/Anki2/User 1/collection.media') / filename),
                      'matchesPreviouslyAuditedMediaHash': True})
for entry in icons:
    asset = B / entry['bundlePath']
    assert sha(asset) == entry['sha256']
    with Image.open(asset) as im: im.load(); assert im.size == (16, 16)
    integrity.append(entry)
assert len(integrity) == 87
(B / 'media_integrity.json').write_text(json.dumps(integrity, indent=2) + '\n', encoding='utf-8', newline='\n')
previous_validation = json.loads((backup / 'validation_results.json').read_text(encoding='utf-8-sig'))
for entry in previous_validation['inputHashes']:
    assert sha(B / entry['filename']) == entry['sha256']
preview = json.loads((R / 'preview_validation.json').read_text(encoding='utf-8'))
assert preview['status'] == 'passed' and preview['loadedImages'] == 141 and preview['captionIconReferences'] == 61

checks = [
    'All 40 source captions match metadata captionOriginal character-for-character, including HTML and spacing',
    'Image_Annotated and Original_Caption match the original generated fields exactly on all 26 image notes',
    'Only those two fields changed; all 38 non-image TSV rows are byte-for-byte unchanged',
    'All note IDs, image filenames, image grouping/order, other answers and summary fields unchanged',
    'Image-only Anki import has exactly the 26 corrected image notes and the original 22-column schema',
    'Full TSV and full Anki import have the same 64 rows; quoted TSV and Anki headers verified',
    'All 202 image references resolve to 80 diagnostic images and seven original caption icons',
    'All 122 caption icon references restored with their exact original filenames',
    'All 87 media files decode; all 80 diagnostic hashes match the prior audit; caption icon hashes recorded',
    'All original input bundle files retain their prior audited SHA-256 hashes',
    'Preview loads all 80 diagnostic references and 61 inline caption icons at their original 16-pixel size',
]
validated_at = datetime.now(timezone.utc).isoformat(timespec='seconds')
result = {'status': 'passed', 'validatedAt': validated_at, 'counts': data['counts'],
          'checks': checks, 'inputHashes': previous_validation['inputHashes'], 'visualPreview': preview,
          'liveAnkiImportPerformed': False, 'installedNoteTypePatched': False,
          'scope': data['captionRepair'], 'visuallyInspectedOriginalRows': [1, 2, 16, 20]}
(R / 'validation_results.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8', newline='\n')

repair_text = '''# Image-caption repair — Focal Hypervascular Liver Lesion

Restored the exact original source captions on all 26 image notes. Only `Image_Annotated` and `Original_Caption` changed. All 38 non-image notes are byte-for-byte unchanged; all IDs, image files, grouping/order and other fields are unchanged.

The prior audit incorrectly deleted 122 inline arrow references. That was an audit error: arrow icons are part of the source captions, not bookkeeping. The repaired fields now match the original generated TSV exactly, and all 40 individual image captions match `metadata.json` `captionOriginal` character-for-character, including HTML, punctuation and spacing.

Use **corrected_image_cards_anki_import.tsv** to update only the 26 image notes in `Corebook::GI::Liver::Focal Hypervascular Liver Lesion`. It retains their original first-field IDs for Anki matching. The full corrected TSV files have also been repaired. No live Anki import was performed.

All seven required original arrow icons already exist in `Anki2/User 1/collection.media`. Their unchanged files were copied into this bundle's `media` folder with all 80 diagnostic files; the latter retain the exact hashes from the prior audit. No image asset was redrawn or substituted. `caption_icon_integrity.json` and `media_integrity.json` record provenance, filenames and hashes.

The extension's audit instructions and audit wake prompt now explicitly require exact original caption HTML, including arrow tags, and separate validation of auxiliary caption media. The pathology image rules and bundled card prompts carry the same requirement. Missing media must be recovered or reported; missing registry entries never authorize stripping captions. The local correction helper and validator have been repaired to enforce this rule. Reload the extension for the updated audit worker instructions to take effect.

Validation passed:

'''
repair_text += '\n'.join('- ' + check for check in checks) + '\n'
(B / 'caption_repair_report.md').write_text(repair_text, encoding='utf-8', newline='\n')
old_report = (backup / 'audit_report.md').read_text(encoding='utf-8-sig')
old_report = old_report.replace('- Removed 122 references to seven unstaged arrow-icon files from captions. Actual diagnostic images and the useful caption text remain. All remaining `<img src>` values are exact metadata/media filenames.',
    '- Caption repair supersedes the initial erroneous cleanup: all 122 arrow references are restored. Original caption fields match the original generated TSV exactly; all 40 source captions match metadata character-for-character.')
old_report = old_report.replace('The audit bundle itself contains no media folder. Verification was against metadata plus the staged Downloads media. Presence in an installed Anki collection.media folder was not established; this audit did not copy or import media into Anki.',
    'The repaired bundle contains a media folder with all 80 diagnostic images and seven original caption icons, recovered unchanged from the Anki User 1 profile. All diagnostic file hashes match the prior audit. No live Anki import or media modification was performed.')
old_report = old_report.replace('All 80 declared primary media files are present under `C:\\Users\\josem.000\\Downloads\\RadPrimer` and decode successfully.',
    'All 80 declared primary media files are present in this bundle\'s `media` folder and decode successfully.')
old_report = old_report.replace('All 80 <img src> references exactly match primary bundle media entries',
    'All 80 diagnostic references match primary media entries; all 122 caption icon references resolve separately')
prefix = '# Caption repair completed\n\nOnly the two caption fields on the 26 image notes were repaired. All 38 non-image notes are unchanged. The initial arrow-removal decision was incorrect and is superseded. See [caption_repair_report.md](caption_repair_report.md) and use [corrected_image_cards_anki_import.tsv](corrected_image_cards_anki_import.tsv) for the image-only update.\n\n'
(B / 'audit_report.md').write_text(prefix + old_report, encoding='utf-8', newline='\n')
outputs = ['corrected_cards.tsv', 'corrected_cards_anki_import.tsv', 'corrected_image_cards_anki_import.tsv',
           'audit_report.md', 'caption_repair_report.md', 'caption_icon_integrity.json', 'media_integrity.json']
marker = ['DONE', 'articleTitle: ' + metadata['articleTitle'], 'completedAt: ' + validated_at, 'validation: passed',
          'captionRepair: exact original captions and arrow tags restored', 'correctedNotes: 64', 'imageOnlyRepairNotes: 26',
          'nonImageNotesUnchanged: 38', 'sourceCaptionsVerified: 40', 'captionArrowReferences: 122', 'verifiedMediaFiles: 87',
          'columnCount: 22', 'targetDeck: ' + metadata['anki']['deckName'], 'liveAnkiImportPerformed: false',
          'validationReport: _codex_review/validation_results.json']
marker += [name + ' SHA256: ' + sha(B / name) for name in outputs]
(B / '_codex_audit_done.txt').write_text('\n'.join(marker) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'status': 'passed', 'imageNotesRepaired': 26, 'nonImageNotesUnchanged': 38, 'captionsExact': 40,
                  'arrowReferencesRestored': 122, 'mediaFilesVerified': 87, 'checks': len(checks)}))
