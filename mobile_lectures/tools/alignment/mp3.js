// Lossless removal of interleaved ID3 metadata from chunked Speechify exports.
// Never resynchronise past unknown data or remove an MPEG frame.
export function cleanChunkedMp3(input) {
  const bytes=Buffer.from(input),frames=[],tags=[];let offset=0,format=null,samples=0;
  while(offset<bytes.length){
    if(bytes.subarray(offset,offset+3).toString()==='ID3'){
      if(offset+10>bytes.length||![2,3,4].includes(bytes[offset+3])||bytes.subarray(offset+6,offset+10).some(x=>x>127))throw new Error('Malformed MP3 metadata.');
      const flags=bytes[offset+5];
      if((bytes[offset+3]===2&&(flags&63))||(bytes[offset+3]===3&&(flags&31))||(bytes[offset+3]===4&&(flags&15)))throw new Error('Unsupported MP3 metadata flags.');
      let length=10;for(let j=0;j<4;j++)length+=bytes[offset+6+j]*2**((3-j)*7);
      if(bytes[offset+3]===4&&(flags&16))length+=10;
      if(offset+length>bytes.length)throw new Error('Truncated MP3 metadata.');
      tags.push({offset,bytes:length,afterFrames:frames.length});offset+=length;continue;
    }
    if(bytes.subarray(offset,offset+3).toString()==='TAG'&&offset+128===bytes.length){tags.push({offset,bytes:128,afterFrames:frames.length});offset+=128;continue;}
    if(offset+4>bytes.length)throw new Error('Truncated MP3 frame.');
    const h=bytes.readUInt32BE(offset),version=(h>>>19)&3,layer=(h>>>17)&3,bitrateIndex=(h>>>12)&15,rateIndex=(h>>>10)&3;
    if((h>>>21)!==2047||![3,2,0].includes(version)||layer!==1||!bitrateIndex||bitrateIndex===15||rateIndex===3)throw new Error('Unrecognised data in MP3; no audio bytes were discarded.');
    const sampleRate=[44100,48000,32000][rateIndex]/({3:1,2:2,0:4}[version]);
    const channels=((h>>>6)&3)===3?1:2,currentFormat=`${version}/${sampleRate}/${channels}`;
    if(format&&format!==currentFormat)throw new Error('MP3 changes audio format between chunks.');format=currentFormat;
    const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bitrateIndex];
    const length=Math.floor((version===3?144000:72000)*bitrate/sampleRate)+((h>>>9)&1);
    if(offset+length>bytes.length)throw new Error('Truncated MP3 audio frame.');
    frames.push(bytes.subarray(offset,offset+length));samples+=(version===3?1152:576)/sampleRate;offset+=length;
  }
  if(!frames.length)throw new Error('MP3 contains no audio frames.');
  const internal=tags.filter(t=>t.afterFrames>0&&t.afterFrames<frames.length);
  return {bytes:internal.length?Buffer.concat(frames):bytes,changed:internal.length>0,
    report:{method:'remove-interleaved-id3-v1',audioFramesPreserved:frames.length,internalMetadataBlocks:internal.length,metadataBytesRemoved:internal.length?tags.reduce((n,t)=>n+t.bytes,0):0,frameDuration:samples}};
}
