(function (root) {
  "use strict";
  const decisions = ["later", "cards", "lecture"];
  const empty = id => ({ version: 1, lessonId: id, revision: 0, images: {} });
  function validate(review, lesson) {
    if (!review) return empty(lesson.id);
    if (review.version !== 1 || review.lessonId !== lesson.id || !Number.isInteger(review.revision) || review.revision < 0) throw new Error("This card selection belongs to another lesson or version.");
    const ids = new Set(lesson.registry.map(i => i.masterImageId));
    for (const [id, item] of Object.entries(review.images || {})) {
      if (!ids.has(id) || !decisions.includes(item.decision) || !["normal", "pathology", "mixed"].includes(item.role)) throw new Error(`Invalid card selection for ${id}.`);
    }
    return review;
  }
  function groupFor(lesson, imageId) {
    const ids = new Set(lesson.registry.map(i => i.masterImageId));
    if (!ids.has(imageId)) throw new Error("Image is not in this lesson.");
    const selected = new Set([imageId]);
    const linkedCases = (lesson.plan?.cases || []).filter(item => item.relationship === "same patient" && item.relationshipEvidence);
    let changed = true;
    while (changed) {
      changed = false;
      for (const image of lesson.registry) {
        if (!image.atomicCluster) continue;
        const group = [image.masterImageId, ...(image.clusterImageIds || [])].filter(id => ids.has(id));
        if (!group.some(id => selected.has(id))) continue;
        for (const id of group) if (!selected.has(id)) { selected.add(id); changed = true; }
      }
      for (const item of linkedCases) {
        const group = item.imageIds.filter(id => ids.has(id));
        if (group.some(id => selected.has(id))) for (const id of group) if (!selected.has(id)) { selected.add(id); changed = true; }
      }
    }
    return [...selected];
  }
  function update(review, lesson, imageId, patch) {
    review = validate(review, lesson);
    const previous = review.images?.[imageId] || { decision: "later", role: "pathology", objective: "" };
    const item = { ...previous, ...patch };
    if (!decisions.includes(item.decision) || !["normal", "pathology", "mixed"].includes(item.role)) throw new Error("Choose a supported card decision and framework.");
    item.objective = String(item.objective || "").trim().slice(0, 1000);
    const images = { ...review.images };
    const group = groupFor(lesson, imageId);
    for (const id of group) images[id] = { ...item };
    return { ...review, revision: review.revision + 1, updatedAt: Date.now(), images };
  }
  function summary(review, lesson) {
    review = validate(review, lesson);
    const counts = { cards: 0, lecture: 0, later: 0 };
    for (const image of lesson.registry) counts[review.images?.[image.masterImageId]?.decision || "later"]++;
    return counts;
  }
  function selectedPlan(review, lesson) {
    review = validate(review, lesson);
    const ids = lesson.registry.filter(i => review.images?.[i.masterImageId]?.decision === "cards").map(i => i.masterImageId);
    if (!ids.length) throw new Error("Select at least one image for cards first.");
    const selected = new Set(ids);
    for (const id of ids) if (groupFor(lesson, id).some(member => !selected.has(member))) throw new Error("A linked image group is only partly selected. Review the group together.");
    return { version: 1, lessonId: lesson.id, reviewRevision: review.revision, selectedImageIds: ids,
      imageObjectives: Object.fromEntries(ids.map(id => [id, review.images[id]])),
      counts: summary(review, lesson), policy: "Only explicitly selected images may be used in cards. Selection permits consideration; it does not require a card for each image. Full lecture text is context. Preserve both source variants and approved linked groups. Compare against the live card bank before generation." };
  }
  const api = { empty, validate, groupFor, update, summary, selectedPlan };
  root.LectureCardReview = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
