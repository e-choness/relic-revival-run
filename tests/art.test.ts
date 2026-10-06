import { describe, expect, it } from 'vitest';
import { anchorsToD, samplePath } from '../src/art/geometry';
import { runPose, worldMatrices } from '../src/art/rig';
import { inkPath, mix, partBounds, renderAvatar } from '../src/art/stylize';
import { DEFAULT_STYLE, newAvatar, type Anchor } from '../src/art/types';

// Test geometry is deliberately trivial (squares); character shapes come only from the owner.
const square: Anchor[] = [
  { x: 100, y: 100 },
  { x: 300, y: 100 },
  { x: 300, y: 300 },
  { x: 100, y: 300 },
];

describe('geometry', () => {
  it('builds closed cubic paths from anchors', () => {
    const d = anchorsToD(square, true);
    expect(d.startsWith('M 100 100')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(4);
  });

  it('samples points along each subpath', () => {
    const [pts] = samplePath(anchorsToD(square, true), 10);
    expect(pts.length).toBeGreaterThan(70);
    expect(pts[0].x).toBeCloseTo(100);
  });
});

describe('stylize', () => {
  const doc = newAvatar('t', 'Test');
  doc.parts.find((p) => p.id === 'body')!.shapes.push({ id: 'a', material: 'solid', color: 'fur', closed: true, anchors: square });

  it('renders fill, shade crescent and ink for solid shapes', () => {
    const { defs, body } = renderAvatar(doc, { idPrefix: 'x' });
    expect(defs).toContain('<mask id="x-body-0-m"');
    expect(defs).not.toContain('feTurbulence'); // wobble is geometric, not a filter
    expect(body.match(/<path /g)).toHaveLength(3);
    expect(body).toContain('data-part="body"');
  });

  it('ink is a filled polygon, not a stroke', () => {
    const d = inkPath(anchorsToD(square, true), DEFAULT_STYLE, true);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('pads part bounds for ink and wobble', () => {
    const b = partBounds(doc, doc.parts.find((p) => p.id === 'body')!)!;
    expect(b.x).toBeLessThan(100);
    expect(b.w).toBeGreaterThan(200);
    expect(partBounds(doc, doc.parts.find((p) => p.id === 'head')!)).toBeNull();
  });

  it('mixes colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('rig', () => {
  const doc = newAvatar('t', 'Test');
  doc.parts.find((p) => p.id === 'body')!.pivot = { x: 500, y: 600 };
  doc.parts.find((p) => p.id === 'head')!.pivot = { x: 520, y: 450 };

  it('rest pose is identity everywhere', () => {
    const m = worldMatrices(doc, {});
    for (const v of Object.values(m)) expect(v.map((n) => +n.toFixed(6))).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('rotation keeps the pivot fixed', () => {
    const [a, b, c, d, e, f] = worldMatrices(doc, { body: { rot: 30 } }).body;
    expect(a * 500 + c * 600 + e).toBeCloseTo(500);
    expect(b * 500 + d * 600 + f).toBeCloseTo(600);
  });

  it('children inherit parent motion', () => {
    const m = worldMatrices(doc, { body: { y: -10 } });
    expect(m.head[5]).toBeCloseTo(-10);
    expect(m.earFront[5]).toBeCloseTo(-10);
  });

  it('legs swing in opposite directions', () => {
    const p = runPose(0.1);
    expect(Math.sign(p.legFront!.rot!)).toBe(-Math.sign(p.legBack!.rot!));
  });
});

describe('wobble', () => {
  it('changes the ink outline deterministically', () => {
    const d = anchorsToD(square, true);
    const still = inkPath(d, { ...DEFAULT_STYLE, wobble: 0 }, true);
    const wobbly = inkPath(d, { ...DEFAULT_STYLE, wobble: 3 }, true);
    expect(wobbly).not.toBe(still);
    expect(inkPath(d, { ...DEFAULT_STYLE, wobble: 3 }, true)).toBe(wobbly);
  });
});
