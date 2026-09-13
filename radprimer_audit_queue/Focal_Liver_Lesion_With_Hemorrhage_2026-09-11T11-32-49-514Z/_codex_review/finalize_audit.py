from pathlib import Path
import datetime, hashlib, json, subprocess, sys

B = Path(__file__).resolve().parent.parent
R = B / '_codex_review'
before = 'Physiology clarification: IDA tracers are transported into hepatocytes (Core Nucs:465).'
after = 'Outside physiology clarification (direct Core Nucs:465 check): IDA tracers are transported into hepatocytes.'
for name in ['corrected_cards.tsv', 'corrected_cards_anki_import.tsv']:
    p = B/name
    text = p.read_text(encoding='utf-8')
    assert text.count(before) == 1
    p.write_text(text.replace(before,after),encoding='utf-8')
p = R/'build_corrected_cards.mjs'
text = p.read_text(encoding='utf-8')
assert before in text
p.write_text(text.replace(before,after),encoding='utf-8')

p = R/'row_audit.json'
audit = json.loads(p.read_text(encoding='utf-8'))
for a in audit:
    if a.get('inputRow') == 33:
        a['sourceBasis'] = 'Captured Core GI:114-115 topic support; explicitly labeled outside physiology clarification from direct Core Nucs:465 check'
p.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

p = B/'audit_report.md'
report = p.read_text(encoding='utf-8').replace('PDF page index:', 'PDF page number:')
report = report.replace('## Outside clarifications and source limits\n', '## Outside clarifications and source limits\n\nThe structured Core evidence identifies the textbook, page ranges and facts used. Retained Core teaching is checked against those auditable topics. The HIDA uptake-site explanation additionally uses a direct check of Core Nucs:465, beyond the staged page range; it is labeled outside physiology clarification on the card and its extracted supporting text is preserved in _codex_review/core_additional_pages.json. It is not represented as part of the captured Core evidence.\n')
report = report.replace('The validation step checks all 22 fields, original ID preservation, group/image order, raw caption equality, auxiliary-icon recovery hashes, source-supported selection, empty drill triggers, repeated-summary consistency, changed-field scope and exact Anki header/body agreement. _codex_audit_done.txt is written only after validation passes.', 'Independent validation passed: all 22 fields, original ID preservation, group/image order, raw caption equality, auxiliary-icon recovery hashes, selected-image coverage, empty drill triggers, repeated-summary consistency, changed-field scope and exact Anki header/body agreement. See _codex_review/validation_results.json. The completion marker was written after these checks passed.')
report += '\nThe three deletions are omissions from the corrected import file. Importing this file does not delete corresponding notes that may already exist in Anki.\n'
p.write_text(report,encoding='utf-8')

subprocess.run([sys.executable,str(R/'validate_final.py')],check=True)
result = json.loads((R/'validation_results.json').read_text(encoding='utf-8'))
assert result['status'] == 'passed'
lines = ['DONE','auditComplete=true','topic: Focal Liver Lesion With Hemorrhage','completedAt: '+datetime.datetime.now(datetime.timezone.utc).isoformat(),'validation: passed','inputNotes: 54','correctedNotes: 57','retainedOriginalIds: 51','deletedInputRows: 31, 52, 53','addedNotes: 6','schemaColumns: 22','imageGroupsPreserved: 17','sourceCaptionsPreservedExactly: 23','diagnosticMediaVerified: 46','auxiliaryIconsRecovered: 8','missingMedia: none','AnkiDeck: Corebook::GI::Liver::Focal Liver Lesion With Hemorrhage','AnkiNoteType: core_rad_notetype_v2','DifferentialDrillTriggers: blank','liveAnkiImportPerformed: false','validationReport: _codex_review/validation_results.json']
for name, digest in result['outputSha256'].items():
    lines.append(name+' SHA256: '+digest)
(B/'_codex_audit_done.txt').write_text('\n'.join(lines)+'\n',encoding='utf-8')
for name in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md','_codex_audit_done.txt']:
    p = B/name
    assert p.is_file() and p.stat().st_size > 0
print(json.dumps({'completed':True,'outputs':[{'filename':name,'bytes':(B/name).stat().st_size} for name in ['corrected_cards.tsv','corrected_cards_anki_import.tsv','audit_report.md','_codex_audit_done.txt']]}))
