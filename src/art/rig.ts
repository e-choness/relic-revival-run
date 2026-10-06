import type { AvatarDoc, PartId, Vec } from './types';

// Cut-out rig: one drawn pose, animated by moving and rotating parts around their pivots.

export interface PartPose {
  /** Offset in canvas px. */
  x: number;
  y: number;
  /** Rotation in degrees around the part's pivot. */
  rot: number;
}

export type Pose = Partial<Record<PartId, Partial<PartPose>>>;

export interface RunParams {
  /** Strides per second. */
  cadence: number;
  /** Body bounce height, px. */
  bob: number;
  /** Leg swing, degrees. */
  legSwing: number;
  /** Arm swing, degrees. */
  armSwing: number;
}

export const DEFAULT_RUN: RunParams = { cadence: 1.8, bob: 14, legSwing: 32, armSwing: 26 };

/** Run cycle at time t (seconds). Legs alternate, arms oppose legs, ears and tail trail the bounce. */
export function runPose(t: number, p: RunParams = DEFAULT_RUN): Pose {
  const ph = t * p.cadence * Math.PI * 2;
  const swing = Math.sin(ph);
  const bounce = Math.abs(Math.sin(ph));
  const lag = Math.sin(ph * 2 - 0.9);
  return {
    body: { y: -bounce * p.bob, rot: 4 },
    head: { rot: -2 + lag * 2 },
    earFront: { rot: lag * 6 },
    earBack: { rot: lag * 6 },
    tail: { rot: lag * 10 },
    legFront: { rot: swing * p.legSwing },
    legBack: { rot: -swing * p.legSwing },
    armFront: { rot: -swing * p.armSwing },
    armBack: { rot: swing * p.armSwing },
  };
}

export function jumpPose(): Pose {
  return { body: { rot: -6 }, legFront: { rot: -30 }, legBack: { rot: 25 }, armFront: { rot: -70 }, armBack: { rot: -50 }, earFront: { rot: 10 }, earBack: { rot: 10 }, tail: { rot: -12 } };
}

export function fallPose(): Pose {
  return { body: { rot: 6 }, legFront: { rot: 18 }, legBack: { rot: -12 }, armFront: { rot: -110 }, armBack: { rot: -95 }, earFront: { rot: -14 }, earBack: { rot: -14 }, tail: { rot: 14 } };
}

/** 2D affine matrix [a, b, c, d, e, f] as in SVG matrix(). */
export type Mat = [number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export function multiply(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

/** Local transform: translate by offset, rotate about the pivot. */
function local(pivot: Vec, pose: Partial<PartPose> = {}): Mat {
  const a = ((pose.rot ?? 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const tx = pose.x ?? 0, ty = pose.y ?? 0;
  // T(offset) · T(pivot) · R · T(-pivot)
  return [cos, sin, -sin, cos, pivot.x - cos * pivot.x + sin * pivot.y + tx, pivot.y - sin * pivot.x - cos * pivot.y + ty];
}

/** World matrix per part, composing each part's transform with its parent chain. */
export function worldMatrices(doc: AvatarDoc, pose: Pose): Record<PartId, Mat> {
  const byId = new Map(doc.parts.map((p) => [p.id, p]));
  const out = {} as Record<PartId, Mat>;
  const resolve = (id: PartId): Mat => {
    if (out[id]) return out[id];
    const part = byId.get(id)!;
    const parent = part.parent && byId.has(part.parent) ? resolve(part.parent) : IDENTITY;
    return (out[id] = multiply(parent, local(part.pivot, pose[id])));
  };
  for (const p of doc.parts) resolve(p.id);
  return out;
}

export function svgTransforms(doc: AvatarDoc, pose: Pose): Partial<Record<PartId, string>> {
  const m = worldMatrices(doc, pose);
  return Object.fromEntries(Object.entries(m).map(([id, v]) => [id, `matrix(${v.map((n) => n.toFixed(4)).join(' ')})`]));
}
