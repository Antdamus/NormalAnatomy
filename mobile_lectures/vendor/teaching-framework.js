(function (root) {
  "use strict";
  const labels = { normal: "Anatomy and normal variants", pathology: "Pathology and cases", mixed: "Mixed anatomy and pathology" };
  const guidance = {
    normal: "Organize by visible structures, spatial relationships, normal imaging appearance, variants and interpretive pitfalls. Explain localization before testing identification; do not force normal structures into disease diagnoses.",
    pathology: "Organize by imaging appearance, case interpretation, close differentials, complications and management-relevant distinctions. Introduce only the anatomy needed to explain each finding.",
    mixed: "Build a shared normal map first: structures, spatial relations, protocols and variants. Then connect that map to abnormal appearances, real cases, mimics and decision-relevant distinctions. Keep anatomy recognition and diagnostic reasoning as distinct objectives inside one coherent lecture; use comparison images when they explain what changed. Do not assign a disease diagnosis to a normal image or create both card families merely because a lesson is mixed."
  };
  function recommend(input = {}) {
    const manifest = input.manifest || input.sourceMetadata?.masterSource?.manifest || input;
    const declared = input.teachingFramework || manifest.teachingFramework || input.sourceMetadata?.teachingFramework;
    if (declared && labels[declared.engine]) return { ...declared, label: labels[declared.engine] };
    const sources = manifest.sources || [];
    // Titles/headings establish a recommendation only, never a medical claim or per-image classification.
    const roles = sources.map(source => {
      if (["normal", "pathology", "mixed"].includes(source.teachingRole)) return source.teachingRole;
      const text = [source.title, ...(source.headings || []).map(h => typeof h === "string" ? h : h.text)].join(" ");
      return /gross anatomy|anatomy imaging issues|normal anatomy/i.test(text) ? "normal" : "pathology";
    });
    const text = String(input.articleTitle || input.title || manifest.articleTitle || "");
    const engine = roles.includes("mixed") || (roles.includes("normal") && roles.includes("pathology")) ? "mixed"
      : roles.length ? (roles.every(r => r === "normal") ? "normal" : "pathology")
      : /foundations.*anatomy|anatomy.*(?:cases|fat|atrophy|pathology)/i.test(text) ? "mixed"
      : /normal anatomy|gross anatomy/i.test(text) ? "normal" : "pathology";
    return { version: 1, engine, label: labels[engine], basis: "source-metadata-inference",
      reason: roles.includes("normal") && roles.includes("pathology") ? "Includes whole anatomy articles and disease/variant articles with different learning objectives."
        : `Suggested from the available article titles and headings; review this choice if the source mixes objectives.`,
      guidance: guidance[engine] };
  }
  function prompt(value) {
    const framework = recommend(value);
    return `TEACHING FRAMEWORK: ${framework.label}\nReason: ${framework.reason || "Reviewed source objectives."}\n${guidance[framework.engine]}\nAim for radiology understanding and Core preparation: a card needs a distinct, useful retrieval objective, not simply an available image. Do not claim verified Core coverage without accessible Core evidence.`;
  }
  const api = { labels, guidance, recommend, prompt };
  root.TeachingFramework = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
