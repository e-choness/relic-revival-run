import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { keysLabel, loadBindings } from '../systems/controls';
import { curatorTitle, isComplete, loadSave, totalStars } from '../systems/save';
import { showOptionsMenu } from '../ui/optionsMenu';
import { addLandscape, advanceLandscape, type LandscapeLayer } from '../ui/landscape';
import { AudioDirector } from '../audio/AudioDirector';
import { MENU_PROFILE } from '../audio/music';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { MenuNav, focusButton } from '../ui/menuNav';
import { FONT_DISPLAY, INKED, PAPER_CSS, REDUCED_MOTION, TOUCH, WIDTH, button, label } from '../ui/theme';

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

    const save = loadSave();
    const total = totalStars(save);
    if (total > 0) {
      const restored = CULTURES.filter((c) => (save.stars[c.id] ?? 0) > 0).length;
      label(this, WIDTH / 2, 292, `${curatorTitle(total).title} · ${total}/${CULTURES.length * 3} stars · ${restored}/${CULTURES.length} relics restored`, 22, { color: '#f2c14e', stroke: '#2b1d2e', strokeThickness: 6 });
    }

    const keys = loadBindings();
    const play = button(this, WIDTH / 2, 352, total > 0 ? 'Continue' : 'Play', () => this.scene.start('WorldMap'), 260).setDepth(10);
    const museum = button(this, WIDTH / 2 - 230, 430, 'Museum', () => this.scene.start('Museum'), 200).setDepth(10);
    let nav: MenuNav | undefined;
    const options = button(this, WIDTH / 2, 430, 'Options', () => {
      nav?.setEnabled(false);
      // Restart afterwards: a reset or rebinding changes what this screen shows.
      showOptionsMenu(this, { inRun: false }, () => this.scene.restart());
    }, 200).setDepth(10);
    const credits = button(this, WIDTH / 2 + 230, 430, 'Credits', () => this.scene.start('Credits', { ending: isComplete(save) }), 200).setDepth(10);
    nav = new MenuNav(this, [play, museum, options, credits].map(focusButton));
    const controls = TOUCH
      ? 'Tap to jump   ·   Tap a tool to pick it   ·   Reveal and Photo have their own buttons'
      : `Jump: ${keysLabel(keys, 'jump')}   ·   Tools: 1–8, ${keysLabel(keys, 'prevTool')}/${keysLabel(keys, 'nextTool')}, wheel   ·   Reveal: left click   ·   Photo: right click   ·   Mute: M`;
    label(this, WIDTH / 2, 650, controls, 20, { ...INKED, strokeThickness: 5 });
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
