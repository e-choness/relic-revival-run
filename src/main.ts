import Phaser from 'phaser';
import { AudioDirector } from './audio/AudioDirector';
import { BootScene } from './scenes/BootScene';
import { MuseumScene } from './scenes/MuseumScene';
import { ResultsScene } from './scenes/ResultsScene';
import { RunScene } from './scenes/RunScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { HEIGHT, WIDTH } from './ui/theme';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1424',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WIDTH, height: HEIGHT },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1400 } } },
  input: { gamepad: true },
  scene: [BootScene, TitleScene, WorldMapScene, RunScene, ResultsScene, MuseumScene],
});

// Audio may only start after a user gesture; M mutes anywhere.
const audio = AudioDirector.get();
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', (e) => {
  unlock();
  if (e.code === 'KeyM') audio.toggleMute();
});

// Dev-only handles for playtest scripts (fast-forwarding a run, inspecting audio); stripped from production builds.
if (import.meta.env.DEV) Object.assign(window, { game, audio });
