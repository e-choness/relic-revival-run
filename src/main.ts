import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
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
  scene: [BootScene, TitleScene, WorldMapScene, RunScene, ResultsScene],
});

// Dev-only handle for playtest scripts (e.g. fast-forwarding a run); stripped from production builds.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
