/* Local-only browser fixtures; serves only these explicit test assets. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const files={
  '/':'corebook_card_registry/tests/attachment-browser.html',
  '/composer':'corebook_card_registry/tests/composer-browser.html',
  '/edge_radprimer_extension/corebook-chatgpt-attachment.js':'edge_radprimer_extension/corebook-chatgpt-attachment.js'
};
const server=http.createServer((req,res)=>{
  if(req.url==='/composer-helpers.js') {
    const source=fs.readFileSync(path.join(root,'edge_radprimer_extension/chatgpt-paster.js'),'utf8');
    const helpers=source.slice(source.indexOf('  const SELECTORS ='),source.indexOf('  const parseChatGptProjectRoute ='));
    res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8'});
    res.end('(()=>{'+helpers+'\nwindow.ComposerFixture={clearAndFillComposer,composerLooksFilled,getComposerText,normalizeForComposerCheck,waitFor,fillVerifiedComposer};})();');
    return;
  }
  const file=files[req.url];if(!file){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'application/javascript; charset=utf-8'});
  res.end(fs.readFileSync(path.join(root,file)));
});
server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
