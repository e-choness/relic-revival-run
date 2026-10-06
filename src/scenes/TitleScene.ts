import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';

// Placeholder title: proves the build pipeline end to end. Replaced by the real title/world map.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width } = this.scale;
    this.add.text(width / 2, 90, 'Relic Revival Run', { fontSize: '56px', color: '#f6c177', fontStyle: 'bold' }).setOrigin(0.5);
    CULTURES.forEach((c, i) => {
      const x = width / 2 + (i < 6 ? -260 : 260);
      const y = 200 + (i % 6) * 70;
      this.add
        .text(x, y, `${i + 1}. ${c.name} — ${c.avatar.animal}`, { fontSize: '24px', color: c.v1 ? '#ffffff' : '#7a6a85' })
        .setOrigin(0.5);
    });
  }
}
