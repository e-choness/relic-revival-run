/** Join quiet edge strips into a periodic texture without mirroring the scenery.
 * The last output column and first output column are neighbours in the source.
 * Premultiplied blending preserves translucent foliage without dark fringes.
 */
export function loopPixels(source: Uint8ClampedArray, width: number, height: number, overlap = Math.round(width * 0.18)) {
  const band = Math.max(2, Math.min(Math.floor(width / 3), overlap));
  const period = width - band;
  const data = new Uint8ClampedArray(period * height * 4);
  const straight = width - band * 2;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    data.set(source.subarray(row + band * 4, row + (width - band) * 4), y * period * 4);
    for (let x = 0; x < band; x++) {
      const u = x / (band - 1), t = u * u * (3 - 2 * u);
      const a = row + (width - band + x) * 4, b = row + x * 4;
      const dest = (y * period + straight + x) * 4;
      const aa = source[a + 3] * (1 - t), ab = source[b + 3] * t, alpha = aa + ab;
      for (let c = 0; c < 3; c++) data[dest + c] = alpha ? (source[a + c] * aa + source[b + c] * ab) / alpha : 0;
      data[dest + 3] = alpha;
    }
  }
  return { data, width: period, height };
}

/** Build once when a scene first visits a setting; scrolling itself is GPU tiled. */
export function loopCanvas(source: HTMLImageElement | HTMLCanvasElement) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const result = loopPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  canvas.width = result.width;
  ctx.putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
  return canvas;
}

export const sceneryFamily = (id: string) => ['egypt', 'iran', 'mali'].includes(id) ? 'arid' : ['portugal', 'greece', 'peru'].includes(id) ? 'coastal' : 'woodland';
export const PARALLAX_SPEED = { distance: 0.08, middle: 0.32, ground: 1 };
