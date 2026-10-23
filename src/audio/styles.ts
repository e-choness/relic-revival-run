// Hand-written arrangements, one per culture, after the research in art/soundtrack-research.md.
// Themes are original melodies written in each tradition's idiom (not transcriptions of traditional
// songs), played on the closest open (CC0) instruments we have. score.ts turns these into events.
//
// Melody notation: tokens `degree[ornament]:length`, bars separated by `|`. Degrees count up the
// culture's scale from its tonic (0); they wrap into higher and lower octaves. `-` is a rest. Lengths
// are in steps: sixteenths in simple meters (a beat is 4), eighths in compound meters (a beat is 3).
// Ornaments: `~` roll (tremolo), `^` grace note from above, `/` slide up into the note.
//
// Chord patterns (bass, accompaniment): `R` root, `T` third, `F` fifth, `O` octave, `C` the whole
// chord, `-` rest; `,` an octave lower, `'` an octave higher. Lengths as above.
//
// Percussion: one character per step, `X` accent, `x` stroke, `o` ghost, `.` rest; bars separated
// by `|`, and the pattern cycles (teental's sixteen beats are four bars).

/** Energy levels, from the combo: 0 calm, 1 warming up, 2 on a streak, 3 in full flow. */
export type Level = 0 | 1 | 2 | 3;

export interface PercVoice {
  /** Sample key in public/assets/audio/manifest.json. */
  sample: string;
  pattern: string;
  /** Lowest energy level at which this voice plays. */
  level: Level;
  /** Which synthesized drum stands in until the sample loads. */
  part: 'low' | 'high';
  /** Talking drum: the stroke bends down by this many semitones. */
  bend?: number;
  gain?: number;
}

export interface Counter {
  instrument: string;
  level: Level;
  /**
   * answer: its own written lines, in the lead's rests (call and response).
   * heterophony: the lead's melody, simplified to the beat and a hair behind, as a second player would.
   * thirds: the lead a third (or a pentatonic step) below, in parallel.
   * fill: quick runs down the chord in the lead's rests (fado guitarra, kora birimintingo).
   * core: the written melody itself, under an elaborated lead (Khmer pinpeat).
   */
  mode: 'answer' | 'heterophony' | 'thirds' | 'fill' | 'core';
  lines?: { A: string; B: string };
  /** Octaves above (+) or below (−) the lead's register. */
  octave?: number;
  gain?: number;
}

export interface Style {
  meter: { beats: number; sub: 3 | 4 };
  lead: {
    instrument: string;
    /** How long notes are decorated when the music has energy: marimba and santur roll, zither and flute glide. */
    ornament: 'roll' | 'slide' | 'grace' | 'none';
    octave?: number;
    /** The written theme is a core melody: the lead plays it elaborated in running eighths (pinpeat). */
    elaborate?: boolean;
    /** Level relative to other leads (1 = as written). */
    gain?: number;
  };
  /** A and B sections; the form is A, A (decorated), B, A. `cadence` replaces the final bar of the last A. */
  themes: { A: string; B: string; cadence?: string };
  /** Chord root (scale degree) for every bar of A and of B. */
  harmony: { kind: 'triad' | 'open' | 'drone'; A: number[]; B: number[] };
  bass?: { pattern: string; level: Level };
  comp?: { instrument: string; pattern: string; level: Level; octave?: number; gain?: number };
  counters: Counter[];
  perc: PercVoice[];
  /** Delay of off-beat sixteenths, as a fraction of a step. */
  swing: number;
  /** Largest random lateness of a note, as a fraction of a step (downbeats stay exact). */
  humanize: number;
  /** Reverb send. */
  room: number;
  /** Overall level trim, so cultures sound about equally loud (measured with scripts/review-museum-music.cjs). */
  level?: number;
}

