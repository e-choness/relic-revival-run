import Phaser from 'phaser';
import type { Culture } from '../data/cultures';
import { loopCanvas, PARALLAX_SPEED, sceneryFamily } from '../art/loopTexture';
import { drawSkyline } from './art';
import { HEIGHT, WIDTH, hex } from './theme';

export interface LandscapeLayer { sprite: Phaser.GameObjects.TileSprite; factor: number }
export const landscapeKey = (id: string) => `landscape-v3-${id}`;

/** Only the visited setting and its shared foreground assets load. */
export function loadLandscape(scene: Phaser.Scene, id: string) {
  for (const asset of [id, sceneryFamily(id), 'path']) {
    if (!scene.textures.exists(landscapeKey(asset)))
      scene.load.image(landscapeKey(asset), `assets/backgrounds/${asset}-v3.webp`);
  }
}

function periodicTexture(scene: Phaser.Scene, id: string) {
  const key = `${landscapeKey(id)}-loop`;
  if (!scene.textures.exists(key)) {
    const image = scene.textures.get(landscapeKey(id)).getSourceImage() as HTMLImageElement;
    scene.textures.addCanvas(key, loopCanvas(image));
  }
  return key;
}

/** Far architecture, nearby plants and stones, then the running surface. */
export function addLandscape(scene: Phaser.Scene, culture: Culture, groundY: number): LandscapeLayer[] {
  const layers: LandscapeLayer[] = [];
  scene.add.rectangle(0, 0, WIDTH, HEIGHT, hex(culture.palette.sky)).setOrigin(0);
  const tile = (id: string, y: number, height: number, scaleX: number, scaleY: number, factor: number) => {
    const key = periodicTexture(scene, id);
    const sprite = scene.add.tileSprite(0, y, WIDTH, height, key).setOrigin(0).setTileScale(scaleX, scaleY);
    layers.push({ sprite, factor });
  };
  if (scene.textures.exists(landscapeKey(culture.id))) {
    const source = scene.textures.get(landscapeKey(culture.id)).getSourceImage();
    const scale = groundY / (source.height * 0.84);
    tile(culture.id, 0, HEIGHT, scale, scale, PARALLAX_SPEED.distance);
  } else {
    const g = scene.add.graphics();
    drawSkyline(g, culture.motif, WIDTH, groundY, hex(culture.palette.ground));
  }
  const middle = sceneryFamily(culture.id);
  if (scene.textures.exists(landscapeKey(middle))) {
    const source = scene.textures.get(landscapeKey(middle)).getSourceImage();
    // Transparent upper portion keeps the playable lanes and landmarks readable.
    const height = 290, scale = height / source.height;
    tile(middle, groundY - height + 35, height, scale, scale, PARALLAX_SPEED.middle);
  }
  if (scene.textures.exists(landscapeKey('path'))) {
    const source = scene.textures.get(landscapeKey('path')).getSourceImage();
    tile('path', groundY, HEIGHT - groundY, 0.65, (HEIGHT - groundY) / source.height, PARALLAX_SPEED.ground);
  } else scene.add.rectangle(0, groundY, WIDTH, HEIGHT - groundY, hex(culture.palette.ground)).setOrigin(0);
  return layers;
}

/** Compensate for texture scale so factors represent actual on-screen speeds. */
export function advanceLandscape(layers: LandscapeLayer[], distance: number, reducedMotion = false) {
  for (const { sprite, factor } of layers) {
    if (reducedMotion && factor !== PARALLAX_SPEED.ground) continue;
    sprite.tilePositionX += distance * factor / sprite.tileScaleX;
  }
}
