import Phaser from 'phaser';
import type { Culture } from '../data/cultures';
import { drawArtifact } from './art';

export const artifactKey = (id: string) => `artifact-${id}`;
export const artifactFile = (id: string) => `assets/artifacts/${id}-v1.webp`;

export function loadArtifact(scene: Phaser.Scene, id: string) {
  if (!scene.textures.exists(artifactKey(id))) scene.load.image(artifactKey(id), artifactFile(id));
}

/** Shared artwork, fitted without distortion. Existing drawings remain a load-failure fallback. */
export function addArtifact(scene: Phaser.Scene, culture: Culture, x: number, y: number, width: number, height: number) {
  const view = scene.add.container(x, y);
  view.add(scene.add.rectangle(0, 0, width, height, 0xfff6e6).setOrigin(0));
  if (scene.textures.exists(artifactKey(culture.id))) {
    const art = scene.add.image(width / 2, height / 2, artifactKey(culture.id));
    art.setScale(Math.min(width / art.width, height / art.height));
    view.add(art);
  } else {
    const fallback = scene.add.graphics();
    drawArtifact(fallback, culture, width, height);
    view.add(fallback);
  }
  return view;
}
