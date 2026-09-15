/* Image bytes are shared across source evidence, master bundles and card runs. */
(function (root) {
  'use strict';
  function sourceKey(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !/^(?:app\.radprimer\.com|(?:[a-z0-9-]+\.)?statdx\.com)$/i.test(url.hostname)) {
      throw new Error('Unsupported source image address.');
    }
    url.hash = '';
    // Size, annotation and all other query parameters are part of the identity.
    return url.href;
  }
  function targetKey(value) {
    const path = String(value || '').replace(/\\/g, '/');
    if (!path || path.startsWith('/') || path.includes(':') || path.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error('Expected an image path relative to Downloads.');
    }
    return path;
  }
  function sameTarget(item, path) {
    return String(item?.filename || '').replace(/\\/g, '/').toLowerCase().endsWith('/' + path.toLowerCase());
  }
  function reusable(item, url, path, receipt) {
    if (!sameTarget(item, path) || item.state !== 'complete' || item.exists !== true || !(item.fileSize > 0)) return false;
    if (receipt?.url === url && receipt.id === item.id && receipt.size === item.fileSize) return true;
    // Adopt older direct downloads only when their source AND destination match.
    try { return /^image\/(?:jpeg|png|gif|webp)\b/i.test(item.mime || '') && sourceKey(item.url) === url; }
    catch { return false; }
  }
  async function hash(blob) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function validate(blob, expectedHash) {
    const image = await VisualLectureMedia.imageBlob(blob);
    const sha256 = await hash(image);
    if (expectedHash && sha256 !== expectedHash) throw new Error('Cached image checksum mismatch.');
    return {blob:image, sha256};
  }
  function create({store, downloads, fetchImage, seedImage = async () => null, validateImage = validate, saveFile}) {
    const loading = new Map();
    let staging = Promise.resolve();
    async function loadImage(url) {
      const cached = await store.get('image:' + url);
      if (cached?.url === url && cached.blob && cached.sha256) {
        try { return {...await validateImage(cached.blob, cached.sha256), reused:true, origin:'cache'}; } catch {}
      }
      const seed = await seedImage(url).catch(() => null);
      let image, origin;
      if (seed?.blob && seed.sha256) {
        try { image = await validateImage(seed.blob, seed.sha256); origin = 'local-file'; } catch {}
      }
      if (!image) { image = await validateImage(await fetchImage(url)); origin = 'source'; }
      await store.put({key:'image:' + url, url, ...image});
      return {...image, reused:origin !== 'source', origin};
    }
    function image(value) {
      const url = sourceKey(value);
      if (!loading.has(url)) {
        const promise = loadImage(url).finally(() => loading.delete(url));
        loading.set(url, promise);
      }
      return loading.get(url);
    }
    async function stageOne(value, filename, timeoutMs) {
      const url = sourceKey(value), path = targetKey(filename);
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '[\\\\/]');
      // Check the latest writer, not an older matching record for an overwritten path.
      const items = await downloads.search({filenameRegex:'[\\\\/]' + escaped + '$', orderBy:['-startTime'], limit:0});
      const latest = items.filter(item => sameTarget(item, path)).sort((a,b) =>
        String(b.startTime || '').localeCompare(String(a.startTime || '')) || b.id - a.id)[0];
      const receipt = await store.get('target:' + path.toLowerCase());
      if (reusable(latest, url, path, receipt)) return {item:latest, method:'existing-file'};

      const content = await image(url);
      const item = await saveFile(content.blob, path, timeoutMs);
      if (item?.state !== 'complete' || !sameTarget(item, path) ||
          (typeof item.fileSize === 'number' && item.fileSize >= 0 && item.fileSize !== content.blob.size)) {
        throw new Error('The image did not finish saving under its required filename.');
      }
      await store.put({key:'target:' + path.toLowerCase(), url, id:item.id, size:content.blob.size, sha256:content.sha256});
      return {item, method:content.reused ? 'cached-image' : 'source', sha256:content.sha256};
    }
    return {image, stage(value, filename, timeoutMs = 120000) {
      // Serialize destination writes and filename routing across simultaneous retries.
      const job = staging.then(() => stageOne(value, filename, timeoutMs));
      staging = job.catch(() => {});
      return job;
    }};
  }

  let connection;
  function open() {
    if (!connection) connection = new Promise((resolve,reject) => {
      const request = indexedDB.open('radprimer-source-images', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('entries', {keyPath:'key'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { connection = null; reject(request.error); };
    });
    return connection;
  }
  async function operation(method, value, mode = 'readonly') {
    const db = await open();
    return new Promise((resolve,reject) => {
      const tx = db.transaction('entries', mode), request = tx.objectStore('entries')[method](value);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Image cache storage failed.'));
    });
  }
  let seedManifest;
  async function localSeed(url) {
    // Optional private, locally staged migration. No filesystem-access permission
    // or Anki changes are needed; these assets are not web-accessible resources.
    if (!seedManifest) seedManifest = fetch(chrome.runtime.getURL('local-image-cache/index.json'))
      .then(response => response.ok ? response.json() : null).catch(() => null);
    const manifest = await seedManifest;
    const entry = manifest?.version === 1 && manifest.entries?.find(row => row.url === url);
    if (!entry || !/^[a-f0-9]{64}\.(?:jpg|png|gif|webp)$/.test(entry.filename) ||
        !/^[a-f0-9]{64}$/.test(entry.sha256)) return null;
    const response = await fetch(chrome.runtime.getURL('local-image-cache/' + entry.filename));
    return response.ok ? {blob:await response.blob(), sha256:entry.sha256} : null;
  }
  let controller;
  function shared() {
    if (!controller) controller = create({
      store:{get:key => operation('get', key), put:entry => operation('put', entry, 'readwrite')},
      downloads:chrome.downloads, fetchImage:fetchImageForDownload, seedImage:localSeed, saveFile:saveCachedImageFile
    });
    return controller;
  }
  async function describe(url) {
    const value=await shared().image(url);
    const bitmap=await createImageBitmap(value.blob);
    try {
      const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d',{willReadFrequently:true});
      context.drawImage(bitmap,0,0);
      const digest=await crypto.subtle.digest('SHA-256',context.getImageData(0,0,bitmap.width,bitmap.height).data);
      return {sha256:value.sha256,pixelHash:bitmap.width+'x'+bitmap.height+':'+[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join(''),width:bitmap.width,height:bitmap.height,mime:value.blob.type,bytes:value.blob.size};
    } finally {bitmap.close();}
  }
  root.RadPrimerImageCache = {sourceKey, targetKey, reusable, validate, create, describe, stage:(...args) => shared().stage(...args)};
  if (typeof module !== 'undefined') module.exports = root.RadPrimerImageCache;
})(globalThis);
