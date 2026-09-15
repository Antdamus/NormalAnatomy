(function initMasterSourceLibraryCore(globalScope) {
  "use strict";

  const LIBRARY_VERSION = 1;

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function slugifyBundleId(value, fallback = "master-source-bundle") {
    const slug = cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return slug || fallback;
  }

  function isMasterSourceLibraryObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.bundles));
  }

  function normalizeMasterSourceLibraryEnvelope(input = {}, normalizeBundle) {
    if (!isMasterSourceLibraryObject(input)) {
      throw new Error("Master source library must contain a bundles array.");
    }
    if (input.version != null && Number(input.version) !== LIBRARY_VERSION) {
      throw new Error(`Unsupported master source library version: ${input.version}.`);
    }
    if (!input.bundles.length) throw new Error("Master source library contains no lecture bundles.");
    if (input.bundles.length > 100) throw new Error("Master source library contains more than 100 lecture bundles.");
    if (typeof normalizeBundle !== "function") throw new Error("A bundle normalizer is required.");

    const collectionKey = cleanText(input.collectionKey);
    const libraryTitle = cleanText(input.libraryTitle || input.title || collectionKey || "Master Source Library");
    const seen = new Set();
    const bundles = input.bundles.map((bundle, index) => {
      if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
        throw new Error(`Lecture bundle ${index + 1} is not an object.`);
      }
      const articleTitle = cleanText(bundle.articleTitle || bundle.manifest?.articleTitle);
      const bundleId = slugifyBundleId(bundle.bundleId || articleTitle || `bundle-${index + 1}`);
      if (seen.has(bundleId)) throw new Error(`Duplicate lecture bundle ID: ${bundleId}.`);
      seen.add(bundleId);
      return normalizeBundle(
        {
          ...bundle,
          bundleId,
          collectionKey: cleanText(bundle.collectionKey || collectionKey),
          libraryTitle: cleanText(bundle.libraryTitle || libraryTitle),
          librarySequence: Number.isFinite(Number(bundle.librarySequence))
            ? Number(bundle.librarySequence)
            : index + 1
        },
        index
      );
    });

    const requestedActiveId = slugifyBundleId(input.activeBundleId || "", "");
    const activeBundleId = seen.has(requestedActiveId) ? requestedActiveId : bundles[0].bundleId;
    return {
      version: LIBRARY_VERSION,
      collectionKey,
      libraryTitle,
      createdAt: cleanText(input.createdAt) || new Date().toISOString(),
      importedAt: new Date().toISOString(),
      activeBundleId,
      bundles
    };
  }

  const api = {
    LIBRARY_VERSION,
    isMasterSourceLibraryObject,
    normalizeMasterSourceLibraryEnvelope,
    slugifyBundleId
  };

  globalScope.RadPrimerMasterSourceLibraryCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
