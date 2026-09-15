(() => {
  if (document.getElementById('radprimer-source-library-button')) return;
  function mount() {
    const statdx=location.hostname==='app.statdx.com';
    const eligible=statdx?/^\/document\//.test(location.pathname)&&document.querySelector('h1[data-document-id]'):/^\/lesson\//.test(location.pathname)&&document.querySelector('#lesson-content a[href*="/document/"]');
    const existing=document.getElementById('radprimer-source-library-button');
    if(!eligible){existing?.remove();return;}if(existing)return;
    const heading=document.querySelector('h1'); if(!heading)return;
    const host=document.createElement('span');host.id='radprimer-source-library-button';
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML='<style>button{font:600 14px system-ui;background:#126c70;color:white;border:0;border-radius:6px;padding:11px 16px;margin:12px 0;cursor:pointer}button:focus-visible{outline:3px solid #72cfd2;outline-offset:3px}</style><button type="button">Download curriculum sources</button>';
    if(statdx)shadow.querySelector('button').textContent='Add to source collection';
    shadow.querySelector('button').addEventListener('click',async()=>{
      try {const response=await chrome.runtime.sendMessage({type:statdx?'SOURCE_LIBRARY_OPEN_STATDX':'SOURCE_LIBRARY_OPEN',url:location.href});if(!response?.ok)throw Error(response?.error || 'Unable to open source library.');}
      catch(error){shadow.querySelector('button').textContent='Reload this page to connect the updated extension';console.warn(error);}
    });
    heading.parentElement.insertAdjacentElement('afterend',host);
  }
  mount();
  let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(mount,200);}).observe(document.body,{childList:true,subtree:true});
})();
