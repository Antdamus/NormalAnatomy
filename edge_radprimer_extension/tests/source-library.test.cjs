const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../source-library-core.js');
const page=(level,articles)=>({kind:'lesson',title:'Pancreas',url:'https://app.radprimer.com/lesson/'+level,breadcrumbs:[{title:'All Categories'},{title:level},{title:'Gastrointestinal'},{title:'Pancreas'}],articles,objectives:['Compare collections'],links:[]});
const sdxId='d4803366-5eea-49c8-9c7e-dd24dd20c98c',sdxUrl='https://app.statdx.com/document/v2/'+sdxId;
test('STATdx aliases canonicalize and remain distinct from the same RadPrimer ID',()=>{
  assert.equal(C.statdxUrl('https://app.statdx.com/document/atrophy/'+sdxId+'?term=test'),sdxUrl);
  assert.equal(C.statdxUrl(sdxUrl+'/references'),sdxUrl);
  for(const url of ['https://app.statdx.com/main','https://app.statdx.com.evil/document/v2/'+sdxId,'http://app.statdx.com/document/v2/'+sdxId,'https://user:pass@app.statdx.com/document/v2/'+sdxId])assert.throws(()=>C.statdxUrl(url));
  const library={articles:{[sdxId]:{id:sdxId,title:'RP source'}},curricula:{}};
  const a=C.mergeStatdx(library,{id:sdxId,title:'Atrophy',url:sdxUrl},{relatedArticleIds:[sdxId],purpose:'More examples'});
  assert.equal(Object.keys(library.articles).length,2);assert.equal(a.sourceId,sdxId);assert.match(a.folder,/^STATdx\//);assert.match(C.imagePath(a,{number:2},'plain'),/STATdx - Atrophy - 002 - unannotated.jpg/);
  C.mergeStatdx(library,{id:sdxId,title:'Atrophy',url:sdxUrl},{relatedArticleIds:[sdxId],purpose:'More examples'});assert.equal(a.addedFor.length,1);
});
test('review imports are atomic and adding sources never marks a gap reviewed',()=>{
  const library={key:'gi / pancreas',articles:{rp:{id:'rp'}},curricula:{}};
  const need={id:'cyst-mimic',title:'Cyst mimic',reason:'Compare a missing pattern',kind:'missing-differential',relatedArticleIds:['rp']};
  const payload={version:1,collectionKey:library.key,needs:[need]};C.importNeeds(library,payload);
  assert.equal(library.reviewNeeds[0].status,'open');assert.throws(()=>C.importNeeds(library,{...payload,collectionKey:'other'}));
  assert.throws(()=>C.importNeeds(library,{...payload,needs:[{...need,title:'changed'},{...need,id:'bad',kind:'toString'}]}));assert.equal(library.reviewNeeds[0].title,need.title);
  const a=C.mergeStatdx(library,{id:sdxId,title:'Atrophy',url:sdxUrl},{needId:need.id});assert.equal(library.reviewNeeds[0].status,'sources-added');a.status='complete';assert.equal(library.reviewNeeds[0].status,'sources-added');
  library.reviewNeeds[0].status='reviewed';C.importNeeds(library,payload);assert.equal(library.reviewNeeds[0].status,'reviewed');
  C.importNeeds(library,{...payload,needs:[{...need,reason:'Another specific gap'}]});assert.equal(library.reviewNeeds[0].status,'sources-added');
});
test('source IDs are namespaced but actual image hashes compare across sources',()=>{
  const a={id:'rp',title:'RP',images:[{id:'same-id',number:1,files:{plain:{status:'complete',sha256:'same'}}}]},b={...a,id:'statdx:same',sourceKind:'statdx',title:'STATdx'};
  const groups=C.overlap({articles:{a,b}});assert.equal(groups.length,1);assert.equal(groups[0].basis,'sha256');assert.equal(groups[0].occurrences[1].source,'STATdx');
});
test('STATdx sections retain local numbering and missing sections block completeness',()=>{
  const p={id:sdxId,section:'article',sourceHtml:'<p>Original</p>',articleHtml:'<p>Source</p>',articleText:'Source',headings:[],errors:[],resources:[],expectedImages:1,images:[{number:1,id:'main'}]};
  const all=C.combineStatdx([p,{...p,section:'cases',images:[{number:1,id:'case'}]}],['references: unavailable']);assert.equal(all.images[1].number,2);assert.equal(all.images[1].sectionImageNumber,1);assert.equal(all.images[1].section,'cases');assert.equal(all.expectedImages,2);assert.deepEqual(all.errors,['references: unavailable']);assert.throws(()=>C.combineStatdx([p,{...p,id:'wrong'}]));
});
test('filesystem names and source URLs cannot escape the collection',()=>{
  for(const name of ['../../test','CON','nul.txt','a:b/c\\d','..','x. ']){const safe=C.safeName(name);assert.ok(safe && !/[<>:"/\\|?*]/.test(safe));assert.ok(!safe.endsWith('.'));}
  assert.throws(()=>C.sourceUrl('https://evil.example/lesson/x'));
  assert.throws(()=>C.sourceUrl('javascript:alert(1)'));
  assert.throws(()=>C.sourceUrl('https://app.radprimer.com/settings'));
});
test('Basic and Intermediate share identity; different specialties do not',()=>{
  assert.equal(C.identity(page('Basic',[])).key,C.identity(page('Intermediate',[])).key);
  const other=page('Basic',[]);other.breadcrumbs[2].title='Pediatrics';
  assert.notEqual(C.identity(page('Basic',[])).key,C.identity(other).key);
});
test('image filenames identify the article, original number and annotation version',()=>{
  const a={title:'Acute Pancreatitis and Complications',folder:'Basic/Acute Pancreatitis--abcd'};
  assert.equal(C.imagePath(a,{number:1},'plain'),a.folder+'/images/Acute Pancreatitis and Complications - 001 - unannotated.jpg');
  assert.equal(C.imagePath(a,{number:12},'annotated'),a.folder+'/images/Acute Pancreatitis and Complications - 012 - annotated.jpg');
  assert.notEqual(C.imagePath(a,{number:1},'plain'),C.imagePath(a,{number:2},'plain'));
  assert.throws(()=>C.imagePath(a,{number:0},'plain'));
  assert.throws(()=>C.imagePath(a,{number:1},'../escape'));
});
test('an article shared by two curricula stays one archived article and retains memberships',()=>{
  const entry={id:'abcd-1234',title:'Pancreas',url:'https://app.radprimer.com/document/abcd-1234',category:'Anatomy'};
  const basic=page('Basic',[entry]),library={...C.identity(basic),articles:{},curricula:{}};
  C.mergeCurriculum(library,basic);const original=library.articles[entry.id].folder;
  C.mergeCurriculum(library,page('Intermediate',[entry]));
  assert.equal(Object.keys(library.articles).length,1);assert.equal(library.articles[entry.id].folder,original);assert.equal(library.articles[entry.id].memberships.length,2);
  C.mergeCurriculum(library,basic);assert.equal(library.articles[entry.id].memberships.length,2);
  C.mergeCurriculum(library,page('Basic',[]));assert.ok(library.articles[entry.id],'Refreshing membership never deletes an archived article');
});
test('exact image matching crosses articles while preserving different images and variants',()=>{
  const article=(id,imageId,sha)=>({id,title:id,images:[{id:imageId,number:1,files:{plain:{status:'complete',sha256:sha}}}]});
  const library={articles:{a:article('a','i1','same'),b:article('b','i2','same'),c:article('c','i3','different')}};
  const groups=C.overlap(library);assert.equal(groups.length,1);assert.deepEqual(groups[0].occurrences.map(o=>o.articleId),['a','b']);
  library.articles.b.images[0].files.plain.status='failed';assert.equal(C.overlap(library).length,0);
});
test('curriculum matching fails on ambiguous names instead of choosing a wrong topic',()=>{
  assert.throws(()=>C.pickLink({title:'GI',links:[{title:'Pancreas',url:'a'},{title:'Pancreas',url:'b'}]},'Pancreas'));
  assert.equal(C.pickLink({title:'GI',links:[{title:' Pancreas ',url:'a'}]},'pancreas').url,'a');
});
