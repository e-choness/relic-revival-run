import type { DamageId } from './conservation';

export type Motif = 'mesoamerican' | 'azulejo' | 'pagoda' | 'egyptian' | 'classical' | 'andean' | 'hills';

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
  palette: { sky: string; ground: string; accent: string };
  /** Shipped in v1; the rest are on the roadmap. */
  v1: boolean;
}

// Ordered by difficulty: more damage types and tools, and later levels add UV-hidden damage.
export const CULTURES: Culture[] = [
  {
    id: 'mexico', name: 'Mexico', artifact: 'Maya mural & stone stela',
    avatar: { animal: 'Axolotl', note: 'Endemic to the lakes of Mexico City', sprite: 'axolotl' }, motif: 'mesoamerican',
    damages: ['grime', 'salts', 'flakingPaint'],
    music: ['marimba', 'huehuetl drum', 'clay ocarina'],
    palette: { sky: '#f6c177', ground: '#b4553a', accent: '#2a9d8f' }, v1: true,
  },
  {
    id: 'portugal', name: 'Portugal', artifact: 'Azulejo tile panel',
    avatar: { animal: 'Iberian lynx', note: 'One of the rarest wild cats on Earth', sprite: 'lynx' }, motif: 'azulejo',
    damages: ['grime', 'salts', 'glazeLoss', 'crack'],
    music: ['Portuguese guitar', 'classical guitar', 'fado minor harmony'],
    palette: { sky: '#dbe9f4', ground: '#1f4e8c', accent: '#f2c14e' }, v1: true,
  },
  {
    id: 'china', name: 'China', artifact: 'Silk scroll & bronze ding',
    avatar: { animal: 'Red panda', note: 'Lives in the mountain forests of Sichuan and Yunnan', sprite: 'red-panda' }, motif: 'pagoda',
    damages: ['foxing', 'insects', 'tear', 'bronzeDisease'],
    music: ['guzheng', 'erhu', 'dizi', 'pentatonic scale'],
    palette: { sky: '#f3e6cf', ground: '#8c2f2f', accent: '#3c8d6e' }, v1: true,
  },
  {
    id: 'egypt', name: 'Egypt', artifact: 'Painted wooden coffin',
    avatar: { animal: 'Fennec fox', note: 'Desert fox of the Sahara with oversized ears', rig: 'fennec' }, motif: 'egyptian',
    damages: ['soot', 'flakingPaint', 'insects', 'oldRepair'],
    music: ['ney flute', 'oud', 'riq frame drum', 'maqam hijaz'],
    palette: { sky: '#f7dca0', ground: '#c08a3e', accent: '#2f6f9f' }, v1: true,
  },
  {
    id: 'greece', name: 'Greece', artifact: 'Black-figure amphora & marble frieze',
    avatar: { animal: 'Little owl', note: "Athena's owl, stamped on ancient Athenian coins", rig: 'little-owl' }, motif: 'classical',
    damages: ['grime', 'crack', 'blackCrust', 'oldRepair', 'salts'],
    music: ['lyra', 'aulos-style double reed', 'laouto', 'dorian mode'],
    palette: { sky: '#cfe7f5', ground: '#e8e2d4', accent: '#c4622d' }, v1: true,
  },
  {
    id: 'peru', name: 'Peru', artifact: 'Paracas embroidered textile',
    avatar: { animal: 'Vicuña', note: 'Andean camelid with the finest wool, prized by the Inca', rig: 'vicuna' }, motif: 'andean',
    damages: ['grime', 'creases', 'insects', 'tear', 'mould'],
    music: ['quena', 'siku panpipes', 'charango', 'bombo'],
    palette: { sky: '#f4d6c6', ground: '#7a3b2e', accent: '#e0a526' }, v1: true,
  },
  {
    id: 'japan', name: 'Japan', artifact: 'Lacquer box & ukiyo-e print',
    avatar: { animal: 'Tanuki', note: 'Raccoon dog of Japanese folklore', rig: 'tanuki' }, motif: 'hills',
    damages: ['lacquerLifting', 'mould', 'foxing', 'tear', 'oldRepair'],
    music: ['koto', 'shakuhachi', 'taiko', 'in scale'],
    palette: { sky: '#f5e9e2', ground: '#2b2b2b', accent: '#c0392b' }, v1: false,
  },
  {
    id: 'india', name: 'India', artifact: 'Chola bronze & Ajanta mural',
    avatar: { animal: 'Bengal tiger cub', note: 'National animal of India', rig: 'tiger-cub' }, motif: 'hills',
    damages: ['bronzeDisease', 'flakingPaint', 'soot', 'yellowedVarnish', 'salts'],
    music: ['sitar', 'bansuri', 'tabla', 'tanpura drone'],
    palette: { sky: '#fbe3b0', ground: '#9c4a1a', accent: '#1b7f79' }, v1: false,
  },
  {
    id: 'iran', name: 'Iran', artifact: 'Safavid tilework',
    avatar: { animal: 'Asiatic cheetah', note: 'Survives in the wild only in Iran', rig: 'cheetah' }, motif: 'hills',
    damages: ['salts', 'glazeLoss', 'crack', 'oldRepair', 'grime'],
    music: ['santur', 'tar', 'tombak', 'dastgah shur'],
    palette: { sky: '#e6f0f3', ground: '#1d5f8a', accent: '#d9a441' }, v1: false,
  },
  {
    id: 'nigeria', name: 'Nigeria', artifact: 'Benin bronze plaque',
    avatar: { animal: 'Leopard', note: 'Royal emblem of the Kingdom of Benin', rig: 'leopard' }, motif: 'hills',
    damages: ['corrosion', 'bronzeDisease', 'oldRepair', 'grime', 'insects'],
    music: ['talking drum', 'agogo bell', 'kora-style harp lute', 'call and response'],
    palette: { sky: '#f2dcb3', ground: '#6b3e26', accent: '#3a7d44' }, v1: false,
  },
  {
    id: 'cambodia', name: 'Cambodia', artifact: 'Angkor sandstone relief',
    avatar: { animal: 'Sun bear', note: 'Smallest bear, native to Southeast Asian forests', rig: 'sun-bear' }, motif: 'hills',
    damages: ['biofilm', 'rootDamage', 'spalling', 'salts', 'blackCrust', 'yellowedVarnish'],
    music: ['roneat xylophone', 'kong vong gongs', 'sralai oboe', 'skor drums'],
    palette: { sky: '#e3efd9', ground: '#7d6b4f', accent: '#c8553d' }, v1: false,
  },
  {
    id: 'mali', name: 'Mali', artifact: 'Timbuktu manuscripts',
    avatar: { animal: 'Desert hedgehog', note: 'Small nocturnal forager of the Sahel', rig: 'desert-hedgehog' }, motif: 'hills',
    damages: ['insects', 'foxing', 'tear', 'mould', 'flakingPaint', 'creases', 'oldRepair'],
    music: ['kora', 'ngoni', 'djembe', 'balafon'],
    palette: { sky: '#f8e1b5', ground: '#a8662d', accent: '#2c6e7f' }, v1: false,
  },
];

export const V1_CULTURES = CULTURES.filter((c) => c.v1);
