// Damage → treatment rules, modelled on real conservation practice.
// Single source of truth: gameplay never matches tools to damage by list position.

export type ToolId =
  | 'brush' // soft brush, micro-vacuum, biocide
  | 'wash' // humidification & washing (paper, textiles)
  | 'poultice' // draws out salts / dissolves black crust
  | 'consolidant' // re-adheres flaking paint, lacquer, glaze, stone
  | 'bond' // adhesive, fill, support stitching
  | 'anoxia' // oxygen-free bag for live infestation
  | 'scalpel' // mechanical removal under magnification
  | 'solventGel'; // removes old repairs, yellowed varnish

/** Non-treatment tools: the UV lamp reveals hidden damage, the camera documents before treatment. */
export type UtilityToolId = 'uvLamp' | 'camera';

export interface ToolDef {
  id: ToolId | UtilityToolId;
  name: string;
  /** Hold time in seconds; 0 = instant tap. */
  holdTime: number;
}

export const TOOLS: Record<ToolId | UtilityToolId, ToolDef> = {
  brush: { id: 'brush', name: 'Soft Brush', holdTime: 0 },
  wash: { id: 'wash', name: 'Humidify & Wash', holdTime: 0.4 },
  poultice: { id: 'poultice', name: 'Poultice', holdTime: 0.6 },
  consolidant: { id: 'consolidant', name: 'Consolidant & Spatula', holdTime: 0.4 },
  bond: { id: 'bond', name: 'Adhesive & Fill', holdTime: 0.3 },
  anoxia: { id: 'anoxia', name: 'Anoxic Bag', holdTime: 0.5 },
  scalpel: { id: 'scalpel', name: 'Scalpel', holdTime: 0 },
  solventGel: { id: 'solventGel', name: 'Solvent Gel', holdTime: 0.4 },
  uvLamp: { id: 'uvLamp', name: 'UV Lamp', holdTime: 0 },
  camera: { id: 'camera', name: 'Camera', holdTime: 0 },
};

export type DamageId =
  | 'grime'
  | 'soot'
  | 'biofilm'
  | 'mould'
  | 'salts'
  | 'blackCrust'
  | 'flakingPaint'
  | 'lacquerLifting'
  | 'glazeLoss'
  | 'spalling'
  | 'crack'
  | 'tear'
  | 'foxing'
  | 'creases'
  | 'insects'
  | 'bronzeDisease'
  | 'corrosion'
  | 'rootDamage'
  | 'oldRepair'
  | 'yellowedVarnish';

export interface DamageDef {
  id: DamageId;
  name: string;
  treatedBy: ToolId;
  /** Only visible after the UV lamp is used (old retouching and varnish fluoresce under UV). */
  hiddenUntilUV?: boolean;
  /** One-line, player-facing explanation shown in tips and on the results card. */
  fact: string;
}

export const DAMAGES: Record<DamageId, DamageDef> = {
  grime: { id: 'grime', name: 'Dust & Grime', treatedBy: 'brush', fact: 'Surface dirt is removed first, gently, before any wet treatment.' },
  soot: { id: 'soot', name: 'Soot', treatedBy: 'brush', fact: 'Soot from lamps and fires is lifted with soft brushes and sponges.' },
  biofilm: { id: 'biofilm', name: 'Lichen & Biofilm', treatedBy: 'brush', fact: 'Lichen is treated with biocide, then brushed away once it dies.' },
  mould: { id: 'mould', name: 'Mould', treatedBy: 'brush', fact: 'Dormant mould is removed with a HEPA micro-vacuum and soft brush.' },
  salts: { id: 'salts', name: 'Salt Efflorescence', treatedBy: 'poultice', fact: 'Poultices draw soluble salts out of porous stone and tile as they dry.' },
  blackCrust: { id: 'blackCrust', name: 'Black Crust', treatedBy: 'poultice', fact: 'Pollution forms gypsum crusts on marble; ammonium carbonate poultices soften them.' },
  flakingPaint: { id: 'flakingPaint', name: 'Flaking Paint', treatedBy: 'consolidant', fact: 'Lifting paint is re-adhered with consolidant and a warm spatula.' },
  lacquerLifting: { id: 'lacquerLifting', name: 'Lifting Lacquer', treatedBy: 'consolidant', fact: 'Traditional urushi lacquer is often used to re-lay lifting lacquer.' },
  glazeLoss: { id: 'glazeLoss', name: 'Glaze Loss', treatedBy: 'consolidant', fact: 'Flaking glaze edges are consolidated to stop further loss.' },
  spalling: { id: 'spalling', name: 'Spalling Stone', treatedBy: 'consolidant', fact: 'Delaminating stone is consolidated so the carved surface is not lost.' },
  crack: { id: 'crack', name: 'Crack', treatedBy: 'bond', fact: 'Reversible adhesives like Paraloid B-72 let future conservators undo a repair.' },
  tear: { id: 'tear', name: 'Tear', treatedBy: 'bond', fact: 'Tears in paper and silk are mended with thin Japanese tissue and wheat-starch paste.' },
  foxing: { id: 'foxing', name: 'Foxing & Stains', treatedBy: 'wash', fact: 'Brown foxing spots on paper can be reduced by careful washing.' },
  creases: { id: 'creases', name: 'Creases', treatedBy: 'wash', fact: 'Brittle fibres are humidified until they relax, then gently flattened.' },
  insects: { id: 'insects', name: 'Insect Infestation', treatedBy: 'anoxia', fact: 'Sealing an object in an oxygen-free bag kills insects without chemicals.' },
  bronzeDisease: { id: 'bronzeDisease', name: 'Bronze Disease', treatedBy: 'scalpel', fact: 'Powdery green chloride corrosion is picked out under a microscope, then inhibited.' },
  corrosion: { id: 'corrosion', name: 'Corrosion Crust', treatedBy: 'scalpel', fact: 'Disfiguring corrosion is reduced mechanically; stable patina is kept.' },
  rootDamage: { id: 'rootDamage', name: 'Roots', treatedBy: 'scalpel', fact: 'Tree roots that pry stones apart are cut back carefully.' },
  oldRepair: { id: 'oldRepair', name: 'Old Repair', treatedBy: 'solventGel', hiddenUntilUV: true, fact: 'Past retouching glows differently under UV, revealing old repairs.' },
  yellowedVarnish: { id: 'yellowedVarnish', name: 'Yellowed Varnish', treatedBy: 'solventGel', hiddenUntilUV: true, fact: 'Aged natural varnish fluoresces green under UV and is thinned with solvent gels.' },
};

export function isCorrectTool(damage: DamageId, tool: ToolId | UtilityToolId): boolean {
  return DAMAGES[damage].treatedBy === tool;
}

/** Treatment tools a level needs, in first-seen order. */
export function toolsFor(damages: readonly DamageId[]): ToolId[] {
  return [...new Set(damages.map((d) => DAMAGES[d].treatedBy))];
}
