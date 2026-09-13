const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const crypto = require('crypto');
const bundle = path.resolve(__dirname, '..');
const root = path.resolve(bundle, '..', '..');
const text = name => fs.readFileSync(path.join(bundle, name), 'utf8').replace(/^\uFEFF/, '');
const json = name => JSON.parse(text(name));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source = fs.readFileSync(path.join(root, 'edge_radprimer_extension/service_worker.js'), 'utf8');
const checks = [];
function check(name, fn) { fn(); checks.push({name, passed: true}); }
const input = json('master_source_import.json');
const manifest = json('master_source_manifest.json');
const registry = json('image_registry.json');
const metadata = json('metadata.json');
const rp = json('RadPrimer_metadata.json');
const sd = json('STATdx_metadata.json');
const all = [...rp.imageRegistry, ...sd.imageRegistry];
const primary = input.selectedPrimaryImageIds;
const archive = input.archiveOptionalImageIds;
check('All import fields and serialized artifacts agree', () => {
  for (const field of ['version','articleTitle','createdAt','packageText','manifest','imageRegistry','sourceSelectionPlan','selectedPrimaryImageIds','archiveOptionalImageIds']) assert(field in input);
  assert.equal(input.version, 1);
  assert.equal(input.packageText, text('master_source_package.txt'));
  assert.deepEqual(input.manifest, manifest);
  assert.deepEqual(input.imageRegistry, registry);
  assert.deepEqual(input.sourceSelectionPlan, manifest.sourceSelectionPlan);
  assert.deepEqual(primary, manifest.selectedPrimaryImageIds);
  assert.deepEqual(archive, manifest.archiveOptionalImageIds);
  assert.equal(manifest.packageSha256, hash(path.join(bundle,'master_source_package.txt')));
});
check('Exact canonical metadata hierarchy and routing preserved', () => {
  assert.deepEqual(manifest.canonicalHierarchy, metadata.canonicalHierarchy);
  assert.deepEqual(manifest.canonicalHierarchy, rp.breadcrumbTrail);
  assert.equal(manifest.canonicalDeckPath, metadata.canonicalDeckPath);
  assert(input.packageText.includes(metadata.canonicalHierarchy.join(' > ')));
  assert(input.packageText.includes('deckPath: ' + metadata.canonicalDeckPath));
  assert(!input.packageText.includes(sd.breadcrumbTrail.join(' > ')));
  assert(!input.packageText.includes(rp.anki.manualDeckRoot));
});
check('All 69 source records preserved with qualified unique filenames', () => {
  assert(Array.isArray(registry)); assert.equal(registry.length,69);
  assert.equal(new Set(registry.map(e=>e.masterImageId)).size,69);
  const names=[];
  for (const e of registry) {
    for (const key of ['masterImageId','sourceKind','sourceLabel','sourceImageNumber','caption','usedFor','downloadRecommendation','plainFilename','annotatedFilename','plainUrl','annotatedUrl']) assert(key in e);
    const original=all.find(o=>o.masterImageId===e.masterImageId);
    assert(original);
    for (const key of ['imageId','sourceKind','sourceLabel','sourceImageNumber','caption','plainUrl','annotatedUrl']) assert.deepEqual(e[key],original[key]);
    assert.equal(e.originalPlainFilename,original.plainFilename);
    assert.equal(e.originalAnnotatedFilename,original.annotatedFilename);
    for (const variant of ['plain','annotated']) {
      assert(e[variant+'Filename'].startsWith(`${e.masterImageId}_${e.sourceLabel}_${variant}_`));
      names.push(e[variant+'Filename']);
    }
    assert.equal(e.visualEvidence.evidenceFilename,original.visualEvidence.evidenceFilename);
    assert.equal(e.visualEvidence.evidenceVariant,original.visualEvidence.evidenceVariant);
    assert.equal(e.visualEvidence.downloaded,true);
    assert.equal(e.visualEvidence.visuallyInspected,true);
    assert.equal(e.visualEvidence.sha256,hash(path.join(bundle,e.visualEvidence.evidenceFilename)));
  }
  assert.equal(new Set(names).size,138);
});
check('Primary/archive partition exhaustive and exact-only exclusions justified', () => {
  assert.equal(primary.length,40); assert.equal(archive.length,29);
  const p=new Set(primary),a=new Set(archive);
  assert.equal(p.size,40); assert.equal(a.size,29);
  assert.equal(new Set([...p,...a]).size,69);
  for (const e of registry) {
    assert.equal(p.has(e.masterImageId),e.downloadRecommendation==='primaryTeachingSet');
    assert.equal(a.has(e.masterImageId),e.downloadRecommendation==='archiveOptionalDuplicate');
    if (a.has(e.masterImageId)) {
      assert(p.has(e.duplicateOf)); assert(e.archiveReason.includes('Exact duplicate'));
      assert(e.duplicateEvidence);
    }
  }
  for (const e of registry.filter(e=>manifest.sourceCoverage.statdxAdditionalSelectedEntries.includes(e.masterImageId))) assert(e.usedFor.includes('recognitionReinforcement'));
});
check('RadPrimer image coverage gate complete and evidence-backed', () => {
  const gate=manifest.sourceCoverage.imageCoverageGate;
  assert.equal(gate.statdxFullyCoversRadPrimerImageSet,true);
  assert.equal(gate.radPrimerImageCoverage.length,28);
  assert.deepEqual(gate.classificationCounts,{exactDuplicate:28,nearDuplicate:0,conceptualReplacement:0,notCovered:0});
  for (const c of gate.radPrimerImageCoverage) {
    const r=registry.find(e=>e.masterImageId===c.radPrimerImageId);
    const s=registry.find(e=>e.masterImageId===c.replacementImageId);
    assert.equal(c.classification,'exactDuplicate'); assert.equal(r.imageId,s.imageId);
    assert.equal(c.evidence.visualReviewCompleted,true);
    assert(fs.existsSync(path.join(bundle,c.evidence.contactSheet)));
    assert.equal(c.evidence.byteIdentical,false);
    assert.notEqual(r.visualEvidence.sha256,s.visualEvidence.sha256);
  }
});
check('All source case clusters preserved or explicitly justified', () => {
  const seen=[];
  for (const c of manifest.caseClusters) {
    const members=[...c.sourceMembers.RadPrimer,...c.sourceMembers.STATdx];
    seen.push(...members);
    assert(c.atomic);
    for (const id of c.selectedImageIds) assert(primary.includes(id));
    for (const id of c.archiveImageIds) assert(archive.includes(id));
    assert.equal(c.selectedImageIds.length+c.archiveImageIds.length,members.length);
    for (const r of c.replacementMappings) assert(primary.includes(r.selectedImageId));
  }
  assert.equal(seen.length,69); assert.equal(new Set(seen).size,69);
  const splits=manifest.sourceSelectionPlan.caseClusterGuardrails.intentionalSplits;
  assert.equal(splits.length,1); assert.equal(splits[0].archivedImageId,'SDX-05');
  assert(splits[0].safeSplitReason.includes('SDX-02, SDX-03, SDX-04'));
  assert(registry.find(e=>e.masterImageId==='SDX-04').teachingCaption.includes('STATdx image 5'));
});
check('Source package labels and image library follow the curated set', () => {
  const library=input.packageText.split('=== SELECTED IMAGE LIBRARY ===')[1].split('=== OPTIONAL DUPLICATE RECOVERY INDEX ===')[0];
  const imageLines=library.split('\n').filter(l=>/^STATdx image \d+ \[/.test(l));
  assert.equal(imageLines.length,40);
  for (const e of registry.filter(e=>primary.includes(e.masterImageId))) {
    assert(library.includes(e.displayLabel+' ['));
    assert(library.includes('Image: '+e.plainFilename));
    assert(library.includes('Caption: '+e.teachingCaption));
  }
  for (const line of library.split('\n')) if (!/^\s*Image(?:_Annotated)?:/.test(line)) assert(!/\b(?:RP|SDX)-\d{2}\b/.test(line));
});

// Exercise the actual installed extension's import/selection helpers in isolation.
const names=['parseJsonMaybe','pickNamedFile','normalizeMasterSourceCache','collectMasterImageIdsFromPlan',
  'getMasterSourcePrimaryImageIds','getMasterSourceArchiveImageIds','buildMasterSourceCacheFromFiles',
  'normalizeImageRegistryEntry','normalizeImageRegistrySourceKind','normalizeSourceCompareKind',
  'flattenRegistryToDownloadFiles','shouldUseRegistryEntryForMasterDownload','buildSourceQualifiedImageFilename',
  'getDownloadBasename','getSourceFilenameLabel','normalizeArticleSourceKind','sanitizeDownloadPathPart',
  'normalizeArticleTitleKey','sanitizeAnkiDeckPart'];
const functions=names.map(name=>{
  const match=source.match(new RegExp('^function '+name+'\\([^]*?^\\}', 'm'));
  assert(match,`Missing extension helper ${name}`); return match[0];
}).join('\n\n');
const context=vm.createContext({Date,console,input,files:[{name:'master_source_import.json',text:JSON.stringify(input)}]});
vm.runInContext(functions,context);
const cache=JSON.parse(JSON.stringify(vm.runInContext('buildMasterSourceCacheFromFiles(files)',context)));
check('Actual extension import normalization accepts master_source_import.json', () => {
  assert.equal(cache.articleTitle,input.articleTitle); assert.equal(cache.packageText,input.packageText);
  assert.deepEqual(cache.manifest.canonicalHierarchy,metadata.canonicalHierarchy);
  assert.equal(cache.imageRegistry.length,69);
  assert.deepEqual(new Set(cache.selectedPrimaryImageIds),new Set(primary));
  assert.deepEqual(new Set(cache.archiveOptionalImageIds),new Set(archive));
});
check('Actual extension download filter produces exactly 80 curated variant files', () => {
  assert.equal(cache.downloadFiles.length,80);
  assert.equal(new Set(cache.downloadFiles.map(f=>f.filename)).size,80);
  for (const file of cache.downloadFiles) {
    assert(primary.includes(file.masterImageId)); assert(!archive.includes(file.masterImageId));
    const e=registry.find(e=>e.masterImageId===file.masterImageId);
    assert.equal(file.filename,e[file.variant+'Filename']);
    assert.equal(file.url,e[file.variant+'Url']);
  }
  const expected=input.sourceSelectionPlan.imageDownloadPlan.files.map(f=>[f.masterImageId,f.variant,f.filename,f.url]);
  const actual=cache.downloadFiles.map(f=>[f.masterImageId,f.variant,f.filename,f.url]);
  assert.deepEqual(actual,expected);
});
check('Separate-file import also selects the same primary image set', () => {
  context.files=['master_source_package.txt','master_source_manifest.json','image_registry.json'].map(name=>({name,text:text(name)}));
  const separate=JSON.parse(JSON.stringify(vm.runInContext('buildMasterSourceCacheFromFiles(files)',context)));
  assert.equal(separate.downloadFiles.length,80);
  assert.deepEqual(separate.selectedPrimaryImageIds,primary);
  assert.deepEqual(separate.archiveOptionalImageIds,archive);
});
check('Imported source files remain byte-identical to the staged browser bundle', () => {
  const staged=path.join('C:/Users/josem.000/Downloads/RadiologyMasterSource',path.basename(bundle));
  let compared=0;
  function walk(p,rel='') {
    for (const d of fs.readdirSync(p,{withFileTypes:true})) {
      if (d.isDirectory()) walk(path.join(p,d.name),path.join(rel,d.name));
      else if (!d.name.endsWith('.crdownload')) {
        const relative=path.join(rel,d.name);
        assert.equal(hash(path.join(staged,relative)),hash(path.join(bundle,relative)),relative);
        compared++;
      }
    }
  }
  walk(staged); assert(compared>=77);
  checks.push({name:'Staged source files verified',passed:true,fileCount:compared});
  const pointer=fs.readFileSync(path.join(root,'master_source_queue/_latest_master_source_bundle.txt'),'utf8').trim();
  assert.equal(path.resolve(pointer).toLowerCase(),bundle.toLowerCase());
});
const result={status:'passed',validatedAt:new Date().toISOString(),checks,
  totals:{registryEntries:69,selectedPrimaryImages:40,archiveOptionalImages:29,primaryVariantDownloads:80},
  extensionHelpersTested:names,extensionSourceSha256:hash(path.join(root,'edge_radprimer_extension/service_worker.js')),
  scope:'Static contract and actual extension helper execution; no live browser import or network download performed.'};
fs.writeFileSync(path.join(__dirname,'validation_results.json'),JSON.stringify(result,null,2)+'\n','utf8');
const outputs=['master_source_package.txt','master_source_manifest.json','image_registry.json','master_source_import.json','master_source_report.md'];
const marker=['DONE','articleTitle: '+input.articleTitle,'completedAt: '+result.validatedAt,'validation: passed',
  'selectedPrimaryImageIds: '+primary.join(', '),'archiveOptionalImageIds: '+archive.join(', '),
  'selectedPrimaryImageCount: 40','archiveOptionalImageCount: 29','primaryVariantDownloads: 80',
  'canonicalHierarchy: '+JSON.stringify(metadata.canonicalHierarchy),
  'canonicalDeckPath: '+metadata.canonicalDeckPath,
  ...outputs.map(name=>`${name} SHA256: ${hash(path.join(bundle,name))}`),
  'validationReport: _codex_review/validation_results.json','No cards or lecture generated.'];
fs.writeFileSync(path.join(bundle,'_codex_master_source_done.txt'),marker.join('\n')+'\n','utf8');
console.log(JSON.stringify({status:result.status,checks:checks.length,...result.totals,completionMarkerWritten:true},null,2));
