import {sha256} from './contract.js';
export const HANDOFF_VERSION=1;
export function speechifyDocument(value){
  let url;try{url=new URL(value);}catch{}
  if(!url||url.origin!=='https://app.speechify.com'||!/^\/item\/[a-zA-Z0-9-]+$/.test(url.pathname))throw new Error('An exact saved Speechify reader is required.');
  return url.origin+url.pathname;
}
export async function validateExport(receipt,manifest){
  if(receipt?.version!==HANDOFF_VERSION||receipt.fingerprint!==manifest.fingerprint||receipt.method!=='speechify-full-document-export'||
    receipt.transcriptSha256!==await sha256(new TextEncoder().encode(manifest.lesson.narration.text))||
    receipt.fullTextMatched!==true||!receipt.title||!receipt.voice||!Number.isSafeInteger(receipt.downloadId)||
    !Number.isFinite(Date.parse(receipt.startedAt))||!Number.isFinite(Date.parse(receipt.completedAt))||Date.parse(receipt.completedAt)<Date.parse(receipt.startedAt))throw new Error('The full-document export evidence does not match this approved lecture.');
  speechifyDocument(receipt.readerUrl);return receipt;
}