export const STYLES: Record<string, Style> = {
  // A music-box lullaby for the menus.
  menu: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'vibraphone', ornament: 'none' },
    themes: {
      A: '2:4 3:4 4:6 3:2 | 2:8 1:4 0:4 | 1:4 2:4 3:4 5:4 | 4:8 3:8',
      B: '5:6 4:2 3:4 2:4 | 3:8 2:8 | 1:4 2:2 3:2 4:4 2:4 | 0:12 -:4',
    },
    harmony: { kind: 'open', A: [0, 0, 1, 3], B: [3, 0, 1, 0] },
    comp: { instrument: 'folkHarp', pattern: 'R:4 F:4 O:4 F:4', level: 1, octave: -1, gain: 0.7 },
    counters: [],
    perc: [],
    swing: 0.1,
    humanize: 0.06,
    room: 0.14,
  },

  // Son: 6/8 against 3/4 (sesquiáltera) over I–IV–V7, marimba in parallel thirds with rolled long notes,
  // the clay ocarina answering, and zapateado-like stamps on the slit drum.
  mexico: {
    meter: { beats: 2, sub: 3 },
    lead: { instrument: 'marimba', ornament: 'roll' },
    themes: {
      A: '7:2 6:1 5:2 4:1 | 3:2 5:2 7:2 | 6:3 4:2 6:1 | 7:3 -:3 | 2:2 4:1 7:2 6:1 | 5:2 3:2 5:2 | 4:1 6:1 8:1 6:1 4:2 | 7~:4 -:2',
      B: '8:2 7:1 5:3 | 9:3 7:3 | 8:2 6:2 4:2 | 7:3 4:3 | 5:2 7:2 10:2 | 9:2 8:1 7:3 | 6:1 8:1 6:1 4:3 | 7~:6',
    },
    harmony: { kind: 'triad', A: [0, 3, 4, 0, 0, 3, 4, 0], B: [3, 0, 4, 0, 3, 0, 4, 0] },
    // 6/8 then 3/4: the sesquiáltera in the bass.
    bass: { pattern: 'R:3 F:3 | R:2 T:2 F:2', level: 0 },
    counters: [
      { instrument: 'marimba', mode: 'thirds', level: 1, gain: 0.6 },
      {
        instrument: 'ocarina', mode: 'answer', level: 2, octave: 0, gain: 0.8,
        lines: {
          A: '-:6 | -:6 | -:6 | 4:1 5:1 4:1 2:3 | -:6 | -:6 | -:6 | -:2 2:1 4:1 7:2',
          B: '-:6 | -:6 | -:6 | -:3 2:1 4:1 6:1 | -:6 | -:6 | -:6 | -:6',
        },
      },
    ],
    perc: [
      { sample: 'slitLow', pattern: 'X..x..|X.x.x.', level: 0, part: 'low' },
      { sample: 'shaker', pattern: 'Xxxxxx|XxXxXx', level: 1, part: 'high', gain: 0.7 },
      { sample: 'slitHigh', pattern: '.x..x.|.x.x.x', level: 2, part: 'high', gain: 0.6 },
    ],
    swing: 0,
    humanize: 0.06,
    room: 0.1,
    level: 0.65,
  },

  // Fado menor: a long sung line (the bowed psaltery stands in for the voice) over i–V7–i; the guitarra
  // answers with tremolo runs in the singer's breaths; the viola keeps bass on 1 and 3, chord on 2 and 4.
  portugal: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'bowedPsaltery', ornament: 'grace', gain: 1.35 },
    themes: {
      A: '4:6 3:2 2:4 1:2 2:2 | -:2 1:2 3:2 6:2 5:6 4:2 | 4:4 3:2 1:2 -1:6 1:2 | 0:12 -:4',
      B: '5:6 4:2 3:4 5:4 | 4:8 2:4 0:4 | 1:3 2:1 3:4 6:4 5:4 | 4:4 2:2 1:2 0:8',
      cadence: '0:16',
    },
    harmony: { kind: 'triad', A: [0, 4, 4, 0], B: [3, 0, 4, 0] },
    bass: { pattern: 'R:4 -:4 F,:4 -:4', level: 0 },
    comp: { instrument: 'folkHarp', pattern: '-:4 C:4 -:4 C:4', level: 0, octave: -1, gain: 0.4 },
    counters: [{ instrument: 'strumstick', mode: 'fill', level: 1, octave: 0, gain: 0.75 }],
    perc: [],
    swing: 0,
    humanize: 0.12,
    room: 0.18,
    level: 1.6,
  },

  // Jiangnan-style pentatonic: the guzheng glides into long notes and trembles on held ones, the dizi
  // plays the same tune simplified (heterophony), the ban woodblock keeps the beat and a gong marks sections.
  china: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'danTranh', ornament: 'slide', octave: -1 },
    themes: {
      A: '3:4 4:2 3:2 2:4 1:2 2:2 | 3/:6 5:2 4:4 3:4 | 2:2 3:2 4:2 5:2 4:4 2:4 | 1:4 2:2 1:2 0~:8',
      B: '5:4 6:4 7/:6 6:2 | 5:4 4:2 3:2 4~:8 | 3:2 5:2 4:2 3:2 2:4 3:4 | 1:2 2:2 1:4 0~:8',
    },
    harmony: { kind: 'open', A: [0, 3, 2, 0], B: [0, 4, 3, 0] },
    bass: { pattern: 'R:4 F:4 O:4 F:4', level: 0 },
    counters: [{ instrument: 'altoRecorder', mode: 'heterophony', level: 2, octave: 1, gain: 1.1 }],
    perc: [
      { sample: 'woodblock', pattern: 'X...x...x...x.x.', level: 1, part: 'high', gain: 0.6 },
      { sample: 'gong', pattern: 'X...............|................|................|................', level: 0, part: 'low', gain: 0.55 },
    ],
    swing: 0,
    humanize: 0.08,
    room: 0.18,
  },

  // Maqam hijaz over the maqsum rhythm (dum tek – tek dum – tek –): the ney leads with slides, the oud
  // doubles it in heterophony, darbuka dum and tek, and the riq's jingles join on a streak.
  egypt: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'tenorRecorder', ornament: 'slide', octave: -1, gain: 1.25 },
    themes: {
      A: '4:4 5:2 4:2 3:4 2:4 | 2:2 3:2 2:2 1:2 0:8 | 0:2 1:2 2:4 3:2 4:2 5:4 | 4~:10 -:6',
      B: '7:4 6:2 5:2 6:4 4:4 | 5:2 4:2 3:2 4:2 5:8 | 4:4 3:2 2:2 1:4 2:4 | 1:2 2:2 1:2 0:10',
    },
    harmony: { kind: 'drone', A: [0, 0, 0, 0], B: [0, 0, 0, 0] },
    bass: { pattern: 'R:6 F,:2 R:8', level: 0 },
    counters: [{ instrument: 'strumstick', mode: 'heterophony', level: 1, octave: 0, gain: 0.6 }],
    perc: [
      { sample: 'darbukaLow', pattern: 'X.......X.......', level: 0, part: 'low' },
      { sample: 'darbukaHigh', pattern: '..X...X.....X...', level: 0, part: 'high', gain: 0.8 },
      { sample: 'darbukaHigh', pattern: '.o.o...o.o.o..oo', level: 2, part: 'high', gain: 0.45 },
      { sample: 'tambourine', pattern: '.x.x.x.x.x.x.x.x', level: 2, part: 'high', gain: 0.35 },
    ],
    swing: 0.12,
    humanize: 0.06,
    room: 0.2,
  },

  // Syrtos: each half bar is long-short-short-short (3+1+2+2 sixteenths). The lyra (bowed psaltery)
  // leads with trills, the laouto (strumstick) strikes the same rhythm, and the drum answers it.
  greece: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'bowedPsaltery', ornament: 'grace' },
    themes: {
      A: '4:3 5:1 4:2 3:2 2:3 3:1 2:2 1:2 | 0:3 1:1 2:2 3:2 4:8 | 6:3 5:1 4:2 3:2 4:3 3:1 2:2 1:2 | 2:3 1:1 0:4 -:8',
      B: '7:3 6:1 5:2 4:2 5:3 4:1 3:2 2:2 | 3:4 4:4 5:8 | 6:3 5:1 4:2 3:2 2:3 1:1 2:2 3:2 | 1:2 0:6 -:8',
      cadence: '1:2 0:14',
    },
    harmony: { kind: 'triad', A: [0, 0, 6, 0], B: [3, 0, 6, 0] },
    bass: { pattern: 'R:8 F,:8', level: 0 },
    comp: { instrument: 'strumstick', pattern: 'R:3 C:1 C:2 C:2 R:3 C:1 C:2 C:2', level: 1, octave: -1, gain: 0.55 },
    counters: [],
    perc: [
      { sample: 'frameDrum', pattern: 'X..x....X..x....', level: 0, part: 'low' },
      { sample: 'darbukaHigh', pattern: '....x.x.....x.x.', level: 1, part: 'high', gain: 0.6 },
      { sample: 'tambourine', pattern: '..x...x...x...x.', level: 2, part: 'high', gain: 0.4 },
    ],
    swing: 0,
    humanize: 0.07,
    room: 0.12,
  },

  // Huayno: long-short-short in 2/4, pentatonic lines that fall to the tonic, two quenas in parallel,
  // the charango strumming the huayno rhythm, the bombo and the chajchas (goat-hoof rattle).
  peru: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'sopranoRecorder', ornament: 'grace' },
    themes: {
      A: '3:2 3:1 4:1 5:2 4:2 3:2 3:1 2:1 3:4 | 4:2 4:1 3:1 2:2 1:2 2:4 -:4 | 3:2 3:1 4:1 5:2 6:2 5:2 4:1 3:1 4:4 | 3:2 2:1 1:1 0:4 0:2 -:6',
      B: '5:4 5:2 4:1 3:1 4:4 3:4 | 2:2 2:1 3:1 4:2 3:2 2:8 | 1:2 1:1 2:1 3:2 2:2 1:2 0:1 1:1 2:4 | 1:2 0:1 -1:1 0:12',
    },
    harmony: { kind: 'open', A: [0, 1, 0, 0], B: [1, 0, 1, 0] },
    bass: { pattern: 'R:4 F,:4 R:4 F,:4', level: 0 },
    comp: { instrument: 'strumstick', pattern: 'C:2 C:1 C:1 C:2 C:1 C:1 C:2 C:1 C:1 C:2 C:1 C:1', level: 1, octave: -1, gain: 0.45 },
    counters: [{ instrument: 'sopranoRecorder', mode: 'thirds', level: 2, gain: 0.55 }],
    perc: [
      { sample: 'bassDrum', pattern: 'X...x.x.X...x.x.', level: 0, part: 'low', gain: 0.8 },
      { sample: 'shaker', pattern: 'Xxx.Xxx.Xxx.Xxx.', level: 1, part: 'high', gain: 0.55 },
    ],
    swing: 0,
    humanize: 0.07,
    room: 0.14,
  },

  // The in scale, with ma (space): the koto bends into notes and leaves silence; the shakuhachi echoes
  // the long notes; taiko and hyoshigi clappers are sparse, never a backbeat.
  japan: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'danTranh', ornament: 'slide', octave: -1 },
    themes: {
      A: '3:4 4:2 3:2 2/:8 | 1:2 2:2 1:4 0:4 -:4 | 5/:6 4:2 3:4 4:4 | 3:8 -:8',
      B: '2:4 3:2 4:2 5/:8 | 6:4 5:2 4:2 3:8 | 2:2 3:2 2:2 1:2 0:4 1:4 | 0:12 -:4',
    },
    harmony: { kind: 'open', A: [0, 0, 2, 3], B: [2, 4, 0, 0] },
    comp: { instrument: 'danTranh', pattern: 'R:2 F:2 O:4 -:8', level: 1, octave: -1, gain: 0.5 },
    counters: [{ instrument: 'altoRecorder', mode: 'heterophony', level: 2, octave: 1, gain: 1.1 }],
    perc: [
      { sample: 'bassDrum', pattern: 'X...........x...|X.......X...x.x.', level: 0, part: 'low', gain: 0.9 },
      { sample: 'woodblock', pattern: '........X.......|........X...X...', level: 1, part: 'high', gain: 0.5 },
    ],
    swing: 0,
    humanize: 0.14,
    room: 0.2,
  },

  // Raga Yaman in teental (16 beats: clap on 1, 5 and 13, the empty khali on 9). The bansuri glides
  // (meend), the tanpura cycles Pa–Sa–Sa–Sa, the tabla plays the theka, and the B section ends in a tihai:
  // one phrase three times, landing on sam.
  india: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'altoRecorder', ornament: 'slide' },
    themes: {
      A: '7:4 6:2 5:2 4:4 3:2 2:2 | 1:4 2:2 1:2 0:8 | -1:2 1:2 2:4 3:2 5:2 4:4 | 2:2 3:2 5:2 6:2 7:8',
      B: '4:2 5:2 6:2 7:2 8:4 7:4 | 9:4 8:2 7:2 6:4 5:4 | 4:4 3:2 2:2 1:2 2:2 3:4 | 2:1 1:1 0:2 -:2 2:1 1:1 0:2 -:2 2:1 1:1 0:2',
    },
    harmony: { kind: 'drone', A: [0, 0, 0, 0], B: [0, 0, 0, 0] },
    comp: { instrument: 'folkHarp', pattern: 'F,:4 R:4 R:4 R,:4', level: 0, octave: 0, gain: 0.45 },
    counters: [{ instrument: 'strumstick', mode: 'heterophony', level: 2, octave: -1, gain: 0.5 }],
    perc: [
      // Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Na Tin Tin Na | Ta Dhin Dhin Dha
      { sample: 'bongo', pattern: 'X...x...x...X...|X...x...x...X...|x...x...x...x...|x...x...x...X...', level: 0, part: 'high', gain: 0.75 },
      { sample: 'congaLow', pattern: 'X...x...x...X...|X...x...x...X...|................|....x...x...X...', level: 0, part: 'low', gain: 0.8 },
      { sample: 'bongo', pattern: '..o...o...o...o.|..o...o...o...o.|..o...o...o...o.|..o...o...oooo..', level: 2, part: 'high', gain: 0.35 },
    ],
    swing: 0,
    humanize: 0.08,
    room: 0.14,
    level: 1.25,
  },

  // Dastgah-e Shur as a 6/8 reng: the santur (dan tranh) trembles on long notes (riz), the kamancheh
  // (bowed psaltery) follows in heterophony, the tombak alternates tom and bak.
  iran: {
    meter: { beats: 2, sub: 3 },
    lead: { instrument: 'danTranh', ornament: 'roll' },
    themes: {
      A: '3:2 2:1 3:2 4:1 | 5:3 4:2 3:1 | 2:2 1:1 2:2 3:1 | 1:3 0:3 | 0:2 2:1 3:2 4:1 | 6:2 5:1 4:3 | 3:2 2:1 1:2 2:1 | 0~:6',
      B: '7:2 6:1 7:3 | 6:2 5:1 4:3 | 5:2 4:1 3:2 2:1 | 3~:6 | 4:2 3:1 2:2 1:1 | 2:3 3:3 | 2:2 1:1 0:2 1:1 | 0~:6',
    },
    harmony: { kind: 'drone', A: [0, 0, 0, 0, 0, 0, 0, 0], B: [0, 0, 0, 0, 0, 0, 0, 0] },
    bass: { pattern: 'R:3 -:3', level: 0 },
    counters: [{ instrument: 'bowedPsaltery', mode: 'heterophony', level: 1, octave: 0, gain: 0.5 }],
    perc: [
      { sample: 'darbukaLow', pattern: 'X..x..', level: 0, part: 'low' },
      { sample: 'darbukaHigh', pattern: '.xx.xx', level: 1, part: 'high', gain: 0.55 },
      { sample: 'darbukaHigh', pattern: '..o..o|.oo..o', level: 3, part: 'high', gain: 0.3 },
    ],
    swing: 0,
    humanize: 0.07,
    room: 0.16,
  },

  // Call and response over the 12/8 standard bell pattern (x.x.xx.x.x.x): the kalimba calls, the
  // balafon answers, the talking drum bends its strokes, sekere and the bass drum fill out the groove.
  nigeria: {
    meter: { beats: 4, sub: 3 },
    lead: { instrument: 'kalimba', ornament: 'none', gain: 1.25 },
    themes: {
      A: '5:2 4:1 3:2 4:1 5:3 3:3 | 2:2 3:1 2:2 1:1 0:3 -:3 | -:12 | -:12',
      B: '7:3 5:2 6:1 5:3 4:3 | 5:2 4:1 3:2 2:1 3:6 | -:12 | -:12',
    },
    harmony: { kind: 'triad', A: [0, 3, 0, 0], B: [3, 0, 3, 0] },
    bass: { pattern: 'R:6 F,:6', level: 0 },
    counters: [{
      instrument: 'balafon', mode: 'answer', level: 0, octave: 0, gain: 0.9,
      lines: {
        A: '-:12 | -:12 | 3:2 4:1 5:2 4:1 3:3 2:3 | 1:2 2:1 1:2 0:1 0:6',
        B: '-:12 | -:12 | 4:2 3:1 2:2 3:1 4:3 2:3 | 1:2 0:1 1:2 2:1 0:6',
      },
    }],
    perc: [
      { sample: 'agogoHigh', pattern: 'X.x.xx.x.x.x', level: 0, part: 'high', gain: 0.6 },
      { sample: 'shaker', pattern: 'x.xx.xx.xx.x', level: 1, part: 'high', gain: 0.45 },
      { sample: 'congaLow', pattern: 'X.....x..x..', level: 1, part: 'low', gain: 0.8 },
      { sample: 'congaHigh', pattern: '...X.x...x.x|..x..X.x..x.', level: 2, part: 'high', bend: 5, gain: 0.7 },
    ],
    swing: 0,
    humanize: 0.06,
    room: 0.09,
  },

  // Pinpeat: the gong circle (vibraphone) plays the core melody one note a beat; the roneat (xylophone)
  // elaborates it in running eighths; the ching marks the cycle (open on the weak beats), the skor drum
  // and a gong punctuate the phrase ends.
  cambodia: {
    meter: { beats: 4, sub: 4 },
    lead: { instrument: 'xylophone', ornament: 'none', elaborate: true },
    themes: {
      A: '2:4 3:4 4:4 3:4 | 2:4 1:4 2:4 0:4 | 3:4 4:4 5:4 4:4 | 3:4 2:4 1:4 0:4',
      B: '5:4 6:4 5:4 4:4 | 3:4 4:4 3:4 2:4 | 1:4 2:4 3:4 2:4 | 1:4 -1:4 0:8',
    },
    harmony: { kind: 'open', A: [0, 0, 3, 0], B: [3, 3, 0, 0] },
    bass: { pattern: 'R:8 F,:8', level: 1 },
    counters: [{ instrument: 'vibraphone', mode: 'core', level: 1, octave: 0, gain: 0.55 }],
    perc: [
      { sample: 'fingerCymbals', pattern: 'o...X...o...X...', level: 0, part: 'high', gain: 0.35 },
      { sample: 'bassDrum', pattern: 'X...............|................|X...............|........X...X...', level: 1, part: 'low', gain: 0.7 },
      { sample: 'gong', pattern: 'X...............|................|................|................', level: 2, part: 'low', gain: 0.4 },
    ],
    swing: 0,
    humanize: 0.05,
    room: 0.15,
  },

  // Mande: the kora's kumbengo ostinato (harp) turns underneath, the balafon sings the theme, kora
  // birimintingo runs fill the gaps on a streak, djembe bass/tone/slap and shaker in 12/8.
  mali: {
    meter: { beats: 4, sub: 3 },
    lead: { instrument: 'balafon', ornament: 'grace' },
    themes: {
      A: '9:2 8:1 7:3 6:2 5:1 4:3 | 5:2 4:1 2:3 4:6 | 7:2 6:1 5:2 4:1 5:3 2:3 | 4:2 2:1 1:2 0:7',
      B: '7:3 9:3 8:2 7:1 6:3 | 5:2 6:1 5:2 4:1 2:6 | 4:2 5:1 7:3 6:2 5:1 4:3 | 2:2 1:1 0:9',
    },
    harmony: { kind: 'open', A: [0, 3, 0, 0], B: [0, 3, 6, 0] },
    // The kumbengo: thumbs walk the bass, fingers interlock above, two bars around.
    comp: { instrument: 'folkHarp', pattern: '0:1 7:1 4:1 2:1 7:1 4:1 -3:1 6:1 4:1 2:1 6:1 4:1 | -4:1 7:1 5:1 3:1 7:1 5:1 -3:1 6:1 4:1 2:1 6:1 4:1', level: 0, octave: 0, gain: 0.5 },
    counters: [{ instrument: 'strumstick', mode: 'fill', level: 2, octave: 0, gain: 0.6 }],
    perc: [
      { sample: 'congaLow', pattern: 'X.....X..x..', level: 0, part: 'low', gain: 0.8 },
      { sample: 'congaHigh', pattern: '..xx.X..xx.X', level: 1, part: 'high', gain: 0.6 },
      { sample: 'shaker', pattern: 'x.xx.xx.xx.x', level: 2, part: 'high', gain: 0.4 },
    ],
    swing: 0,
    humanize: 0.06,
    room: 0.1,
  },
};
