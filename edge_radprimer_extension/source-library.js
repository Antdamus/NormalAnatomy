/* A visible extension tab owns collection work; IndexedDB checkpoints survive it. */
(() => {
  'use strict';
  const C=SourceLibraryCore,$=id=>document.getElementById(id),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let library,topics=[],workingTab=null,running=false,paused=false,connection,busy=false;
  const source=new URLSearchParams(location.search).get('source');
  const statdxSource=new URLSearchParams(location.search).get('statdx');
  const status=text=>{$('status').textContent=text;$('action-status').textContent=text;};
  async function hash(value){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
  async function database(){if(!connection)connection=new Promise((resolve,reject)=>{const r=indexedDB.open('radprimer-curriculum-library',1);r.onupgradeneeded=()=>r.result.createObjectStore('collections',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return connection;}
  async function db(method,value){const d=await database();return new Promise((resolve,reject)=>{const tx=d.transaction('collections',method.startsWith('get')?'readonly':'readwrite'),r=tx.objectStore('collections')[method](value);tx.oncomplete=()=>resolve(r.result);tx.onerror=tx.onabort=()=>reject(tx.error || Error('Unable to save the collection checkpoint.'));});}
  async function checkpoint(){library.updatedAt=new Date().toISOString();await db('put',library);render();}
  async function closeSource(){if(workingTab!==null){const id=workingTab;workingTab=null;await chrome.tabs.remove(id).catch(()=>{});}}
  async function read(url,metadataOnly=false){
    const expected=C.sourceUrl(url);
    const statdx=expected.startsWith('https://app.statdx.com/'),label=statdx?'STATdx':'RadPrimer';
    if(workingTab===null)workingTab=(await chrome.tabs.create({url:expected,active:false})).id;else await chrome.tabs.update(workingTab,{url:expected,active:false});
    const deadline=Date.now()+60000;
    while(Date.now()<deadline){
      const tab=await chrome.tabs.get(workingTab);
      if(tab.status==='complete'){
        if(!tab.url?.startsWith(statdx?'https://app.statdx.com/':'https://app.radprimer.com/'))throw Error(label+' needs you to sign in before this article can be collected.');
        let capture;
        if(statdx){
          await chrome.scripting.executeScript({target:{tabId:workingTab},files:['statdx-content-extractor.js']});
          const response=await chrome.tabs.sendMessage(workingTab,{type:'SOURCE_LIBRARY_STATDX_CAPTURE',metadataOnly});
          if(!response?.ok)throw Error(response?.error || 'STATdx extraction could not connect. Reload the extension and retry.');capture=response.result;
        }else capture=(await chrome.scripting.executeScript({target:{tabId:workingTab},files:['source-library-extractor.js']}))[0]?.result;
        if(capture?.kind && capture.kind!=='unavailable'){
          if(C.sourceUrl(capture.url)!==expected)throw Error(label+' opened a different source page. Please check your sign-in and access.');
          return capture;
        }
        if(!/^https:\/\/app\.(radprimer|statdx)\.com\/(lesson|curriculum|document)(\/|$)/.test(tab.url))throw Error('Please sign in to '+label+', then resume this collection.');
      }
      await delay(500);
    }
    throw Error('The source page did not become ready within one minute. Retry after checking '+label+'.');
  }
  async function captureArticle(article){
    const first=await read(article.url);
    if(C.sourceKind(article)!=='statdx')return first;
    const parts=[first],missing=[];
    for(const section of first.sectionLinks || []){
      if(paused){missing.push('Paused before capturing '+section.section);continue;}
      try{const page=await read(section.url);if(page.id!==article.sourceId)throw Error('Section belongs to another article.');parts.push(page);}
      catch(error){missing.push(section.section+': '+error.message);}
    }
    return C.combineStatdx(parts,missing);
  }
  function restoreTopics(){topics=Object.values(library.curricula).map(c=>({kind:'lesson',url:c.url,title:library.title,breadcrumbs:[{title:c.title},...library.path.map(title=>({title}))],objectives:c.objectives,articles:c.articleIds.map(id=>library.articles[id])}));renderTopics();}
  async function addTopic(page){
    if(page.kind!=='lesson' || !page.articles.length)throw Error('Choose an organ lesson containing articles.');
    const identity=C.identity(page);
    if(library && identity.key!==library.key)throw Error('That curriculum does not match this topic and specialty.');
    if(!library){library=await db('get',identity.key) || {...identity,version:1,kind:'radprimer-curriculum-library',createdAt:new Date().toISOString(),articles:{},curricula:{},status:'ready'};}
    topics=topics.filter(p=>C.identity(p).level!==identity.level);topics.push(page);renderTopics();
  }
  function renderTopics(){
    $('title').textContent=library.title;$('destination').textContent='Folder: Downloads / '+library.folder.replaceAll('/',' / ');
    const previouslySelected=new Set([...$('levels').querySelectorAll('input:checked')].map(el=>el.value));
    $('levels').replaceChildren();
    for(const page of topics){const info=C.identity(page),label=document.createElement('label');label.className='level';label.innerHTML=`<input type="checkbox" value="${C.escape(info.level)}"><span><strong>${C.escape(info.level)}</strong><small>${page.articles.length} articles</small></span>`;label.querySelector('input').checked=previouslySelected.size?previouslySelected.has(info.level):page.url===source;$('levels').append(label);}
    $('start').disabled=busy;render();
  }
  function render(){
    if(!library)return;const c=C.counts(library);$('badge').textContent=running?'Collecting':library.status;
    $('progress').max=Math.max(1,c.articles);$('progress').value=c.complete;
    $('stats').textContent=`${c.complete} / ${c.articles} articles complete · ${c.images} image occurrences · ${c.completeFiles} files ready · ${c.failedFiles} failed files`;
    $('articles').innerHTML=Object.values(library.articles).map(a=>`<div class="article"><div><strong>${C.escape(a.title)}</strong><small>${C.escape(C.sourceLabel(a))}${a.memberships.length?' · '+C.escape(a.memberships.map(m=>m.level).join(' · ')):''} · ${a.images.length} images</small></div><span class="state">${C.escape(a.status)}</span>${a.errors?.length?`<div class="error">${C.escape(a.errors.join('; '))}</div>`:''}</div>`).join('');
    $('show-folder').hidden=!library.indexDownloadId;$('copy-review').disabled=!c.articles;
    renderSupplement();
    updateDownloadSummary();
    if(c.failedFiles || Object.values(library.articles).some(a=>a.errors?.length))$('saved-articles').open=true;
  }
  async function discover(){
    try {
      const current=await read(source);await addTopic(current);const info=C.identity(current);
      try{
        const root=await read('https://app.radprimer.com/curriculum');
        for(const level of ['Basic','Intermediate'].filter(x=>C.normalize(x)!==C.normalize(info.level))){
          let target=await read(C.pickLink(root,level).url);
          for(const part of info.path)target=await read(C.pickLink(target,part).url);
          await addTopic(target);
        }
        $('discovery').textContent='Choose one or both curricula. They will share this topic folder.';
      }catch(error){$('discovery').textContent='Current curriculum is ready. '+error.message;}
      status(library.status==='complete'?'Your saved collection is ready. Add a curriculum or verify the saved downloads.':'Ready to collect. Saved files will be reused.');
    }catch(error){$('discovery').textContent=error.message;$('discovery').className='error';}
    finally{await closeSource();}
  }
  async function save(relative,content,type='application/json'){
    const response=await chrome.runtime.sendMessage({type:'SOURCE_LIBRARY_SAVE',filename:library.folder+'/'+relative,content,mime:type});
    if(!response?.ok)throw Error(response?.error || 'The source document failed to save. Reload the extension and collection screen, then retry.');
    return {...response.result,relativePath:relative};
  }
  async function imageFile(url,filename){
    const response=await chrome.runtime.sendMessage({type:'SOURCE_LIBRARY_IMAGE',url,filename:library.folder+'/'+filename});
    if(!response?.ok)throw Error(response?.error || 'The image download failed.');
    return {...response.result,relativePath:filename};
  }
  async function fileExists(file,relative=file?.relativePath){
    if(!file?.downloadId || file.status==='failed')return false;
    const item=(await chrome.downloads.search({id:file.downloadId}))[0];
    return item?.state==='complete' && item.exists && item.fileSize>0 && (file.bytes===undefined || item.fileSize===file.bytes) && (!relative || item.filename?.replaceAll('\\','/').toLowerCase().endsWith('/'+(library.folder+'/'+relative).toLowerCase()));
  }
  async function articleReady(article){
    if(article.status!=='complete' || article.artifacts?.length!==4)return false;
    const names=['article.txt','article.html','source.json','images.json'];
    for(let i=0;i<names.length;i++)if(!await fileExists(article.artifacts[i],article.folder+'/'+names[i]))return false;
    for(const image of article.images)for(const variant of ['plain','annotated']){
      const file=image.files?.[variant],expected=C.imagePath(article,image,variant);
      if(file?.relativePath!==expected || !await fileExists(file,expected))return false;
    }
    for(const resource of article.resources)if(!await fileExists(resource.file))return false;
    return true;
  }
  function localHtml(html,article){
    const container=document.createElement('div');container.innerHTML=html;
    for(const img of container.querySelectorAll('img[src]')){
      const resource=article.resources.find(r=>r.url===img.getAttribute('src'));
      if(resource?.file?.status==='complete')img.setAttribute('src','../../'+C.pathUrl(resource.file.relativePath));
      else img.replaceWith(document.createTextNode(`[${img.alt || 'Source image'} — not downloaded]`));
    }
    return container.innerHTML;
  }
  function articleHtml(article){
    const figures=article.images.map(i=>`<figure id="image-${i.number}"><h3>Image ${i.number} · ${C.escape(i.group)}</h3><div class="pair">${['plain','annotated'].map(v=>{const f=i.files?.[v];return `<div><strong>${v==='plain'?'Without annotations':'With annotations'}</strong>${f?.status==='complete'?`<a href="../../${C.pathUrl(f.relativePath)}"><img loading="lazy" src="../../${C.pathUrl(f.relativePath)}" alt="${C.escape(article.title)} image ${i.number}, ${v}"></a>`:`<p class="warning">${C.escape(f?.error || 'Not downloaded')}</p>`}</div>`;}).join('')}</div><figcaption>${localHtml(i.captionHtml,article)}</figcaption><small>Source image ID: ${C.escape(i.id)}</small></figure>`).join('');
    return C.documentHtml(article.title,`<p><a href="../../index.html">${C.escape(library.title)} collection</a> · <a href="${C.escape(article.url)}">Original article</a></p><h1>${C.escape(article.title)}</h1><p>${C.escape((article.snapshot.authors || []).join(', '))}</p><p>Captured ${C.escape(article.snapshot.collectedAt)} · ${C.escape(article.status)} · ${article.images.length} gallery images</p><p><a href="#source-images">Jump to images</a></p>${article.errors.length?`<p class="warning">${C.escape(article.errors.join('; '))}</p>`:''}${localHtml(article.snapshot.articleHtml,article)}<h2 id="source-images">Original images and captions</h2>${figures}`);
  }
  async function writeArticle(article){
    article.artifacts=[];
    article.artifacts.push(await save(article.folder+'/article.txt',article.title+'\n'+article.url+'\n\n'+article.snapshot.articleText,'text/plain;charset=utf-8'));
    article.artifacts.push(await save(article.folder+'/article.html',articleHtml(article),'text/html;charset=utf-8'));
    article.artifacts.push(await save(article.folder+'/source.json',JSON.stringify(article.snapshot,null,2)));
    article.artifacts.push(await save(article.folder+'/images.json',JSON.stringify({articleId:article.id,expectedImages:article.snapshot.expectedImages,images:article.images,resources:article.resources},null,2)));
  }
  async function collect(article,refresh){
    if(!refresh && await articleReady(article)){status('Verified saved article: '+article.title);return;}
    article.status='collecting';article.errors=[];await checkpoint();status('Reading '+article.title);
    try {
      if(refresh || !article.snapshot || article.snapshot.errors.length){const capture=await captureArticle(article);if(capture.kind!=='article' || capture.id!==(article.sourceId || article.id))throw Error('The loaded article does not match the requested source.');article.snapshot=capture;article.images=capture.images.map(i=>({...i,files:{}}));article.resources=capture.resources.map(r=>({...r}));}
      // A source tab remains available for same-origin image retrieval on resumed runs.
      else if(workingTab===null || new URL((await chrome.tabs.get(workingTab)).url).origin!==new URL(article.url).origin)await read(article.url,true);
      article.errors=[...article.snapshot.errors];
      for(const resource of article.resources){
        if(paused)break;
        const extension=new URL(resource.url).pathname.match(/\.(png|jpe?g|gif|webp)$/i)?.[1] || 'png';
        const filename='_resources/'+(await hash(resource.url)).slice(0,32)+'.'+extension;
        try{if(!await fileExists(resource.file))resource.file=await imageFile(resource.url,filename);}catch(error){resource.file={status:'failed',error:error.message};}
      }
      for(const image of article.images){
        if(paused)break;
        for(const variant of ['plain','annotated']){
          if(paused)break;
          status(`${article.title} · image ${image.number}/${article.images.length} · ${variant==='plain'?'without annotations':'with annotations'}`);
          try{
            if(!/^[a-z0-9-]+$/i.test(image.id))throw Error('Missing or invalid source image ID.');
            const filename=C.imagePath(article,image,variant);
            if(image.files[variant]?.relativePath!==filename || !await fileExists(image.files[variant],filename))image.files[variant]=await imageFile(image[variant+'Url'],filename);
          }catch(error){image.files[variant]={status:'failed',error:error.message};}
        }
        await checkpoint();
      }
      for(const resource of article.resources)if(resource.file?.status!=='complete')article.errors.push(`${resource.alt}: ${resource.file?.error || 'not downloaded'}`);
      for(const image of article.images)for(const variant of ['plain','annotated'])if(image.files[variant]?.status!=='complete')article.errors.push(`Image ${image.number} (${variant}): ${image.files[variant]?.error || 'not downloaded'}`);
      article.status=paused?'paused':article.errors.length?'needs attention':'complete';
      await writeArticle(article);
    }catch(error){article.errors.push(error.message);article.status='needs attention';}
    await checkpoint();
  }
  function reviewRequest(){return `Review the RadPrimer and optional STATdx source collection at Downloads/${library.folder}.\n\nRead collection.json and each article's source.json/article.txt. Inspect the actual images and complete captions in article.html and images.json. Compare learning objectives across Basic and Intermediate, then assess the added STATdx sources in light of their addedFor reasons and study packs. Recommend coherent WHOLE-ARTICLE combinations and identify articles to keep separate, with manageable lesson sizes. Preserve distinct useful images and source information. Reconcile inconsistent terminology and verify medical claims requiring updates.\n\nUse image-overlap.json as exact-match candidates only. Matching captions do not establish image duplication. Compare actual files across both sources; retain different slices, phases, views and meaningful annotations. Keep annotated/plain pairs together. Recommend a final lesson for repeated images and explain exclusions. Do not delete original sources.\n\nWrite combination-recommendations.md with exact article names and IDs, proposed lesson titles, rationale, coverage, and image placement. Write coverage-review.md identifying specific missing image examples, undercovered topics, and similar-looking differentials that would improve a pack. Do not invent availability in STATdx: relatedArticles are leads, not downloaded sources. Prioritize concrete gaps over requesting every possible topic. Report unavailable or uninspected content.\n\nWrite review-needs.json for import into the source library. Format: {"version":1,"collectionKey":${JSON.stringify(library.key)},"needs":[{"id":"stable-simple-id","kind":"more-images","title":"Topic","reason":"Specific gap supported by the reviewed sources","pack":"Proposed pack","searchTerms":"Terms for the user to search in STATdx","relatedArticleIds":["exact collection article ID"]}]}. Supported kinds: more-images, missing-differential, deeper-coverage, other. Use at most 100 requests, unique simple IDs, and existing collection article IDs. Read review-tracker.json first and reuse existing IDs for the same request. Added sources still require content/image review; do not assume a request is covered just because an article downloaded.\n\nNo cards, Anki edits, lecture generation, external messages or uploads are requested. Collection status: ${library.status}. Complete articles: ${C.counts(library).complete}/${C.counts(library).articles}. Missing content must be reported before claiming a complete review.\n`;}
  async function exportLibrary(){
    library.imageLayout='article-numbered-v1';
    library.updatedAt=new Date().toISOString();
    const withoutSnapshots={...library,articles:Object.fromEntries(Object.entries(library.articles).map(([id,a])=>{const {snapshot,...rest}=a;return [id,{...rest,sourceFile:a.folder+'/source.json'}];}))};
    await save('collection.json',JSON.stringify(withoutSnapshots,null,2));
    await save('image-overlap.json',JSON.stringify({version:2,scope:'Source-qualified image IDs, exact file hashes and exact decoded pixels; visual near-duplicates require review.',groups:C.overlap(library)},null,2));
    await save('image-overlap.html',C.overlapHtml(library),'text/html;charset=utf-8');
    await save('review-request.md',reviewRequest(),'text/markdown;charset=utf-8');
    await save('review-tracker.json',JSON.stringify({version:1,collectionKey:library.key,needs:library.reviewNeeds || []},null,2));
    await save('review-tracker.html',C.reviewHtml(library),'text/html;charset=utf-8');
    const index=await save('index.html',C.overview(library),'text/html;charset=utf-8');library.indexDownloadId=index.downloadId;library.absoluteFolder=index.filename.replace(/[\\/]index\.html$/,'');
    await checkpoint();
  }
  function controls(active,collecting=active){busy=active;running=collecting;$('pause').hidden=!collecting;$('pause').disabled=false;for(const id of ['start','refresh','add','add-need','import-needs','collections','statdx-urls','purpose','pack','need-link','related-search'])$(id).disabled=active || (!library && id!=='collections');for(const i of document.querySelectorAll('#levels input,#statdx-sources input,#needs button,#related-articles input'))i.disabled=active;updateDownloadSummary();}
  function updateDownloadSummary(){
    const levels=[...$('levels').querySelectorAll('input:checked')].map(i=>i.value),links=$('statdx-urls').value.split(/\r?\n/).filter(s=>s.trim()).length,queued=$('statdx-sources').querySelectorAll('input:checked').length;
    const parts=[...levels,links?`${links} STATdx link${links===1?'':'s'}`:'',queued?`${queued} saved STATdx article${queued===1?'':'s'}`:''].filter(Boolean);
    $('start').textContent=running?'Downloading…':library?'Download to '+library.title:'Download to collection';
    $('start').disabled=busy || !library || !parts.length;
    $('download-summary').textContent=!library?'Choose a collection first.':parts.length?parts.join(' + ')+'. Saves text, captions, and images to '+library.title+'.': 'Paste a STATdx link or select a RadPrimer curriculum above.';
  }
  async function queueStatdx(links){
    const details={needId:$('need-link').value,purpose:$('purpose').value,pack:$('pack').value,relatedArticleIds:[...$('related-articles').querySelectorAll('input:checked')].map(o=>o.value)};
    const added=[],failed=[],remaining=[];
    for(const url of links){
      if(paused){remaining.push(url);continue;}
      status('Reading STATdx article title…');
      try{const meta=await read(url,true);added.push(C.mergeStatdx(library,meta,details).id);await checkpoint();}
      catch(error){remaining.push(url);failed.push(error.message);}
    }
    $('statdx-urls').value=remaining.join('\n');
    return {added,failed};
  }
  async function run(){
    if(!library || busy)return;
    const links=[...new Set($('statdx-urls').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map(C.statdxUrl))];
    if(links.length>20)throw Error('Paste up to 20 STATdx article links at a time.');
    const levels=new Set([...$('levels').querySelectorAll('input:checked')].map(i=>i.value)),extra=[...$('statdx-sources').querySelectorAll('input:checked')].map(i=>i.value);if(!levels.size && !extra.length && !links.length){status('Paste a STATdx link or select a RadPrimer curriculum above.');return;}
    status('Preparing the collection and checking saved work…');
    await navigator.locks.request('radprimer-curriculum-library',{ifAvailable:true},async lock=>{
      if(!lock){status('Another source collection is running. Pause it or wait for it to finish.');return;}
      controls(true);paused=false;
      try {
        library=await db('get',library.key) || library;
        for(const page of topics.filter(p=>levels.has(C.identity(p).level)))C.mergeCurriculum(library,page);
        const queued=await queueStatdx(links);extra.push(...queued.added);
        library.status='collecting';await checkpoint();await exportLibrary();
        const ids=[...new Set([...levels].flatMap(l=>library.curricula[l]?.articleIds || []).concat(extra))];
        for(const id of ids){if(paused)break;await collect(library.articles[id],$('refresh').checked);}
        library.status=paused?'paused':!queued.failed.length && Object.values(library.articles).every(a=>a.status==='complete')?'complete':'needs attention';
        await exportLibrary();status(paused?'Paused. Your downloaded files are saved. Click the download button to resume.':library.status==='complete'?'Collection complete. Use Show folder to view your articles and images.':'Saved with missing content. Click the download button to retry. '+queued.failed.join('; '));
      }catch(error){library.status='needs attention';status(error.message);await checkpoint();await exportLibrary().catch(()=>{});}
      finally{await closeSource();controls(false);render();}
    });
  }
  function renderSupplement(){
    const existing=[...$('statdx-sources').querySelectorAll('input')],known=new Set(existing.map(i=>i.value)),selected=new Set(existing.filter(i=>i.checked).map(i=>i.value));
    $('statdx-sources').innerHTML=Object.values(library.articles).filter(a=>C.sourceKind(a)==='statdx').map(a=>`<label class="level"><input type="checkbox" value="${C.escape(a.id)}" ${!known.has(a.id)||selected.has(a.id)?'checked':''} ${busy?'disabled':''}><span><strong>${C.escape(a.title)}</strong><small>STATdx · ${C.escape(a.status)}</small></span></label>`).join('');
    const updateOptions=(el,html)=>{if(el.innerHTML!==html){const values=new Set([...el.selectedOptions].map(o=>o.value));el.innerHTML=html;for(const o of el.options)if(values.has(o.value))o.selected=true;}};
    const related=$('related-articles'),choices=Object.values(library.articles),signature=JSON.stringify(choices.map(a=>[a.id,a.title]));
    if(related.dataset.signature!==signature){const checked=new Set([...related.querySelectorAll('input:checked')].map(i=>i.value));related.innerHTML=choices.map(a=>`<label class="related-choice"><input type="checkbox" value="${C.escape(a.id)}" ${checked.has(a.id)?'checked':''} ${busy?'disabled':''}><span>${C.escape(a.title)}<small>${C.escape(C.sourceLabel(a))}</small></span></label>`).join('');related.dataset.signature=signature;filterRelated();}
    updateOptions($('need-link'),'<option value="">None — just save this article</option>'+(library.reviewNeeds || []).map(n=>`<option value="${C.escape(n.id)}">${C.escape(n.title)}</option>`).join(''));
    $('needs').innerHTML=(library.reviewNeeds || []).map(n=>{
      const added=(n.articleIds || []).map(id=>library.articles[id]).filter(Boolean),ready=added.length && added.every(a=>a.status==='complete');
      const state=n.status==='reviewed'?'Reviewed':n.status==='dismissed'?'Not needed':added.length?(ready?'Ready for review':'Sources queued'):'Looking for sources';
      return `<div class="need"><h3>${C.escape(n.title)}</h3><small>${C.escape(C.needKinds[n.kind])} · ${state}${n.pack?' · '+C.escape(n.pack):''}</small><p>${C.escape(n.reason)}</p><p>Search: ${C.escape(n.searchTerms)}</p>${added.length?'<ul>'+added.map(a=>`<li>${C.escape(a.title)} · ${C.escape(a.status)}</li>`).join('')+'</ul>':''}<div class="actions"><button data-need="${C.escape(n.id)}" data-action="attach" class="secondary">Add a source</button><button data-need="${C.escape(n.id)}" data-action="copy" class="secondary">Copy search terms</button><a href="https://app.statdx.com/main" target="_blank" rel="noreferrer">Open STATdx</a><button data-need="${C.escape(n.id)}" data-action="${n.status==='reviewed'||n.status==='dismissed'?'reopen':'reviewed'}" class="secondary">${n.status==='reviewed'||n.status==='dismissed'?'Reopen request':'Mark reviewed'}</button>${n.status!=='dismissed'?`<button data-need="${C.escape(n.id)}" data-action="dismissed" class="secondary">Not needed</button>`:''}</div></div>`;
    }).join('') || '<p class="hint">No requests yet. A combination review can recommend specific topics and image examples to look for.</p>';
    for(const i of $('needs').querySelectorAll('button'))i.disabled=busy;
  }
  async function mutate(action){
    if(!library || busy)return;
    await navigator.locks.request('radprimer-curriculum-library',{ifAvailable:true},async lock=>{
      if(!lock){status('Another source collection is running. Pause it or wait for it to finish.');return;}
      controls(true,false);
      try{library=await db('get',library.key) || library;await action();await checkpoint();await exportLibrary();}
      catch(error){status(error.message);}
      finally{await closeSource();controls(false);render();}
    });
  }
  function filterRelated(){const query=C.normalize($('related-search').value);for(const label of $('related-articles').querySelectorAll('label'))label.hidden=!C.normalize(label.textContent).includes(query);}
  $('related-search').addEventListener('input',filterRelated);
  for(const id of ['statdx-urls','levels','statdx-sources'])$(id).addEventListener('input',updateDownloadSummary);
  $('add-need').addEventListener('click',()=>mutate(async()=>{
    C.importNeeds(library,{version:1,collectionKey:library.key,needs:[{id:'need-'+crypto.randomUUID(),title:$('need-title').value,reason:$('need-reason').value,kind:$('need-kind').value,pack:$('need-pack').value,searchTerms:$('need-search').value,relatedArticleIds:[]}]});
    for(const id of ['need-title','need-reason','need-pack','need-search'])$(id).value='';status('Review request saved. Add sources whenever you find useful articles.');
  }));
  $('import-needs').addEventListener('change',()=>{const file=$('import-needs').files[0];if(file)mutate(async()=>{if(file.size>1000000)throw Error('The review request file is too large.');const count=C.importNeeds(library,JSON.parse(await file.text()));status(count+' review requests imported.');}).finally(()=>{$('import-needs').value='';});});
  $('needs').addEventListener('click',event=>{
    const button=event.target.closest('button[data-need]');if(!button || busy)return;
    const need=library.reviewNeeds.find(n=>n.id===button.dataset.need);if(!need)return;
    if(button.dataset.action==='attach'){$('supplement').open=true;$('review-options').open=true;$('need-link').value=need.id;$('purpose').value=need.reason.slice(0,2000);$('pack').value=need.pack;for(const o of $('related-articles').querySelectorAll('input'))o.checked=need.relatedArticleIds.includes(o.value);$('statdx-urls').focus();return;}
    if(button.dataset.action==='copy'){navigator.clipboard.writeText(need.searchTerms).then(()=>status('STATdx search terms copied.')).catch(e=>status(e.message));return;}
    mutate(async()=>{const current=library.reviewNeeds.find(n=>n.id===need.id);current.status=button.dataset.action==='reopen'?(current.articleIds.length?'sources-added':'open'):button.dataset.action;status('Review request updated.');});
  });
  $('collections').addEventListener('change',async()=>{
    if(busy)return;const value=$('collections').value;
    library=null;topics=[];controls(true,false);
    for(const id of ['levels','statdx-sources','related-articles','articles','needs'])$(id).replaceChildren();
    delete $('related-articles').dataset.signature;
    for(const id of ['purpose','pack','related-search'])$(id).value='';$('need-link').value='';
    $('title').textContent='Choose a collection';$('destination').textContent='';$('stats').textContent='';$('badge').textContent='Ready';$('progress').value=0;
    try{if(value){library=await db('get',value);if(library)restoreTopics();}status(library?'Ready. Click Download to '+library.title+' to save the selected articles.':'Choose the collection where you want to save these articles.');}
    catch(error){status(error.message);}finally{controls(false);}
  });
  $('start').addEventListener('click',()=>run().catch(error=>{controls(false);status(error.message);}));
  $('activate-update').addEventListener('click',()=>chrome.runtime.reload());
  $('pause').addEventListener('click',()=>{paused=true;$('pause').disabled=true;status('Pausing after the current file finishes…');});
  $('show-folder').addEventListener('click',()=>chrome.downloads.show(library.indexDownloadId));
  $('copy-review').addEventListener('click',async()=>{await navigator.clipboard.writeText(reviewRequest().replace('Downloads/'+library.folder,library.absoluteFolder || 'Downloads/'+library.folder));status('Review request copied. Paste it into Codex when you want the article combinations reviewed.');});
  $('add').addEventListener('click',()=>mutate(async()=>{await addTopic(await read(C.sourceUrl($('lesson-url').value,['lesson'])));$('discovery').textContent='Curriculum added. Select it above to include it.';}));
  window.addEventListener('pagehide',()=>{if(workingTab!==null)chrome.tabs.remove(workingTab).catch(()=>{});});
  (async()=>{
    const ping=await chrome.runtime.sendMessage({type:'SOURCE_LIBRARY_PING'}).catch(()=>null);
    if(!ping?.ok || ping.result?.version<4){$('update-panel').hidden=false;$('discovery').textContent='Activate the extension update above to enable source collection.';return;}
    controls(true,false);
    if(source){$('curriculum-options').open=true;try{await discover();}finally{controls(false);}}
    else{
      const saved=await db('getAll');$('collection-picker').hidden=false;
      $('collections').innerHTML='<option value="">Choose a saved collection</option>'+saved.map(l=>`<option value="${C.escape(l.key)}">${C.escape(l.path.join(' / '))}</option>`).join('');
      if(saved.length===1){library=saved[0];$('collections').value=library.key;restoreTopics();}
      $('discovery').textContent=saved.length?'Choose the collection above, check the article link, then click Download. Everything else is optional.':'Open a RadPrimer organ lesson and click Download curriculum sources to create a collection first.';
      if(statdxSource){$('statdx-urls').value=C.statdxUrl(statdxSource);$('supplement').open=true;}
      controls(false);
      status(library?'Ready. Click Download to '+library.title+' to save the selected articles.':'Choose the collection where you want to save these articles.');
    }
  })().catch(error=>{controls(false);status(error.message);});
})();
