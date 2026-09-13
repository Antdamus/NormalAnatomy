const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert/strict'), crypto=require('crypto');
const bundle=path.resolve(__dirname,'..'), root=path.resolve(bundle,'..','..');
const text=n=>fs.readFileSync(path.join(bundle,n),'utf8').replace(/^\uFEFF/,'');
const json=n=>JSON.parse(text(n));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const input=json('master_source_import.json'), manifest=json('master_source_manifest.json'), registry=json('image_registry.json');
const meta=json('metadata.json'), rp=json('RadPrimer_metadata.json'), sd=json('STATdx_metadata.json');
const originals=[...rp.imageRegistry,...sd.imageRegistry], primary=input.selectedPrimaryImageIds, archive=input.archiveOptionalImageIds;
const get=id=>registry.find(e=>e.masterImageId===id);
const checks=[];
function check(name,fn){fn();checks.push({name,passed:true});}
check('Import contract and independently serialized artifacts agree',()=>{
 for(const f of ['version','articleTitle','createdAt','packageText','manifest','imageRegistry','sourceSelectionPlan','selectedPrimaryImageIds','archiveOptionalImageIds']) assert(f in input);
 assert.equal(input.version,1);assert.equal(input.articleTitle,meta.articleTitle);
 assert.equal(input.packageText,text('master_source_package.txt'));
 assert.deepEqual(input.manifest,manifest);assert.deepEqual(input.imageRegistry,registry);
 assert.deepEqual(input.sourceSelectionPlan,manifest.sourceSelectionPlan);
 assert.deepEqual(primary,manifest.selectedPrimaryImageIds);assert.deepEqual(archive,manifest.archiveOptionalImageIds);
 assert.equal(manifest.packageSha256,hash(path.join(bundle,'master_source_package.txt')));
});
check('Exact canonical RadPrimer hierarchy and supplied routing preserved',()=>{
 assert.deepEqual(manifest.canonicalHierarchy,meta.canonicalHierarchy);assert.deepEqual(manifest.canonicalHierarchy,rp.breadcrumbTrail);
 assert.equal(manifest.canonicalDeckPath,meta.canonicalDeckPath);
 assert(input.packageText.includes(meta.canonicalHierarchy.join(' > ')));
 assert(input.packageText.includes('deckPath: '+meta.canonicalDeckPath));
 assert(!input.packageText.includes(sd.breadcrumbTrail.join(' > ')));
 assert(!input.packageText.includes(rp.anki.manualDeckRoot));
});
check('All source records, captions, URLs, stable IDs and evidence preserved',()=>{
 assert(Array.isArray(registry));assert.equal(registry.length,44);assert.equal(new Set(registry.map(e=>e.masterImageId)).size,44);
 const names=[];
 for(const e of registry){
  for(const f of ['masterImageId','sourceKind','sourceLabel','sourceImageNumber','caption','usedFor','downloadRecommendation','plainFilename','annotatedFilename','plainUrl','annotatedUrl','visualEvidence'])assert(f in e);
  const original=originals.find(o=>o.masterImageId===e.masterImageId);assert(original);
  for(const f of ['imageId','sourceKind','sourceLabel','sourceImageNumber','caption','plainUrl','annotatedUrl']) assert.deepEqual(e[f],original[f]);
  assert.equal(e.originalPlainFilename,original.plainFilename);assert.equal(e.originalAnnotatedFilename,original.annotatedFilename);
  for(const v of ['plain','annotated']){assert(e[v+'Filename'].startsWith(`${e.masterImageId}_${e.sourceLabel}_${v}_`));names.push(e[v+'Filename']);}
  assert.equal(e.filename,e.plainFilename);
  assert.equal(e.visualEvidence.evidenceFilename,original.visualEvidence.evidenceFilename);
  assert.equal(e.visualEvidence.evidenceVariant,original.visualEvidence.evidenceVariant);
  assert.equal(e.visualEvidence.downloaded,true);assert.equal(e.visualEvidence.visuallyInspected,true);
  assert.equal(e.visualEvidence.sha256,hash(path.join(bundle,e.visualEvidence.evidenceFilename)));
 }
 assert.equal(new Set(names).size,88);
});
check('Source and embedded metadata, image manifests and captions agree',()=>{
 for(const src of meta.sources){
  const single=json(src.sourceLabel+'_metadata.json');assert.deepEqual(src.metadata,single);assert.deepEqual(src.imageRegistry,single.imageRegistry);
  const caps=[...text(src.sourceLabel+'_source_package.txt').replace(/\r\n/g,'\n').matchAll(/IMAGE_(\d+):[^\n]*\n[\s\S]*?    Caption: ([\s\S]*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)/g)];
  assert.equal(caps.length,single.imageRegistry.length);
  caps.forEach((c,i)=>{assert.equal(Number(c[1]),single.imageRegistry[i].sourceImageNumber);assert.equal(c[2].trim(),single.imageRegistry[i].caption.trim());});
 }
 assert.deepEqual(json('image_evidence_manifest.json'),meta.imageEvidence);
 assert.equal(meta.imageEvidence.entries.length,44);
 const essential=n=>text(n).split('ESSENTIAL INFORMATION')[1].split('=== IMAGES')[0].trim();
 assert.equal(essential('RadPrimer_source_package.txt'),essential('STATdx_source_package.txt'));
 for(const f of manifest.inputFiles)assert.equal(f.sha256,hash(path.join(bundle,f.filename)));
});
check('Primary/archive partitions are exhaustive and archives have exact evidence',()=>{
 assert.equal(primary.length,23);assert.equal(archive.length,21);
 assert.equal(new Set(primary).size,23);assert.equal(new Set(archive).size,21);
 assert.equal(new Set([...primary,...archive]).size,44);
 for(const e of registry){
  assert.equal(primary.includes(e.masterImageId),e.downloadRecommendation==='primaryTeachingSet');
  assert.equal(archive.includes(e.masterImageId),e.downloadRecommendation==='archiveOptionalDuplicate');
  if(archive.includes(e.masterImageId)){assert(primary.includes(e.duplicateOf));assert(e.archiveReason.includes('Exact duplicate'));assert(e.duplicateEvidence);assert.equal(e.duplicateClassification,'exactDuplicate');}
 }
 for(const id of ['SDX-10','SDX-11','SDX-16']){assert(primary.includes(id));assert(get(id).usedFor.includes('recognitionReinforcement'));}
 const plan=input.sourceSelectionPlan.imageDownloadPlan;
 assert.deepEqual([...plan.primaryTeachingSet.RadPrimer,...plan.primaryTeachingSet.STATdx],primary);
 assert.deepEqual([...plan.archiveOptionalDuplicates.RadPrimer,...plan.archiveOptionalDuplicates.STATdx],archive);
 assert.equal(plan.files.length,46);
});
check('Every RadPrimer entry has an evidence-backed image coverage decision',()=>{
 const gate=manifest.sourceCoverage.imageCoverageGate;
 assert.equal(gate.performedBeforeMerge,true);assert.equal(gate.statdxFullyCoversRadPrimerImageSet,true);
 assert.equal(gate.radPrimerImageCoverage.length,20);
 assert.deepEqual(gate.classificationCounts,{exactDuplicate:20,nearDuplicate:0,conceptualReplacement:0,notCovered:0});
 const seen=[];
 for(const c of gate.radPrimerImageCoverage){
  seen.push(c.radPrimerImageId);assert.equal(c.classification,'exactDuplicate');
  const r=get(c.radPrimerImageId),s=get(c.replacementImageId);
  assert.equal(r.imageId,s.imageId);assert.equal(c.evidence.sameStableSourceImageId,r.imageId);
  assert.equal(c.evidence.visualReviewCompleted,true);assert.equal(c.evidence.byteIdentical,false);
  assert.notEqual(r.visualEvidence.sha256,s.visualEvidence.sha256);
  assert(fs.existsSync(path.join(bundle,c.evidence.contactSheet)));assert(c.visualObservation.length>40);
 }
 assert.deepEqual(seen,rp.imageRegistry.map(e=>e.masterImageId));
 const extra=manifest.additionalDuplicateDecisions[0];
 assert.equal(extra.archivedImageId,'SDX-05');assert.equal(extra.selectedImageId,'SDX-01');
 assert.equal(extra.evidence.sameStableSourceImageId,false);assert.notEqual(get('SDX-01').imageId,get('SDX-05').imageId);
 assert.equal(extra.evidence.originalFilesViewedIndividually,true);assert.equal(extra.evidence.visualReviewCompleted,true);
});
check('Atomic source clusters preserved and only redundant same-slice split documented',()=>{
 const members=[];
 for(const c of manifest.caseClusters){
  const all=[...c.sourceMembers.RadPrimer,...c.sourceMembers.STATdx];members.push(...all);assert(c.atomic);
  assert.equal(c.selectedImageIds.length+c.archiveImageIds.length,all.length);
  for(const id of c.selectedImageIds)assert(primary.includes(id));for(const id of c.archiveImageIds)assert(archive.includes(id));
  for(const r of c.replacementMappings){assert(archive.includes(r.archivedImageId));assert(primary.includes(r.selectedImageId));}
  for(const id of all)assert.equal(get(id).caseClusterId,c.clusterId);
 }
 assert.equal(members.length,44);assert.equal(new Set(members).size,44);
 for(const pair of [['SDX-03','SDX-04'],['SDX-10','SDX-11'],['SDX-12','SDX-13'],['SDX-14','SDX-15'],['SDX-17','SDX-18']]){
  assert(pair.every(id=>primary.includes(id)));assert.equal(get(pair[0]).caseClusterId,get(pair[1]).caseClusterId);
  assert(get(pair[1]).teachingCaption.includes(get(pair[0]).displayLabel));
 }
 const splits=manifest.sourceSelectionPlan.caseClusterGuardrails.intentionalSplits;assert.equal(splits.length,1);assert.equal(splits[0].archivedImageId,'SDX-05');
 assert(text('master_source_report.md').includes('one intentional selected/archive split'));
});
check('Curated source library uses clean source-qualified display labels',()=>{
 const library=input.packageText.split('=== SELECTED IMAGE LIBRARY ===')[1].split('=== OPTIONAL DUPLICATE RECOVERY INDEX ===')[0];
 assert.equal(library.split('\n').filter(l=>/^STATdx image \d+ \[STATdx\]/.test(l)).length,23);
 for(const e of registry.filter(e=>primary.includes(e.masterImageId))){
  assert(library.includes(e.displayLabel+' [STATdx]'));assert(library.includes('Image: '+e.plainFilename));
  assert(library.includes('Image_Annotated: '+e.annotatedFilename));assert(library.includes('Caption: '+e.teachingCaption));
 }
 for(const line of library.split('\n'))if(!/^\s*Image(?:_Annotated)?:/.test(line))assert(!/\b(?:RP|SDX)-\d{2}\b/.test(line));
 assert.equal(manifest.coreValidation.suppliedAuditableCoreEvidence,false);
});

