const assert = require("node:assert/strict");
const {
  isMasterSourceLibraryObject,
  normalizeMasterSourceLibraryEnvelope,
  slugifyBundleId
} = require("../master-source-library-core.js");

assert.equal(slugifyBundleId("  Pancreatitis: Acute + Chronic  "), "pancreatitis-acute-chronic");
assert.equal(isMasterSourceLibraryObject({ bundles: [] }), true);
assert.equal(isMasterSourceLibraryObject({ packageText: "single" }), false);

const normalized = normalizeMasterSourceLibraryEnvelope(
  {
    version: 1,
    collectionKey: "gastrointestinal / pancreas",
    libraryTitle: "Pancreas Curriculum",
    activeBundleId: "tumors",
    bundles: [
      { bundleId: "foundations", articleTitle: "Foundations", packageText: "a" },
      { bundleId: "tumors", articleTitle: "Tumors", packageText: "b" }
    ]
  },
  (bundle) => ({ ...bundle, normalized: true })
);

assert.equal(normalized.activeBundleId, "tumors");
assert.deepEqual(normalized.bundles.map((bundle) => bundle.bundleId), ["foundations", "tumors"]);
assert.equal(normalized.bundles[0].collectionKey, "gastrointestinal / pancreas");
assert.equal(normalized.bundles[1].normalized, true);

assert.throws(
  () => normalizeMasterSourceLibraryEnvelope(
    { bundles: [{ bundleId: "same" }, { bundleId: "same" }] },
    (bundle) => bundle
  ),
  /Duplicate lecture bundle ID/
);
assert.throws(
  () => normalizeMasterSourceLibraryEnvelope({ version: 2, bundles: [{}] }, (bundle) => bundle),
  /Unsupported master source library version/
);

console.log("master-source-library tests passed");
