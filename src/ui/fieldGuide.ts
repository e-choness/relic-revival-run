import Phaser from 'phaser';
import { DAMAGES, TOOLS, toolsFor, type DamageId } from '../data/conservation';
import { CULTURES, type Culture } from '../data/cultures';
import { TWISTS } from '../data/twists';
import { damageTexture, toolTexture } from './art';
import { FONT_DISPLAY, HEIGHT, INK, INK_CSS, WIDTH, button, card, label } from './theme';


/** Damage types this culture introduces for the first time in the culture order. */
export function newDamages(culture: Culture): Set<DamageId> {
  const before = new Set(CULTURES.slice(0, CULTURES.indexOf(culture)).flatMap((c) => c.damages));
  return new Set(culture.damages.filter((d) => !before.has(d)));
}

/**
 * Field guide overlay: every damage type in this culture → the tool (and key) that treats it.
 * Shown before each run and from the pause menu, so the rules are never a guessing game.
 */
export function showFieldGuide(scene: Phaser.Scene, culture: Culture, actionLabel: string, onClose: () => void) {
  const tools = toolsFor(culture.damages);
  const fresh = newDamages(culture);
  const rows = culture.damages.length;
  // Tighter rows for long lists so the guide always fits on screen.
  const rowH = rows > 6 ? 54 : 62;
  const h = 214 + rows * rowH + 70;
  const top = HEIGHT / 2 - h / 2;
  const c = scene.add.container(0, 0).setDepth(30);
  c.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.65).setInteractive());
  c.add(card(scene, WIDTH / 2, HEIGHT / 2, 820, h));
  c.add(label(scene, WIDTH / 2, top + 40, `Field guide: ${culture.name}`, 34, { fontFamily: FONT_DISPLAY }));
  c.add(label(scene, WIDTH / 2, top + 80, `Restore the ${culture.artifact.toLowerCase()}. Damage arrives on the beat: treat it on the beat for a Perfect!`, 18));
  const twist = TWISTS[culture.twist];
  c.add(label(scene, WIDTH / 2, top + 112, `${twist.name}: ${twist.guide}`, 17, { color: '#c4622d', wordWrap: { width: 740 }, align: 'center' }));
  c.add(label(scene, WIDTH / 2, top + 150, 'Match each damage to its tool:', 19));

  culture.damages.forEach((d, i) => {
    const def = DAMAGES[d];
    const y = top + 194 + i * rowH;
    const tool = def.treatedBy;
    const key = tools.indexOf(tool) + 1;
    c.add(scene.add.image(WIDTH / 2 - 350, y, damageTexture(d)).setDisplaySize(52, 52));
    c.add(label(scene, WIDTH / 2 - 312, y - 10, def.name + (fresh.has(d) ? '  · NEW' : ''), 22).setOrigin(0, 0.5));
    const note = def.hiddenUntilUV ? 'Hidden: reveal it with the UV lamp (U) first' : def.fact;
    c.add(label(scene, WIDTH / 2 - 312, y + 14, note, 14, { color: def.hiddenUntilUV ? '#8e44ff' : INK_CSS, wordWrap: { width: 380 } }).setOrigin(0, 0.5));
    c.add(label(scene, WIDTH / 2 + 95, y, '→', 28));
    c.add(scene.add.image(WIDTH / 2 + 150, y, toolTexture(tool)).setDisplaySize(46, 46));
    c.add(label(scene, WIDTH / 2 + 185, y, `${TOOLS[tool].name}  [${key}]`, 20).setOrigin(0, 0.5));
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    scene.input.keyboard?.off('keydown', onKey);
    c.destroy();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (['Space', 'Enter', 'Escape'].includes(e.code)) close();
  };
  c.add(button(scene, WIDTH / 2, top + h - 48, actionLabel, close, 280));
  scene.input.keyboard?.on('keydown', onKey);
  scene.input.gamepad?.once('down', close);
  return c;
}
