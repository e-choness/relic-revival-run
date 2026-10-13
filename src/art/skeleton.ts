import type { PartId, Vec } from './types';

/** Shared source-space joints for the side-view working cast (1000px canvas). */
export const SIDE_JOINTS: Record<PartId, Vec> = {
  body: { x: 525, y: 706 }, coatTail: { x: 502, y: 647 },
  head: { x: 540, y: 533 }, earFront: { x: 533, y: 309 }, earBack: { x: 545, y: 306 },
  tail: { x: 474, y: 694 },
  legFront: { x: 528, y: 706 }, shinFront: { x: 528, y: 812 }, footFront: { x: 528, y: 914 },
  legBack: { x: 516, y: 706 }, shinBack: { x: 516, y: 812 }, footBack: { x: 516, y: 914 },
  armFront: { x: 530, y: 548 }, forearmFront: { x: 530, y: 636 },
  armBack: { x: 541, y: 548 }, forearmBack: { x: 541, y: 636 },
};

/** Two-bone IK, knee bending toward +x. Angles are degrees from a downward rest bone. */
export function solveLeg(hip: Vec, ankle: Vec, thigh = 106, shin = 102) {
  const dx = ankle.x - hip.x, dy = ankle.y - hip.y;
  const distance = Math.min(thigh + shin - 0.001, Math.max(Math.abs(thigh - shin) + 0.001, Math.hypot(dx, dy)));
  const direction = Math.atan2(dy, dx);
  const a = Math.acos(Math.max(-1, Math.min(1, (thigh * thigh + distance * distance - shin * shin) / (2 * thigh * distance))));
  const upper = direction - a;
  const knee = { x: hip.x + Math.cos(upper) * thigh, y: hip.y + Math.sin(upper) * thigh };
  // Use the reachable target if the requested ankle lies outside the limb's reach.
  const target = { x: hip.x + Math.cos(direction) * distance, y: hip.y + Math.sin(direction) * distance };
  const lower = Math.atan2(target.y - knee.y, target.x - knee.x);
  return { thigh: upper * 180 / Math.PI - 90, shin: (lower - upper) * 180 / Math.PI, knee, ankle: target };
}

/** A planted foot moves backwards at constant speed, then lifts and recovers forwards. */
export function strideFoot(phase: number, stride = 170, lift = 86): Vec & { pitch: number; planted: boolean } {
  const u = ((phase % 1) + 1) % 1;
  const contact = 0.4;
  if (u < contact) return { x: stride * (0.5 - u / contact), y: 0, pitch: 0, planted: true };
  const s = (u - contact) / (1 - contact);
  const ease = s * s * (3 - 2 * s);
  return { x: stride * (-0.5 + ease), y: -lift * Math.sin(s * Math.PI) ** 1.3, pitch: 26 * Math.sin(s * Math.PI * 2), planted: false };
}
