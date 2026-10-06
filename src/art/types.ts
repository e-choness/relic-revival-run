// Avatar documents: human-drawn shapes plus style settings. The pipeline only renders them;
// it never invents geometry.

export type Vec = { x: number; y: number };

/** solid = fill + cel shade + ink; line = ink stroke only; blush = soft glow; highlight = flat fill, no ink. */
export type Material = 'solid' | 'line' | 'blush' | 'highlight';

export interface Anchor extends Vec {
  /** Bezier handles, relative to the anchor. */
  in?: Vec;
  out?: Vec;
}

export interface Shape {
  id: string;
  material: Material;
  /** Palette key. */
  color: string;
  closed: boolean;
  /** Drawn in the workshop. */
  anchors?: Anchor[];
  /** Imported from an SVG editor (edit those in the source file). */
  d?: string;
}

export type PartId = 'earBack' | 'tail' | 'legBack' | 'armBack' | 'body' | 'legFront' | 'head' | 'earFront' | 'armFront';

export interface Part {
  id: PartId;
  parent?: PartId;
  /** Rotation pivot in canvas coordinates (e.g. hip, shoulder, neck). */
  pivot: Vec;
  shapes: Shape[];
}

export interface AvatarStyle {
  inkColor: string;
  /** Ink stroke width in canvas px (canvas is 1000×1000). */
  inkWidth: number;
  /** 0–1: how much open lines thin out at their ends. */
  taper: number;
  /** 0–1: brush-pressure rhythm along an outline. */
  pressureVariation: number;
  /** Displacement in px for the hand-drawn wobble; 0 disables it. */
  wobble: number;
  /** Direction the light comes from, in degrees (0 = from the right, 90 = from below). */
  lightAngle: number;
  /** How far the lit area is offset; larger = wider shade crescent. */
  shadeOffset: number;
  /** 0–1: how much shade colour moves toward the ink colour. */
  shadeDarken: number;
}

export interface AvatarDoc {
  version: 1;
  id: string;
  name: string;
  /** Canvas is size × size, character facing right, feet near the bottom. */
  size: number;
  palette: Record<string, string>;
  style: AvatarStyle;
  parts: Part[];
  /** Generated working base for the owner to redraw; never final art. */
  placeholder?: boolean;
}

/** Draw order, back to front (both ears sit behind the head outline, as in the jam art). Parents define how parts move together in the rig. */
export const PART_TEMPLATE: { id: PartId; parent?: PartId; label: string }[] = [
  { id: 'earBack', parent: 'head', label: 'Ear (back)' },
  { id: 'tail', parent: 'body', label: 'Tail' },
  { id: 'legBack', parent: 'body', label: 'Leg (back)' },
  { id: 'armBack', parent: 'body', label: 'Arm (back)' },
  { id: 'body', label: 'Body' },
  { id: 'legFront', parent: 'body', label: 'Leg (front)' },
  { id: 'earFront', parent: 'head', label: 'Ear (front)' },
  { id: 'head', parent: 'body', label: 'Head' },
  { id: 'armFront', parent: 'body', label: 'Arm (front)' },
];

/** Line and shading defaults, matched by eye to the original jam art style (ink weight relative to height). */
export const DEFAULT_STYLE: AvatarStyle = {
  inkColor: '#1e1418',
  inkWidth: 9,
  taper: 0.6,
  pressureVariation: 0.35,
  wobble: 1.5,
  lightAngle: 225,
  shadeOffset: 18,
  shadeDarken: 0.18,
};

export function newAvatar(id: string, name: string): AvatarDoc {
  return {
    version: 1,
    id,
    name,
    size: 1000,
    // Starter keys only; colours are chosen in the workshop.
    palette: { fur: '#cccccc', coat: '#ffffff', pants: '#888888', shoes: '#eeeeee', eye: '#333333', blush: '#f4a0a8' },
    style: { ...DEFAULT_STYLE },
    parts: PART_TEMPLATE.map((p) => ({ id: p.id, parent: p.parent, pivot: { x: 500, y: 500 }, shapes: [] })),
  };
}
