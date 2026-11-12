// Coordinates are CSS pixels in the image viewport; scale is relative to the source.
export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function fit(view, image) {
  return Math.min(view.width / image.width, view.height / image.height, 1);
}
export function constrain(camera, view, image) {
  const scale = clamp(camera.scale, fit(view, image), Math.max(8 * fit(view, image), 1));
  const width = image.width * scale, height = image.height * scale;
  return {scale, x: width <= view.width ? (view.width-width)/2 : clamp(camera.x, view.width-width, 0),
    y: height <= view.height ? (view.height-height)/2 : clamp(camera.y, view.height-height, 0)};
}
export function zoomAt(camera, scale, point, view, image) {
  scale = clamp(scale, fit(view,image), Math.max(8 * fit(view,image),1));
  const ratio = scale / camera.scale;
  return constrain({scale, x:point.x-(point.x-camera.x)*ratio, y:point.y-(point.y-camera.y)*ratio},view,image);
}
