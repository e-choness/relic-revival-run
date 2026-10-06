import { PATTERNS, degreeToMidi, midiToFreq, mix, phrase, seedFrom, type Note, type Perc, type SoundProfile, type Timbre } from './music';

// PLACEHOLDER soundtrack and effects, synthesized with Web Audio until recorded stems exist.
// Music is a layered, beat-scheduled loop (bass, percussion, lead, drone, tension) whose mix follows play:
// the combo builds percussion and melody density, low artifact integrity brings in a tense pulse.

export type Sfx = 'jump' | 'switch' | 'restore' | 'wrong' | 'miss' | 'uv' | 'camera' | 'click' | 'win' | 'fail';

const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const STEPS_PER_PHRASE = 16;
/** Phrase order per 4-phrase cycle: statement, repeat, answer, return. */
const FORM = [0, 0, 1, 2];
const MUTE_KEY = 'relic-revival-run:muted';

type Layer = 'bass' | 'perc' | 'lead' | 'drone' | 'tension';

export class AudioDirector {
  private static instance?: AudioDirector;
  static get(): AudioDirector {
    return (this.instance ??= new AudioDirector());
  }

  muted = readMuted();
  private ctx?: AudioContext;
  private master!: GainNode;
  private music!: GainNode;
  private sfxBus!: GainNode;
  private layers = {} as Record<Layer, GainNode>;
  private noise!: AudioBuffer;

  private profile?: SoundProfile;
  private profileKey?: string;
  private phrases: Note[][] = [];
  private step = 0;
  private nextTime = 0;
  private timer?: ReturnType<typeof setInterval>;
  private sustained: OscillatorNode[] = [];
  private intensity = 0;
  private integrity = 1;

  /** Create/resume the audio context. Browsers only allow this from a user gesture. */
  unlock() {
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      const ctx = (this.ctx = new Ctor());
      this.master = gain(ctx, this.muted ? 0 : 0.8, ctx.destination);
      this.music = gain(ctx, 0.5, this.master);
      this.sfxBus = gain(ctx, 0.8, this.master);
      for (const l of ['bass', 'perc', 'lead', 'drone', 'tension'] as Layer[]) this.layers[l] = gain(ctx, 0, this.music);
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      // A profile requested before the first gesture starts now.
      if (this.profile) this.start();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  /** Switch soundtrack; a no-op if this profile is already playing. */
  play(profile: SoundProfile, key: string) {
    if (key === this.profileKey) return;
    this.stop();
    this.profile = profile;
    this.profileKey = key;
    const seed = seedFrom(key);
    this.phrases = [0, 1, 2].map((i) => phrase(seed + i * 7919, STEPS_PER_PHRASE, profile.scale.length + 2));
    if (this.ctx) this.start();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    const t = this.ctx?.currentTime ?? 0;
    for (const o of this.sustained) o.stop(t + 0.3);
    this.sustained = [];
    this.profileKey = undefined;
  }

  /** Combo streak → busier, fuller music. */
  setIntensity(combo: number) {
    this.intensity = Math.min(1, combo / 8);
  }

  /** Artifact condition → tension layer. */
  setIntegrity(value: number) {
    this.integrity = value;
  }

  /** Quieter music while paused. */
  duck(on: boolean) {
    if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.15 : 0.5, this.ctx.currentTime, 0.1);
  }

