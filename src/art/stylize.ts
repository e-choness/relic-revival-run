import { getStroke } from 'perfect-freehand';
import { bounds, polygonToD, samplePath, shapeD } from './geometry';
import type { AvatarDoc, AvatarStyle, Part, PartId, Shape, Vec } from './types';

// Turns human-drawn shapes into the jam look: tapered brush ink, flat fill, one cel-shade crescent, blush.

export interface RenderOptions {
  /** Prefix for SVG ids so several renders can share a DOM. */
  idPrefix?: string;
  /** Only these parts (default: all, in template order). */
  parts?: PartId[];
  /** SVG transform per part (from the rig). */
  transforms?: Partial<Record<PartId, string>>;
}

export function color(doc: AvatarDoc, key: string): string {
  return doc.palette[key] ?? (key.startsWith('#') ? key : '#ff00ff');
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

/** Brush-like ink outline as a filled polygon path. */
export function inkPath(d: string, style: AvatarStyle, closed: boolean): string {
  const seed = [...d].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 1000, 7) / 100;
  return samplePath(d)
    .map((raw) => {
      const pts = wobble(raw, style.wobble, seed);
      const n = pts.length;
      // A slow thick/thin rhythm imitates hand pressure along the stroke.
      const input = pts.map((p, i) => [p.x, p.y, 0.5 + 0.5 * style.pressureVariation * Math.sin((i / n) * Math.PI * 6 + 1.3)]);
      const len = n * 4;
      const stroke = getStroke(input, {
        size: style.inkWidth,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.2,
        simulatePressure: false,
        last: true,
        start: { taper: closed ? 0 : len * 0.25 * style.taper },
        end: { taper: closed ? 0 : len * 0.25 * style.taper },
      });
      return polygonToD(stroke);
    })
    .join(' ');
}

/** `id` is unique per shape; `fx` prefixes the shared blur filter. */
function renderShape(doc: AvatarDoc, shape: Shape, id: string, fx: string): { defs: string; body: string } {
  const d = shapeD(shape);
  if (!d) return { defs: '', body: '' };
  const s = doc.style;
  const fill = color(doc, shape.color);
  switch (shape.material) {
    case 'line':
      return { defs: '', body: `<path d="${inkPath(d, s, shape.closed)}" fill="${s.inkColor}"/>` };
    case 'highlight':
      return { defs: '', body: `<path d="${d}" fill="${fill}"/>` };
    case 'blush':
      return { defs: '', body: `<path d="${d}" fill="${fill}" opacity="0.75" filter="url(#${fx}-blur)"/>` };
    case 'solid': {
      const a = (s.lightAngle * Math.PI) / 180;
      const dx = Math.cos(a) * s.shadeOffset, dy = Math.sin(a) * s.shadeOffset;
      // Shade = shape minus a copy of itself shifted toward the light → a crescent on the far side.
      const defs = `<mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${doc.size}" height="${doc.size}"><rect width="${doc.size}" height="${doc.size}" fill="#fff"/><path d="${d}" transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)})" fill="#000"/></mask>`;
      const body =
        `<path d="${d}" fill="${fill}"/>` +
        `<path d="${d}" fill="${mix(fill, s.inkColor, s.shadeDarken)}" mask="url(#${id}-m)"/>` +
        `<path d="${inkPath(d, s, shape.closed)}" fill="${s.inkColor}"/>`;
      return { defs, body };
    }
  }
}

export function renderAvatar(doc: AvatarDoc, opts: RenderOptions = {}): { defs: string; body: string } {
  const p = opts.idPrefix ?? doc.id;
  const wanted = opts.parts ? new Set(opts.parts) : undefined;
  let defs =
    `<filter id="${p}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>`;
  let body = '';
  for (const part of doc.parts) {
    if (wanted && !wanted.has(part.id)) continue;
    let inner = '';
    part.shapes.forEach((shape, i) => {
      const out = renderShape(doc, shape, `${p}-${part.id}-${i}`, p);
      defs += out.defs;
      inner += out.body;
    });
    const t = opts.transforms?.[part.id];
    body += `<g data-part="${part.id}"${t ? ` transform="${t}"` : ''}>${inner}</g>`;
  }
  return { defs, body };
}

export function toSvg(doc: AvatarDoc, opts: RenderOptions = {}, viewBox = `0 0 ${doc.size} ${doc.size}`): string {
  const { defs, body } = renderAvatar(doc, opts);
  const [, , w, h] = viewBox.split(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>`;
}

/** Bounding box of a part including ink and wobble, for cropped export. */
export function partBounds(doc: AvatarDoc, part: Part): { x: number; y: number; w: number; h: number } | null {
  const pts: Vec[] = part.shapes.flatMap((s) => samplePath(shapeD(s), 8).flat());
  if (pts.length === 0) return null;
  const b = bounds(pts);
  const pad = doc.style.inkWidth + doc.style.wobble * 2 + 12;
  return { x: Math.floor(b.x - pad), y: Math.floor(b.y - pad), w: Math.ceil(b.w + pad * 2), h: Math.ceil(b.h + pad * 2) };
}

/**
 * Hand wobble: nudge sampled points along the line's normal with a smooth, looping wave.
 * Done on geometry rather than with an SVG displacement filter, which tears thin ink into spikes.
 */
function wobble(pts: Vec[], amount: number, seed: number): Vec[] {
  if (!amount || pts.length < 3) return pts;
  const n = pts.length - 1;
  // Whole cycles over the stroke so closed outlines meet without a seam.
  const c1 = Math.max(1, Math.round((n * 4 * 0.02) / (Math.PI * 2)));
  const c2 = Math.max(2, Math.round((n * 4 * 0.055) / (Math.PI * 2)));
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    const t = (i / n) * Math.PI * 2;
    const off = amount * (0.6 * Math.sin(c1 * t + seed) + 0.4 * Math.sin(c2 * t + seed * 1.7));
    return { x: p.x - (ty / l) * off, y: p.y + (tx / l) * off };
  });
}
