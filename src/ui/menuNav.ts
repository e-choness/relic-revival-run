import Phaser from 'phaser';
import { nearest, type Dir } from '../systems/navigation';
import { INK } from './theme';

/** Something a keyboard or gamepad user can focus and activate. Coordinates are its centre. */
export interface Focusable {
  x: number;
  y: number;
  w: number;
  h: number;
  activate: () => void;
}


const KEY_DIRS: Record<string, Dir> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
// Standard gamepad mapping: 12-15 are the D-pad.
const PAD_DIRS: Record<number, Dir> = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const STICK_DEADZONE = 0.6;

/**
 * Keyboard / gamepad focus for click-only menus: arrows, D-pad or left stick move between items,
 * Enter / Space / A activate, Esc / B go back. The ring stays hidden until keys or a pad are used.
 */
export class MenuNav {
  private index = 0;
  private visible = false;
  private enabled = true;
  private readonly ring: Phaser.GameObjects.Graphics;
  private stickHeld = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private items: Focusable[],
    /** escape: false when the scene already uses Esc itself (e.g. the pause key). */
    private readonly opts: { back?: () => void; depth?: number; start?: number; escape?: boolean } = {},
  ) {
    this.index = opts.start ?? 0;
    this.ring = scene.add.graphics().setDepth(opts.depth ?? 50);
    scene.input.keyboard?.on('keydown', this.onKey, this);
    scene.input.gamepad?.on('down', this.onPad, this);
    scene.events.on('update', this.pollStick, this);
    scene.events.once('shutdown', () => this.destroy());
  }

  /** Temporarily hand input to something else (e.g. an overlay). */
  setEnabled(on: boolean) {
    this.enabled = on;
    this.draw();
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this.onKey, this);
    this.scene.input.gamepad?.off('down', this.onPad, this);
    this.scene.events.off('update', this.pollStick, this);
    this.ring.destroy();
  }

  private onKey(e: KeyboardEvent) {
    if (!this.enabled) return;
    const dir = KEY_DIRS[e.code];
    if (dir) return this.move(dir);
    if (e.code === 'Enter' || e.code === 'Space') this.activate();
    else if (e.code === 'Escape' && this.opts.back && this.opts.escape !== false) this.opts.back();
  }

  private onPad(_pad: Phaser.Input.Gamepad.Gamepad, b: Phaser.Input.Gamepad.Button) {
    if (!this.enabled) return;
    const dir = PAD_DIRS[b.index];
    if (dir) return this.move(dir);
    if (b.index === 0) this.activate();
    else if (b.index === 1 && this.opts.back) this.opts.back();
  }

  private pollStick() {
    const pad = this.scene.input.gamepad?.pad1;
    if (!pad || !this.enabled) return;
    const { x, y } = pad.leftStick;
    const dir: Dir | null = Math.abs(x) > STICK_DEADZONE ? (x < 0 ? 'left' : 'right') : Math.abs(y) > STICK_DEADZONE ? (y < 0 ? 'up' : 'down') : null;
    if (dir && !this.stickHeld) this.move(dir);
    this.stickHeld = !!dir;
  }

  private activate() {
    // The default item is meant to be pressed, so Enter acts at once; only moving first reveals the ring.
    this.visible = true;
    this.draw();
    this.items[this.index]?.activate();
  }

  private move(dir: Dir) {
    if (!this.visible) {
      this.visible = true;
      return this.draw();
    }
    this.index = nearest(this.items, this.index, dir);
    this.draw();
  }

  private draw() {
    this.ring.clear();
    const it = this.items[this.index];
    if (!it || !this.visible || !this.enabled) return;
    this.ring.lineStyle(9, INK, 1).strokeRoundedRect(it.x - it.w / 2 - 8, it.y - it.h / 2 - 8, it.w + 16, it.h + 16, 20);
    this.ring.lineStyle(5, 0xf2c14e, 1).strokeRoundedRect(it.x - it.w / 2 - 8, it.y - it.h / 2 - 8, it.w + 16, it.h + 16, 20);
  }
}

/** Focusable for a button container made by theme.button(). */
export function focusButton(c: Phaser.GameObjects.Container): Focusable {
  return { x: c.x, y: c.y, w: c.width, h: c.height, activate: () => (c.getData('activate') as () => void)() };
}
