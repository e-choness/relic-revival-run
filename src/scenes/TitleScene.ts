import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { drawSkyline } from '../ui/art';
import { AudioDirector } from '../audio/AudioDirector';
import { MENU_PROFILE } from '../audio/music';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { FONT_DISPLAY, HEIGHT, PAPER_CSS, WIDTH, button, hex, label } from '../ui/theme';

const PARADE_GAP = 150;
const PARADE_SPEED = 160;

export class TitleScene extends Phaser.Scene {
  private parade: { view: AvatarView; x: number }[] = [];

  constructor() {
    super('Title');
  }

  create() {
    AudioDirector.get().play(MENU_PROFILE, 'menu');
    const mexico = CULTURES[0];
    const bg = this.add.graphics();
    bg.fillGradientStyle(hex(mexico.palette.sky), hex(mexico.palette.sky), 0xe9a15b, 0xe9a15b, 1).fillRect(0, 0, WIDTH, HEIGHT);
    const sky = this.add.graphics();
    drawSkyline(sky, 'mesoamerican', WIDTH + 320, 560, 0xd9875a);
    bg.fillStyle(hex(mexico.palette.ground), 1).fillRect(0, 560, WIDTH, HEIGHT - 560);

    label(this, WIDTH / 2, 150, 'Relic Revival Run', 84, { fontFamily: FONT_DISPLAY, color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 12 });
    label(this, WIDTH / 2, 250, 'Run, restore, and bring heritage back to life', 30, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 6 });

    // The whole restorer team runs past, one per culture.
    this.parade = CULTURES.map((c, i) => ({ view: addAvatar(this, c, 0, 560, 120, 'run'), x: -120 - i * PARADE_GAP }));

    button(this, WIDTH / 2, 380, 'Play', () => this.scene.start('WorldMap'), 260);
    label(this, WIDTH / 2, 650, 'Jump: Space / tap   ·   Tools: 1–8, Q/E, wheel   ·   UV: U   ·   Camera: C   ·   Mute: M', 22, { color: PAPER_CSS });
  }

  update(_t: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    const loop = WIDTH + 120 + CULTURES.length * PARADE_GAP;
    for (const p of this.parade) {
      p.x += PARADE_SPEED * dt;
      if (p.x > WIDTH + 120) p.x -= loop;
      p.view.setFeet(p.x, 560);
      p.view.tick(dt);
    }
  }
}
