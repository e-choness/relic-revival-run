import type { PartId, Vec } from './types';
import { SIDE_JOINTS, solveLeg, strideFoot } from './skeleton';

/** Anything with part pivots and parents: an AvatarDoc in the workshop, rig.json in the game. */
export interface RigLike {
  parts: { id: PartId; parent?: PartId | null; pivot: Vec }[];
}

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
  /** Stride amplitude control; the foot travels five times this many canvas px. */
  legSwing: number;
  /** Arm swing, degrees. */
  armSwing: number;
  /** Additional pelvis lowering for a bent-knee landing. */
  crouch?: number;
}

export const DEFAULT_RUN: RunParams = { cadence: 1.65, bob: 18, legSwing: 46, armSwing: 38 };

/** Contact, compression, passing, and flight. IK keeps planted feet on a level ground plane. */
export function runPose(t: number, p: RunParams = DEFAULT_RUN): Pose {
  const ph = t * p.cadence * Math.PI * 2;
  const bounce = (1 - Math.cos(ph * 2)) / 2;
  const lag = Math.sin(ph * 2 - 0.9);
  const body = { y: 44 - bounce * p.bob + (p.crouch ?? 0), rot: 13 + Math.sin(ph * 2) * 1.5 };
  const pose: Pose = {
    body,
    head: { rot: -10 + lag * 1.8 },
    earFront: { rot: lag * 7 },
    earBack: { rot: Math.sin(ph * 2 - 1.25) * 9 },
    tail: { rot: -14 + Math.sin(ph - 1.1) * 9 },
    coatTail: { rot: 8 + lag * 7 },
    armFront: { rot: 8 + Math.cos(ph) * p.armSwing },
    armBack: { rot: 8 - Math.cos(ph) * p.armSwing },
    forearmFront: { rot: -88 - Math.sin(ph - 0.4) * 16 },
    forearmBack: { rot: -88 + Math.sin(ph - 0.4) * 16 },
  };
  for (const side of ['Front', 'Back'] as const) {
    const step = strideFoot(t * p.cadence + (side === 'Back' ? 0.5 : 0), p.legSwing * 5);
    const hip = SIDE_JOINTS[`leg${side}`];
    const root = SIDE_JOINTS.body;
    const a = body.rot * Math.PI / 180;
    const worldHip = {
      x: root.x + Math.cos(a) * (hip.x - root.x) - Math.sin(a) * (hip.y - root.y),
      y: root.y + Math.sin(a) * (hip.x - root.x) + Math.cos(a) * (hip.y - root.y) + body.y,
    };
    const leg = solveLeg(worldHip, { x: hip.x + step.x, y: 914 + step.y });
    pose[`leg${side}`] = { rot: leg.thigh - body.rot };
    pose[`shin${side}`] = { rot: leg.shin };
    pose[`foot${side}`] = { rot: step.pitch - leg.thigh - leg.shin };
  }
  return pose;
}

export function jumpPose(t = 0): Pose {
  const flutter = Math.sin(t * 9) * 3;
  const tuck = Math.min(1, Math.max(0, t / 0.2));
  return {
    body: { rot: 10 }, head: { rot: -13 },
    legFront: { rot: -65 - tuck * 12 }, shinFront: { rot: 94 + tuck * 15 }, footFront: { rot: -22 },
    legBack: { rot: 10 - tuck * 30 }, shinBack: { rot: 98 }, footBack: { rot: -55 },
    armFront: { rot: -40 }, forearmFront: { rot: -100 }, armBack: { rot: 35 }, forearmBack: { rot: -92 },
    earFront: { rot: 15 + flutter }, earBack: { rot: 18 + flutter }, tail: { rot: -24 + flutter }, coatTail: { rot: 18 },
  };
}

export function fallPose(t = 0): Pose {
  const flutter = Math.sin(t * 10) * 3;
  return {
    body: { rot: 8 }, head: { rot: 1 },
    legFront: { rot: -26 }, shinFront: { rot: 35 }, footFront: { rot: -20 },
    legBack: { rot: 16 }, shinBack: { rot: 52 }, footBack: { rot: -50 },
    armFront: { rot: -58 }, forearmFront: { rot: -36 }, armBack: { rot: 45 }, forearmBack: { rot: -94 },
    earFront: { rot: -18 + flutter }, earBack: { rot: -22 + flutter }, tail: { rot: 12 + flutter }, coatTail: { rot: -14 },
  };
}

export function idlePose(t: number): Pose {
  const s = Math.sin(t * 2.4);
  return { body: { y: s * 2, rot: 2 }, head: { rot: -2 + s }, forearmFront: { rot: -78 }, forearmBack: { rot: -72 }, armFront: { rot: 5 }, armBack: { rot: -8 }, footFront: { rot: -2 }, footBack: { rot: -2 }, tail: { rot: s * 4 } };
}

/** Ease between complete poses, including joints absent from either pose. */
export function blendPose(from: Pose, to: Pose, amount: number): Pose {
  const t = Math.max(0, Math.min(1, amount));
  const pose: Pose = {};
  for (const id of new Set([...Object.keys(from), ...Object.keys(to)]) as Set<PartId>) {
    const a = from[id], b = to[id];
    pose[id] = {
      x: (a?.x ?? 0) * (1 - t) + (b?.x ?? 0) * t,
      y: (a?.y ?? 0) * (1 - t) + (b?.y ?? 0) * t,
      rot: (a?.rot ?? 0) * (1 - t) + (b?.rot ?? 0) * t,
    };
  }
  return pose;
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
export function worldMatrices(doc: RigLike, pose: Pose): Record<PartId, Mat> {
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

export function svgTransforms(doc: RigLike, pose: Pose): Partial<Record<PartId, string>> {
  const m = worldMatrices(doc, pose);
  return Object.fromEntries(Object.entries(m).map(([id, v]) => [id, `matrix(${v.map((n) => n.toFixed(4)).join(' ')})`]));
}
