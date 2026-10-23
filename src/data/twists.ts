// One gameplay twist per culture, tied to its material or place. Shown in the field guide.

export type TwistId = 'none' | 'tiles' | 'wind' | 'darkness' | 'fragile' | 'thinAir' | 'precision' | 'crescendo' | 'pairs' | 'regrowth' | 'sandstorm';

export interface Twist {
  id: TwistId;
  name: string;
  /** One line for the field guide: what changes and how to play it. */
  guide: string;
}

export const TWISTS: Record<TwistId, Twist> = {
  none: { id: 'none', name: 'First steps', guide: 'No surprises here: learn the tools and find the beat.' },
  tiles: { id: 'tiles', name: 'Missing tiles', guide: 'Gold tile pieces float by: catch them to set lost tiles back into the panel for bonus points.' },
  wind: { id: 'wind', name: 'Mountain wind', guide: 'Gusts blow damage up or down a lane. Watch for the arrows!' },
  darkness: { id: 'darkness', name: 'Inside the tomb', guide: 'It is dark in here. Your lamp lights the way, and the UV lamp lights up the whole chamber for a moment.' },
  fragile: { id: 'fragile', name: 'Fragile pieces', guide: 'Spots with a red ring are fragile: double points if right, double damage if wrong.' },
  thinAir: { id: 'thinAir', name: 'Thin mountain air', guide: 'You jump higher and float longer in the Andes, so more damage sits up high.' },
  precision: { id: 'precision', name: 'Lacquer precision', guide: 'Lacquer rewards precision: the Perfect window is tighter, but Perfects are worth triple.' },
  crescendo: { id: 'crescendo', name: 'Festival crescendo', guide: 'The music speeds up as the run goes on. Keep up!' },
  pairs: { id: 'pairs', name: 'Call and response', guide: 'Damage comes in pairs, like a talking drum and its answer. Treat both for a response bonus.' },
  regrowth: { id: 'regrowth', name: 'Jungle regrowth', guide: 'Damage you miss grows back once, later in the run. Second chance, but it still counts.' },
  sandstorm: { id: 'sandstorm', name: 'Harmattan sandstorm', guide: 'Dusty winds blur the view and blow damage between lanes.' },
};
