import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { isUnlocked, loadSave } from '../systems/save';
import { AudioDirector } from '../audio/AudioDirector';
import { MENU_PROFILE } from '../audio/music';
import { addAvatar, type AvatarView } from '../ui/avatar';
import { FONT_DISPLAY, HEIGHT, INK, PAPER_CSS, WIDTH, button, card, hex, label, stars } from '../ui/theme';

export class WorldMapScene extends Phaser.Scene {
  private avatars: AvatarView[] = [];

  constructor() {
    super('WorldMap');
  }

  create() {
    AudioDirector.get().play(MENU_PROFILE, 'menu');
    this.avatars = [];
    const save = loadSave();
    this.add.graphics().fillGradientStyle(0x3b2a4a, 0x3b2a4a, 0x1d1424, 0x1d1424, 1).fillRect(0, 0, WIDTH, HEIGHT);
    label(this, WIDTH / 2, 56, 'Choose a culture', 48, { fontFamily: FONT_DISPLAY, color: PAPER_CSS });

    const cw = 270, ch = 150;
    CULTURES.forEach((c, i) => {
      const x = 190 + (i % 4) * 300, y = 175 + Math.floor(i / 4) * 175;
      const open = isUnlocked(save, i);
      const g = card(this, x, y, cw, ch, open ? hex(c.palette.sky) : 0x6b5a78);
      g.fillStyle(open ? hex(c.palette.accent) : INK, 1).fillRect(x - cw / 2 + 2, y + ch / 2 - 30, cw - 4, 28);
      // Each culture's restorer stands on its card; locked ones are faded.
      const view = addAvatar(this, c, x - 88, y + ch / 2 - 30, 104, 'idle');
      (view.object as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(open ? 1 : 0.45);
      this.avatars.push(view);
      label(this, x + 38, y - 42, `${i + 1}. ${c.name}`, 30, { fontFamily: FONT_DISPLAY, fontSize: '24px' });
      label(this, x + 38, y + 2, c.artifact, 16, { wordWrap: { width: 170 }, align: 'center' });
      if (open) stars(this, x, y + ch / 2 - 16, save.stars[c.id] ?? 0, 20);
      else label(this, x, y + ch / 2 - 16, c.v1 ? 'Locked' : 'Coming soon', 18, { color: PAPER_CSS });

      if (!open) return;
      const zone = this.add.zone(x, y, cw, ch).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.scene.start('Run', { index: i }));
    });

    button(this, 130, HEIGHT - 50, 'Back', () => this.scene.start('Title'), 180);
  }

  update(_t: number, deltaMs: number) {
    for (const a of this.avatars) a.tick(deltaMs / 1000);
  }
}
