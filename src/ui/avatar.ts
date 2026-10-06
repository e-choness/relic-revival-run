import Phaser from 'phaser';
import type { Culture } from '../data/cultures';
import { CutoutAvatar, rigKey, type AvatarAnim, type RigData } from './CutoutAvatar';

/** Workshop cut-out avatar, or a plain fallback if its rig is missing. Positioned by the feet. */
export interface AvatarView {
  readonly object: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth;
  setAnim(anim: AvatarAnim): void;
  tick(dt: number): void;
  setFeet(x: number, y: number): void;
}

export function addAvatar(scene: Phaser.Scene, culture: Culture, x: number, y: number, height: number, anim: AvatarAnim = 'idle'): AvatarView {
  const { rig } = culture.avatar;
  if (rig && scene.cache.json.exists(rigKey(rig))) {
    const c = new CutoutAvatar(scene, x, y, scene.cache.json.get(rigKey(rig)) as RigData, height);
    c.anim = anim;
    return {
      object: c,
      setAnim: (a) => (c.anim = a),
      tick: (dt) => c.tick(dt),
      setFeet: (fx, fy) => c.setPosition(fx, fy),
    };
  }
  const img = scene.add.image(x, y, 'avatar-placeholder').setOrigin(0.5, 1).setDisplaySize(height * 0.64, height);
  return { object: img, setAnim() {}, tick() {}, setFeet: (fx, fy) => img.setPosition(fx, fy) };
}
