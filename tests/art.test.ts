import { describe, expect, it } from 'vitest';
import { anchorsToD, samplePath } from '../src/art/geometry';
import { blendPose, DEFAULT_RUN, fallPose, jumpPose, runPose, worldMatrices } from '../src/art/rig';
import { inkPath, mix, partBounds, renderAvatar } from '../src/art/stylize';
import { DEFAULT_STYLE, newAvatar, type Anchor } from '../src/art/types';
import { SIDE_JOINTS, solveLeg, strideFoot } from '../src/art/skeleton';
import { loopPixels } from '../src/art/loopTexture';

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

  it('keeps a planted ankle level and its sole flat while the pelvis bounces', () => {
    const side = newAvatar('side', 'Side view');
    for (const part of side.parts) part.pivot = SIDE_JOINTS[part.id];
    for (let frame = 0; frame < 100; frame++) {
      const phase = frame / 100;
      const pose = runPose(phase, { ...DEFAULT_RUN, cadence: 1 });
      const matrices = worldMatrices(side, pose);
      for (const name of ['Front', 'Back'] as const) {
        const foot = strideFoot(phase + (name === 'Back' ? 0.5 : 0), DEFAULT_RUN.legSwing * 5);
        if (!foot.planted) continue;
        const pivot = SIDE_JOINTS[`foot${name}`];
        const [a, b, c, d, e, f] = matrices[`foot${name}`];
        expect(a * pivot.x + c * pivot.y + e).toBeCloseTo(SIDE_JOINTS[`leg${name}`].x + foot.x, 4);
        expect(b * pivot.x + d * pivot.y + f).toBeCloseTo(914, 4);
        expect(Math.atan2(b, a)).toBeCloseTo(0, 5);
        expect(pose[`shin${name}`]!.rot).toBeGreaterThan(0);
      }
      expect(pose.body!.rot).toBeGreaterThan(10);
    }
  });

  it('bends knees forward and handles an unreachable target without NaN', () => {
    const leg = solveLeg({ x: 0, y: 0 }, { x: 0, y: 150 });
    expect(leg.knee.x).toBeGreaterThan(0);
    expect(Math.hypot(leg.knee.x, leg.knee.y)).toBeCloseTo(106);
    expect(Math.hypot(leg.ankle.x - leg.knee.x, leg.ankle.y - leg.knee.y)).toBeCloseTo(102);
    const stretched = solveLeg({ x: 0, y: 0 }, { x: 1000, y: 1000 });
    expect(Number.isFinite(stretched.shin)).toBe(true);
    expect(Math.hypot(stretched.ankle.x, stretched.ankle.y)).toBeLessThan(208);
  });

  it('hides both hips under the coat and tucks the knees more in a jump than a fall', () => {
    const ids = doc.parts.map(p => p.id);
    expect(ids.indexOf('legFront')).toBeLessThan(ids.indexOf('body'));
    expect(ids.indexOf('legBack')).toBeLessThan(ids.indexOf('body'));
    expect(jumpPose(0.2).shinFront!.rot!).toBeGreaterThan(fallPose().shinFront!.rot!);
    expect(jumpPose(0.2).shinBack!.rot!).toBeGreaterThan(fallPose().shinBack!.rot!);
  });

  it('loops without a pose discontinuity at the run boundary', () => {
    const start = worldMatrices(doc, runPose(0));
    const end = worldMatrices(doc, runPose(1 / DEFAULT_RUN.cadence));
    for (const id of doc.parts.map(p => p.id))
      start[id].forEach((value, i) => expect(end[id][i]).toBeCloseTo(value, 6));
  });

  it('can transition from jump to fall without snapping unkeyed joints', () => {
    const jump = jumpPose(), fall = fallPose();
    const start = worldMatrices(doc, blendPose(jump, fall, 0));
    const end = worldMatrices(doc, blendPose(jump, fall, 1));
    expect(start).toEqual(worldMatrices(doc, jump));
    expect(end).toEqual(worldMatrices(doc, fall));
    expect(blendPose({ head: { rot: 10 } }, {}, 0.5).head?.rot).toBe(5);
  });
});

describe('looping scenery', () => {
  it('joins adjacent source columns at the wrap and preserves the central landmark', () => {
    const width = 20, height = 2;
    const source = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) source.set([x * 10, y * 100, 80, 255], (y * width + x) * 4);
    const loop = loopPixels(source, width, height, 4);
    expect(loop.width).toBe(16);
    for (let y = 0; y < height; y++) {
      const row = y * loop.width * 4;
      expect(loop.data[row]).toBe(40);
      expect(loop.data[row + (loop.width - 1) * 4]).toBe(30);
      expect(loop.data[row + 6 * 4]).toBe(100);
      for (let x = 0; x < loop.width; x++) expect(loop.data[row + x * 4 + 3]).toBe(255);
    }
  });

  it('does not darken translucent edges while blending over transparent black', () => {
    const source = new Uint8ClampedArray(20 * 4);
    for (let x = 16; x < 20; x++) source.set([200, 120, 50, 255], x * 4);
    const loop = loopPixels(source, 20, 1, 4);
    const pixel = 13 * 4;
    expect([...loop.data.slice(pixel, pixel + 3)]).toEqual([200, 120, 50]);
    expect(loop.data[pixel + 3]).toBeGreaterThan(0);
    expect(loop.data[pixel + 3]).toBeLessThan(255);
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
