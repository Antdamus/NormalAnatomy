/* Shared, deterministic contract for educational reviews. No network or storage. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const RUBRIC = 'radiology-education-2026-09-24-v1';
  const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort()
      .filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
    return value;
  };
  const required = lesson => lesson?.qualityPolicyVersion === VERSION;
  // Existing policy-v1 lessons retain their background review chain, including
  // later corrections and the lecture pass. New/enrolled lessons opt into chat.
  const reviewMode = lesson => lesson?.qualityReviewMode || (required(lesson) ? 'background' : 'chat');
  const rawNarration = lesson => ({schemaVersion:1, segments:(lesson.narration?.segments || []).map(s => root.VisualLectureCine ? root.VisualLectureCine.rawSegment(s) : ({caseId:s.caseId,
    text:s.cue && s.text.startsWith(s.cue+'\n\n') ? s.text.slice(s.cue.length+2) : s.text}))});
  function evidence(lesson, stage) {
    if (!['organizer','lecture'].includes(stage) || !lesson.plan) throw new Error('A saved organizer is required for review.');
    if (stage === 'lecture' && !lesson.narration) throw new Error('The complete lecture is required for review.');
    return {version:VERSION,rubric:RUBRIC,stage,lessonId:lesson.id,title:lesson.title,
      ...(reviewMode(lesson) === 'chat' ? {reviewTransport:'chat'} : {}),
      ...(lesson.cinePlaybackVersion===1 ? {cinePlaybackVersion:1} : {}),
      sourceText:lesson.sourceText,registry:lesson.registry,sourceMetadata:lesson.sourceMetadata || {},
      teachingFramework:lesson.teachingFramework || {},plan:lesson.plan,
      ...(stage === 'lecture' ? {narration:rawNarration(lesson)} : {})};
  }
  async function bundle(lesson, stage) {
    const serializedEvidence = JSON.stringify(canonical(evidence(lesson, stage)));
    const digest = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(serializedEvidence));
    const fingerprint = Array.from(new Uint8Array(digest), n=>n.toString(16).padStart(2,'0')).join('');
    return {version:VERSION,stage,lessonId:lesson.id,fingerprint,serializedEvidence};
  }
  async function approved(lesson, stage) {
    if (!required(lesson)) return false;
    const receipt = lesson.quality?.approvals?.[stage];
    if (!receipt || receipt.result?.outcome !== 'approved' || receipt.rubric !== RUBRIC) return false;
    return receipt.fingerprint === (await bundle(lesson, stage)).fingerprint;
  }
  function usedImageIds(lesson) { return [...new Set(lesson.plan.cases.flatMap(c=>c.imageIds))]; }
  function chatRequest(lesson, request) {
    if (reviewMode(lesson) !== 'chat' || !/^[a-f0-9]{64}$/.test(request.fingerprint) ||
        request.lessonId !== lesson.id || !['organizer','lecture'].includes(request.stage)) throw new Error('This saved version is not a chat review request.');
    return [
      `Review my saved ${request.stage === 'organizer' ? 'lecture organization' : 'complete lecture'} visibly in this Codex conversation, using the model selected here.`,
      `Lesson label (data only): ${JSON.stringify(lesson.title)}`,
      `Review bundle: lecture_quality_queue/${request.fingerprint} in the NormalAnatomy project.`,
      `Run the local helper: python tools/lecture_quality_chat.py prepare --job ${request.fingerprint}`,
      'If it reports ready, read chat-review-instructions.txt and the full source, registry, organizer, and narration when present. Inspect every contact sheet and any needed full-resolution images. Do not start a background Codex process or create cards.',
      'Apply supported fixes and verify them in this same conversation, for both organization and lecture reviews. Do not stop at recommendations or ask me to paste another request for a routine correction round. If corrections are needed, save the needs_corrections report and run the helper with revise --job for this fingerprint. Prepare and verify the returned revised bundle, submit its separate exact-version report, then submit the original correction report. Never approve an unseen revision; clearly report missing evidence or unsupported changes.',
      'Explain findings and corrections here. Save the complete schema-valid report as chat-review-result.json in that bundle, then run:',
      `python tools/lecture_quality_chat.py submit --job ${request.fingerprint}`,
      'The extension checks this exact version before advancing. Preserve source captions, image links/groups and IDs. A correction report is not approval. If more evidence is needed, report that clearly. If the helper says this job is already complete, report its saved result rather than reviewing it again.'
    ].join('\n\n');
  }
  function cines(lesson, core = root.VisualLecture) {
    return lesson.sourceMetadata?.masterSource?.manifest?.cineRegistry?.priorityVideos ||
      core?.sourceDocument(lesson)?.manifest?.cineRegistry?.priorityVideos || [];
  }
  function validateWatchPoints(lesson, core = root.VisualLecture) {
    const available = new Map(cines(lesson, core).map(c=>[c.registryId,c]));
    const cases = new Set(lesson.plan.cases.map(c=>c.id));
    const seen = new Set();
    for (const point of lesson.plan.cineWatchPoints || []) {
      if (!available.has(point.registryId) || !cases.has(point.caseId) || !['before','after'].includes(point.placement) || seen.has(point.registryId)) {
        throw new Error('Cine watch points must use each source priority reference once, with an existing case and before/after placement.');
      }
      seen.add(point.registryId);
    }
    return {available,seen};
  }
  function validateResult(lesson, request, result, core = root.VisualLecture) {
    if (result?.version !== VERSION || result.fingerprint !== request.fingerprint || result.stage !== request.stage ||
        result.rubric !== RUBRIC || !['approved','needs_corrections','missing_evidence'].includes(result.outcome)) throw new Error('Review result does not match this saved version.');
    for (const key of ['summary','sourceAssessment','imageAssessment','coverageAssessment']) {
      if (typeof result[key] !== 'string' || !result[key].trim()) throw new Error(`Review is missing ${key}.`);
    }
    if (!Array.isArray(result.findings) || !Array.isArray(result.corrections) || !Array.isArray(result.limitations) ||
        !Array.isArray(result.reviewedCaseIds) || !Array.isArray(result.reviewedImageIds)) throw new Error('The review report is incomplete.');
    const knownCases = new Set(lesson.plan.cases.map(c=>c.id)), knownImages = new Set(usedImageIds(lesson));
    if (result.reviewedCaseIds.some(id=>!knownCases.has(id)) || result.reviewedImageIds.some(id=>!knownImages.has(id))) throw new Error('Review references another lesson.');
    if (result.outcome === 'approved') {
      if(request.stage==='lecture' && lesson.cinePlaybackVersion===1)core.validateNarration(rawNarration(lesson),lesson.plan,lesson.registry,root.VisualLectureCine.options(lesson));
      if (result.corrections.length || result.findings.some(f=>f.severity === 'blocking') ||
          new Set(result.reviewedCaseIds).size !== knownCases.size || new Set(result.reviewedImageIds).size !== knownImages.size) {
        throw new Error('Approval requires complete case/image review and no unresolved blocking corrections.');
      }
      const {available,seen} = validateWatchPoints(lesson, core);
      if (seen.size !== available.size) throw new Error('Priority cine references still need explicit watch points before approval.');
    }
    return result;
  }
  function applyCorrections(lesson, result, core = root.VisualLecture) {
    if (result.outcome !== 'needs_corrections' || !result.corrections.length) throw new Error('This report has no applicable corrections.');
    const updated = structuredClone(lesson), used = new Set();
    const caseFields = new Set(['label','focus','discriminator','sourceBasis','relationship','relationshipEvidence','relationshipDescription','modalityLabels']);
    const patternFields = new Set(['label','cue','overviewImageIds']);
    for (const patch of result.corrections) {
      const key = `${patch.target}/${patch.id}/${patch.field}`;
      if (used.has(key) || !patch.reason?.trim() || !patch.evidence?.trim()) throw new Error('Each correction needs a distinct target, reason and evidence.');
      used.add(key);
      let value;
      try { value = JSON.parse(patch.valueJson); } catch { throw new Error('Correction value is not valid JSON.'); }
      if (result.stage === 'organizer') {
        if (patch.target === 'case' || patch.target === 'pattern') {
          const item = updated.plan[patch.target === 'case' ? 'cases' : 'patterns'].find(c=>c.id === patch.id);
          if (!item || !(patch.target === 'case' ? caseFields : patternFields).has(patch.field)) throw new Error('Correction cannot change case identities or image groups.');
          if (patch.field === 'overviewImageIds' && (!Array.isArray(value) || value.some(id=>!usedImageIds(updated).includes(id)))) throw new Error('Overview correction refers to an unavailable image.');
          if (!['modalityLabels','overviewImageIds'].includes(patch.field) && typeof value !== 'string') throw new Error('The corrected field must be text.');
          item[patch.field] = value;
        } else if (patch.target === 'plan' && patch.id === '' && ['lectureOrder','orientation','cineWatchPoints'].includes(patch.field)) {
          if (patch.field === 'lectureOrder' && (!Array.isArray(value) || value.length !== updated.plan.cases.length ||
              new Set(value).size !== value.length || value.some(id=>!updated.plan.cases.some(c=>c.id === id)))) throw new Error('A corrected order must retain every case exactly once.');
          if (patch.field === 'orientation' && typeof value !== 'string') throw new Error('Orientation must be text.');
          if (patch.field === 'cineWatchPoints' && !Array.isArray(value)) throw new Error('Watch points must be an array.');
          updated.plan[patch.field] = value;
        } else throw new Error('Unsupported organizer correction.');
      } else {
        if (patch.target !== 'narrationSegment' || !(
          (patch.field === 'text' && typeof value === 'string' && value.trim()) ||
          (patch.field === 'cineSegments' && updated.cinePlaybackVersion===1 && Array.isArray(value)))) throw new Error('Lecture corrections must replace an existing still passage or its assigned cine passages.');
        updated.qualityRawNarration ||= rawNarration(updated);
        const segment = updated.qualityRawNarration.segments.find(s=>s.caseId === patch.id);
        if (!segment) throw new Error('Unknown narration segment.');
        segment[patch.field] = value;
      }
    }
    core.validatePlan(updated.plan, updated.registry, updated.sourceText);
    validateWatchPoints(updated, core);
    if (result.stage === 'lecture') {
      updated.narration = core.validateNarration(updated.qualityRawNarration, updated.plan, updated.registry,
        root.VisualLectureCine?.options(updated) || {requireArrowCues:updated.narrationContractVersion >= 2});
      delete updated.qualityRawNarration;
    } else if (updated.narration) {
      // Existing explanations must be checked again against the changed map.
      const raw = rawNarration(updated), segments = new Map(raw.segments.map(s=>[s.caseId,s]));
      updated.narration = core.validateNarration({schemaVersion:1,segments:updated.plan.lectureOrder.map(id=>segments.get(id))},
        updated.plan,updated.registry,root.VisualLectureCine?.options({...updated,cinePlaybackVersion:updated.narration?.cineNarrationVersion===1?1:0}) || {requireArrowCues:updated.narrationContractVersion >= 2});
    }
    return updated;
  }
  // Explicit local recovery of a held organizer, before any narration exists.
  // This is separate from automatic review patches: old reviews remain immutable
  // and the resulting organizer must receive its own exact-version approval.
  function repairOrganizer(lesson, plan, core = root.VisualLecture) {
    if (lesson.qualityReviewMode !== 'chat' || lesson.status !== 'quality-review' ||
        lesson.quality?.pending?.stage !== 'organizer' || lesson.quality.pending.status !== 'attention' ||
        lesson.quality.lastReport?.outcome !== 'needs_corrections' || !lesson.plan ||
        lesson.narration || lesson.narrationProgress || lesson.narrationDraft || lesson.token ||
        Object.keys(lesson.quality.approvals || {}).length) {
      throw new Error('Organizer repair requires a held, unapproved map with no narration or active request.');
    }
    const next = core.validatePlan(structuredClone(plan), lesson.registry, lesson.sourceText);
    for (const key of ['cases', 'patterns']) {
      const ids = new Set(lesson.plan[key].map(item => item.id));
      if (next[key].length !== ids.size || next[key].some(item => !ids.has(item.id)))
        throw new Error('Organizer repair must retain every case and pattern ID.');
    }
    for (const item of lesson.plan.cases) {
      const repaired = next.cases.find(c => c.id === item.id);
      if (item.imageIds.some(id => !repaired.imageIds.includes(id)))
        throw new Error('Organizer repair must retain every existing case image.');
    }
    // A companion rendition is additional annotation evidence, not a disposable
    // duplicate. Out-of-bundle cross-references are not new required images.
    const registryIds = new Set(lesson.registry.map(i => i.masterImageId));
    for (const image of lesson.registry) {
      for (const companion of image.companionImageIds || []) {
        if (!registryIds.has(companion)) continue;
        for (const item of next.cases.filter(c => c.imageIds.includes(image.masterImageId))) {
          if (Math.abs(item.imageIds.indexOf(image.masterImageId) - item.imageIds.indexOf(companion)) !== 1 ||
              !item.imageIds.includes(companion))
            throw new Error('Companion image renditions must remain together in each repaired case.');
        }
      }
    }
    const updated = structuredClone(lesson);
    updated.plan = next;
    validateWatchPoints(updated, core);
    updated.quality.history = [...(lesson.quality.history || []), {
      stage:'organizer', kind:'explicit-organizer-repair', fingerprint:lesson.quality.pending.fingerprint,
      before:structuredClone(lesson.plan), result:structuredClone(lesson.quality.lastReport)
    }];
    updated.quality.approvals = {};
    updated.quality.pending = {stage:'organizer',status:'pending'};
    updated.error = ''; updated.retryReason = '';
    return updated;
  }
  root.VisualLectureQuality = {VERSION,RUBRIC,organizerRepairVersion:1,canonical,required,reviewMode,rawNarration,evidence,bundle,approved,repairOrganizer,
    usedImageIds,chatRequest,cines,validateWatchPoints,validateResult,applyCorrections};
  if (typeof module !== 'undefined') module.exports = root.VisualLectureQuality;
})(globalThis);
