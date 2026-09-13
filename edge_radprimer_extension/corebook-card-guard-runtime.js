function corebookTarget(settings, meta = {}) {
  const target = buildAnkiDeckTarget({settings, extractionMeta:meta, articleTitle:meta.title || ''});
  return {deckName:target.deckName, title:meta.title || '',
    required:CorebookCardGuard.isCardMode(settings) && /^Corebook(?:::|$)/i.test(target.deckName),
    captions:(meta.sourceQualifiedImages || meta.imageRegistry || []).map(e => e.caption || '')};
}

async function readCurrentCorebook() {
  let result;
  try {
    result = await requestAnkiLiveDrillBridge('/corebook/snapshot', {method:'POST', body:{}, timeoutMs:50000});
  } catch (error) {
    throw new Error('Cannot check the cards you keep in Corebook. Open Anki, restart it after installing the updated bridge, and retry. ' + error.message);
  }
  return CorebookCardGuard.assertFresh(result.bank);
}

async function attachCorebookCardContext(settings, extraction) {
  const target = corebookTarget(settings, extraction.meta);
  if (!target.required) return extraction;
  const bank = await readCurrentCorebook();
  const selected = CorebookCardGuard.context(bank, target);
  const output = String(extraction.output || '').replace(/=== COREBOOK RETAINED CARD CHECK ===[\s\S]*?=== END COREBOOK RETAINED CARD CHECK ===\s*/g, '');
  return {...extraction,
    output:'=== COREBOOK RETAINED CARD CHECK ===\n' + selected.text + '\n=== END COREBOOK RETAINED CARD CHECK ===\n\n' + output,
    meta:{...extraction.meta, corebookGuard:{required:true, status:'ready',
      collectionIdentity:bank.collectionIdentity, generationSnapshotId:bank.snapshotId,
      capturedAt:bank.capturedAt, retainedCount:bank.cardCount,
      removedCount:bank.removedEntries.length, promptCandidateCount:selected.data.selectedCount,
      selection:selected.data.selection, scope:selected.data.scope,
      relatedScopeCount:selected.data.relatedScopeCount, contextFormat:selected.format,
      contextChars:selected.serializedChars}}};
}

async function stageCorebookAuditContext(pending, metadata, folderName) {
  const target = corebookTarget(pending.settings, pending.extractionMeta);
  if (!target.required) return;
  metadata.corebookGuard = {...(pending.extractionMeta?.corebookGuard || {}), required:true,
    snapshotFile:'corebook_snapshot.json', contextFile:'corebook_context.txt', reviewRequired:true};
  try {
    const bank = await readCurrentCorebook();
    await downloadAuditTextFile(folderName, 'corebook_snapshot.json', JSON.stringify(bank, null, 2), 'application/json;charset=utf-8');
    // Preserve the complete audit bank even when its prompt projection is too big.
    const selected = CorebookCardGuard.context(bank, target);
    await downloadAuditTextFile(folderName, 'corebook_context.txt', selected.text);
    Object.assign(metadata.corebookGuard, {status:'ready', auditSnapshotId:bank.snapshotId,
      capturedAt:bank.capturedAt, collectionIdentity:bank.collectionIdentity,
      retainedCount:bank.cardCount, removedCount:bank.removedEntries.length});
  } catch (error) {
    // Preserve an already-generated TSV even if Anki closed during generation.
    Object.assign(metadata.corebookGuard, {status:'refreshRequired', error:error.message});
    await downloadAuditTextFile(folderName, 'corebook_context.txt',
      'COREBOOK CHECK INCOMPLETE\n' + error.message + '\nRefresh with tools/corebook_card_guard.py prepare before completing the audit.');
  }
}

function corebookAuditInstructions(metadata) {
  if (!metadata.corebookGuard?.required && !/^Corebook(?:::|$)/i.test(metadata.anki?.deckName || '')) return '';
  return [
    '## Required comparison with retained Corebook cards',
    CorebookCardGuard.POLICY,
    'Before auditing, run from NormalAnatomy: python tools/corebook_card_guard.py prepare --bundle "<absolute bundle folder>".',
    'This reads current Anki, refreshes corebook_snapshot.json, and creates card_overlap_candidates.json. A staged generation snapshot alone is not a fresh audit check.',
    'Read the complete related-organ cards in corebook_snapshot.json plus the global candidates. Candidate scores are retrieval aids, not proof of semantic duplication.',
    'Resolve conceptual overlaps before writing final TSVs. For each final note, write a card_overlap_review.json decision with clinicalContext, disposition (newConcept, distinctImage, existingNoteCorrection), learningObjective, rationale, and matchedEntryIds.',
    'Use current entryId or removed historyId values for matchedEntryIds. An existingNoteCorrection must keep the entire Clinical_Context, exact stable ID and note type of an owned note; describe the correction separately.',
    'Include skippedQuestions with question, disposition (coveredByExisting or removedPreviously), matchedEntryIds and rationale. Do not add skipped/update-proposal bookkeeping to learner fields.',
    'Review JSON must include snapshotId, semanticReviewComplete:true, fullOrganReviewComplete:true, and crossCategoryReviewComplete:true. Record the topic/organ scope reviewed.',
    'After edits, run: python tools/corebook_card_guard.py validate --bundle "<absolute bundle folder>".',
    'The validator refreshes Anki again, verifies snapshot identity/content, exact-match conflicts, review coverage, unchanged import schema and final TSV hashes. If the bank changed, prepare and review the new overlaps again.',
    'Do not write _codex_audit_done.txt or claim an import is ready unless corebook_validation.json reports passed for these exact final files.',
    'If current Anki cannot be read, preserve draft files and report the incomplete check; do not claim there are no existing duplicates.',
  ].join('\n');
}
