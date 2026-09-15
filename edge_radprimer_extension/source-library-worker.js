/* Small worker endpoints; the visible library page owns the resumable run. */
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(!['SOURCE_LIBRARY_OPEN','SOURCE_LIBRARY_OPEN_STATDX','SOURCE_LIBRARY_IMAGE','SOURCE_LIBRARY_SAVE','SOURCE_LIBRARY_PING'].includes(message?.type))return false;
  (async()=>{
    if(message.type==='SOURCE_LIBRARY_PING')return {version:4};
    if(message.type==='SOURCE_LIBRARY_OPEN' || message.type==='SOURCE_LIBRARY_OPEN_STATDX') {
      const statdx=message.type==='SOURCE_LIBRARY_OPEN_STATDX';
      const url=statdx?SourceLibraryCore.statdxUrl(message.url):SourceLibraryCore.sourceUrl(message.url,['lesson']);
      const tab=await chrome.tabs.create({url:chrome.runtime.getURL('source-library.html')+(statdx?'?statdx=':'?source=')+encodeURIComponent(url)});
      return {tabId:tab.id};
    }
    const senderUrl=sender.url || sender.tab?.url;
    if(!senderUrl?.startsWith(chrome.runtime.getURL('source-library.html')))throw Error('Source exports must originate in the source library.');
    const filename=RadPrimerImageCache.targetKey(message.filename);
    if(!filename.startsWith('RadPrimerLibrary/'))throw Error('Source library files must stay inside RadPrimerLibrary.');
    if(message.type==='SOURCE_LIBRARY_SAVE'){
      if(typeof message.content!=='string' || !['application/json','text/plain;charset=utf-8','text/html;charset=utf-8','text/markdown;charset=utf-8'].includes(message.mime))throw Error('Unsupported source document.');
      // Use the worker's filename router, which is shared with the existing exports.
      const downloadId=await downloadTextFileToPath(filename,message.content,message.mime);
      const item=(await chrome.downloads.search({id:downloadId}))[0];
      const bytes=new TextEncoder().encode(message.content).length;
      if(item?.state!=='complete' || !item.filename?.replaceAll('\\','/').toLowerCase().endsWith('/'+filename.toLowerCase()) || item.fileSize!==bytes)throw Error('The source document did not save under its required filename. Retry the collection.');
      return {downloadId,filename:item.filename,bytes};
    }
    const url=new URL(RadPrimerImageCache.sourceKey(message.url));
    if(!(url.origin==='https://app.radprimer.com' && /^\/(images|img)\//.test(url.pathname)) && !(url.origin==='https://app.statdx.com' && /^\/(image\/thumbnail|img)\//.test(url.pathname)))throw Error('Unsupported source resource.');
    const saved=await RadPrimerImageCache.stage(url.href,filename);
    const metadata=await RadPrimerImageCache.describe(url.href);
    return {status:'complete',filename,downloadId:saved.item.id,method:saved.method,...metadata};
  })().then(result=>sendResponse({ok:true,result})).catch(error=>sendResponse({ok:false,error:error.message || String(error)}));
  return true;
});
