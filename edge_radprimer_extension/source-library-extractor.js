/* Read-only DOM capture. Deliberately independent of prompt/card extraction. */
(() => {
  'use strict';
  const text = node => String(node?.textContent || '').replace(/\s+/g,' ').trim();
  const absolute = value => new URL(value, location.href).href;
  const title = text(document.querySelector('h1'));
  const breadcrumbs = [...document.querySelectorAll('.breadcrumbs li')].map(li=>({title:text(li),url:li.querySelector('a[href]')?.href || ''}));
  const result = {url:location.href.split(/[?#]/)[0],title,breadcrumbs,collectedAt:new Date().toISOString()};
  const list = document.querySelector('#lesson-content');
  if (list) {
    result.kind = location.pathname.startsWith('/lesson/') ? 'lesson' : 'curriculum';
    result.links = [...list.querySelectorAll('a[href]')].map(a=>({title:text(a),url:a.href})).filter(a=>/^https:\/\/app\.radprimer\.com\/(curriculum|lesson)\//.test(a.url));
    result.articles = [...list.querySelectorAll('a[href*="/document/"]')].map(a=>({title:text(a),url:a.href,
      id:a.pathname.match(/^\/document\/([^/]+)/)?.[1],category:text(a.closest('li.folder')?.querySelector('.folder-name'))}));
    const heading = [...document.querySelectorAll('h2')].find(h=>text(h)==='Learning Objectives');
    result.objectives = [...(heading?.nextElementSibling?.querySelectorAll('li') || [])].map(text);
    return result;
  }
  const articleRoot = document.querySelector('.col-lft .document-data, #content .document-data, .document-data');
  if (!articleRoot || !location.pathname.startsWith('/document/')) return {...result,kind:'unavailable',error:'The source content is not ready, or RadPrimer requires sign-in.'};
  result.kind='article'; result.id=location.pathname.match(/^\/document\/([^/]+)/)[1]; result.sourceHtml=articleRoot.innerHTML;
  result.authors=[...document.querySelectorAll('.author-name')].map(text);
  const resources = new Map();
  function cleanHtml(input) {
    const container = document.createElement('div'); container.innerHTML=input;
    container.querySelectorAll('script,style,noscript,iframe,object,embed,form,input,button,select,textarea,link,meta,svg,canvas').forEach(e=>e.remove());
    for (const element of container.querySelectorAll('*')) {
      for (const attr of [...element.attributes]) if (!['href','src','alt','title','colspan','rowspan','id'].includes(attr.name)) element.removeAttribute(attr.name);
      if (element.hasAttribute('href')) {
        try {const url=new URL(element.getAttribute('href'),location.href); if(!['http:','https:'].includes(url.protocol))element.removeAttribute('href');else {element.setAttribute('href',url.href);element.setAttribute('rel','noreferrer');}} catch {element.removeAttribute('href');}
      }
      if (element.hasAttribute('src')) {
        try {
          const url=new URL(element.getAttribute('src'),location.href);
          if(element.tagName!=='IMG' || url.origin!==location.origin || !/^\/(img|images)\//.test(url.pathname)) throw Error('Unsupported inline image');
          element.setAttribute('src',url.href); resources.set(url.href,{url:url.href,alt:element.getAttribute('alt') || 'Inline source image'});
        } catch {element.replaceWith(document.createTextNode(`[${element.getAttribute('alt') || 'Source image unavailable'}]`));}
      }
    }
    return container.innerHTML;
  }
  function outline(input) {
    const container=document.createElement('div');container.innerHTML=input;
    container.querySelectorAll('img').forEach(e=>e.replaceWith(document.createTextNode(` [${e.alt || 'image'}] `)));
    container.querySelectorAll('li,p,h1,h2,h3,h4,h5,h6,div,tr,br').forEach(e=>{e.prepend(document.createTextNode('\n'));e.append(document.createTextNode('\n'));});
    return container.textContent.replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  result.articleHtml=cleanHtml(result.sourceHtml); result.articleText=outline(result.articleHtml);
  result.headings=[...articleRoot.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h=>({level:Number(h.tagName[1]),text:text(h)}));
  result.images=[...document.querySelectorAll('#gallery img[data-caption], #gallery button[rel] img, #gallery button[imageid] img')].map((img,index)=>{
    const carrier=img.closest('button[rel],button[imageid],a[rel]');
    const id=carrier?.getAttribute('rel') || carrier?.getAttribute('imageid') || img.getAttribute('src')?.match(/\/images\/([^/?#]+)/)?.[1] || '';
    const rawCaption=img.getAttribute('data-caption') || carrier?.getAttribute('data-caption') || '';
    const captionHtml=cleanHtml(rawCaption);
    return {number:index+1,id,group:img.getAttribute('data-groupname') || carrier?.getAttribute('data-category-name') || '',
      groupId:img.getAttribute('data-groupid') || '',groupImageNumber:carrier?.getAttribute('data-image-index-in-category') || '',
      captionHtml,captionText:outline(captionHtml),rawCaption,
      plainUrl:id?absolute(`/images/${encodeURIComponent(id)}?style=xlarge&annotated=false`):'',
      annotatedUrl:id?absolute(`/images/${encodeURIComponent(id)}?style=xlarge&annotated=true`):''};
  });
  const displayed=document.body.innerText.match(/Displaying images\s+\d+\s+to\s+\d+\s+of\s+(\d+)/i);
  result.expectedImages=displayed?Number(displayed[1]):result.images.length;
  result.resources=[...resources.values()]; result.errors=[];
  if(!result.articleText || !result.headings.length)result.errors.push('Article text or headings could not be verified.');
  if(result.images.length!==result.expectedImages)result.errors.push(`Gallery count mismatch: ${result.images.length} of ${result.expectedImages} images captured.`);
  for(const image of result.images){if(!image.id)result.errors.push(`Image ${image.number} has no source ID.`);if(!image.captionText)result.errors.push(`Image ${image.number} has no caption.`);}
  return result;
})();
