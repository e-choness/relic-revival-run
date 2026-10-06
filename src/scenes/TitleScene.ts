import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { drawSkyline } from '../ui/art';
import { FONT_DISPLAY, HEIGHT, PAPER_CSS, WIDTH, button, hex, label } from '../ui/theme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const mexico = CULTURES[0];
    const bg = this.add.graphics();
    bg.fillGradientStyle(hex(mexico.palette.sky), hex(mexico.palette.sky), 0xe9a15b, 0xe9a15b, 1).fillRect(0, 0, WIDTH, HEIGHT);
    const sky = this.add.graphics();
    drawSkyline(sky, 'mesoamerican', WIDTH + 320, 560, 0xd9875a);
    bg.fillStyle(hex(mexico.palette.ground), 1).fillRect(0, 560, WIDTH, HEIGHT - 560);

    label(this, WIDTH / 2, 150, 'Relic Revival Run', 84, { fontFamily: FONT_DISPLAY, color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 12 });
    label(this, WIDTH / 2, 250, 'Run, restore, and bring heritage back to life', 30, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 6 });

    const hero = this.add.sprite(-120, 480, 'axolotl-run-1').setScale(0.6).play('axolotl-run');
    this.tweens.add({ targets: hero, x: WIDTH + 120, duration: 6000, repeat: -1 });

    button(this, WIDTH / 2, 380, 'Play', () => this.scene.start('WorldMap'), 260);
    label(this, WIDTH / 2, 650, 'Jump: Space / tap   ·   Tools: 1–8, Q/E, wheel   ·   UV: U   ·   Camera: C', 22, { color: PAPER_CSS });
  }
}
