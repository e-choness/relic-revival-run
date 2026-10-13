import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { keysLabel, loadBindings } from '../systems/controls';
import { addLandscape, advanceLandscape, type LandscapeLayer } from '../ui/landscape';
import { AudioDirector } from '../audio/AudioDirector';
import { MENU_PROFILE } from '../audio/music';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { MenuNav, focusButton } from '../ui/menuNav';
import { FONT_DISPLAY, PAPER_CSS, REDUCED_MOTION, WIDTH, button, label } from '../ui/theme';

const PARADE_GAP = 150;
const PARADE_SPEED = 160;

export class TitleScene extends Phaser.Scene {
  private parade: { view: AvatarView; x: number }[] = [];
  private landscape: LandscapeLayer[] = [];

  constructor() {
    super('Title');
  }

  create() {
    AudioDirector.get().play(MENU_PROFILE, 'menu');
    this.landscape = addLandscape(this, CULTURES[0], 560);

    label(this, WIDTH / 2, 150, 'Relic Revival Run', 84, { fontFamily: FONT_DISPLAY, color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 12 });
    label(this, WIDTH / 2, 250, 'Run, restore, and bring heritage back to life', 30, { color: PAPER_CSS, stroke: '#2b1d2e', strokeThickness: 6 });

    // The whole restorer team runs past, one per culture.
    this.parade = CULTURES.map((c, i) => ({ view: addAvatar(this, c, 0, 560, 120, 'run'), x: -120 - i * PARADE_GAP }));

    const keys = loadBindings();
    const play = button(this, WIDTH / 2, 380, 'Play', () => this.scene.start('WorldMap'), 260);
    new MenuNav(this, [focusButton(play)]);
    label(this, WIDTH / 2, 650, `Jump: ${keysLabel(keys, 'jump')} / tap   ·   Tools: 1–8, ${keysLabel(keys, 'prevTool')}/${keysLabel(keys, 'nextTool')}, wheel   ·   UV: ${keysLabel(keys, 'uv')}   ·   Camera: ${keysLabel(keys, 'camera')}   ·   Mute: M`, 22, { color: PAPER_CSS });
  }

  update(_t: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    if (!REDUCED_MOTION) advanceLandscape(this.landscape, dt * 24);
    const loop = WIDTH + 120 + CULTURES.length * PARADE_GAP;
    for (const p of this.parade) {
      p.x += PARADE_SPEED * dt;
      if (p.x > WIDTH + 120) p.x -= loop;
      p.view.setFeet(p.x, 560);
      p.view.setRunSpeed(PARADE_SPEED + (REDUCED_MOTION ? 0 : 24));
      p.view.tick(dt);
    }
  }
}
