const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert/strict'), crypto=require('crypto');
const bundle=path.resolve(__dirname,'..'), root=path.resolve(bundle,'..','..');
const text=n=>fs.readFileSync(path.join(bundle,n),'utf8').replace(/^\uFEFF/,'');
const json=n=>JSON.parse(text(n));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const input=json('master_source_import.json'), manifest=json('master_source_manifest.json'), registry=json('image_registry.json');
const meta=json('metadata.json'), rp=json('RadPrimer_metadata.json'), sd=json('STATdx_metadata.json');
const evidence=json('image_evidence_manifest.json'), audit=json('_codex_review/image_file_audit.json');
const originals=[...rp.imageRegistry,...sd.imageRegistry], primary=input.selectedPrimaryImageIds, archive=input.archiveOptionalImageIds;
const get=id=>registry.find(e=>e.masterImageId===id);
const checks=[];
function check(name,fn){fn();checks.push({name,passed:true});}

check('Complete import contract and separately serialized artifacts agree',()=>{
 for(const f of ['version','articleTitle','createdAt','packageText','manifest','imageRegistry','sourceSelectionPlan','selectedPrimaryImageIds','archiveOptionalImageIds'])assert(f in input);
 assert.equal(input.version,1);assert.equal(input.articleTitle,meta.articleTitle);
 assert.equal(input.packageText,text('master_source_package.txt'));
 assert.deepEqual(input.manifest,manifest);assert.deepEqual(input.imageRegistry,registry);
 assert.deepEqual(input.sourceSelectionPlan,manifest.sourceSelectionPlan);
 assert.deepEqual(primary,manifest.selectedPrimaryImageIds);assert.deepEqual(archive,manifest.archiveOptionalImageIds);
 assert.equal(manifest.packageSha256,hash(path.join(bundle,'master_source_package.txt')));
});
check('Exact RadPrimer canonical hierarchy and provided deck path preserved',()=>{
 assert.deepEqual(manifest.canonicalHierarchy,meta.canonicalHierarchy);assert.deepEqual(manifest.canonicalHierarchy,rp.breadcrumbTrail);
 assert.equal(manifest.canonicalDeckPath,meta.canonicalDeckPath);
 assert(input.packageText.includes(meta.canonicalHierarchy.join(' > ')));
 assert(input.packageText.includes('canonicalHierarchy: '+JSON.stringify(meta.canonicalHierarchy).replace(/,/g,', ')));
 assert(input.packageText.includes('deckPath: '+meta.canonicalDeckPath));
 assert(!input.packageText.includes(sd.breadcrumbTrail.join(' > ')));
 assert(!input.packageText.includes(rp.anki.manualDeckRoot));
 assert.equal(manifest.generatedCards,false);assert.equal(manifest.generatedLecture,false);
});
check('All original records, captions, URLs, stable IDs and evidence preserved',()=>{
 assert(Array.isArray(registry));assert.equal(registry.length,28);assert.equal(new Set(registry.map(e=>e.masterImageId)).size,28);
 const names=[];
 for(const e of registry){
  for(const f of ['masterImageId','sourceKind','sourceLabel','sourceImageNumber','caption','usedFor','downloadRecommendation','plainFilename','annotatedFilename','plainUrl','annotatedUrl','visualEvidence'])assert(f in e);
  const original=originals.find(o=>o.masterImageId===e.masterImageId);assert(original);
  for(const f of ['imageId','sourceKind','sourceLabel','sourceImageNumber','caption','plainUrl','annotatedUrl'])assert.deepEqual(e[f],original[f]);
  assert.equal(e.originalPlainFilename,original.plainFilename);assert.equal(e.originalAnnotatedFilename,original.annotatedFilename);
  assert.equal(e.originalGroup,original.group||'');assert.deepEqual(e.originalGroupNumbers,original.groupNumbers||[]);
  for(const v of ['plain','annotated']){assert(e[v+'Filename'].startsWith(`${e.masterImageId}_${e.sourceLabel}_${v}_`));names.push(e[v+'Filename']);assert(new URL(e[v+'Url']).hostname.endsWith(e.sourceKind+'.com'));}
  assert.equal(e.filename,e.plainFilename);
  for(const f of ['evidenceFilename','evidenceVariant','downloaded'])assert.deepEqual(e.visualEvidence[f],original.visualEvidence[f]);
  assert.equal(e.visualEvidence.downloaded,true);assert.equal(e.visualEvidence.visuallyInspected,true);
  assert.equal(e.visualEvidence.sha256,hash(path.join(bundle,e.visualEvidence.evidenceFilename)));
  const a=audit.files.find(a=>a.masterImageId===e.masterImageId);assert(a);
  assert.equal(a.sha256,e.visualEvidence.sha256);assert.deepEqual(a.dimensions,e.visualEvidence.dimensions);
  assert(fs.existsSync(path.join(bundle,e.visualEvidence.contactSheet)));
  assert.deepEqual(e.sourceAnnotationTokens,[...e.caption.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m=>m[1]));
  assert.equal(e.annotationAssets.annotatedVariantDownloadedInBundle,false);
 }
 assert.equal(new Set(names).size,56);assert.equal(audit.files.length,28);assert.equal(audit.visuallyInspected,true);
});
check('Source metadata, source captions, image evidence and input hashes agree',()=>{
 for(const src of meta.sources){
  const single=json(src.sourceLabel+'_metadata.json');assert.deepEqual(src.metadata,single);assert.deepEqual(src.imageRegistry,single.imageRegistry);
  const caps=[...text(src.sourceLabel+'_source_package.txt').replace(/\r\n/g,'\n').matchAll(/IMAGE_(\d+):[^\n]*\n[\s\S]*?    Caption: ([\s\S]*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)/g)];
  assert.equal(caps.length,single.imageRegistry.length);
  caps.forEach((c,i)=>{assert.equal(Number(c[1]),single.imageRegistry[i].sourceImageNumber);assert.equal(c[2].trim(),single.imageRegistry[i].caption.trim());});
  for(const e of single.imageRegistry){
   const ev=evidence.entries.find(a=>a.masterImageId===e.masterImageId);assert(ev);
   for(const f of ['imageId','caption','sourceImageNumber','sourceKind'])assert.deepEqual(ev[f],e[f]);
   for(const f of ['evidenceFilename','evidenceVariant','downloaded'])assert.deepEqual(ev[f],e.visualEvidence[f]);
  }
 }
 assert.deepEqual(evidence,meta.imageEvidence);assert.equal(evidence.entries.length,28);
 const essential=n=>text(n).replace(/\r\n/g,'\n').split('ESSENTIAL INFORMATION\n')[1].split('=== IMAGES')[0].trim();
 assert.equal(essential('RadPrimer_source_package.txt'),essential('STATdx_source_package.txt'));
 const corrected=essential('RadPrimer_source_package.txt').replace('Oxidized surgical gelatin (Surgicel)','Oxidized regenerated cellulose (Surgicel)');
 assert(input.packageText.includes(corrected));
 const differential=text('RadPrimer_source_package.txt').replace(/\r\n/g,'\n').split('DIFFERENTIAL DIAGNOSIS\n')[1].split('ESSENTIAL INFORMATION')[0].trim();
 assert(input.packageText.includes(differential));
 for(const f of manifest.inputFiles)assert.equal(f.sha256,hash(path.join(bundle,f.filename)));
});
check('Primary/archive partition retains every unique image and archives only exact copies',()=>{
 assert.equal(primary.length,14);assert.equal(archive.length,14);
 assert.deepEqual(primary,sd.imageRegistry.map(e=>e.masterImageId));
 assert.deepEqual(archive,rp.imageRegistry.map(e=>e.masterImageId));
 assert.equal(new Set([...primary,...archive]).size,28);
 assert.equal(new Set(primary.map(id=>get(id).imageId)).size,14);
 for(const e of registry){
  assert.equal(primary.includes(e.masterImageId),e.downloadRecommendation==='primaryTeachingSet');
  assert.equal(archive.includes(e.masterImageId),e.downloadRecommendation==='archiveOptionalDuplicate');
  if(archive.includes(e.masterImageId)){
   assert(primary.includes(e.duplicateOf));assert(e.archiveReason.includes('Exact duplicate'));
   assert.equal(e.duplicateClassification,'exactDuplicate');assert(e.duplicateEvidence.visualReviewCompleted);
   assert.equal(e.imageId,get(e.duplicateOf).imageId);assert.deepEqual(e.usedFor,[]);
  }else assert(e.usedFor.length>0);
 }
 const plan=input.sourceSelectionPlan.imageDownloadPlan;
 assert.deepEqual([...plan.primaryTeachingSet.RadPrimer,...plan.primaryTeachingSet.STATdx],primary);
 assert.deepEqual([...plan.archiveOptionalDuplicates.RadPrimer,...plan.archiveOptionalDuplicates.STATdx],archive);
 assert.equal(plan.files.length,28);assert.equal(plan.archiveDownloadsByDefault,false);
 for(const g of manifest.sourceCoverage.recognitionComparisons){assert(g.allRetained);assert(g.imageIds.every(id=>primary.includes(id)));}
 for(const id of ['SDX-02','SDX-04','SDX-06','SDX-07','SDX-09','SDX-11','SDX-13','SDX-14'])assert(get(id).usedFor.includes('recognitionReinforcement'));
});
check('Every RadPrimer coverage decision is supported by actual files and matching UUIDs',()=>{
 const gate=manifest.sourceCoverage.imageCoverageGate;
 assert(gate.performedBeforeMerge);assert(gate.statdxFullyCoversRadPrimerImageSet);
 assert.equal(gate.radPrimerImageCoverage.length,14);
 assert.deepEqual(gate.classificationCounts,{exactDuplicate:14,nearDuplicate:0,conceptualReplacement:0,notCovered:0});
 const seen=[];
 for(const c of gate.radPrimerImageCoverage){
  seen.push(c.radPrimerImageId);assert.equal(c.classification,'exactDuplicate');
  const r=get(c.radPrimerImageId),s=get(c.replacementImageId);
  assert.equal(r.imageId,s.imageId);assert.equal(c.evidence.sameStableSourceImageId,r.imageId);
  assert.equal(c.evidence.visualReviewCompleted,true);assert.equal(c.evidence.byteIdentical,false);assert.equal(c.evidence.rgbPixelIdentical,false);
  assert.notEqual(r.visualEvidence.sha256,s.visualEvidence.sha256);
  assert.equal(r.visualEvidence.sha256,c.evidence.radPrimerSha256);assert.equal(s.visualEvidence.sha256,c.evidence.statdxSha256);
  assert.deepEqual(c.evidence.radPrimerDimensions,[900,900]);assert.deepEqual(c.evidence.statdxDimensions,[1000,1000]);
  assert(fs.existsSync(path.join(bundle,c.evidence.contactSheet)));assert(c.visualObservation.length>40);
 }
 assert.deepEqual(seen,rp.imageRegistry.map(e=>e.masterImageId));
 assert.deepEqual(audit.pairDecisions,gate.radPrimerImageCoverage);
});
check('Whole-case replacements and composite panels are complete without invented follow-up',()=>{
 const members=[];
 for(const c of manifest.caseClusters){
  const all=[...c.sourceMembers.RadPrimer,...c.sourceMembers.STATdx];members.push(...all);assert(c.atomic);assert.equal(c.intentionalSplit,false);
  assert.deepEqual(c.selectedImageIds,c.sourceMembers.STATdx);assert.deepEqual(c.archiveImageIds,c.sourceMembers.RadPrimer);
  for(const r of c.replacementMappings){assert(archive.includes(r.archivedImageId));assert(primary.includes(r.selectedImageId));assert.equal(get(r.archivedImageId).imageId,get(r.selectedImageId).imageId);}
  for(const id of all){assert.equal(get(id).caseClusterId,c.clusterId);assert.equal(get(id).panelCount,c.panelCountPerSourceImage);}
  assert.deepEqual(c.separateImageSamePatientLinks,[]);
 }
 assert.equal(members.length,28);assert.equal(new Set(members).size,28);
 assert.equal(get('SDX-07').panelCount,4);assert.equal(get('SDX-09').panelCount,2);
 assert(get('SDX-09').caseContext.includes('CT is not supplied'));assert(get('SDX-14').caseContext.includes('prior trauma image is not supplied'));
 assert.deepEqual(manifest.sourceSelectionPlan.caseClusterGuardrails.intentionalSplits,[]);
 assert(text('master_source_report.md').includes('No source case cluster was intentionally split.'));
});
check('Clean source labels, caption correction, anatomical caution and no false Core attribution',()=>{
 const library=input.packageText.split('=== SELECTED IMAGE LIBRARY ===')[1].split('=== OPTIONAL DUPLICATE RECOVERY INDEX ===')[0];
 assert.equal(library.split('\n').filter(l=>/^STATdx image \d+ \[STATdx\]/.test(l)).length,14);
 for(const e of registry.filter(e=>primary.includes(e.masterImageId))){
  assert(library.includes(e.displayLabel+' [STATdx]'));assert(library.includes('Image: '+e.plainFilename));
  assert(library.includes('Image_Annotated: '+e.annotatedFilename));assert(library.includes('Caption: '+e.teachingCaption));
 }
 for(const line of input.packageText.split('\n'))if(!/^\s*Image(?:_Annotated)?:/.test(line))assert(!/\b(?:RP|SDX)-\d{2}\b/.test(line));
 assert(get('SDX-10').caption.includes('oxidized surgical gelatin'));
 assert(get('SDX-10').teachingCaption.includes('oxidized regenerated cellulose'));
 for(const e of registry)assert.equal(e.teachingCaption,e.caption.replace('oxidized surgical gelatin (Surgicel)','oxidized regenerated cellulose (Surgicel)'));
 assert(get('SDX-11').caseContext.includes('pelvic CT'));assert(get('SDX-11').usedFor.includes('crossAnatomicAnalogy'));
 assert.equal(manifest.coreValidation.suppliedAuditableCoreEvidence,false);
 assert(input.packageText.includes('no auditable Core evidence supplied'));
 assert(input.packageText.includes('https://www.jnjmedtech.com/en-US/products/surgery/biosurgery/surgicel-original-absorbable-hemostat/'));
 assert.equal(manifest.sourceQualityNotes.length,6);
});

