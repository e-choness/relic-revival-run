import Phaser from 'phaser';
import { CULTURES } from '../data/cultures';
import { generateTextures } from '../ui/art';
import { FONT_BODY, label } from '../ui/theme';

const PROPS = ['bug', 'crack', 'stain', 'brush', 'camera', 'uv'];
const FRAMES = { run: 8, jump: 3, fall: 3 } as const;
const FONTS: [string, string][] = [
  ['Borel', 'assets/fonts/Borel-Regular.ttf'],
  ['Edu SA Beginner', 'assets/fonts/EduSABeginner-VariableFont_wght.ttf'],
];

export const spriteIds = () => [...new Set(CULTURES.flatMap((c) => (c.avatar.sprite ? [c.avatar.sprite] : [])))];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const text = this.add.text(640, 360, 'Loading…', { fontFamily: FONT_BODY, fontSize: '32px', color: '#fff6e6' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => text.setText(`Loading… ${Math.round(p * 100)}%`));
    for (const p of PROPS) this.load.image(`prop-${p}`, `assets/props/${p}.png`);
    for (const s of spriteIds())
      for (const [anim, n] of Object.entries(FRAMES))
        for (let i = 1; i <= n; i++) this.load.image(`${s}-${anim}-${i}`, `assets/avatars/${s}/${anim}_${String(i).padStart(2, '0')}.png`);
  }

  async create() {
    generateTextures(this);
    for (const s of spriteIds())
      for (const [anim, n] of Object.entries(FRAMES))
        this.anims.create({
          key: `${s}-${anim}`,
          frames: Array.from({ length: n }, (_, i) => ({ key: `${s}-${anim}-${i + 1}` })),
          frameRate: anim === 'run' ? 14 : 10,
          repeat: anim === 'run' ? -1 : 0,
        });
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
