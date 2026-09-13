"""Read Anki cards and maintain an external history. Never writes to Anki."""
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = 1
ROOT = 'Corebook'
FAMILIES = [
    ('unknown', 'Question', 'Most_Likely_Diagnosis'),
    ('mechanism', 'Mechanism_Q', 'Mechanism'),
    ('boardsTrap', 'Boards_Trap_Q', 'Boards_Trap'),
    ('highYield', 'High_Yield_Q', 'High_Yield_A'),
    ('differentialDrill', 'Differential_Q', 'Differentials'),
]


def now():
    return datetime.now(timezone.utc).isoformat()


def plain(value):
    value = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', str(value), flags=re.S | re.I)
    value = re.sub(r'<[^>]*>', ' ', value)
    return re.sub(r'\s+', ' ', html.unescape(value)).strip()


def normalized(value):
    return re.sub(r'\W+', ' ', plain(value).casefold()).strip()


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def img_sources(value):
    return re.findall(r'<img\b[^>]*\bsrc=[\"\']([^\"\']+)[\"\']', value, re.I)


def in_scope(deck):
    return deck.casefold() == ROOT.casefold() or deck.casefold().startswith(ROOT.casefold() + '::')


def card_content(col, cid, ordinal, model, fields):
    templates = model.get('tmpls', [])
    template = next((t for t in templates if int(t.get('ord', -1)) == ordinal), {})
    qfmt = template.get('qfmt', '')
    present = [(kind, q, a) for kind,q,a in FAMILIES
               if re.search(r'{{\s*(?:text:)?' + re.escape(q) + r'\s*}}', qfmt)]
    present = [item for item in present if fields.get(item[1], '').strip()]
    if len(present) == 1:
        kind,q,a = present[0]
        question = fields[q]
        answer = fields.get(a, '')
        if kind == 'unknown':
            question = fields.get('Image', '') + question
            answer += fields.get('Imaging_Differentiation', '')
        return kind, q, question, answer, template.get('name', kind)
    # Render the actual card for other note types, reverse cards and cloze ordinals.
    card = col.get_card(cid)
    question, answer = card.question(), card.answer()
    if answer.startswith(question):
        answer = answer[len(question):]
    for field in ('summary', 'Original_Caption'):
        value = fields.get(field, '')
        if value:
            question, answer = question.replace(value, ''), answer.replace(value, '')
    return 'other', '', question, answer, template.get('name', 'Other')


def capture(col, profile_path):
    if col is None:
        raise RuntimeError('Open your Anki profile before checking Corebook.')
    # All-card membership distinguishes deleted cards from moves to other decks.
    rows = col.db.all('SELECT c.id,c.nid,c.did,c.odid,c.ord,c.queue,n.mid,n.flds,n.guid '
                      'FROM cards c JOIN notes n ON n.id=c.nid ORDER BY c.id')
    if not any(in_scope(d.name) for d in col.decks.all_names_and_ids()):
        raise RuntimeError('The open Anki profile has no Corebook deck. Open the intended profile.')
    all_note_ids = {str(v) for v in col.db.list('SELECT id FROM notes')}
    all_card_ids = {str(r[0]) for r in rows}
    models, decks, entries = {}, {}, []
    for cid,nid,did,odid,ordinal,queue,mid,field_text,guid in rows:
        effective_did = odid or did  # Keep original deck membership in filtered decks.
        if effective_did not in decks:
            decks[effective_did] = col.decks.name(effective_did)
        deck = decks[effective_did]
        if not in_scope(deck):
            continue
        if mid not in models:
            models[mid] = col.models.get(mid)
        model = models[mid]
        names = [f['name'] for f in model['flds']]
        values = field_text.split('\x1f')
        if len(names) != len(values):
            raise RuntimeError(f'Incomplete fields for Anki note {nid}; snapshot was not saved.')
        fields = dict(zip(names, values))
        kind,qfield,q,a,template = card_content(col, cid, ordinal, model, fields)
        media = list(dict.fromkeys(img_sources(q) + img_sources(a)))
        stable = re.search(r'([A-Za-z0-9]{10,16})$', plain(fields.get('Clinical_Context', '')))
        entry = {
            'entryId': str(cid), 'cardId': str(cid), 'noteId': str(nid), 'guid': guid,
            'stableId': stable.group(1) if stable else '',
            'clinicalContext': fields.get('Clinical_Context', ''),
            'deck': deck, 'noteType': model['name'], 'cardType': kind,
            'template': template, 'questionField': qfield,
            'suspended': int(queue) == -1, 'question': plain(q), 'answer': plain(a),
            'imageSources': media,
            'imageRecognition': kind == 'unknown' or bool(img_sources(q)),
        }
        entry['contentHash'] = digest([normalized(q), normalized(a), media, kind])
        entries.append(entry)
    identity = digest([str(Path(profile_path).resolve()), col.db.scalar('SELECT crt FROM col')])[:24]
    snapshot = {'schemaVersion': SCHEMA, 'complete': True, 'scopeRoot': ROOT,
                'collectionIdentity': identity, 'capturedAt': now(),
                'cardCount': len(entries), 'noteCount': len({e['noteId'] for e in entries}),
                'entries': entries}
    return snapshot, all_note_ids, all_card_ids


def reconcile(previous, snapshot, all_note_ids, all_card_ids):
    if snapshot.get('complete') is not True:
        raise ValueError('An incomplete snapshot cannot change deletion history.')
    if previous and previous['collectionIdentity'] != snapshot['collectionIdentity']:
        raise ValueError('Collection identity changed; do not merge histories across profiles or replacements.')
    current = {e['entryId']: e for e in snapshot['entries']}
    history = {e['historyId']: e for e in (previous or {}).get('removedEntries', [])}
    for old in (previous or {}).get('entries', []):
        replacement = current.get(old['entryId'])
        reason = None
        if replacement:
            if replacement['contentHash'] != old['contentHash']:
                reason = 'questionRevised'
        elif old['noteId'] not in all_note_ids:
            reason = 'noteDeleted'
        elif old['cardId'] not in all_card_ids:
            reason = 'cardRemoved'
        else:
            reason = 'movedOutOfCorebook'
        if reason:
            hid = digest([old['entryId'], old['contentHash']])[:24]
            history.setdefault(hid, {**old, 'historyId': hid, 'removedAt': snapshot['capturedAt'],
                                      'reason': reason, 'suppressRecreation': True})
    # A user restoring/reimporting a question explicitly overrides its tombstone.
    active_hashes = {e['contentHash'] for e in current.values()}
    history = {k:v for k,v in history.items() if v['contentHash'] not in active_hashes}
    result = {**snapshot, 'removedEntries': list(history.values()),
              'historyStartedAt': (previous or {}).get('historyStartedAt', snapshot['capturedAt']),
              'authority': 'currentAnkiCollection', 'generatedFilesAreAccepted': False}
    result['snapshotId'] = digest([result['collectionIdentity'], result['entries'], result['removedEntries']])
    return result


def atomic_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=path.name + '.', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def refresh(col, profile_path, registry_dir):
    snapshot, all_notes, all_cards = capture(col, profile_path)
    registry_dir = Path(registry_dir)
    path = registry_dir / (snapshot['collectionIdentity'] + '.json')
    # Corrupt history is an error, never silently reset it and lose deletions.
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else None
    result = reconcile(previous, snapshot, all_notes, all_cards)
    atomic_json(path, result)
    atomic_json(registry_dir / 'latest.json', result)
    return result
