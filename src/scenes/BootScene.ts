import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { generateTextures } from '../ui/art';
import { loadRig } from '../ui/CutoutAvatar';
import { FONT_BODY, label } from '../ui/theme';

const FONTS: [string, string][] = [
  ['Borel', 'assets/fonts/Borel-Regular.ttf'],
  ['Edu SA Beginner', 'assets/fonts/EduSABeginner-VariableFont_wght.ttf'],
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const text = this.add.text(640, 360, 'Loading…', { fontFamily: FONT_BODY, fontSize: '32px', color: '#fff6e6' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => text.setText(`Loading… ${Math.round(p * 100)}%`));
    for (const c of CULTURES) if (c.avatar.rig) loadRig(this, c.avatar.rig);
  }

  async create() {
    generateTextures(this);
    await Promise.all(
      FONTS.map(async ([family, url]) => {
        try {
          document.fonts.add(await new FontFace(family, `url(${url})`).load());
        } catch {
          /* fall back to cursive */
        }
      }),
    );
    label(this, 0, 0, '', 1).destroy(); // warm the font so first text renders with it
    this.scene.start('Title');
  }
}