// Use the real extension helpers, extracted without starting browser listeners or network activity.
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
check('Installed extension single-file JSON import accepts the source package',()=>{
 assert.equal(cache.packageText,input.packageText);assert.equal(cache.articleTitle,input.articleTitle);
 assert.deepEqual(cache.manifest.canonicalHierarchy,meta.canonicalHierarchy);assert.equal(cache.imageRegistry.length,28);
 assert.deepEqual(cache.selectedPrimaryImageIds,primary);assert.deepEqual(cache.archiveOptionalImageIds,archive);
});
check('Installed extension download filter emits exactly 28 intended source-qualified files',()=>{
 assert.equal(cache.downloadFiles.length,28);assert.equal(new Set(cache.downloadFiles.map(f=>f.filename)).size,28);
 for(const f of cache.downloadFiles){assert(primary.includes(f.masterImageId));assert(!archive.includes(f.masterImageId));const e=get(f.masterImageId);assert.equal(f.filename,e[f.variant+'Filename']);assert.equal(f.url,e[f.variant+'Url']);}
 const fields=f=>[f.masterImageId,f.variant,f.filename,f.url];
 assert.deepEqual(cache.downloadFiles.map(fields),input.sourceSelectionPlan.imageDownloadPlan.files.map(fields));
});
check('Installed extension separate-file import produces the same curated set',()=>{
 context.files=['master_source_package.txt','master_source_manifest.json','image_registry.json'].map(n=>({name:n,text:text(n)}));
 const separate=JSON.parse(JSON.stringify(vm.runInContext('buildMasterSourceCacheFromFiles(files)',context)));
 assert.deepEqual(separate.selectedPrimaryImageIds,primary);assert.deepEqual(separate.archiveOptionalImageIds,archive);
 assert.equal(separate.downloadFiles.length,28);assert.equal(separate.packageText,input.packageText);
});
let copiedFileCount=0;
let latestPointerAtValidation='';
check('Every staged file was imported byte-for-byte into the explicitly requested bundle',()=>{
 const staged=path.join('C:/Users/josem.000/Downloads/RadiologyMasterSource',path.basename(bundle));
 function walk(dir,relative=''){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=path.join(relative,entry.name);
   if(entry.isDirectory())walk(path.join(dir,entry.name),rel);
   else if(!entry.name.endsWith('.crdownload')){assert.equal(hash(path.join(staged,rel)),hash(path.join(bundle,rel)),rel);copiedFileCount++;}
  }
 }
 walk(staged);assert.equal(copiedFileCount,37);
 assert.equal(path.basename(bundle),'Liver_Lesion_Containing_Gas_2026-09-13T01-26-09-985Z');
 latestPointerAtValidation=fs.readFileSync(path.join(root,'master_source_queue/_latest_master_source_bundle.txt'),'utf8').trim();
});
const result={status:'passed',validatedAt:new Date().toISOString(),checks,
 importObservation:{initialLatestPointerRead:bundle,latestPointerAtValidation,pointerAdvancedDuringSynthesis:path.resolve(latestPointerAtValidation).toLowerCase()!==bundle.toLowerCase(),handling:'The initial importer result and pointer read matched the user-named bundle. The shared pointer may advance due to other work; validation continues against the explicit requested bundle without overwriting that pointer.'},
 totals:{registryEntries:28,selectedPrimaryImages:14,archiveOptionalImages:14,primaryVariantDownloads:28,caseClusters:14,stagedFilesVerified:copiedFileCount},
 extensionHelpersTested:names,extensionSourceSha256:hash(path.join(root,'edge_radprimer_extension/service_worker.js')),
 scope:'Source-copy fidelity, artifact integrity, recorded visual evidence, whole-case/composite preservation and real extension helper import/download compatibility. No live browser import or remote image download performed.'};
fs.writeFileSync(path.join(__dirname,'validation_results.json'),JSON.stringify(result,null,2)+'\n','utf8');
const outputs=['master_source_package.txt','master_source_manifest.json','image_registry.json','master_source_import.json','master_source_report.md'];
const marker=['DONE','masterSourceComplete=true','articleTitle: '+input.articleTitle,'completedAt: '+result.validatedAt,'validation: passed',
 'selectedPrimaryImageIds: '+primary.join(', '),'archiveOptionalImageIds: '+archive.join(', '),
 'selectedPrimaryImageCount: 14','archiveOptionalImageCount: 14','primaryVariantDownloads: 28',
 'canonicalHierarchy: '+JSON.stringify(meta.canonicalHierarchy),'canonicalDeckPath: '+meta.canonicalDeckPath,
 ...outputs.map(n=>`${n} SHA256: ${hash(path.join(bundle,n))}`),'validationReport: _codex_review/validation_results.json','No cards or lecture generated.'];
fs.writeFileSync(path.join(bundle,'_codex_master_source_done.txt'),marker.join('\n')+'\n','utf8');
console.log(JSON.stringify({status:result.status,checks:checks.length,...result.totals,completionMarkerWritten:true},null,2));