  sfx(name: Sfx) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + 0.005;
    const p = this.profile;
    const scaleNote = (deg: number, octave = 1) => midiToFreq(degreeToMidi(p ?? DEFAULT_SFX_PROFILE, deg) + 12 * octave);
    switch (name) {
      case 'jump':
        return this.sweep('sine', 300, 640, t, 0.16, 0.25);
      case 'switch':
        return this.voice('mallet', 1320, t, 0.05, this.sfxBus, 0.18);
      case 'click':
        return this.voice('mallet', 880, t, 0.08, this.sfxBus, 0.25);
      case 'restore': {
        // A short rising figure in the culture's own scale and instrument, nudged onto the beat when close.
        const start = this.quantize(t);
        [0, 2, 4].forEach((d, i) => this.voice(p?.lead ?? 'mallet', scaleNote(d), start + i * 0.07, 0.25, this.sfxBus, 0.5));
        return;
      }
      case 'wrong':
        this.sweep('sawtooth', 116, 92, t, 0.35, 0.18, 700);
        return this.sweep('sawtooth', 110, 87, t, 0.35, 0.18, 700);
      case 'miss':
        return this.sweep('sine', 120, 55, t, 0.22, 0.3);
      case 'uv':
        for (const [i, f] of [1200, 1500, 1800].entries()) this.sweep('sine', f, f * 1.5, t + i * 0.04, 0.45, 0.08);
        return;
      case 'camera':
        this.noiseHit(t, 0.06, 0.35, 'highpass', 3000);
        return this.voice('mallet', 2400, t + 0.05, 0.03, this.sfxBus, 0.12);
      case 'win':
        [0, 1, 2, 3, 4, 5].forEach((d, i) => this.voice(p?.lead ?? 'mallet', scaleNote(d), t + i * 0.09, 0.4, this.sfxBus, 0.45));
        return;
      case 'fail':
        [2, 1, 0].forEach((d, i) => this.voice('bowed', scaleNote(d, 0), t + i * 0.22, 0.4, this.sfxBus, 0.35));
        return;
    }
  }

  // ---------- scheduler ----------

  private get stepDur() {
    return 60 / (this.profile?.tempo ?? 90) / 2;
  }

  private start() {
    const ctx = this.ctx!, p = this.profile!;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    if (p.drone > 0) {
      for (const [m, g] of [[p.root - 24, 1], [p.root - 17, 0.6]] as const) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midiToFreq(m);
        o.connect(gain(ctx, 0.12 * g, this.layers.drone));
        o.start();
        this.sustained.push(o);
      }
    }
    // Tension: a low minor-second throb, faded in by the mix when the artifact is in danger.
    const throb = ctx.createOscillator(), lfo = ctx.createOscillator(), depth = gain(ctx, 0.5);
    throb.frequency.value = midiToFreq(p.root - 23);
    lfo.frequency.value = 2.2;
    const amp = gain(ctx, 0.5, this.layers.tension);
    lfo.connect(depth).connect(amp.gain);
    throb.connect(amp);
    throb.start();
    lfo.start();
    this.sustained.push(throb, lfo);
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const p = this.profile!, ctx = this.ctx!;
    const m = mix(this.intensity, this.integrity);
    const set = (l: Layer, v: number) => this.layers[l].gain.setTargetAtTime(v, ctx.currentTime, 0.4);
    set('bass', m.bass);
    set('perc', m.perc);
    set('lead', m.lead);
    set('drone', p.drone);
    set('tension', m.tension * 0.35);

    const beat = step % 8;
    if (beat === 0) this.voice('bass', midiToFreq(p.root - 12), t, this.stepDur * 3, this.layers.bass, 0.8);
    if (beat === 4) this.voice('bass', midiToFreq(degreeToMidi(p, fifthDegree(p)) - 12), t, this.stepDur * 3, this.layers.bass, 0.6);

    if (p.perc !== 'none') {
      const pat = PATTERNS[p.perc];
      if (pat.low[beat]) this.drum(p.perc, 'low', t, pat.low[beat] === 2 ? 1 : 0.55);
      if (pat.high[beat]) this.drum(p.perc, 'high', t, pat.high[beat] === 2 ? 1 : 0.55);
      // Fills at the end of each phrase once the player is on a streak.
      if (this.intensity > 0.6 && step % STEPS_PER_PHRASE >= 14) this.drum(p.perc, 'high', t + this.stepDur / 2, 0.5);
    }

    const pos = step % STEPS_PER_PHRASE;
    const ph = this.phrases[FORM[Math.floor(step / STEPS_PER_PHRASE) % FORM.length]];
    let at = 0;
    for (const n of ph) {
      if (at === pos && n.degree !== null && Math.random() < m.density)
        this.voice(p.lead, midiToFreq(degreeToMidi(p, n.degree)), t, n.steps * this.stepDur * 0.95, this.layers.lead, 0.5);
      at += n.steps;
      if (at > pos) break;
    }
  }

  private quantize(t: number) {
    if (!this.timer) return t;
    const until = this.nextTime - t;
    return until < 0.09 ? this.nextTime : t;
  }

  // ---------- voices ----------

  private voice(kind: Timbre | 'bass', freq: number, t: number, dur: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.connect(out);
    const osc = (type: OscillatorType, f: number, level: number, detune = 0, dest: AudioNode = env) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(gain(ctx, level, dest));
      return o;
    };
    let oscs: OscillatorNode[];
    let end: number;
    switch (kind) {
      case 'pluck': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(Math.min(8000, freq * 8), t);
        lp.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), t + 0.4);
        lp.connect(env);
        oscs = [osc('triangle', freq, 0.5, 0, lp), osc('sawtooth', freq, 0.15, 7, lp)];
        end = t + Math.max(0.5, dur * 1.5);
        decay(env.gain, t, vel, end);
        break;
      }
      case 'mallet':
        oscs = [osc('sine', freq, 1), osc('sine', freq * 4, 0.22)];
        end = t + Math.max(0.35, dur);
        decay(env.gain, t, vel, end);
        break;
      case 'bass':
        oscs = [osc('sine', freq, 1), osc('triangle', freq, 0.35)];
        end = t + dur;
        decay(env.gain, t, vel * 0.9, end);
        break;
      case 'wind':
      case 'bowed': {
        if (kind === 'wind') oscs = [osc('sine', freq, 1), osc('triangle', freq * 2, 0.12)];
        else {
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 1800;
          lp.connect(env);
          oscs = [osc('sawtooth', freq, 0.5, 0, lp)];
        }
        // Vibrato that eases in, as a player would.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(freq * 0.007, t + 0.25);
        lfo.connect(depth);
        for (const o of oscs) depth.connect(o.frequency);
        oscs.push(lfo);
        end = t + dur + 0.15;
        const attack = kind === 'wind' ? 0.06 : 0.12;
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(vel * 0.7, t + attack);
        env.gain.setValueAtTime(vel * 0.7, t + Math.max(attack, dur));
        env.gain.linearRampToValueAtTime(0, end);
        if (kind === 'wind') this.noiseHit(t, dur, vel * 0.04, 'bandpass', freq * 2, env);
        break;
      }
    }
    for (const o of oscs) {
      o.start(t);
      o.stop(end + 0.05);
    }
  }

  private drum(kind: Exclude<Perc, 'none'>, part: 'low' | 'high', t: number, vel: number) {
    const out = this.layers.perc;
    if (part === 'low') {
      if (kind === 'gong') return [1, 2.4, 3.9].forEach((r, i) => this.ring(220 * r, t, 1.2 / (i + 1), vel * 0.25 / (i + 1), out));
      const [from, to, len, level] = kind === 'taiko' ? [95, 42, 0.8, 1] : kind === 'hand' ? [180, 70, 0.3, 0.8] : [130, 60, 0.22, 0.6];
      this.sweep('sine', from, to, t, len, level * vel, undefined, out);
      if (kind === 'frame') this.noiseHit(t, 0.08, 0.15 * vel, 'bandpass', 900, out);
      return;
    }
    if (kind === 'gong') return [1, 2.7].forEach((r) => this.ring(660 * r, t, 0.4, vel * 0.08, out));
    const [type, f, len] = kind === 'frame' ? (['highpass', 5000, 0.06] as const) : kind === 'taiko' ? (['bandpass', 3000, 0.03] as const) : (['bandpass', 2000, 0.07] as const);
    this.noiseHit(t, len, 0.35 * vel, type, f, out);
  }

  private ring(freq: number, t: number, len: number, level: number, out: AudioNode) {
    const ctx = this.ctx!, o = ctx.createOscillator(), g = gain(ctx, 0, out);
    o.frequency.value = freq;
    o.connect(g);
    decay(g.gain, t, level, t + len);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  private sweep(type: OscillatorType, from: number, to: number, t: number, len: number, level: number, lowpass?: number, out: AudioNode = this.sfxBus) {
    const ctx = this.ctx!, o = ctx.createOscillator(), g = gain(ctx, 0, out);
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + len);
    if (lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.frequency.value = lowpass;
      o.connect(lp).connect(g);
    } else o.connect(g);
    decay(g.gain, t, level, t + len);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  private noiseHit(t: number, len: number, level: number, type: BiquadFilterType, freq: number, out: AudioNode = this.sfxBus) {
    const ctx = this.ctx!, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = gain(ctx, 0, out);
    src.buffer = this.noise;
    f.type = type;
    f.frequency.value = freq;
    src.connect(f).connect(g);
    decay(g.gain, t, level, t + len);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.05);
  }
}

const DEFAULT_SFX_PROFILE: SoundProfile = { root: 62, scale: [0, 2, 4, 7, 9], tempo: 90, lead: 'mallet', perc: 'none', drone: 0 };

function gain(ctx: AudioContext, value: number, out?: AudioNode) {
  const g = ctx.createGain();
  g.gain.value = value;
  if (out) g.connect(out);
  return g;
}

function decay(param: AudioParam, t: number, level: number, end: number) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(level, t + 0.005);
  param.exponentialRampToValueAtTime(0.0001, end);
}

/** Scale degree closest to a perfect fifth, for the bass line. */
function fifthDegree(p: SoundProfile) {
  let best = 0;
  p.scale.forEach((s, i) => Math.abs(s - 7) < Math.abs(p.scale[best] - 7) && (best = i));
  return best;
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
