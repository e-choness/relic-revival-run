import Phaser from 'phaser';
import { ACTIONS, keysLabel, loadBindings, rebind, saveBindings, DEFAULT_BINDINGS, type Action } from '../systems/controls';
import { FONT_DISPLAY, HEIGHT, INK, WIDTH, button, card, label } from './theme';

const ROW_H = 70;

/** Key remapping overlay: click an action, press a key. */
export function showControlsMenu(scene: Phaser.Scene, onClose: () => void) {
  let bindings = loadBindings();
  let listening: Action | null = null;
  const h = 150 + ACTIONS.length * ROW_H + 90;
  const top = HEIGHT / 2 - h / 2;
  const c = scene.add.container(0, 0).setDepth(30);
  c.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.65).setInteractive());
  c.add(card(scene, WIDTH / 2, HEIGHT / 2, 640, h));
  c.add(label(scene, WIDTH / 2, top + 42, 'Controls', 36, { fontFamily: FONT_DISPLAY }));
  const hint = label(scene, WIDTH / 2, top + 86, 'Click an action, then press its new key. Number keys and M are fixed.', 17);
  c.add(hint);

  const rows = ACTIONS.map((a, i) => {
    const y = top + 140 + i * ROW_H;
    c.add(label(scene, WIDTH / 2 - 250, y, a.label, 24).setOrigin(0, 0.5));
    const b = button(scene, WIDTH / 2 + 140, y, keysLabel(bindings, a.id), () => {
      listening = a.id;
      (b.getAt(1) as Phaser.GameObjects.Text).setText('press a key…');
    }, 260);
    c.add(b);
    return { action: a.id, b };
  });
  const refresh = () => rows.forEach(({ action, b }) => (b.getAt(1) as Phaser.GameObjects.Text).setText(keysLabel(bindings, action)));

  const onKey = (e: KeyboardEvent) => {
    if (!listening) {
      if (e.code === 'Escape') close();
      return;
    }
    const next = rebind(bindings, listening, e.code);
    if (next) {
      bindings = next;
      saveBindings(bindings);
      hint.setText('Saved.');
    } else hint.setText('That key is reserved (1–9 select tools, M mutes).');
    listening = null;
    refresh();
  };
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    scene.input.keyboard?.off('keydown', onKey);
    c.destroy();
    onClose();
  };
  c.add(button(scene, WIDTH / 2 - 150, top + h - 50, 'Reset', () => {
    bindings = structuredClone(DEFAULT_BINDINGS);
    saveBindings(bindings);
    refresh();
  }, 220));
  c.add(button(scene, WIDTH / 2 + 150, top + h - 50, 'Back', close, 220));
  scene.input.keyboard?.on('keydown', onKey);
  return c;
}
