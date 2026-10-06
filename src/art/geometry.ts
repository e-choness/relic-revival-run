import { svgPathProperties } from 'svg-path-properties';
import type { Anchor, Shape, Vec } from './types';

const r = (n: number) => Math.round(n * 100) / 100;

export function anchorsToD(anchors: Anchor[], closed: boolean): string {
  if (anchors.length === 0) return '';
  const seg = (a: Anchor, b: Anchor) => {
    const c1 = { x: a.x + (a.out?.x ?? 0), y: a.y + (a.out?.y ?? 0) };
    const c2 = { x: b.x + (b.in?.x ?? 0), y: b.y + (b.in?.y ?? 0) };
    return `C ${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(b.x)} ${r(b.y)}`;
  };
  const parts = [`M ${r(anchors[0].x)} ${r(anchors[0].y)}`];
  for (let i = 1; i < anchors.length; i++) parts.push(seg(anchors[i - 1], anchors[i]));
  if (closed && anchors.length > 2) parts.push(seg(anchors[anchors.length - 1], anchors[0]), 'Z');
  return parts.join(' ');
}

export function shapeD(shape: Shape): string {
  return shape.d ?? anchorsToD(shape.anchors ?? [], shape.closed);
}

/** Evenly spaced points along a path (all subpaths). */
export function samplePath(d: string, step = 4): Vec[][] {
  // Split on moveto so each subpath becomes its own stroke.
  const subpaths = d.match(/[Mm][^Mm]*/g) ?? [];
  return subpaths.flatMap((sp) => {
    try {
      const props = new svgPathProperties(sp);
      const len = props.getTotalLength();
      if (!len) return [];
      const n = Math.max(2, Math.ceil(len / step));
      return [Array.from({ length: n + 1 }, (_, i) => props.getPointAtLength((len * i) / n))];
    } catch {
      return [];
    }
  });
}

export function bounds(points: Vec[]): { x: number; y: number; w: number; h: number } {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Closed polygon from an outline (perfect-freehand output) as path data. */
export function polygonToD(points: number[][]): string {
  if (points.length < 3) return '';
  return `M ${points.map(([x, y]) => `${r(x)} ${r(y)}`).join(' L ')} Z`;
}
