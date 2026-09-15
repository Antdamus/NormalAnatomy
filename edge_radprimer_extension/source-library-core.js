(function (root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeName(value, max = 65) {
    let result = String(value || '').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').replace(/[. ]+$/g, '').trim().slice(0, max).replace(/[. ]+$/g, '');
    if (!result || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(result)) result = '_' + (result || 'untitled');
    return result;
  }
  function imagePath(article, image, variant) {
    if(!['plain','annotated'].includes(variant) || !Number.isSafeInteger(image.number) || image.number<1)throw Error('Invalid image number or annotation version.');
    const label=variant==='plain'?'unannotated':'annotated';
    return `${article.folder}/images/${article.sourceKind==='statdx'?'STATdx - ':''}${safeName(article.title,48)} - ${String(image.number).padStart(3,'0')} - ${label}.jpg`;
  }
  function sourceUrl(value, types = ['lesson', 'curriculum', 'document']) {
    const url = new URL(value, 'https://app.radprimer.com');
    if(url.protocol==='https:' && ['app.statdx.com','statdx.com','www.statdx.com'].includes(url.hostname) && !url.username && !url.password && types.includes('document')){
      const match=url.pathname.match(/^\/document\/(?:v2\/|[^/]+\/)?([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})(?:\/(anatomy|cases|ddx|references))?\/?$/i);
      if(!match)throw Error('Choose a STATdx article link.');
      return 'https://app.statdx.com/document/v2/'+match[1].toLowerCase()+(match[2]?'/'+match[2]:'');
    }
    if (url.origin !== 'https://app.radprimer.com' || !types.includes(url.pathname.split('/')[1]) || url.username || url.password) throw Error('Choose a RadPrimer curriculum or article link.');
    url.hash = ''; url.search = ''; return url.href;
  }
  const sourceKind = article => article.sourceKind || (String(article.url || article).includes('statdx.com/')?'statdx':'radprimer');
  const sourceLabel = article => sourceKind(article)==='statdx'?'STATdx':'RadPrimer';
  function statdxUrl(value){const url=sourceUrl(value,['document']);if(!url.startsWith('https://app.statdx.com/'))throw Error('Choose a STATdx article link.');return url.replace(/\/(anatomy|cases|ddx|references)$/,'');}
  function mergeStatdx(library,meta,details={}){
    const url=statdxUrl(meta.url),sourceId=url.split('/').at(-1);
    if(meta.id!==sourceId || !normalize(meta.title))throw Error('The STATdx article could not be identified.');
    const id='statdx:'+sourceId,relatedArticleIds=[...new Set(details.relatedArticleIds || [])];
    if(relatedArticleIds.some(id=>!library.articles[id]))throw Error('A related article is not in this collection.');
    if(details.needId && !(library.reviewNeeds || []).some(n=>n.id===details.needId))throw Error('The review request is not in this collection.');
    const addedFor={needId:details.needId || '',purpose:String(details.purpose || '').trim().slice(0,2000),pack:String(details.pack || '').trim().slice(0,200),relatedArticleIds};
    let article=library.articles[id];
    if(!article)article=library.articles[id]={id,sourceId,sourceKind:'statdx',title:meta.title,url,folder:'STATdx/'+safeName(meta.title,58)+'--'+sourceId.slice(0,12),memberships:[],status:'pending',images:[],resources:[],errors:[],addedFor:[]};
    if(!article.addedFor.some(item=>JSON.stringify(item)===JSON.stringify(addedFor)))article.addedFor.push(addedFor);
    if(details.needId){const need=library.reviewNeeds.find(n=>n.id===details.needId);need.articleIds=[...new Set([...(need.articleIds || []),id])];if(need.status!=='dismissed')need.status='sources-added';}
    return article;
  }
  const needKinds={'more-images':'More image examples','missing-differential':'Missing differential','deeper-coverage':'More detail','other':'Other review need'};
  function importNeeds(library,payload){
    if(payload?.version!==1 || payload.collectionKey!==library.key || !Array.isArray(payload.needs) || payload.needs.length>100)throw Error('Choose a review-needs file for this collection (up to 100 requests).');
    const ids=new Set(),clean=payload.needs.map(n=>{
      if(!n || typeof n.id!=='string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(n.id) || ids.has(n.id))throw Error('Review request IDs must be unique simple names.');ids.add(n.id);
      for(const [key,max] of Object.entries({title:200,reason:4000,pack:200,searchTerms:500}))if(n[key]!==undefined && (typeof n[key]!=='string' || n[key].length>max))throw Error('Invalid '+key+' in review request.');
      if(!normalize(n.title) || !normalize(n.reason) || !Object.hasOwn(needKinds,n.kind))throw Error('Each review request needs a topic, a reason and a supported type.');
      const relatedArticleIds=n.relatedArticleIds || [];if(!Array.isArray(relatedArticleIds) || relatedArticleIds.some(id=>!library.articles[id]))throw Error('A review request refers to an unknown source article.');
      return {id:n.id,title:n.title.trim(),reason:n.reason.trim(),kind:n.kind,pack:(n.pack || '').trim(),searchTerms:(n.searchTerms || n.title).trim(),relatedArticleIds:[...new Set(relatedArticleIds)]};
    });
    library.reviewNeeds ||= [];
    for(const n of clean){const existing=library.reviewNeeds.find(x=>x.id===n.id);if(existing){const changed=Object.keys(n).some(k=>JSON.stringify(n[k])!==JSON.stringify(existing[k]));Object.assign(existing,n);if(changed)existing.status=existing.articleIds?.length?'sources-added':'open';}else library.reviewNeeds.push({...n,status:'open',articleIds:[]});}
    return clean.length;
  }
  function combineStatdx(parts,missing=[]){
    const first=parts[0];if(!first || parts.some(p=>p.id!==first.id))throw Error('STATdx sections do not belong to the same article.');
    const images=parts.flatMap(p=>p.images.map(i=>({...i,section:p.section,sectionUrl:p.url,sectionImageNumber:i.number}))).map((i,n)=>({...i,number:n+1}));
    return {...first,kind:'article',sourceKind:'statdx',sections:parts.map(p=>({name:p.section,url:p.url,sourceHtml:p.sourceHtml,expectedImages:p.expectedImages,countBasis:p.countBasis,errors:p.errors})),
      sourceHtml:parts.map(p=>p.sourceHtml).join('\n'),articleHtml:parts.map(p=>`<section><h2>${escape(p.section)}</h2>${p.articleHtml}</section>`).join('\n'),articleText:parts.map(p=>p.section+'\n'+p.articleText).join('\n\n'),
      headings:parts.flatMap(p=>p.headings),images,expectedImages:parts.reduce((n,p)=>n+p.expectedImages,0),resources:[...new Map(parts.flatMap(p=>p.resources).map(r=>[r.url,r])).values()],relatedArticles:parts.flatMap(p=>p.relatedArticles || []),
      errors:[...parts.flatMap(p=>p.errors.map(e=>p.section+': '+e)),...missing],sectionLinks:first.sectionLinks,collectedAt:new Date().toISOString()};
  }
  function identity(page) {
    const levelIndex = page.breadcrumbs.findIndex(c => /^(basic|intermediate)$/i.test(c.title));
    if (levelIndex < 0) throw Error('The curriculum level could not be identified. Open an organ lesson in Basic or Intermediate.');
    const path = page.breadcrumbs.slice(levelIndex + 1).map(c => c.title);
    if (!path.length || normalize(path.at(-1)) !== normalize(page.title)) throw Error('The topic and its curriculum path do not match.');
    return {key:path.map(normalize).join(' / '), title:page.title, path, level:page.breadcrumbs[levelIndex].title,
      folder:'RadPrimerLibrary/' + path.map(p => safeName(p, 42)).join('/')};
  }
  function pickLink(page, title) {
    const matches = page.links.filter(l => normalize(l.title) === normalize(title));
    const unique = [...new Map(matches.map(l => [l.url,l])).values()];
    if (unique.length !== 1) throw Error(`Could not uniquely locate “${title}” in ${page.title}. Open that curriculum and collect it separately into the same topic folder.`);
    return unique[0];
  }
  function mergeCurriculum(library, page) {
    const info = identity(page);
    if (info.key !== library.key) throw Error('This curriculum belongs to a different topic.');
    const ids = [];
    for (const entry of page.articles) {
      if (!/^[a-z0-9-]+$/i.test(entry.id)) throw Error('An article has an invalid source identifier.');
      ids.push(entry.id);
      const existing = library.articles[entry.id];
      if (existing) {
        existing.memberships = existing.memberships.filter(m => m.url !== page.url);
        existing.memberships.push({level:info.level, url:page.url, category:entry.category});
      } else library.articles[entry.id] = {...entry, status:'pending', folder:`${safeName(info.level)}/${safeName(entry.title, 58)}--${entry.id.slice(0,12)}`,
        memberships:[{level:info.level,url:page.url,category:entry.category}], images:[], resources:[], errors:[]};
    }
    // A refreshed index records removals without deleting any archived article.
    library.curricula[info.level] = {title:info.level, url:page.url, objectives:page.objectives, articleIds:[...new Set(ids)], collectedAt:new Date().toISOString()};
    return library;
  }
  function overlap(library) {
    const groups = new Map();
    for (const article of Object.values(library.articles)) for (const image of article.images || []) {
      const occurrence = {articleId:article.id, article:article.title, source:sourceLabel(article), folder:article.folder, imageNumber:image.number, imageId:image.id, caption:image.captionText};
      for (const key of [`source:${sourceKind(article)}:${image.id}`, ...['plain','annotated'].flatMap(v => {
        const file = image.files?.[v]; return file?.status === 'complete' ? [`sha256:${v}:${file.sha256}`, ...(file.pixelHash ? [`pixels:${v}:${file.pixelHash}`] : [])] : [];
      })]) {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(occurrence);
      }
    }
    return [...groups].filter(([,rows]) => new Set(rows.map(r => r.articleId)).size > 1)
      .map(([key,occurrences]) => ({basis:key.split(':')[0],key,occurrences}));
  }
  function counts(library) {
    const articles = Object.values(library.articles);
    const files = articles.flatMap(a => [...(a.images || []).flatMap(i => Object.values(i.files || {})), ...(a.resources || []).map(r => r.file).filter(Boolean)]);
    return {articles:articles.length, complete:articles.filter(a => a.status === 'complete').length,
      images:articles.reduce((s,a)=>s+(a.images?.length || 0),0), completeFiles:new Set(files.filter(f=>f.status==='complete').map((f,i)=>f.relativePath || f.filename || i)).size,
      failedFiles:files.filter(f=>f.status==='failed').length, overlapGroups:overlap(library).length};
  }
  const style = 'body{font:16px/1.6 system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 24px;color:#182b38;background:#fafcfc}h1,h2,h3{line-height:1.25}a{color:#086c70}table{border-collapse:collapse;width:100%}td,th{padding:12px;text-align:left;border-bottom:1px solid #cddcdd;vertical-align:top}img{max-width:100%;height:auto}figcaption img,p img,li img{max-height:24px;vertical-align:middle}figure{margin:28px 0;padding:20px;background:white;border:1px solid #d5e1e2;border-radius:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair img{width:100%;max-height:700px;object-fit:contain}small,.muted{color:#536976}.warning{color:#9a4600}pre{white-space:pre-wrap}@media(max-width:650px){.pair{grid-template-columns:1fr}}';
  function documentHtml(title, body) { return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(title)}</title><style>${style}</style></head><body>${body}</body></html>`; }
  const pathUrl = path => path.split('/').map(encodeURIComponent).join('/');
  function overview(library) {
    const c = counts(library);
    return documentHtml(library.title, `<h1>${escape(library.title)}</h1><p>${c.complete} of ${c.articles} articles complete · ${c.images} image occurrences · ${c.failedFiles} failed files</p><p>Collection status: <strong>${escape(library.status)}</strong>. Updated ${escape(library.updatedAt)}.</p><p><a href="image-overlap.html">Repeated images across articles</a> · <a href="review-request.md">Combination review instructions</a> · <a href="collection.json">Complete collection inventory</a></p>` +
      Object.values(library.curricula).map(level=>`<h2>${escape(level.title)}</h2><p><a href="${escape(level.url)}">Original curriculum</a></p><ul>${level.objectives.map(o=>`<li>${escape(o)}</li>`).join('')}</ul><table><tr><th>Article</th><th>Images</th><th>Status</th></tr>${level.articleIds.map(id=>{const a=library.articles[id];return `<tr><td><a href="${pathUrl(a.folder)}/article.html">${escape(a.title)}</a><br><small>${escape(a.memberships.find(m=>m.level===level.title)?.category)}</small></td><td>${a.images.length}</td><td>${escape(a.status)}${a.errors?.length?`<br><span class="warning">${escape(a.errors.join('; '))}</span>`:''}</td></tr>`;}).join('')}</table>`).join('')+
      (Object.values(library.articles).some(a=>sourceKind(a)==='statdx')?'<h2>Added STATdx articles</h2><ul>'+Object.values(library.articles).filter(a=>sourceKind(a)==='statdx').map(a=>`<li><a href="${pathUrl(a.folder)}/article.html">${escape(a.title)}</a> · ${escape(a.status)} · ${a.images.length} images${(a.addedFor || []).map(d=>`<p>${escape(d.pack?d.pack+' · ':'')}${escape(d.purpose)}</p>`).join('')}</li>`).join('')+'</ul>':'')+
      ((library.reviewNeeds || []).length?'<p><a href="review-tracker.html">Review requests and supplemental sources</a></p>':''));
  }
  function overlapHtml(library) {
    const groups = overlap(library);
    return documentHtml('Image overlap — '+library.title, `<h1>Repeated images · ${escape(library.title)}</h1><p><a href="index.html">Back to the collection</a></p><p>Matches use source image IDs within a source, identical file bytes, or identical decoded pixels. Similar crops, recompressed images, different phases and views require visual review. No source image was removed.</p>${groups.length?groups.map((g,i)=>`<h2>Match ${i+1} · ${escape(g.basis)}</h2><ul>${g.occurrences.map(o=>`<li><a href="${pathUrl(o.folder)}/article.html#image-${o.imageNumber}">${escape(o.source)} · ${escape(o.article)} · image ${o.imageNumber}</a>: ${escape(o.caption)}</li>`).join('')}</ul>`).join(''):'<p>No cross-article matches found among the captured images. This does not rule out visual near-duplicates.</p>'}`);
  }
  function reviewHtml(library){return documentHtml('Review requests — '+library.title,`<h1>Review requests · ${escape(library.title)}</h1><p><a href="index.html">Back to the collection</a></p><p>These requests come from a review or your notes. Added sources still need a content and image review before a gap can be considered covered.</p>${(library.reviewNeeds || []).map(n=>`<section><h2>${escape(n.title)}</h2><p>${escape(needKinds[n.kind])} · ${escape(n.status)}${n.pack?' · '+escape(n.pack):''}</p><p>${escape(n.reason)}</p><p>Search terms: ${escape(n.searchTerms)}</p><ul>${(n.articleIds || []).map(id=>{const a=library.articles[id];return a?`<li><a href="${pathUrl(a.folder)}/article.html">${escape(sourceLabel(a))} · ${escape(a.title)}</a> · ${escape(a.status)}</li>`:'';}).join('')}</ul></section>`).join('') || '<p>No review requests recorded yet.</p>'}`);}
  root.SourceLibraryCore = {normalize,escape,safeName,imagePath,sourceUrl,sourceKind,sourceLabel,statdxUrl,mergeStatdx,importNeeds,needKinds,combineStatdx,reviewHtml,identity,pickLink,mergeCurriculum,overlap,counts,documentHtml,overview,overlapHtml,pathUrl};
  if (typeof module !== 'undefined') module.exports = root.SourceLibraryCore;
})(globalThis);
