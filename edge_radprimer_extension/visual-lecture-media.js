(function (root) {
  "use strict";
  function rasterMime(bytes) {
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
    if ([137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) return "image/png";
    const header = String.fromCharCode(...bytes.slice(0,12));
    if (/^GIF8[79]a/.test(header)) return "image/gif";
    if (header.startsWith("RIFF") && header.slice(8,12) === "WEBP") return "image/webp";
    return "";
  }
  async function imageBlob(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mime = rasterMime(bytes);
    if (!mime) throw new Error("The source returned a sign-in page or non-image response. Keep the source article open and signed in, then retry.");
    // Servers may label real images as application/octet-stream. Check the file,
    // not that header, and retain the exact bytes with a usable raster MIME type.
    const image = new Blob([bytes], { type: mime });
    if (typeof createImageBitmap === "function") {
      const decoded = await createImageBitmap(image); decoded.close();
    }
    return image;
  }
  root.VisualLectureMedia = { rasterMime, imageBlob };
  if (typeof module !== "undefined") module.exports = root.VisualLectureMedia;
})(globalThis);
