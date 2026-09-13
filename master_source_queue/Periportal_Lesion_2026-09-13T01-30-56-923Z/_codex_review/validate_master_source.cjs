const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const bundle=path.resolve(__dirname,'..'),root=path.resolve(bundle,'..','..');
const text=n=>fs.readFileSync(path.join(bundle,n),'utf8').replace(/^\uFEFF/,'');
const json=n=>JSON.parse(text(n));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const input=json('master_source_import.json'),manifest=json('master_source_manifest.json'),registry=json('image_registry.json');
const meta=json('metadata.json'),rp=json('RadPrimer_metadata.json'),sd=json('STATdx_metadata.json');
const evidence=json('image_evidence_manifest.json'),audit=json('_codex_review/image_evidence_audit.json');
const originals=[...rp.imageRegistry,...sd.imageRegistry],primary=input.selectedPrimaryImageIds,archive=input.archiveOptionalImageIds;
const byId=new Map(registry.map(e=>[e.masterImageId,e])),checks=[];
function check(name,fn){
 try{fn();checks.push({name,passed:true});}
 catch(e){console.error(JSON.stringify({failedCheck:name,code:e.code,message:String(e.message).slice(0,1000),stack:String(e.stack).split('\n').filter(l=>l.includes('validate_master_source')).slice(0,3)},null,2));process.exit(1);}
}
check('Import object, serialized artifacts and package hash agree',()=>{
 for(const k of ['version','articleTitle','createdAt','packageText','manifest','imageRegistry','sourceSelectionPlan','selectedPrimaryImageIds','archiveOptionalImageIds'])assert(k in input);
 assert.equal(input.version,1);assert.equal(input.articleTitle,meta.articleTitle);
 assert.equal(input.packageText,text('master_source_package.txt'));
 assert.deepEqual(input.manifest,manifest);assert.deepEqual(input.imageRegistry,registry);
 assert.deepEqual(input.sourceSelectionPlan,manifest.sourceSelectionPlan);
 assert.deepEqual(primary,manifest.selectedPrimaryImageIds);assert.deepEqual(archive,manifest.archiveOptionalImageIds);
 assert.equal(manifest.packageSha256,hash(path.join(bundle,'master_source_package.txt')));
});
check('Canonical hierarchy, deck route and RadPrimer diagnosis ordering preserved',()=>{
 assert.deepEqual(manifest.canonicalHierarchy,meta.canonicalHierarchy);
 assert.deepEqual(manifest.canonicalHierarchy,rp.breadcrumbTrail);
 assert.equal(manifest.canonicalDeckPath,meta.canonicalDeckPath);
 assert(input.packageText.includes(meta.canonicalHierarchy.join(' > ')));
 assert(input.packageText.includes('deckPath: '+meta.canonicalDeckPath));
 assert(!input.packageText.includes(sd.breadcrumbTrail.join(' > ')));
 assert(!input.packageText.includes(rp.anki.manualDeckRoot));
 const diff=text('RadPrimer_source_package.txt').split('DIFFERENTIAL DIAGNOSIS')[1].split('ESSENTIAL INFORMATION')[0];
 const diagnoses=[...diff.matchAll(/^  - (.+)$/gm)].map(m=>m[1].trim());assert.equal(diagnoses.length,17);
 const masterDiff=input.packageText.split('=== DIFFERENTIAL DIAGNOSIS')[1].split('=== ESSENTIAL INFORMATION')[0];
 let last=-1;for(const d of diagnoses){const p=masterDiff.indexOf('- '+d);assert(p>last,d);last=p;}
 assert.equal(manifest.generatedCards,false);assert.equal(manifest.generatedLecture,false);assert.equal(manifest.liveAnkiModified,false);
});
check('All source records, original captions/icons, URLs and image IDs preserved',()=>{
 assert(Array.isArray(registry));assert.equal(registry.length,48);assert.equal(byId.size,48);
 const filenames=[];
 for(const e of registry){
  for(const f of ['masterImageId','sourceKind','sourceLabel','sourceImageNumber','caption','usedFor','downloadRecommendation','plainFilename','annotatedFilename','plainUrl','annotatedUrl','visualEvidence'])assert(f in e);
  const o=originals.find(x=>x.masterImageId===e.masterImageId);assert(o);
  for(const f of ['imageId','sourceKind','sourceLabel','sourceImageNumber','caption','plainUrl','annotatedUrl'])assert.deepEqual(e[f],o[f]);
  assert.equal(e.originalPlainFilename,o.plainFilename);assert.equal(e.originalAnnotatedFilename,o.annotatedFilename);
  assert.equal(e.originalGroup,o.group||'');assert.deepEqual(e.originalGroupNumbers,o.groupNumbers||[]);
  assert.equal(e.teachingCaption,e.caption);assert.equal(e.filename,e.plainFilename);
  assert.equal(e.displayLabel,`${e.sourceLabel} image ${e.sourceImageNumber}`);
  assert.deepEqual(e.sourceAnnotationTokens,[...e.caption.matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m=>m[1]));
  for(const v of ['plain','annotated']){
   assert(e[v+'Filename'].startsWith(`${e.masterImageId}_${e.sourceLabel}_${v}_`));filenames.push(e[v+'Filename']);
   assert.equal(new URL(e[v+'Url']).hostname,'app.'+e.sourceKind+'.com');
  }
 }
 assert.equal(new Set(filenames).size,96);
});
check('Packages, source metadata and evidence manifest agree',()=>{
 for(const s of meta.sources){
  const d=json(s.sourceLabel+'_metadata.json');assert.deepEqual(s.metadata,d);
  if(s.imageRegistry)assert.deepEqual(s.imageRegistry,d.imageRegistry);
  const captions=[...text(s.sourceLabel+'_source_package.txt').replace(/\r\n/g,'\n').matchAll(/IMAGE_(\d+):[^\n]*\n[\s\S]*?    Caption: ([\s\S]*?)(?=\n\nIMAGE_|\n\n=== SOURCE ATTRIBUTION)/g)];
  assert.equal(captions.length,d.imageRegistry.length);
  captions.forEach((c,i)=>{assert.equal(Number(c[1]),d.imageRegistry[i].sourceImageNumber);assert.equal(c[2].trim(),d.imageRegistry[i].caption.trim());});
  for(const e of d.imageRegistry){
   const ev=evidence.entries.find(x=>x.masterImageId===e.masterImageId);assert(ev);
   for(const f of ['imageId','caption','sourceImageNumber','sourceKind'])assert.deepEqual(ev[f],e[f]);
   for(const f of ['evidenceFilename','evidenceVariant','downloaded'])assert.deepEqual(ev[f],e.visualEvidence[f]);
  }
 }
 assert.deepEqual(meta.imageEvidence,evidence);assert.equal(evidence.entries.length,48);
 for(const f of manifest.inputFiles)assert.equal(f.sha256,hash(path.join(bundle,f.filename)));
});
check('48 actual evidence files, per-image review and hash records are valid',()=>{
 assert.equal(audit.images.length,48);
 for(const e of registry){
  const a=audit.images.find(x=>x.masterImageId===e.masterImageId),o=originals.find(x=>x.masterImageId===e.masterImageId);assert(a);
  const ve=e.visualEvidence;
  assert.equal(ve.evidenceFilename,o.visualEvidence.evidenceFilename);assert.equal(ve.evidenceVariant,'plain');
  assert.equal(ve.downloaded,true);assert.equal(ve.visuallyInspected,true);assert.equal(ve.decodedSuccessfully,true);
  assert.equal(ve.sha256,hash(path.join(bundle,ve.evidenceFilename)));assert.equal(ve.sha256,a.fileSha256);
  assert.equal(ve.decodedRgbSha256,a.decodedRgbSha256);assert.deepEqual(ve.dimensions,a.dimensions);
  assert(a.dimensions[0]>150 && a.dimensions[1]>150);
  assert(fs.existsSync(path.join(bundle,ve.contactSheet)));assert(e.visualObservation.length>40);
  assert.equal(ve.annotatedVariantInspected,false);
 }
 for(const key of ['imageId','fileSha256','decodedRgbSha256'])assert.equal(new Set(audit.images.map(x=>x[key])).size,48);
 assert.deepEqual(audit.identicalGroups,{imageId:[],fileSha256:[],decodedRgbSha256:[]});
 assert.equal(manifest.imageEvidenceReview.visuallyInspectedImageCount,48);
 assert.equal(manifest.imageEvidenceReview.missingImageCount,0);assert.equal(manifest.imageEvidenceReview.unusableImageCount,0);
});
check('Every RadPrimer image has a documented pre-merge coverage decision',()=>{
 const g=manifest.sourceCoverage.imageCoverageGate;
 assert(g.performedBeforeMerge);assert.equal(g.statdxFullyCoversRadPrimerImageSet,false);
 assert.equal(g.statdxFullyReplacesRadPrimerTeachingObjectives,false);
 assert.deepEqual(g.classificationCounts,{exactDuplicate:0,nearDuplicate:0,conceptualReplacement:8,notCovered:6});
 assert.deepEqual(g.radPrimerImageCoverage.map(x=>x.radPrimerImageId),rp.imageRegistry.map(x=>x.masterImageId));
 const counts={exactDuplicate:0,nearDuplicate:0,conceptualReplacement:0,notCovered:0};
 for(const c of g.radPrimerImageCoverage){
  counts[c.classification]++;assert(c.selected);assert.equal(c.fullyReplaced,false);assert.equal(c.sameImageOrSlice,false);
  assert.equal(c.decision,'retainPrimary');assert(c.evidence.visuallyInspected);
  assert.deepEqual(c.evidence.statdxComparedImageIds,sd.imageRegistry.map(e=>e.masterImageId));
  assert.equal(c.evidence.radPrimerFileSha256,byId.get(c.radPrimerImageId).visualEvidence.sha256);
  assert.deepEqual(byId.get(c.radPrimerImageId).radPrimerCoverageByStatdx,c);
  if(c.classification==='conceptualReplacement'){
   assert(c.statdxImageIds.length>0);assert.equal(c.coverageExtent,'partialConceptualOnly');
   assert(byId.get(c.radPrimerImageId).usedFor.includes('recognitionReinforcement'));
   for(const p of c.statdxImageIds)assert(byId.has(p));
  } else assert.deepEqual(c.statdxImageIds,[]);
 }
 assert.deepEqual(counts,g.classificationCounts);
 assert.deepEqual(g.radPrimerImageCoverage.filter(c=>c.classification==='notCovered').map(c=>c.radPrimerImageId),['RP-03','RP-04','RP-08','RP-10','RP-13','RP-14']);
});
check('Selection plan exhaustively retains useful images with no archive defaults',()=>{
 assert.equal(primary.length,48);assert.equal(new Set(primary).size,48);assert.deepEqual(archive,[]);
 assert.deepEqual(primary,registry.map(e=>e.masterImageId));
 for(const e of registry){assert.equal(e.downloadRecommendation,'primaryTeachingSet');assert(e.usedFor.length>0);assert.equal(e.duplicateOf,null);assert.equal(e.archiveReason,null);}
 const p=input.sourceSelectionPlan.imageDownloadPlan;
 assert.deepEqual([...p.primaryTeachingSet.RadPrimer,...p.primaryTeachingSet.STATdx],primary);
 assert.deepEqual([...p.archiveOptionalDuplicates.RadPrimer,...p.archiveOptionalDuplicates.STATdx],archive);
 assert.equal(p.files.length,96);assert.equal(p.archiveDownloadsByDefault,false);
 assert.equal(p.selectedImageCount,48);assert.equal(p.variantFileCount,96);
 assert(input.sourceSelectionPlan.imageCurationPolicy.includes('Near duplicates'));
 assert(input.sourceSelectionPlan.duplicateEvidencePolicy.includes('Caption/topic similarity alone is insufficient'));
 for(const near of manifest.sourceCoverage.withinSourceRetainedNearDuplicates){
  assert.equal(near.classification,'nearDuplicate');
  for(const id of near.imageIds){assert(primary.includes(id));assert(byId.get(id).usedFor.includes('recognitionReinforcement'));}
 }
});
check('All 36 atomic groups cover the registry once; 11 companion groups remain intact',()=>{
 assert.equal(manifest.caseClusters.length,36);assert.equal(manifest.caseClusters.filter(c=>c.imageIds.length>1).length,11);
 const members=[];
 for(const c of manifest.caseClusters){
  members.push(...c.imageIds);assert(c.atomic);assert.equal(c.intentionalSplit,false);
  assert.deepEqual(c.selectedImageIds,c.imageIds);assert.deepEqual(c.archiveImageIds,[]);
  for(const id of c.imageIds){const e=byId.get(id);assert(primary.includes(id));assert.equal(e.caseClusterId,c.clusterId);assert.deepEqual(e.clusterImageIds,c.imageIds);assert.equal(e.sourceLabel,c.sourceLabel);}
 }
 assert.equal(members.length,48);assert.equal(new Set(members).size,48);
 for(const [cid,ids] of [['RP-RPC-US',['RP-11','RP-12']],['SDX-HEPATITIS',['SDX-08','SDX-09']],['SDX-PERIBILIARY-CYSTS',['SDX-26','SDX-27']],['SDX-PVT',['SDX-28','SDX-29']]]){
  const c=manifest.caseClusters.find(c=>c.clusterId===cid);assert.deepEqual(c.imageIds,ids);assert.equal(c.relationshipEvidence,'explicitSamePatient');
 }
 const psc=manifest.caseClusters.find(c=>c.clusterId==='SDX-PSC-PROCEDURE');
 assert.equal(psc.patientIdentityConfirmedForWholeCluster,false);assert(psc.evidenceBasis.includes('not confirmed'));
 assert.deepEqual(input.sourceSelectionPlan.caseClusterGuardrails.intentionalClusterSplits,[]);
 assert(text('master_source_report.md').includes('No source case cluster was intentionally split.'));
});
check('Human-facing labels are clean and every caption/filename is in the image library',()=>{
 const library=input.packageText.split('=== SELECTED IMAGE LIBRARY ===')[1].split('=== OPTIONAL DUPLICATE ARCHIVE ===')[0];
 assert.equal(library.split('\n').filter(l=>/^(RadPrimer|STATdx) image \d+ \[(RadPrimer|STATdx)\]$/.test(l)).length,48);
 for(const e of registry){assert(library.includes(e.displayLabel+' ['+e.sourceLabel+']'));assert(library.includes('Caption: '+e.caption));assert(library.includes('Image: '+e.plainFilename));assert(library.includes('Image_Annotated: '+e.annotatedFilename));}
 for(const line of input.packageText.split('\n'))if(!/^\s*Image(?:_Annotated)?:/.test(line))assert(!/\b(?:RP|SDX)-\d{2}\b/.test(line),line);
 assert.equal(manifest.coreValidation.suppliedAuditableCoreEvidence,false);
 assert(input.packageText.includes('No auditable Core Radiology evidence supplied'));
 assert(input.packageText.includes('not itself a sign of rejection'));
});

