import Phaser from 'phaser';
import { fallPose, jumpPose, runPose, worldMatrices, type Pose } from '../art/rig';
import type { PartId, Vec } from '../art/types';

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
  anim: AvatarAnim = 'run';
  private t = 0;
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
    this.t += dt;
    this.pose(this.t);
  }

  private pose(t: number) {
    const pose: Pose = this.anim === 'run' ? runPose(t) : this.anim === 'jump' ? jumpPose() : this.anim === 'fall' ? fallPose() : idlePose(t);
    const m = worldMatrices(this.rig, pose);
    for (const { part, img } of this.images) {
      const [a, b, c, d, e, f] = m[part.id];
      // Rigid transform of the part's top-left corner; rotation from the matrix.
      img.setPosition(a * part.x + c * part.y + e - this.origin.x, b * part.x + d * part.y + f - this.origin.y);
      img.setRotation(Math.atan2(b, a));
    }
  }
}

/** Gentle breathing for menus. */
function idlePose(t: number): Pose {
  const s = Math.sin(t * 2.4);
  return { body: { y: s * 3 }, head: { rot: s * 1.5 }, earFront: { rot: s * 3 }, earBack: { rot: s * 3 }, tail: { rot: s * 6 } };
}
