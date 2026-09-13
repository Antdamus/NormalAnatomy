"""Refresh Anki evidence and validate a human/agent semantic overlap review.

No Anki writes. Similarity scores retrieve candidates; they do not decide that
two concepts or images are equivalent. The final review is a separate artifact.
"""
from __future__ import annotations
import argparse
import difflib
import hashlib
import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

FIELDS = 'Clinical_Context Image Image_Annotated Question Most_Likely_Diagnosis Entity_Label Differential_Q Differentials Imaging_Differentiation Original_Caption Mechanism_Q Mechanism Boards_Trap_Q Boards_Trap High_Yield_Q High_Yield_A Radiopaedia_Link Radiopaedia_Case_Context Radiopaedia_Case_Summary Radiopaedia_Case_Differential summary Tags'.split()
FAMILIES = [(3,4,'unknown'),(10,11,'mechanism'),(12,13,'boardsTrap'),(14,15,'highYield')]


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')


def plain(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', s))).strip()


def normalized(s):
    return re.sub(r'\W+', ' ', plain(s).casefold()).strip()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_bank():
    req = urllib.request.Request('http://127.0.0.1:8765/corebook/snapshot', data=b'{}',
                                 headers={'Content-Type':'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=55) as response:
        result = json.load(response)
    if result.get('ok') is not True:
        raise ValueError(result.get('error', 'Corebook read failed.'))
    bank = result.get('bank', {})
    check_bank(bank)
    return bank


def check_bank(bank):
    if bank.get('schemaVersion') != 1 or bank.get('complete') is not True or bank.get('scopeRoot') != 'Corebook':
        raise ValueError('Incomplete Corebook snapshot.')
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(bank['capturedAt'].replace('Z','+00:00'))).total_seconds()
    if age < -60 or age > 900:
        raise ValueError('Corebook snapshot is stale; refresh from Anki.')
    if bank.get('cardCount') != len(bank['entries']) or not bank.get('snapshotId') or not bank.get('collectionIdentity'):
        raise ValueError('Snapshot count or identity mismatch.')


def read_cards(path):
    rows = [r.split('\t') for r in path.read_text(encoding='utf-8-sig').splitlines() if r]
    if any(len(r) != len(FIELDS) for r in rows):
        raise ValueError('Expected the existing no-header, 22-column TSV schema.')
    records = []
    for i,r in enumerate(rows,1):
        active = [(q,a,t) for q,a,t in FAMILIES if r[q].strip()]
        if len(active) != 1:
            raise ValueError(f'Row {i} must contain one question family.')
        q,a,t = active[0]
        records.append({'row':i,'clinicalContext':r[0], 'question':plain(r[q]), 'answer':plain(r[a]),
                        'cardType':t, 'imageRecognition':bool(r[1]) or t == 'unknown',
                        'stableId':(re.search(r'([A-Za-z0-9]{10,16})$', plain(r[0])) or [None,''])[1]})
    return rows,records


def candidate_id(entry):
    return entry.get('historyId') or entry['entryId']


def similarity(card, entry):
    q,a = normalized(card['question']), normalized(card['answer'])
    eq,ea = normalized(entry['question']), normalized(entry['answer'])
    if q and a and q == eq and a == ea:
        return 1.0
    question = difflib.SequenceMatcher(None,q,eq,autojunk=False).ratio()
    left,right = set((q+' '+a).split()),set((eq+' '+ea).split())
    overlap = len(left & right) / max(1, len(left | right))
    return round(0.65*question + 0.35*overlap,4)


def candidates(records, bank):
    entries = bank['entries'] + bank['removedEntries']
    result = []
    for card in records:
        if card['imageRecognition']:
            result.append({**card,'candidates':[],'note':'Preserve distinct images and atomic clusters; text similarity cannot prove image duplication.'})
            continue
        matches = []
        for entry in entries:
            if entry.get('imageRecognition'):
                continue
            score = similarity(card, entry)
            if score >= .30 or (card['stableId'] and card['stableId'] == entry.get('stableId')):
                matches.append({'entryId':candidate_id(entry),'noteId':entry['noteId'],'cardId':entry['cardId'],
                    'state':entry.get('reason','retained'),'deck':entry['deck'],'cardType':entry['cardType'],
                    'question':entry['question'],'answer':entry['answer'],'score':score})
        matches.sort(key=lambda e:-e['score'])
        # Never discard a high-confidence match when limiting the retrieval list.
        picked = [e for i,e in enumerate(matches) if i < 12 or e['score'] >= .90]
        result.append({**card, 'candidates':picked, 'totalCandidateCount':len(matches)})
    return result


def prepare(bundle, bank):
    check_bank(bank)
    _,records = read_cards(bundle/'generated_cards.tsv')
    meta = json.loads((bundle/'metadata.json').read_text(encoding='utf-8-sig'))
    deck = meta.get('anki',{}).get('deckName','Corebook')
    scope = '::'.join(deck.split('::')[:-1]) or 'Corebook'
    related = [e for e in bank['entries'] + bank['removedEntries'] if e['deck'] == scope or e['deck'].startswith(scope+'::')]
    write_json(bundle/'corebook_snapshot.json', bank)
    write_json(bundle/'card_overlap_candidates.json', {'snapshotId':bank['snapshotId'],'capturedAt':bank['capturedAt'],
        'scopeReviewed':scope,'allCorebookCardsSearched':len(bank['entries']),
        'fullOrganEntries':related, 'cards':candidates(records,bank),
        'limits':'Lexical retrieval is not semantic proof. Review all related-organ entries and cross-category candidates against the learning objective and answer. Image duplicates require visual/source evidence.'})
    if not (bundle/'card_overlap_review.json').exists():
        write_json(bundle/'card_overlap_review.json', {'snapshotId':bank['snapshotId'], 'scopeReviewed':scope,
            'semanticReviewComplete':False,'fullOrganReviewComplete':False,'crossCategoryReviewComplete':False,
            'decisions':[],'skippedQuestions':[]})
    write_json(bundle/'corebook_validation.json', {'status':'reviewRequired','snapshotId':bank['snapshotId'],
        'message':'Compare current cards and deletion history, then validate the final TSVs.'})
    return {'status':'prepared','retained':len(bank['entries']),'removedHistory':len(bank['removedEntries']),
            'inputNotes':len(records),'scopeReviewed':scope}


def validate(bundle, bank):
    check_bank(bank)
    review = json.loads((bundle/'card_overlap_review.json').read_text(encoding='utf-8-sig'))
    if review.get('snapshotId') != bank['snapshotId']:
        raise ValueError('Corebook changed after the overlap review. Prepare and review the refreshed bank.')
    for flag in ['semanticReviewComplete','fullOrganReviewComplete','crossCategoryReviewComplete']:
        if review.get(flag) is not True:
            raise ValueError('Incomplete overlap review: '+flag)
    if not review.get('scopeReviewed'):
        raise ValueError('Record the organ/topic scope reviewed.')
    meta = json.loads((bundle/'metadata.json').read_text(encoding='utf-8-sig'))
    expected_scope = '::'.join(meta.get('anki',{}).get('deckName','Corebook').split('::')[:-1]) or 'Corebook'
    if review['scopeReviewed'] != expected_scope:
        raise ValueError('Reviewed scope does not match the target organ/topic parent.')
    rows,records = read_cards(bundle/'corrected_cards.tsv')
    decisions = review.get('decisions', [])
    lookup = {d['clinicalContext']:d for d in decisions}
    if len(lookup) != len(decisions) or len(decisions) != len(records) or {r['clinicalContext'] for r in records} != set(lookup):
        raise ValueError('Exactly one overlap decision is required for every final note ID.')
    entries = {candidate_id(e):e for e in bank['entries']+bank['removedEntries']}
    active = {e['entryId']:e for e in bank['entries']}
    exact_new = set()
    for card in records:
        decision = lookup[card['clinicalContext']]
        action = decision.get('disposition')
        if action not in ['newConcept','distinctImage','existingNoteCorrection']:
            raise ValueError('Invalid final-note disposition: '+str(action))
        if len(decision.get('learningObjective','').strip()) < 10 or len(decision.get('rationale','').strip()) < 15:
            raise ValueError('Explain the objective and distinct contribution for every final note.')
        match_ids = decision.get('matchedEntryIds', [])
        if not isinstance(match_ids,list) or any(e not in entries for e in match_ids):
            raise ValueError('Overlap references must resolve to current entryId or removed historyId values.')
        if action == 'distinctImage' and not card['imageRecognition']:
            raise ValueError('Text-only questions cannot bypass overlap checks as images.')
        owned = [active[e] for e in match_ids if e in active]
        if action == 'existingNoteCorrection' and not any(
                card['stableId'] and card['clinicalContext'] == e.get('clinicalContext')
                and e.get('noteType') == meta.get('anki',{}).get('noteType','core_rad_notetype_v2') for e in owned):
            raise ValueError('Existing-note corrections must preserve the entire owned Clinical_Context and matching note type.')
        if card['imageRecognition']:
            continue
        key = (normalized(card['question']),normalized(card['answer']))
        if key in exact_new:
            raise ValueError('Exact conceptual Q/A repeated inside the corrected batch.')
        exact_new.add(key)
        exact = [e for e in entries.values() if not e.get('imageRecognition') and
                 (normalized(e['question']),normalized(e['answer'])) == key]
        if exact and action != 'existingNoteCorrection':
            raise ValueError('An unchanged owned/removed question was emitted as new: '+card['question'])
    for skipped in review.get('skippedQuestions', []):
        if skipped.get('disposition') not in ['coveredByExisting','removedPreviously'] or not skipped.get('rationale'):
            raise ValueError('Explain each skipped question and its disposition.')
        if not skipped.get('matchedEntryIds') or any(x not in entries for x in skipped['matchedEntryIds']):
            raise ValueError('Skipped questions must reference actual Anki/history entries.')
    meta = json.loads((bundle/'metadata.json').read_text(encoding='utf-8-sig'))
    anki = meta.get('anki',{})
    if anki.get('deckName'):
        expected = '\n'.join(['#separator:tab','#html:true','#notetype:'+anki.get('noteType','core_rad_notetype_v2'),'#deck:'+anki['deckName']])+'\n'
        if (bundle/'corrected_cards_anki_import.tsv').read_text(encoding='utf-8-sig') != expected+(bundle/'corrected_cards.tsv').read_text(encoding='utf-8-sig'):
            raise ValueError('Anki import headers/body differ from the corrected TSV or target metadata.')
    files = ['corrected_cards.tsv','card_overlap_review.json']
    if (bundle/'corrected_cards_anki_import.tsv').exists(): files.append('corrected_cards_anki_import.tsv')
    result = {'status':'passed','validatedAt':datetime.now(timezone.utc).isoformat(),
              'snapshotId':bank['snapshotId'],'collectionIdentity':bank['collectionIdentity'],
              'finalNotes':len(rows),'columns':22,'outputSha256':{n:sha(bundle/n) for n in files},
              'semanticReview':'Explicit per-note agent/human review; lexical scores alone never establish equivalence.',
              'ankiModified':False}
    write_json(bundle/'corebook_validation.json',result)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['prepare','validate'])
    parser.add_argument('--bundle',type=Path,required=True)
    args = parser.parse_args()
    bundle = args.bundle.resolve(strict=True)
    try:
        bank = read_bank()
        result = prepare(bundle,bank) if args.action == 'prepare' else validate(bundle,bank)
        print(json.dumps(result,ensure_ascii=False,indent=2))
        return 0
    except Exception as error:
        write_json(bundle/'corebook_validation.json',{'status':'blocked','reason':str(error),
            'ankiModified':False,'message':'Preserve drafts. Do not claim duplicate checking passed or write the audit completion marker.'})
        print('Corebook comparison incomplete: '+str(error),file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