// Execute the real installed extension helpers without invoking browser/network actions.
const source=fs.readFileSync(path.join(root,'edge_radprimer_extension/service_worker.js'),'utf8');
const names=['parseJsonMaybe','pickNamedFile','normalizeMasterSourceCache','collectMasterImageIdsFromPlan',
 'getMasterSourcePrimaryImageIds','getMasterSourceArchiveImageIds','buildMasterSourceCacheFromFiles',
 'normalizeImageRegistryEntry','normalizeImageRegistrySourceKind','normalizeSourceCompareKind',
 'flattenRegistryToDownloadFiles','shouldUseRegistryEntryForMasterDownload','buildSourceQualifiedImageFilename',
 'getDownloadBasename','getSourceFilenameLabel','normalizeArticleSourceKind','sanitizeDownloadPathPart',
 'normalizeArticleTitleKey','sanitizeAnkiDeckPart'];
const functionText=names.map(n=>{const match=source.match(new RegExp('^function '+n+'\\([^]*?^\\}','m'));assert(match,n);return match[0];}).join('\n\n');
const context=vm.createContext({Date,console,files:[{name:'master_source_import.json',text:JSON.stringify(input)}]});
vm.runInContext(functionText,context);
const cache=JSON.parse(JSON.stringify(vm.runInContext('buildMasterSourceCacheFromFiles(files)',context)));
check('Actual extension single-JSON import accepts all artifacts and selection fields',()=>{
 assert.equal(cache.packageText,input.packageText);assert.equal(cache.articleTitle,input.articleTitle);
 assert.deepEqual(cache.manifest.canonicalHierarchy,meta.canonicalHierarchy);assert.equal(cache.imageRegistry.length,44);
 assert.deepEqual(cache.selectedPrimaryImageIds,primary);assert.deepEqual(cache.archiveOptionalImageIds,archive);
});
check('Actual extension download filter emits exactly 46 curated source-qualified files',()=>{
 assert.equal(cache.downloadFiles.length,46);assert.equal(new Set(cache.downloadFiles.map(f=>f.filename)).size,46);
 for(const f of cache.downloadFiles){assert(primary.includes(f.masterImageId));assert(!archive.includes(f.masterImageId));const e=get(f.masterImageId);assert.equal(f.filename,e[f.variant+'Filename']);assert.equal(f.url,e[f.variant+'Url']);}
 const fields=f=>[f.masterImageId,f.variant,f.filename,f.url];
 assert.deepEqual(cache.downloadFiles.map(fields),input.sourceSelectionPlan.imageDownloadPlan.files.map(fields));
});
check('Actual extension separate-file import preserves the same curated set',()=>{
 context.files=['master_source_package.txt','master_source_manifest.json','image_registry.json'].map(n=>({name:n,text:text(n)}));
 const separate=JSON.parse(JSON.stringify(vm.runInContext('buildMasterSourceCacheFromFiles(files)',context)));
 assert.deepEqual(separate.selectedPrimaryImageIds,primary);assert.deepEqual(separate.archiveOptionalImageIds,archive);
 assert.equal(separate.downloadFiles.length,46);
});
check('Imported browser files are byte-identical and latest pointer targets this bundle',()=>{
 const staged=path.join('C:/Users/josem.000/Downloads/RadiologyMasterSource',path.basename(bundle));
 let count=0;
 function walk(dir,relative=''){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=path.join(relative,entry.name);
   if(entry.isDirectory())walk(path.join(dir,entry.name),rel);
   else if(!entry.name.endsWith('.crdownload')){assert.equal(hash(path.join(staged,rel)),hash(path.join(bundle,rel)),rel);count++;}
  }
 }
 walk(staged);assert.equal(count,53);checks.push({name:'Staged files verified',passed:true,fileCount:count});
 const pointer=fs.readFileSync(path.join(root,'master_source_queue/_latest_master_source_bundle.txt'),'utf8').trim();
 assert.equal(path.resolve(pointer).toLowerCase(),bundle.toLowerCase());
});
const result={status:'passed',validatedAt:new Date().toISOString(),checks,totals:{registryEntries:44,selectedPrimaryImages:23,archiveOptionalImages:21,primaryVariantDownloads:46,caseClusters:18},
 extensionHelpersTested:names,extensionSourceSha256:hash(path.join(root,'edge_radprimer_extension/service_worker.js')),
 scope:'Artifact integrity, preserved sources, image evidence, clusters and actual extension import/download helpers. No live browser import or remote image download performed.'};
fs.writeFileSync(path.join(__dirname,'validation_results.json'),JSON.stringify(result,null,2)+'\n','utf8');
const outputs=['master_source_package.txt','master_source_manifest.json','image_registry.json','master_source_import.json','master_source_report.md'];
const marker=['DONE','articleTitle: '+input.articleTitle,'completedAt: '+result.validatedAt,'validation: passed',
 'selectedPrimaryImageIds: '+primary.join(', '),'archiveOptionalImageIds: '+archive.join(', '),
 'selectedPrimaryImageCount: 23','archiveOptionalImageCount: 21','primaryVariantDownloads: 46',
 'canonicalHierarchy: '+JSON.stringify(meta.canonicalHierarchy),'canonicalDeckPath: '+meta.canonicalDeckPath,
 ...outputs.map(n=>`${n} SHA256: ${hash(path.join(bundle,n))}`),'validationReport: _codex_review/validation_results.json','No cards or lecture generated.'];
fs.writeFileSync(path.join(bundle,'_codex_master_source_done.txt'),marker.join('\n')+'\n','utf8');
console.log(JSON.stringify({status:result.status,checks:checks.length,...result.totals,completionMarkerWritten:true},null,2));
