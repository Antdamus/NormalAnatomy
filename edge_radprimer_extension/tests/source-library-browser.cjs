/* Isolated fixture test: no live account or source network is used. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),extract=fs.readFileSync(path.join(root,'source-library-extractor.js'),'utf8');
const source='https://app.radprimer.com/document/abc-123/lesson/lesson-basic';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();
  await page.route('https://app.radprimer.com/**',route=>route.fulfill({contentType:'text/html',body:`<h1>Fixture article</h1><div class="breadcrumbs"><ul><li>Basic</li><li>Gastrointestinal</li><li>Pancreas</li></ul></div><div class="document-data"><h2>IMAGING</h2><p>Important <strong>complete text</strong>.</p><table><tr><td>One</td><td>Two</td></tr></table><h2>SELECTED REFERENCES</h2><p><a href="https://pubmed.ncbi.nlm.nih.gov/123">Reference retained</a></p><img src="/img/arrows/WC.png" alt="White curved arrow" onerror="alert(1)"><script>/* must not be exported in display HTML */</script></div><p>Displaying images 1 to 2 of 2.</p><div id="gallery"><button rel="image-1" data-category-name="Cases"><img src="/images/image-1?style=thumbnail" data-caption="Original &lt;img src='/img/arrows/WC.png' alt='White curved arrow'&gt; caption" data-groupname="Cases"></button><button rel="image-2"><img src="/images/image-2?style=thumbnail" data-caption="Distinct phase" data-groupname="Cases"></button></div>`}));
  await page.goto(source);const captured=await page.evaluate(extract);
  assert.equal(captured.kind,'article');assert.equal(captured.images.length,2);assert.equal(captured.expectedImages,2);assert.deepEqual(captured.errors,[]);
  assert.match(captured.articleText,/Reference retained/);assert.match(captured.articleHtml,/<table>/);assert.ok(!captured.articleHtml.includes('onerror'));assert.ok(!captured.articleHtml.includes('<script'));
  assert.match(captured.images[0].captionHtml,/White curved arrow/);assert.match(captured.images[0].plainUrl,/annotated=false/);assert.match(captured.images[0].annotatedUrl,/annotated=true/);assert.equal(captured.resources.length,1);
  await page.locator('#gallery button').last().evaluate(el=>el.remove());const partial=await page.evaluate(extract);assert.match(partial.errors.join(' '),/count mismatch/);
  await page.route('https://app.radprimer.com/lesson/basic',route=>route.fulfill({contentType:'text/html',body:`<h1>Pancreas</h1><div class="breadcrumbs"><ul><li>All Categories</li><li>Basic</li><li>GI</li><li>Pancreas</li></ul></div><h2>Learning Objectives</h2><ul><li>Objective one</li><li>Objective two</li></ul><ul id="lesson-content"><li class="folder"><button><span class="folder-name">Diagnosis</span></button><ul><li><a href="/document/article-1/lesson/basic">Disease one</a></li><li><a href="/document/article-2/lesson/basic">Disease two</a></li></ul></li></ul>`}));
  await page.goto('https://app.radprimer.com/lesson/basic');const curriculum=await page.evaluate(extract);assert.equal(curriculum.articles.length,2);assert.equal(curriculum.articles[0].category,'Diagnosis');assert.equal(curriculum.objectives.length,2);
  console.log('PASS: full references/tables, both variants, caption icons, original ordering, source metadata, missing-gallery detection, curriculum discovery');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
