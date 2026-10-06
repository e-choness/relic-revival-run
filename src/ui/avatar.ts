import Phaser from 'phaser';
import type { Culture } from '../data/cultures';
import { CutoutAvatar, rigKey, type AvatarAnim, type RigData } from './CutoutAvatar';

/** Jam frame sprite, workshop cut-out, or a plain fallback, behind one interface. Positioned by the feet. */
export interface AvatarView {
  readonly object: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth;
  setAnim(anim: AvatarAnim): void;
  tick(dt: number): void;
  setFeet(x: number, y: number): void;
}

/** Jam frames are 256px tall with a little empty margin; this keeps all avatars the same visual size. */
const SPRITE_FRAME = 256;
const SPRITE_FILL = 0.9;

export function addAvatar(scene: Phaser.Scene, culture: Culture, x: number, y: number, height: number, anim: AvatarAnim = 'idle'): AvatarView {
  const { sprite, rig } = culture.avatar;

  if (sprite) {
    const s = scene.add.sprite(x, y, `${sprite}-run-1`).setOrigin(0.5, 1).setScale(height / (SPRITE_FRAME * SPRITE_FILL));
    let current: AvatarAnim | null = null;
    const view: AvatarView = {
      object: s,
      setAnim(a) {
        if (a === current) return;
        current = a;
        if (a === 'idle') s.stop().setTexture(`${sprite}-run-1`);
        else s.play(`${sprite}-${a}`, true);
      },
      tick() {},
      setFeet(fx, fy) {
        s.setPosition(fx, fy);
      },
    };
    view.setAnim(anim);
    return view;
  }

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
