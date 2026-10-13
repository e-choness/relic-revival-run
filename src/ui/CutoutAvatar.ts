import Phaser from 'phaser';
import { blendPose, fallPose, idlePose, jumpPose, runPose, worldMatrices, DEFAULT_RUN, type Pose } from '../art/rig';
import type { PartId, Vec } from '../art/types';
import { REDUCED_MOTION } from './theme';

/** rig.json written by the avatar workshop export. Bounds and pivots are in avatar canvas units. */
export interface RigData {
  id: string;
  size: number;
  /** Export scale: part PNG pixels = canvas units × scale. */
  scale: number;
  order: PartId[];
  parts: { id: PartId; parent: PartId | null; pivot: Vec; x: number; y: number; w: number; h: number }[];
}

export type AvatarAnim = 'idle' | 'run' | 'jump' | 'fall';
export type AvatarReaction = 'restore' | 'mistake';

export const rigKey = (id: string) => `rig-${id}`;
export const partKey = (id: string, part: string) => `${id}-part-${part}`;

/** Queues a rig's json and, once it arrives, its part images. Call from a scene's preload(). */
export function loadRig(scene: Phaser.Scene, id: string) {
  scene.load.json(rigKey(id), `assets/avatars/${id}/rig.json`);
  scene.load.once(`filecomplete-json-${rigKey(id)}`, (_key: string, _type: string, rig: RigData) => {
    for (const p of rig.parts) scene.load.image(partKey(id, p.id), `assets/avatars/${id}/parts/${p.id}.png`);
  });
}

/**
 * Cut-out avatar: one drawn pose split into parts, posed each frame by src/art/rig.ts.
 * The container's origin is the avatar's feet (bottom centre).
 */
export class CutoutAvatar extends Phaser.GameObjects.Container {
  private animationState: AvatarAnim = 'idle';
  private stateTime = 1;
  private transition: Pose = {};
  private current: Pose = {};
  private landing = 1;
  private reaction: AvatarReaction = 'restore';
  private reactionTime = 1;
  react(reaction: AvatarReaction) { this.reaction = reaction; this.reactionTime = 0; }
  get anim(): AvatarAnim { return this.animationState; }
  set anim(value: AvatarAnim) {
    if (value === this.animationState) return;
    if (value === 'run' && (this.animationState === 'fall' || this.animationState === 'jump')) this.landing = 0;
    this.transition = this.current;
    this.animationState = value;
    this.stateTime = 0;
  }
  private t = 0;
  private runPhase = 0;
  private runSpeed?: number;
  setRunSpeed(speed: number) { this.runSpeed = Math.max(0, speed); }
  private readonly images: { part: RigData['parts'][number]; img: Phaser.GameObjects.Image }[] = [];
  private readonly origin: Vec;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly rig: RigData, height: number) {
    super(scene, x, y);
    const byId = new Map(rig.parts.map((p) => [p.id, p]));
    for (const id of rig.order) {
      const part = byId.get(id);
      if (!part) continue;
      const img = scene.add.image(0, 0, partKey(rig.id, id)).setOrigin(0, 0).setScale(1 / rig.scale);
      this.add(img);
      this.images.push({ part, img });
    }
    const top = Math.min(...rig.parts.map((p) => p.y));
    const bottom = Math.max(...rig.parts.map((p) => p.y + p.h));
    // Exported bounds include ink padding; trim it so the feet sit on the ground.
    this.origin = { x: rig.size / 2, y: bottom - 14 };
    this.setScale(height / (bottom - top));
    this.pose(0);
    scene.add.existing(this);
  }

  /** Advance the animation by dt seconds. */
  tick(dt: number) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.t += dt;
    this.stateTime += dt;
    this.landing += dt;
    this.reactionTime += dt;
    if (this.anim === 'run') {
      // A contact foot travels one stride in 40% of the cycle, at the ground speed.
      const cadence = this.runSpeed === undefined ? DEFAULT_RUN.cadence : this.runSpeed * 0.4 / (DEFAULT_RUN.legSwing * 5 * this.scaleX);
      this.runPhase = (this.runPhase + dt * cadence) % 1;
    }
    this.pose(this.t);
  }

  private pose(t: number) {
    const heavy = ['sun-bear', 'tanuki'].includes(this.rig.id);
    const settle = !REDUCED_MOTION && this.landing < 0.28 ? Math.sin(this.landing / 0.28 * Math.PI) * (1 - this.landing / 0.28) : 0;
    const target: Pose = this.anim === 'run' ? runPose(this.runPhase, { ...DEFAULT_RUN, cadence: 1, crouch: settle * 24, bob: REDUCED_MOTION ? 6 : heavy ? 13 : 18 }) : this.anim === 'jump' ? jumpPose(this.stateTime) : this.anim === 'fall' ? fallPose(this.stateTime) : idlePose(REDUCED_MOTION ? 0 : t);
    const progress = Math.min(1, this.stateTime / 0.14);
    const pose = blendPose(this.transition, target, progress * progress * (3 - 2 * progress));
    this.current = pose;
    if (!REDUCED_MOTION && this.reactionTime < 0.32) {
      const reach = Math.sin(this.reactionTime / 0.32 * Math.PI);
      if (this.reaction === 'restore') {
        pose.armFront = { ...pose.armFront, rot: (pose.armFront?.rot ?? 0) - reach * 38 };
        pose.head = { ...pose.head, rot: (pose.head?.rot ?? 0) - reach * 5 };
      } else {
        pose.body = { ...pose.body, x: (pose.body?.x ?? 0) - reach * 12, rot: (pose.body?.rot ?? 0) - reach * 5 };
        pose.earFront = { rot: -reach * 18 };
      }
    }
    const m = worldMatrices(this.rig, pose);
    for (const { part, img } of this.images) {
      const [a, b, c, d, e, f] = m[part.id];
      // Rigid transform of the part's top-left corner; rotation from the matrix.
      img.setPosition(a * part.x + c * part.y + e - this.origin.x, b * part.x + d * part.y + f - this.origin.y);
      img.setRotation(Math.atan2(b, a));
    }
  }
}
