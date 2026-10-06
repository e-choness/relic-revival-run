import type { SoundProfile } from '../audio/music';
import type { DamageId } from './conservation';

export type Motif =
  | 'mesoamerican' | 'azulejo' | 'pagoda' | 'egyptian' | 'classical' | 'andean'
  | 'torii' | 'stupa' | 'dome' | 'benin' | 'angkor' | 'sahel' | 'hills';

export interface Culture {
  id: string;
  name: string;
  artifact: string;
  avatar: {
    animal: string;
    note: string;
    /** Hand-drawn frame animation in public/assets/avatars/<sprite> (the jam avatars). */
    sprite?: string;
    /** Cut-out rig exported by the avatar workshop to public/assets/avatars/<rig>. */
    rig?: string;
  };
  /** Background / artifact silhouette style. */
  motif: Motif;
  damages: DamageId[];
  /** Instruments / idioms the soundtrack stems should use. */
  music: string[];
  /** Placeholder synth soundtrack: scale, tempo, instrument family (see src/audio/music.ts). */
  sound: SoundProfile;
  palette: { sky: string; ground: string; accent: string };
  /** In the released game; unreleased cultures show as "Coming soon". */
  released: boolean;
}

// Ordered by difficulty: more damage types and tools, and later levels add UV-hidden damage.
export const CULTURES: Culture[] = [
  {
    id: 'mexico', name: 'Mexico', artifact: 'Maya mural & stone stela',
    avatar: { animal: 'Axolotl', note: 'Endemic to the lakes of Mexico City', sprite: 'axolotl' }, motif: 'mesoamerican',
    damages: ['grime', 'salts', 'flakingPaint'],
    music: ['marimba', 'huehuetl drum', 'clay ocarina'],
    sound: { root: 62, scale: [0, 2, 4, 5, 7, 9, 11], tempo: 112, lead: 'mallet', perc: 'hand', drone: 0 },
    palette: { sky: '#f6c177', ground: '#b4553a', accent: '#2a9d8f' }, released: true,
  },
  {
    id: 'portugal', name: 'Portugal', artifact: 'Azulejo tile panel',
    avatar: { animal: 'Iberian lynx', note: 'One of the rarest wild cats on Earth', sprite: 'lynx' }, motif: 'azulejo',
    damages: ['grime', 'salts', 'glazeLoss', 'crack'],
    music: ['Portuguese guitar', 'classical guitar', 'fado minor harmony'],
    sound: { root: 57, scale: [0, 2, 3, 5, 7, 8, 11], tempo: 76, lead: 'pluck', perc: 'none', drone: 0 },
    palette: { sky: '#dbe9f4', ground: '#1f4e8c', accent: '#f2c14e' }, released: true,
  },
  {
    id: 'china', name: 'China', artifact: 'Silk scroll & bronze ding',
    avatar: { animal: 'Red panda', note: 'Lives in the mountain forests of Sichuan and Yunnan', sprite: 'red-panda' }, motif: 'pagoda',
    damages: ['foxing', 'insects', 'tear', 'bronzeDisease'],
    music: ['guzheng', 'erhu', 'dizi', 'pentatonic scale'],
    sound: { root: 62, scale: [0, 2, 4, 7, 9], tempo: 90, lead: 'pluck', perc: 'gong', drone: 0 },
    palette: { sky: '#f3e6cf', ground: '#8c2f2f', accent: '#3c8d6e' }, released: true,
  },
  {
    id: 'egypt', name: 'Egypt', artifact: 'Painted wooden coffin',
    avatar: { animal: 'Fennec fox', note: 'Desert fox of the Sahara with oversized ears', rig: 'fennec' }, motif: 'egyptian',
    damages: ['soot', 'flakingPaint', 'insects', 'oldRepair'],
    music: ['ney flute', 'oud', 'riq frame drum', 'maqam hijaz'],
    sound: { root: 62, scale: [0, 1, 4, 5, 7, 8, 10], tempo: 100, lead: 'wind', perc: 'frame', drone: 0.4 },
    palette: { sky: '#f7dca0', ground: '#c08a3e', accent: '#2f6f9f' }, released: true,
  },
  {
    id: 'greece', name: 'Greece', artifact: 'Black-figure amphora & marble frieze',
    avatar: { animal: 'Little owl', note: "Athena's owl, stamped on ancient Athenian coins", rig: 'little-owl' }, motif: 'classical',
    damages: ['grime', 'crack', 'blackCrust', 'oldRepair', 'salts'],
    music: ['lyra', 'aulos-style double reed', 'laouto', 'dorian mode'],
    sound: { root: 64, scale: [0, 2, 3, 5, 7, 9, 10], tempo: 104, lead: 'bowed', perc: 'frame', drone: 0.2 },
    palette: { sky: '#cfe7f5', ground: '#e8e2d4', accent: '#c4622d' }, released: true,
  },
  {
    id: 'peru', name: 'Peru', artifact: 'Paracas embroidered textile',
    avatar: { animal: 'Vicuña', note: 'Andean camelid with the finest wool, prized by the Inca', rig: 'vicuna' }, motif: 'andean',
    damages: ['grime', 'creases', 'insects', 'tear', 'mould'],
    music: ['quena', 'siku panpipes', 'charango', 'bombo'],
    sound: { root: 64, scale: [0, 3, 5, 7, 10], tempo: 96, lead: 'wind', perc: 'hand', drone: 0 },
    palette: { sky: '#f4d6c6', ground: '#7a3b2e', accent: '#e0a526' }, released: true,
  },
  {
    id: 'japan', name: 'Japan', artifact: 'Lacquer box & ukiyo-e print',
    avatar: { animal: 'Tanuki', note: 'Raccoon dog of Japanese folklore', rig: 'tanuki' }, motif: 'torii',
    damages: ['lacquerLifting', 'mould', 'foxing', 'tear', 'oldRepair'],
    music: ['koto', 'shakuhachi', 'taiko', 'in scale'],
    sound: { root: 64, scale: [0, 1, 5, 7, 8], tempo: 72, lead: 'pluck', perc: 'taiko', drone: 0 },
    palette: { sky: '#f5e9e2', ground: '#2b2b2b', accent: '#c0392b' }, released: true,
  },
  {
    id: 'india', name: 'India', artifact: 'Chola bronze & Ajanta mural',
    avatar: { animal: 'Bengal tiger cub', note: 'National animal of India', rig: 'tiger-cub' }, motif: 'stupa',
    damages: ['bronzeDisease', 'flakingPaint', 'soot', 'yellowedVarnish', 'salts'],
    music: ['sitar', 'bansuri', 'tabla', 'tanpura drone'],
    sound: { root: 61, scale: [0, 2, 4, 6, 7, 9, 11], tempo: 84, lead: 'wind', perc: 'hand', drone: 0.7 },
    palette: { sky: '#fbe3b0', ground: '#9c4a1a', accent: '#1b7f79' }, released: true,
  },
  {
    id: 'iran', name: 'Iran', artifact: 'Safavid tilework',
    avatar: { animal: 'Asiatic cheetah', note: 'Survives in the wild only in Iran', rig: 'cheetah' }, motif: 'dome',
    damages: ['salts', 'glazeLoss', 'crack', 'oldRepair', 'grime'],
    music: ['santur', 'tar', 'tombak', 'dastgah shur'],
    sound: { root: 62, scale: [0, 1.5, 3, 5, 7, 8, 10], tempo: 80, lead: 'mallet', perc: 'frame', drone: 0.3 },
    palette: { sky: '#e6f0f3', ground: '#1d5f8a', accent: '#d9a441' }, released: true,
  },
  {
    id: 'nigeria', name: 'Nigeria', artifact: 'Benin bronze plaque',
    avatar: { animal: 'Leopard', note: 'Royal emblem of the Kingdom of Benin', rig: 'leopard' }, motif: 'benin',
    damages: ['corrosion', 'bronzeDisease', 'oldRepair', 'grime', 'insects'],
    music: ['talking drum', 'agogo bell', 'kora-style harp lute', 'call and response'],
    sound: { root: 65, scale: [0, 2, 4, 7, 9], tempo: 118, lead: 'pluck', perc: 'hand', drone: 0 },
    palette: { sky: '#f2dcb3', ground: '#6b3e26', accent: '#3a7d44' }, released: true,
  },
  {
    id: 'cambodia', name: 'Cambodia', artifact: 'Angkor sandstone relief',
    avatar: { animal: 'Sun bear', note: 'Smallest bear, native to Southeast Asian forests', rig: 'sun-bear' }, motif: 'angkor',
    damages: ['biofilm', 'rootDamage', 'spalling', 'salts', 'blackCrust', 'yellowedVarnish'],
    music: ['roneat xylophone', 'kong vong gongs', 'sralai oboe', 'skor drums'],
    sound: { root: 60, scale: [0, 2, 4, 7, 9], tempo: 96, lead: 'mallet', perc: 'gong', drone: 0 },
    palette: { sky: '#e3efd9', ground: '#7d6b4f', accent: '#c8553d' }, released: true,
  },
  {
    id: 'mali', name: 'Mali', artifact: 'Timbuktu manuscripts',
    avatar: { animal: 'Desert hedgehog', note: 'Small nocturnal forager of the Sahel', rig: 'desert-hedgehog' }, motif: 'sahel',
    damages: ['insects', 'foxing', 'tear', 'mould', 'flakingPaint', 'creases', 'oldRepair'],
    music: ['kora', 'ngoni', 'djembe', 'balafon'],
    sound: { root: 65, scale: [0, 2, 4, 5, 7, 9, 10], tempo: 108, lead: 'pluck', perc: 'hand', drone: 0 },
    palette: { sky: '#f8e1b5', ground: '#a8662d', accent: '#2c6e7f' }, released: true,
  },
];

export const RELEASED_CULTURES = CULTURES.filter((c) => c.released);
