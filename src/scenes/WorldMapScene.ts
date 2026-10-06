import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { isUnlocked, loadSave } from '../systems/save';
import { FONT_DISPLAY, HEIGHT, INK, PAPER_CSS, WIDTH, button, card, hex, label, stars } from '../ui/theme';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }

  create() {
    const save = loadSave();
    this.add.graphics().fillGradientStyle(0x3b2a4a, 0x3b2a4a, 0x1d1424, 0x1d1424, 1).fillRect(0, 0, WIDTH, HEIGHT);
    label(this, WIDTH / 2, 56, 'Choose a culture', 48, { fontFamily: FONT_DISPLAY, color: PAPER_CSS });

    const cw = 270, ch = 150;
    CULTURES.forEach((c, i) => {
      const x = 190 + (i % 4) * 300, y = 175 + Math.floor(i / 4) * 175;
      const open = isUnlocked(save, i);
      const g = card(this, x, y, cw, ch, open ? hex(c.palette.sky) : 0x6b5a78);
      g.fillStyle(open ? hex(c.palette.accent) : INK, 1).fillRect(x - cw / 2 + 2, y + ch / 2 - 30, cw - 4, 28);
      label(this, x, y - 42, `${i + 1}. ${c.name}`, 30, { fontFamily: FONT_DISPLAY, fontSize: '26px' });
      label(this, x, y, c.artifact, 18);
      if (open) stars(this, x, y + ch / 2 - 16, save.stars[c.id] ?? 0, 20);
      else label(this, x, y + ch / 2 - 16, c.v1 ? 'Locked' : 'Coming soon', 18, { color: PAPER_CSS });

      if (!open) return;
      const zone = this.add.zone(x, y, cw, ch).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.scene.start('Run', { index: i }));
    });

    button(this, 130, HEIGHT - 50, 'Back', () => this.scene.start('Title'), 180);
  }
}
