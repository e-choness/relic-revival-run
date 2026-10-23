import Phaser from 'phaser';
import { AudioDirector } from '../audio/AudioDirector';
import { loadSave, resetSave, setChill } from '../systems/save';
import { VOLUME_STEP, loadAssist, saveAssist, type Volume } from '../systems/settings';
import { showControlsMenu } from './controlsMenu';
import { MenuNav, focusButton } from './menuNav';
import { FONT_DISPLAY, HEIGHT, INK, WIDTH, button, card, label } from './theme';

const W = 700;
const ROW_H = 78;

const setText = (b: Phaser.GameObjects.Container, text: string) => (b.getAt(1) as Phaser.GameObjects.Text).setText(text);

/**
 * Options overlay: volumes, sound, tool hints, controls. Outside a run it also offers chill mode and
 * resetting progress (both would change the rules of a run already under way).
 */
export function showOptionsMenu(scene: Phaser.Scene, opts: { inRun: boolean }, onClose: () => void) {
  const audio = AudioDirector.get();
  const h = 150 + (opts.inRun ? 4 : 5) * ROW_H;
  const top = HEIGHT / 2 - h / 2;
  const c = scene.add.container(0, 0).setDepth(30);
  c.add(scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, INK, 0.65).setInteractive());
  c.add(card(scene, WIDTH / 2, HEIGHT / 2, W, h));
  c.add(label(scene, WIDTH / 2, top + 44, 'Options', 36, { fontFamily: FONT_DISPLAY }));
  const hint = label(scene, WIDTH / 2, top + 88, 'Arrows or D-pad to move · Enter or A to change', 17);
  c.add(hint);

  const rowY = (i: number) => top + 150 + i * ROW_H;
  const volumeRow = (v: Volume, name: string, i: number) => {
    const y = rowY(i);
    const value = label(scene, WIDTH / 2, y, '', 26);
    const show = () => value.setText(`${name}: ${Math.round(audio.volume(v) * 100)}%`);
    const step = (d: number) => {
      audio.setVolume(v, audio.volume(v) + d * VOLUME_STEP);
      audio.sfx('click');
      show();
    };
    const minus = button(scene, WIDTH / 2 - 230, y, '−', () => step(-1), 90);
    const plus = button(scene, WIDTH / 2 + 230, y, '+', () => step(1), 90);
    show();
    c.add([value, minus, plus]);
    return [minus, plus];
  };
  const music = volumeRow('music', 'Music', 0);
  const effects = volumeRow('sfx', 'Effects', 1);

  const colX = (k: number) => WIDTH / 2 + (k ? 160 : -160);
  const soundLabel = () => `Sound: ${audio.muted ? 'off' : 'on'} (M)`;
  const sound = button(scene, colX(0), rowY(2), soundLabel(), () => {
    audio.toggleMute();
    setText(sound, soundLabel());
  }, 290);
  let assist = loadAssist();
  const hintsLabel = () => `Tool hints: ${assist ? 'on' : 'off'}`;
  const hints = button(scene, colX(1), rowY(2), hintsLabel(), () => {
    assist = !assist;
    saveAssist(assist);
    setText(hints, hintsLabel());
  }, 290);

  let nav: MenuNav | undefined;
  const controls = button(scene, colX(opts.inRun ? 0 : 1), rowY(3), 'Controls', () => {
    c.setVisible(false);
    nav?.setEnabled(false);
    showControlsMenu(scene, () => {
      c.setVisible(true);
      // Next tick, so the key that closed the controls menu isn't handled again here.
      scene.time.delayedCall(0, () => nav?.setEnabled(true));
    });
  }, 290);
  const items = [...music, ...effects, sound, hints, controls];

  if (!opts.inRun) {
    let chill = loadSave().chill;
    const chillLabel = () => `Chill mode: ${chill ? 'on' : 'off'}`;
    const chillBtn = button(scene, colX(0), rowY(3), chillLabel(), () => {
      chill = !chill;
      setChill(loadSave(), chill);
      setText(chillBtn, chillLabel());
      hint.setText(chill ? 'Chill mode: mistakes break your combo but never harm the artifact.' : 'Chill mode off: condition matters again.');
    }, 290);
    // Two presses, so progress is never lost to a stray click.
    let armed = false;
    const reset = button(scene, colX(0), rowY(4), 'Reset progress', () => {
      if (!armed) {
        armed = true;
        setText(reset, 'Press again to reset');
        hint.setText('This clears all stars, scores and museum notes. Settings are kept.').setColor('#c0392b');
        return;
      }
      resetSave();
      armed = false;
      setText(reset, 'Progress reset');
      hint.setText('A fresh start: every culture after Mexico is locked again.').setColor('#2b1d2e');
    }, 290);
    c.add([chillBtn, reset]);
    items.splice(4, 0, chillBtn);
    items.push(reset);
  }

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    nav?.destroy();
    c.destroy();
    onClose();
  };
  const back = button(scene, colX(1), rowY(opts.inRun ? 3 : 4), 'Back', close, 290);
  c.add([sound, hints, controls, back]);
  items.push(back);
  nav = new MenuNav(scene, items.map(focusButton), { back: close, depth: 40, start: items.length - 1 });
  return c;
}
