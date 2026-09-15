const fs = require('node:fs');
const path = require('node:path');
const core = require('../visual-lecture-core.js');
const root = path.resolve(__dirname, '../..');
function fixture() {
  const source = path.join(root, 'master_source_queue/Periportal_Lesion_2026-09-13T01-30-56-923Z');
  const ids = ['SDX-02', 'SDX-01', 'SDX-26', 'SDX-27', 'SDX-28', 'SDX-29'];
  const registry = JSON.parse(fs.readFileSync(path.join(source, 'image_registry.json'), 'utf8'))
    .filter(i => ids.includes(i.masterImageId)).map(i => ({ ...i, required: true }));
  const caption = id => registry.find(i => i.masterImageId === id).caption;
  const plan = {
    schemaVersion: 1, title: 'Periportal lesion', orientation: 'Start with the visible pattern, then compare the structures beside the portal vein.',
    patterns: [{ id: 'tubes', label: 'Tubular or cystic structures', cue: 'Ducts, cysts, or an occluded portal vein?', overviewImageIds: ['SDX-02','SDX-26','SDX-28'] }],
    cases: [
      { id:'ducts', patternId:'tubes', label:'Dilated bile ducts', relationship:'comparison', relationshipEvidence:'', imageIds:['SDX-02','SDX-01'], modalityLabels:{'SDX-02':'Contrast-enhanced CT','SDX-01':'T2 fat-suppressed MRI'}, focus:'Look for ducts alongside the portal vein.', discriminator:'Different patients and causes illustrate the same ductal pattern.', sourceBasis:'STATdx captions 1 and 2' },
      { id:'cysts', patternId:'tubes', label:'Peribiliary cysts', relationship:'same patient', relationshipEvidence:caption('SDX-27'), imageIds:['SDX-26','SDX-27'], modalityLabels:{'SDX-26':'Contrast-enhanced CT','SDX-27':'T2 fat-suppressed MRI'}, focus:'Compare water-density and water-intensity cystic structures.', discriminator:'These source cases are peribiliary cysts; T2 brightness alone does not establish duct communication.', sourceBasis:'STATdx captions 26 and 27' },
      { id:'thrombus', patternId:'tubes', label:'Portal vein thrombosis', relationship:'same patient', relationshipEvidence:caption('SDX-29'), imageIds:['SDX-28','SDX-29'], modalityLabels:{'SDX-28':'Contrast-enhanced CT','SDX-29':'Contrast-enhanced CT · second view'}, focus:'Trace the occluded portal branches and collateral veins.', discriminator:'The low-density branching structures here are occluded portal veins, a ductal mimic.', sourceBasis:'STATdx captions 28 and 29' }
    ], lectureOrder:['ducts','cysts','thrombus']
  };
  const sourceText = registry.map(i => i.caption).join('\n\n');
  const rawNarration = { schemaVersion:1, segments:plan.cases.map(c => ({ caseId:c.id, text:c.imageIds.map(id => `STATdx image ${registry.find(i => i.masterImageId === id).sourceImageNumber}. ${caption(id).replace(/<[^>]*>/g,'')}`).join('\n\n') })) };
  const lesson = { id:'vl-123456789abcdef0', title:'Periportal lesion', registry, sourceText, plan, narration:core.validateNarration(rawNarration,plan,registry), status:'ready', updatedAt:1, createdAt:1, settings:{chatgptTimeoutSec:30}, speechifyTitle:'Periportal lesion · 9abcdef0' };
  const mediaDir = path.join(root,'radprimer_audit_queue/Periportal_Lesion_2026-09-13T02-42-52-327Z/media');
  return { lesson, rawNarration, mediaDir };
}
fixture.available = () => [
  'master_source_queue/Periportal_Lesion_2026-09-13T01-30-56-923Z/image_registry.json',
  'radprimer_audit_queue/Periportal_Lesion_2026-09-13T02-42-52-327Z/media'
].every(name => fs.existsSync(path.join(root, name)));
module.exports = fixture;