// Read only: execute exact installed extension helper bodies in an isolated VM.
// No browser listeners, remote requests, filesystem mutation by the extension,
// or extension source changes are involved.
const workerPath=path.join(root,'edge_radprimer_extension/service_worker.js'),worker=fs.readFileSync(workerPath,'utf8');
const names=['parseJsonMaybe','pickNamedFile','normalizeMasterSourceCache','collectMasterImageIdsFromPlan',
 'getMasterSourcePrimaryImageIds','getMasterSourceArchiveImageIds','buildMasterSourceCacheFromFiles',
 'normalizeImageRegistryEntry','normalizeImageRegistrySourceKind','normalizeSourceCompareKind',
 'flattenRegistryToDownloadFiles','shouldUseRegistryEntryForMasterDownload','buildSourceQualifiedImageFilename',
 'getDownloadBasename','getSourceFilenameLabel','normalizeArticleSourceKind','sanitizeDownloadPathPart',
 'normalizeArticleTitleKey','sanitizeAnkiDeckPart'];
const functions=names.map(n=>{const m=worker.match(new RegExp('^function '+n+'\\([^]*?^\\}','m'));assert(m,n);return m[0];}).join('\n\n');
const context=vm.createContext({Date,console,files:[{name:'master_source_import.json',text:JSON.stringify(input)}]});
vm.runInContext(functions,context);
const cache=JSON.parse(JSON.stringify(vm.runInContext('buildMasterSourceCacheFromFiles(files)',context)));
check('Installed extension accepts the single-file import and retains all primary IDs',()=>{
 assert.equal(cache.packageText,input.packageText);assert.equal(cache.articleTitle,input.articleTitle);
 assert.deepEqual(cache.manifest.canonicalHierarchy,meta.canonicalHierarchy);
 assert.equal(cache.imageRegistry.length,48);assert.deepEqual(cache.selectedPrimaryImageIds,primary);assert.deepEqual(cache.archiveOptionalImageIds,archive);
});
check('Installed extension emits exactly 96 planned source-qualified variant downloads',()=>{
 assert.equal(cache.downloadFiles.length,96);assert.equal(new Set(cache.downloadFiles.map(f=>f.filename)).size,96);
 for(const f of cache.downloadFiles){const e=byId.get(f.masterImageId);assert(primary.includes(f.masterImageId));assert.equal(f.filename,e[f.variant+'Filename']);assert.equal(f.url,e[f.variant+'Url']);assert.equal(f.sourceLabel,e.sourceLabel);}
 const fields=f=>[f.masterImageId,f.variant,f.filename,f.url];
 assert.deepEqual(cache.downloadFiles.map(fields),input.sourceSelectionPlan.imageDownloadPlan.files.map(fields));
});
check('Installed extension separate-file import produces the identical selection and filenames',()=>{
 context.files=['master_source_package.txt','master_source_manifest.json','image_registry.json'].map(n=>({name:n,text:text(n)}));
 const separate=JSON.parse(JSON.stringify(vm.runInContext('buildMasterSourceCacheFromFiles(files)',context)));
 assert.deepEqual(separate.selectedPrimaryImageIds,primary);assert.deepEqual(separate.archiveOptionalImageIds,archive);
 assert.deepEqual(separate.downloadFiles,cache.downloadFiles);assert.equal(separate.packageText,cache.packageText);
});
let copied=0;
check('Imported browser files remain byte-identical; newest-bundle pointer targets this folder',()=>{
 const staged=path.join('C:/Users/josem.000/Downloads/RadiologyMasterSource',path.basename(bundle));
 function walk(dir,relative=''){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=path.join(relative,e.name);
   if(e.isDirectory())walk(path.join(dir,e.name),rel);
   else if(!e.name.endsWith('.crdownload')){assert.equal(hash(path.join(staged,rel)),hash(path.join(bundle,rel)),rel);copied++;}
  }
 }
 walk(staged);assert.equal(copied,57);
 assert.equal(path.resolve(fs.readFileSync(path.join(root,'master_source_queue/_latest_master_source_bundle.txt'),'utf8').trim()).toLowerCase(),bundle.toLowerCase());
});
const result={status:'passed',validatedAt:new Date().toISOString(),checks,
 totals:{registryEntries:48,selectedPrimaryImages:48,archiveOptionalImages:0,primaryVariantDownloads:96,
  radPrimerImages:14,statdxImages:34,atomicGroups:36,multiImageGroups:11,stagedFilesVerified:copied},
 extensionHelpersTested:names,extensionSourceSha256:hash(workerPath),
 scope:'Source fidelity, media-evidence integrity, canonical routing, coverage decisions, atomic groups and installed extension import/download helper compatibility. No live browser import, remote download or card audit was performed.'};
fs.writeFileSync(path.join(__dirname,'validation_results.json'),JSON.stringify(result,null,2)+'\n','utf8');
const outputs=['master_source_package.txt','master_source_manifest.json','image_registry.json','master_source_import.json','master_source_report.md'];
const done=['DONE','masterSourceComplete=true','articleTitle='+input.articleTitle,'completedAt='+result.validatedAt,
 'validation=passed','selectedPrimaryImageCount=48','archiveOptionalImageCount=0','primaryVariantDownloadCount=96',
 'selectedPrimaryImageIds='+JSON.stringify(primary),'archiveOptionalImageIds=[]',
 'canonicalHierarchy='+JSON.stringify(meta.canonicalHierarchy),'canonicalDeckPath='+meta.canonicalDeckPath,
 ...outputs.map(n=>`${n} SHA256: ${hash(path.join(bundle,n))}`),
 'validationReport=_codex_review/validation_results.json','No cards or lecture generated.'];
fs.writeFileSync(path.join(bundle,'_codex_master_source_done.txt'),done.join('\n')+'\n','utf8');
console.log(JSON.stringify({status:result.status,checks:checks.length,...result.totals,completionMarkerWritten:true},null,2));
