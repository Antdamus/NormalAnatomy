import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {align,setGlobalOption} from 'echogarden';
import {readPackage,verifyManifest,sha256} from '../../src/contract.js';
import {transcriptAnchors,mapAlignedWords} from '../../src/timing-anchors.js';

const {values}=parseArgs({options:{package:{type:'string'},manifest:{type:'string'},audio:{type:'string'},out:{type:'string'},profile:{type:'string',default:'baseline'},ffmpeg:{type:'string'}}});
if((!values.package&&!values.manifest)||!values.audio||!values.out)throw new Error('Use --package or --manifest, --audio and --out.');
if(!['baseline','check'].includes(values.profile))throw new Error('Unknown alignment profile.');
try{await fs.access(values.out);throw new Error('Output already exists; retain previous evidence and choose a new output.');}catch(e){if(e.code!=='ENOENT')throw e;}
const manifest=values.package?(await readPackage(await fs.readFile(values.package))).manifest:await verifyManifest(JSON.parse(await fs.readFile(values.manifest,'utf8')));
const transcript=manifest.lesson.narration.text,anchors=transcriptAnchors(manifest.lesson);
const audioBytes=await fs.readFile(values.audio),audioSha256=await sha256(audioBytes),transcriptSha256=await sha256(new TextEncoder().encode(transcript));
if(values.ffmpeg)setGlobalOption('ffmpegPath',values.ffmpeg);
// Fail on decode errors rather than accepting ffmpeg's usual success-with-skips.
const run=promisify(execFile),ffmpeg=values.ffmpeg||'ffmpeg';
await run(ffmpeg,['-nostdin','-v','error','-xerror','-err_detect','explode','-i',values.audio,'-vn','-f','null','-'],{windowsHide:true,maxBuffer:1024*1024});
const ffprobe=values.ffmpeg?path.join(path.dirname(values.ffmpeg),process.platform==='win32'?'ffprobe.exe':'ffprobe'):'ffprobe';
const probe=JSON.parse((await run(ffprobe,['-v','error','-show_entries','format=duration','-of','json',values.audio],{windowsHide:true})).stdout);
const playbackDuration=Number(probe.format?.duration);
console.log(JSON.stringify({stage:'aligning',engine:'dtw',profile:values.profile,anchors:anchors.length,characters:transcript.length,audioSha256}));
// No transcription/generation model or external audio service is used. Explicit
// language, crop=false and isolate=false also avoid optional neural preprocessing.
const options={engine:'dtw',language:'en-US',crop:false,isolate:false,plainText:{paragraphBreaks:'double',whitespace:'preserve'},dtw:values.profile==='baseline'?{granularity:['xx-low','low'],windowDuration:['20%',15]}:{granularity:['x-low','medium'],windowDuration:['25%',20]}};
const result=await align(values.audio,transcript,options,{logLevel:'info'});
const decodedDuration=result.inputRawAudio.audioChannels[0].length/result.inputRawAudio.sampleRate;
if(!Number.isFinite(playbackDuration)||Math.abs(playbackDuration-decodedDuration)>0.25)throw new Error('Recording playback and decoded clocks disagree; automatic timing is held.');
const duration=playbackDuration;
const words=result.wordTimeline.map(({text,startTime,endTime,startOffsetUtf16,endOffsetUtf16})=>({text,startTime,endTime,startOffsetUtf16,endOffsetUtf16}));
const cues=mapAlignedWords(anchors,words,duration);
const output={format:'normalanatomy-alignment-evidence',version:1,createdAt:new Date().toISOString(),fingerprint:manifest.fingerprint,audioSha256,transcriptSha256,duration,decodedDuration,engine:'echogarden-dtw',engineVersion:'3.4.0',profile:values.profile,options,cues,words,humanVerified:false};
await fs.mkdir(path.dirname(values.out),{recursive:true});await fs.writeFile(values.out,JSON.stringify(output),{encoding:'utf8',flag:'wx'});
console.log(JSON.stringify({stage:'aligned',cues:cues.length,words:words.length,duration,output:values.out,humanVerified:false}));
