const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {organize}=require('../tools/organize-source-library.cjs'),C=require('../source-library-core.js');
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'source-library-names-'));
  t.after(()=>{assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'source-library-names-'));fs.rmSync(root,{recursive:true,force:true});});
  const write=(name,content)=>{fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),content);};
  const files={};for(const variant of ['plain','annotated']){const bytes=Buffer.from('original '+variant),relativePath='_images/shared/'+variant+'.jpg';write(relativePath,bytes);files[variant]={status:'complete',relativePath,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),downloadId:variant==='plain'?1:2};}
  const articles={};
  for(const [id,title,numbers] of [['a','Acute Pancreatitis',[1,2]],['b','Another Article',[1]]]){
    const images=numbers.map(number=>({id:'shared',number,rawCaption:'Original caption '+number,captionText:'Original caption '+number,files:structuredClone(files)}));
    if(id==='b')images[0].files.annotated={status:'failed',error:'Paused before download'};
    const article=articles[id]={id,title,folder:'Basic/'+title,images,status:id==='b'?'paused':'complete',errors:id==='b'?['Not downloaded']:[],memberships:[{level:'Basic'}],resources:[],artifacts:[]};
    write(article.folder+'/images.json',JSON.stringify({articleId:id,expectedImages:images.length,images,resources:[]}));
    write(article.folder+'/source.json',JSON.stringify({id,original:'untouched'}));
    write(article.folder+'/article.html',images.map(image=>'<figure id="image-'+image.number+'">'+Object.values(image.files).filter(f=>f.status==='complete').map(f=>'<a href="../../'+C.pathUrl(f.relativePath)+'"><img src="../../'+C.pathUrl(f.relativePath)+'"></a>').join('')+'<figcaption>'+image.rawCaption+'</figcaption></figure>').join(''));
  }
  const library={kind:'radprimer-curriculum-library',status:'paused',folder:'RadPrimerLibrary/GI/Pancreas',title:'Pancreas',articles,curricula:{Basic:{title:'Basic',articleIds:['a','b'],objectives:[]}}};write('collection.json',JSON.stringify(library));write('index.html','old index');
  return {root,library,write};
}
test('offline repair keeps each occurrence numbered and preserves paused state, sources and hashes',t=>{
  const {root,library}=fixture(t),before=fs.readFileSync(path.join(root,'collection.json'));
  const preview=organize(root);assert.equal(preview.imageFiles,5);assert.deepEqual(fs.readFileSync(path.join(root,'collection.json')),before);
  const result=organize(root,{apply:true});assert.equal(result.imageFiles,5);assert.equal(result.collectionStatus,'paused');
  const after=JSON.parse(fs.readFileSync(path.join(root,'collection.json')));assert.equal(after.status,'paused');assert.equal(after.articles.b.status,'paused');assert.equal(after.articles.b.images[0].files.annotated.status,'failed');
  for(const article of Object.values(after.articles))for(const image of article.images){
    const html=fs.readFileSync(path.join(root,article.folder,'article.html'),'utf8'),figure=html.match(new RegExp('<figure id="image-'+image.number+'">([\\s\\S]*?)</figure>'))[1];
    for(const [variant,file] of Object.entries(image.files))if(file.status==='complete'){
      assert.equal(file.relativePath,C.imagePath(article,image,variant));assert.ok(figure.includes(C.pathUrl(file.relativePath)));
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.relativePath))).digest('hex'),file.sha256);
    }
    assert.ok(figure.includes(image.rawCaption));
  }
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,library.articles.a.folder,'source.json'))).original,'untouched');
  assert.ok(fs.existsSync(path.join(root,result.backup,'_images/shared/plain.jpg')));assert.ok(!fs.existsSync(path.join(root,'_images')));
  assert.deepEqual(fs.readFileSync(path.join(root,result.backup,'collection.json')),before);
  assert.equal(organize(root,{apply:true}).imageFiles,0,'Reapplying makes no further changes');
});
test('a corrupted source file fails preflight without changing the inventory',t=>{
  const {root,write}=fixture(t),before=fs.readFileSync(path.join(root,'collection.json'));write('_images/shared/plain.jpg','wrong bytes');
  assert.throws(()=>organize(root,{apply:true}),/checksum mismatch/);assert.deepEqual(fs.readFileSync(path.join(root,'collection.json')),before);assert.ok(!fs.existsSync(path.join(root,'_backup_before_image_rename')));
});
test('offline repair refuses a running collection',t=>{
  const {root,library,write}=fixture(t);library.status='collecting';write('collection.json',JSON.stringify(library));assert.throws(()=>organize(root,{apply:true}),/Pause the collection/);
});
