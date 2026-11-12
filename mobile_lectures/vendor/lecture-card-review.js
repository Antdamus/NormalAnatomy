(function (root) {
  "use strict";
  const decisions = ["later", "cards", "lecture"];
  const empty = id => ({ version: 1, lessonId: id, revision: 0, images: {} });
  // These are saved study collections, not evidence of patient identity. Never
  // infer a link from matching prose, a gallery label or the singular atomicGroupId.
  function sourceGroups(lesson) {
    const ids = new Set(lesson.registry.map(i => i.masterImageId)), groups = new Map();
    function add(id, label, kind, members) {
      if (!Array.isArray(members) || members.length < 2 || new Set(members).size !== members.length || members.some(id => !ids.has(id))) return;
      if (!groups.has(id)) groups.set(id, { id, label, kind, imageIds: [...members] });
    }
    for (const group of lesson.sourceMetadata?.masterSource?.manifest?.caseAndComparisonSequences || []) {
      if (typeof group.id === "string" && group.id && group.preserveOrderAndPairs === true)
        add(`collection:${group.id}`, group.originalGroupLabel || group.id, "source collection", group.imageIds);
    }
    for (const image of lesson.registry) for (const other of image.companionImageIds || []) {
      const members = [image.masterImageId, other].sort();
      add(`companion:${JSON.stringify(members)}`, "Companion images", "saved companions", members);
    }
    return [...groups.values()];
  }
  function requiredGroups(lesson) {
    const ids = new Set(lesson.registry.map(i => i.masterImageId)), groups = [], named = new Map();
    for (const image of lesson.registry) {
      if (image.atomicCluster) groups.push([image.masterImageId, ...(image.clusterImageIds || [])].filter(id => ids.has(id)));
      for (const name of new Set(Array.isArray(image.atomicGroupIds) ? image.atomicGroupIds : [])) if (typeof name === "string" && name.trim()) {
        if (!named.has(name)) named.set(name, []);
        named.get(name).push(image.masterImageId);
      }
    }
    groups.push(...named.values());
    for (const item of lesson.plan?.cases || []) if (item.relationship === "same patient" && item.relationshipEvidence) groups.push(item.imageIds.filter(id => ids.has(id)));
    return groups;
  }
  function closure(lesson, imageId, groups) {
    if (!lesson.registry.some(i => i.masterImageId === imageId)) throw new Error("Image is not in this lesson.");
    const selected = new Set([imageId]); let changed = true;
    while (changed) {
      changed = false;
      for (const group of groups) if (group.some(id => selected.has(id))) for (const id of group) if (!selected.has(id)) { selected.add(id); changed = true; }
    }
    return lesson.registry.map(i => i.masterImageId).filter(id => selected.has(id));
  }
  function inherit(review, lesson) {
    review = validate(review, lesson);
    if (review.inheritedLinks) return review;
    // Upgrade old choices without adding/removing a selection. A collection
    // whose members were individually selected remains unlinked until restored.
    const disabledGroupIds = sourceGroups(lesson).filter(g => {
      const selected = g.imageIds.filter(id => review.images?.[id]?.decision === "cards").length;
      return selected > 0 && selected < g.imageIds.length;
    }).map(g => g.id);
    return { ...review, inheritedLinks: { version: 1, disabledGroupIds } };
  }
  function sameSavedData(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    if (Array.isArray(left)) return left.length === right.length && left.every((item, index) => sameSavedData(item, right[index]));
    // IndexedDB and extension storage need not retain the same object-key order.
    // Keep every field/value and array position significant; only key order varies.
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key =>
      Object.prototype.hasOwnProperty.call(right, key) && sameSavedData(left[key], right[key]));
  }
  function validate(review, lesson) {
    if (!review) return empty(lesson.id);
    if (review.version !== 1 || review.lessonId !== lesson.id || !Number.isInteger(review.revision) || review.revision < 0) throw new Error("This card selection belongs to another lesson or version.");
    const ids = new Set(lesson.registry.map(i => i.masterImageId));
    for (const [id, item] of Object.entries(review.images || {})) {
      if (!ids.has(id) || !decisions.includes(item.decision) || !["normal", "pathology", "mixed"].includes(item.role)) throw new Error(`Invalid card selection for ${id}.`);
    }
    const groupIds = new Set(), members = new Set();
    if (review.manualGroups !== undefined && !Array.isArray(review.manualGroups)) throw new Error("Invalid saved image links.");
    for (const group of review.manualGroups || []) {
      if (!group || typeof group.id !== "string" || !group.id || groupIds.has(group.id) || !Array.isArray(group.imageIds) || group.imageIds.length < 2) throw new Error("Invalid saved image links.");
      groupIds.add(group.id);
      for (const id of group.imageIds) {
        if (!ids.has(id) || members.has(id)) throw new Error("Saved image links contain unknown or repeated images.");
        members.add(id);
      }
    }
    if (review.inheritedLinks !== undefined) {
      const value = review.inheritedLinks, available = new Set(sourceGroups(lesson).map(g => g.id));
      if (!value || value.version !== 1 || !Array.isArray(value.disabledGroupIds) || new Set(value.disabledGroupIds).size !== value.disabledGroupIds.length || value.disabledGroupIds.some(id => !available.has(id))) throw new Error("Invalid inherited image links.");
    }
    return review;
  }
  function groupFor(lesson, imageId, review) {
    const disabled = new Set(review?.inheritedLinks?.disabledGroupIds || []);
    return closure(lesson, imageId, [...requiredGroups(lesson),
      ...(review?.inheritedLinks ? sourceGroups(lesson).filter(g => !disabled.has(g.id)).map(g => g.imageIds) : []),
      ...(review?.manualGroups || []).map(g => g.imageIds)]);
  }
  function linkInfo(lesson, imageId, review) {
    const members = new Set(groupFor(lesson, imageId, review));
    const all = sourceGroups(lesson), disabled = new Set(review?.inheritedLinks?.disabledGroupIds || []);
    const connected = new Set(closure(lesson, imageId, [...requiredGroups(lesson), ...all.map(g => g.imageIds)]));
    return { inherited: review?.inheritedLinks ? all.filter(g => !disabled.has(g.id) && g.imageIds.some(id => members.has(id))) : [],
      disabled: all.filter(g => disabled.has(g.id) && g.imageIds.some(id => connected.has(id))),
      manual: (review?.manualGroups || []).filter(g => g.imageIds.some(id => members.has(id))),
      required: requiredGroups(lesson).filter(g => g.length > 1 && g.some(id => members.has(id))) };
  }
  function separate(review, lesson, imageId, expectedRevision) {
    review = inherit(review, lesson); checkRevision(review, expectedRevision);
    const info = linkInfo(lesson, imageId, review), next = unlink(review, lesson, imageId, expectedRevision);
    next.inheritedLinks = { version: 1, disabledGroupIds: [...new Set([...review.inheritedLinks.disabledGroupIds, ...info.inherited.map(g => g.id)])].sort() };
    return validate(next, lesson);
  }
  function restoreLinks(review, lesson, imageId, roles, expectedRevision) {
    review = inherit(review, lesson); checkRevision(review, expectedRevision);
    const restore = new Set(linkInfo(lesson, imageId, review).disabled.map(g => g.id));
    const next = { ...review, inheritedLinks: { version: 1, disabledGroupIds: review.inheritedLinks.disabledGroupIds.filter(id => !restore.has(id)) }, images: { ...review.images }, revision: review.revision + 1, updatedAt: Date.now() };
    for (const id of groupFor(lesson, imageId, next)) next.images[id] = { role: roles?.[id] || "pathology", objective: "", ...next.images[id], decision: "cards" };
    return validate(next, lesson);
  }
  function checkRevision(review, expectedRevision) {
    if (review.revision !== expectedRevision) throw new Error("Image choices changed while this picker was open. Close it and open it again to review the latest links.");
  }
  function link(review, lesson, imageIds, roles, expectedRevision) {
    review = validate(review, lesson); checkRevision(review, expectedRevision);
    if (!Array.isArray(imageIds) || imageIds.length < 2 || new Set(imageIds).size !== imageIds.length) throw new Error("Choose at least two different images to link.");
    const members = new Set(imageIds.flatMap(id => groupFor(lesson, id, review)));
    const merged = (review.manualGroups || []).filter(g => g.imageIds.some(id => members.has(id)));
    const group = { id: merged[0]?.id || `linked-${review.revision + 1}`, imageIds: lesson.registry.map(i => i.masterImageId).filter(id => members.has(id)) };
    const images = { ...review.images };
    for (const id of group.imageIds) images[id] = { role: roles?.[id] || "pathology", objective: "", ...images[id], decision: "cards" };
    return validate({ ...review, images, manualGroups: [...(review.manualGroups || []).filter(g => !merged.includes(g)), group], revision: review.revision + 1, updatedAt: Date.now() }, lesson);
  }
  function unlink(review, lesson, imageId, expectedRevision) {
    review = validate(review, lesson); checkRevision(review, expectedRevision);
    const members = new Set(groupFor(lesson, imageId, review));
    return { ...review, manualGroups: (review.manualGroups || []).filter(g => !g.imageIds.some(id => members.has(id))), revision: review.revision + 1, updatedAt: Date.now() };
  }
  function update(review, lesson, imageId, patch) {
    review = validate(review, lesson);
    const previous = review.images?.[imageId] || { decision: "later", role: "pathology", objective: "" };
    const item = { ...previous, ...patch };
    if (!decisions.includes(item.decision) || !["normal", "pathology", "mixed"].includes(item.role)) throw new Error("Choose a supported card decision and framework.");
    item.objective = String(item.objective || "").trim().slice(0, 1000);
    const images = { ...review.images };
    const group = groupFor(lesson, imageId, review);
    const sourceGroup = new Set(groupFor(lesson, imageId));
    for (const id of group) {
      // Manual links preserve separate teaching objectives/frameworks; card use travels together.
      const source = lesson.registry.find(i => i.masterImageId === id);
      const role = source?.teachingRole || lesson.sourceMetadata?.masterSource?.manifest?.sources?.find(s => s.id === source?.sourceArticleId)?.teachingRole || root.TeachingFramework?.recommend(lesson)?.engine || item.role;
      images[id] = sourceGroup.has(id) ? { ...item } : { role, objective: "", decision: "later", ...images[id], ...(patch.decision ? { decision: patch.decision } : {}) };
    }
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
    const linkedImageGroups = [], visited = new Set();
    for (const id of ids) {
      const group = groupFor(lesson, id, review);
      if (group.some(member => !selected.has(member))) throw new Error("A linked image group is only partly selected. Review the group together.");
      if (visited.has(id)) continue;
      group.forEach(member => visited.add(member));
      if (group.length > 1) {
        const manual = (review.manualGroups || []).find(g => g.imageIds.some(member => group.includes(member)));
        linkedImageGroups.push({ id: manual?.id || `source-${group[0]}`, imageIds: group, origin: manual ? "user" : "source", requireTogether: true });
      }
    }
    return { version: 1, lessonId: lesson.id, reviewRevision: review.revision, selectedImageIds: ids,
      linkedImageGroups,
      imageObjectives: Object.fromEntries(ids.map(id => [id, review.images[id]])),
      counts: summary(review, lesson), policy: "Only explicitly selected images may be used in cards. Selection permits consideration; it does not require a card for each image. Include complete article text only for articles represented by selected images. Preserve both source variants. Every linkedImageGroups entry is indivisible: whenever one member appears in a note, include the entire ordered group on both image sides of that same note. User links express keep-together intent, not proof of same patient, chronology or an interval. Verify clinical relationships and timepoints from the original sources. Compare against the live card bank before generation; any exclusion must account for the whole group." };
  }
  const api = { empty, validate, groupFor, link, unlink, update, summary, selectedPlan, sameSavedData, sourceGroups, inherit, linkInfo, separate, restoreLinks };
  root.LectureCardReview = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
