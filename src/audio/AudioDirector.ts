import { SUSTAINED, degreeToMidi, midiToFreq, nearestSample, rng, type Perc, type PitchedSample, type SoundProfile, type Timbre } from './music';
import { loadVolume, saveVolume, type Volume } from '../systems/settings';
import { arrangementMix, composeScore, scoreEvents, type Score } from './score';

// Soundtrack and effects. Music is composed at runtime from each culture's scales and rhythms and played on
// open (CC0) instrument samples (public/assets/audio, see CREDITS.md); synthesized voices are the fallback.
// Related phrases, voice-led accompaniment, and answering instruments follow the same beat clock as play.
// Combo shapes the support layers; the melody stays intact and low condition adds a restrained pulse.

export type Sfx = 'jump' | 'switch' | 'restore' | 'perfect' | 'wrong' | 'miss' | 'uv' | 'camera' | 'click' | 'win' | 'fail' | 'bonus';

const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const MUTE_KEY = 'relic-revival-run:muted';
/** Bus levels at 100% volume. */
const MUSIC_LEVEL = 0.5;
const SFX_LEVEL = 0.65;
const AUDIO_DIR = 'assets/audio/';

interface Manifest {
  melodic: Record<string, PitchedSample[]>;
  perc: Record<string, string>;
}

type Layer = 'bass' | 'perc' | 'lead' | 'response' | 'harmony' | 'drone' | 'tension';

export class AudioDirector {
  private static instance?: AudioDirector;
  static get(): AudioDirector {
    return (this.instance ??= new AudioDirector());
  }

  muted = readMuted();
  private ducked = false;
  private volumes: Record<Volume, number> = { music: loadVolume('music'), sfx: loadVolume('sfx') };
  private ctx?: AudioContext;
  private master!: GainNode;
  private music!: GainNode;
  private sfxBus!: GainNode;
  private layers = {} as Record<Layer, GainNode>;
  private noise!: AudioBuffer;

  private profile?: SoundProfile;
  private profileKey?: string;
  private score?: Score;
  private track?: GainNode;
  private trackNodes: AudioNode[] = [];
  private roomImpulse?: AudioBuffer;
  private barIntensity = 0;
  private step = 0;
  /** Audio-clock time of beat 0 of the current track. */
  private musicStart = 0;
  /** Multiplies the culture tempo (India's crescendo twist). */
  private tempoScale = 1;
  private nextTime = 0;
  private timer?: ReturnType<typeof setInterval>;
  private sustained: OscillatorNode[] = [];
  private intensity = 0;
  private manifest?: Promise<Manifest | null>;
  private manifestData: Manifest | null = null;
  /** Decoded samples by file; filled in the background, so early notes may use the synth. */
  private buffers = new Map<string, AudioBuffer>();
  private requested = new Set<string>();
  private integrity = 1;

  /** Create/resume the audio context. Browsers only allow this from a user gesture. */
  unlock() {
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) {
      this.initialize(new Ctor());
      // A profile requested before the first gesture starts now.
      if (this.profile) {
        this.loadSamples(this.profile);
        this.start();
      }
    }
    if (this.ctx!.state === 'suspended') void this.ctx!.resume();
  }

  private initialize(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = gain(ctx, this.muted ? 0 : 0.8, ctx.destination);
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.18;
    compressor.connect(this.master);
    this.music = gain(ctx, this.musicLevel(), compressor);
    this.sfxBus = gain(ctx, SFX_LEVEL * this.volumes.sfx, compressor);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0), random = rng(1717);
    for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
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

  volume(v: Volume): number {
    return this.volumes[v];
  }

  /** Set and remember the music or effects volume (0–1). */
  setVolume(v: Volume, value: number) {
    this.volumes[v] = saveVolume(v, value);
    if (!this.ctx) return;
    if (v === 'music') this.music.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, 0.05);
    else this.sfxBus.gain.setTargetAtTime(SFX_LEVEL * this.volumes.sfx, this.ctx.currentTime, 0.05);
  }

  /** Switch soundtrack; a no-op if this profile is already playing. */
  play(profile: SoundProfile, key: string) {
    if (key === this.profileKey) return;
    this.stop();
    this.profile = profile;
    this.profileKey = key;
    this.tempoScale = 1;
    this.intensity = key === 'menu' ? 0.3 : 0;
    this.integrity = 1;
    this.score = composeScore(profile, key);
    if (this.ctx) {
      this.loadSamples(profile);
      this.start();
    }
  }

  /** Exhibits demonstrate the whole arrangement, independently of the last run's condition. */
  preview(profile: SoundProfile, key: string) {
    this.play(profile, key);
    this.intensity = 0.7;
    this.integrity = 1;
    this.duck(false);
  }

  /** Fetch and decode the samples this profile uses (once each). */
  private loadSamples(p: SoundProfile) {
    const ctx = this.ctx;
    if (!ctx || !p.samples) return;
    const companion = this.score?.arrangement.companion;
    this.manifest ??= fetch(`${AUDIO_DIR}manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .catch(() => null);
    void this.manifest.then((m) => {
      if (!m) return;
      this.manifestData = m;
      const { lead, low, high } = p.samples!;
      const files = [...[lead, companion].flatMap(inst => inst ? (m.melodic[inst] ?? []).map(x => x.file) : []), ...[low, high].flatMap((k) => (k && m.perc[k] ? [m.perc[k]] : []))];
      for (const file of files) {
        if (this.requested.has(file)) continue;
        this.requested.add(file);
        fetch(AUDIO_DIR + file)
          .then((r) => r.arrayBuffer())
          .then((b) => ctx.decodeAudioData(b))
          .then((buf) => this.buffers.set(file, buf))
          .catch(() => this.requested.delete(file));
      }
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    const t = this.ctx?.currentTime ?? 0;
    for (const o of this.sustained) o.stop(t + 0.3);
    this.sustained = [];
    if (this.track) {
      const track = this.track;
      const nodes = this.trackNodes;
      track.gain.cancelScheduledValues(t);
      track.gain.setTargetAtTime(0, t, 0.06);
      setTimeout(() => nodes.forEach(node => node.disconnect()), 900);
    }
    this.track = undefined;
    this.trackNodes = [];
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
    this.ducked = on;
    if (this.ctx) this.music.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, 0.1);
  }

  private musicLevel() {
    return (this.ducked ? 0.15 : MUSIC_LEVEL) * this.volumes.music;
  }

  /**
   * Quarter-note beats elapsed on the audio clock, so gameplay lines up with what is heard. Null without
   * music, and while the context is suspended or interrupted: its clock stands still then, and play must not.
   */
  beatPosition(): { beat: number; dur: number } | null {
    if (!this.ctx || !this.timer || !this.profile || this.ctx.state !== 'running') return null;
    const dur = this.stepDur * 2;
    return { beat: (this.ctx.currentTime - this.musicStart) / dur, dur };
  }

  /** Speed the music up or down without a jump in the beat position. */
  setTempoScale(scale: number) {
    const pos = this.beatPosition();
    this.tempoScale = scale;
    if (pos && this.ctx) this.musicStart = this.ctx.currentTime - pos.beat * this.stepDur * 2;
  }

  /** `level`: for restore, the combo (the figure climbs the scale as it grows). */
  sfx(name: Sfx, level = 0) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime + 0.005;
    const p = this.profile;
    const scaleMidi = (deg: number, octave = 1) => degreeToMidi(p ?? DEFAULT_SFX_PROFILE, deg) + 12 * octave;
    const scaleNote = (deg: number, octave = 1) => midiToFreq(scaleMidi(deg, octave));
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
        const lift = Math.min(level, 8);
        [0, 2, 4].forEach((d, i) => this.leadNote(scaleMidi(d + lift), start + i * 0.07, 0.25, this.sfxBus, 0.6));
        return;
      }
      case 'perfect': {
        const start = this.quantize(t);
        this.leadNote(scaleMidi(7, 1), start, 0.3, this.sfxBus, 0.5);
        this.ring(midiToFreq(scaleMidi(4, 2)), start, 0.6, 0.12, this.sfxBus);
        return;
      }
      case 'bonus': {
        [0, 4, 7].forEach((d, i) => this.leadNote(scaleMidi(d, 1), t + i * 0.05, 0.3, this.sfxBus, 0.5));
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
        [0, 1, 2, 3, 4, 5].forEach((d, i) => this.leadNote(scaleMidi(d), t + i * 0.09, 0.4, this.sfxBus, 0.55));
        return;
      case 'fail':
        [2, 1, 0].forEach((d, i) => this.voice('bowed', scaleNote(d, 0), t + i * 0.22, 0.4, this.sfxBus, 0.35));
        return;
    }
  }

  // ---------- scheduler ----------

  private get stepDur() {
    return 60 / ((this.profile?.tempo ?? 90) * this.tempoScale) / 2;
  }

  private start() {
    const ctx = this.ctx!, p = this.profile!;
    this.createTrack();
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.musicStart = this.nextTime;
    this.barIntensity = this.intensity;
    if (p.drone > 0) {
      for (const [m, g] of [[p.root - 24, 1], [p.root - 17, 0.6]] as const) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midiToFreq(m);
        const amp = gain(ctx, 0.09 * g, this.layers.drone);
        o.connect(amp);
        this.trackNodes.push(o, amp);
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
    this.trackNodes.push(throb, lfo, depth, amp);
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  private createTrack() {
    const ctx = this.ctx!;
    const track = this.track = gain(ctx, 0, this.music);
    track.gain.setTargetAtTime(1, ctx.currentTime, 0.12);
    this.trackNodes = [track];
    if (!this.roomImpulse) {
      const frames = Math.floor(ctx.sampleRate * 1.35);
      this.roomImpulse = ctx.createBuffer(2, frames, ctx.sampleRate);
      const random = rng(90210);
      for (let channel = 0; channel < 2; channel++) {
        const data = this.roomImpulse.getChannelData(channel);
        for (let i = 0; i < frames; i++) {
          const seconds = i / ctx.sampleRate;
          data[i] = seconds < 0.022 ? 0 : (random() * 2 - 1) * Math.exp(-seconds * 5.5);
        }
      }
    }
    const room = ctx.createConvolver();
    room.buffer = this.roomImpulse;
    const highpass = ctx.createBiquadFilter(), lowpass = ctx.createBiquadFilter();
    highpass.type = 'highpass'; highpass.frequency.value = 280;
    lowpass.type = 'lowpass'; lowpass.frequency.value = 4200;
    const wet = gain(ctx, this.score!.arrangement.room, track);
    highpass.connect(lowpass).connect(room).connect(wet);
    this.trackNodes.push(room, highpass, lowpass, wet);
    const pan: Record<Layer, number> = { lead: -0.1, response: 0.28, harmony: -0.32, bass: 0, perc: 0.12, drone: 0.15, tension: 0 };
    for (const layer of Object.keys(pan) as Layer[]) {
      const bus = this.layers[layer] = gain(ctx, 0);
      const stereo = ctx.createStereoPanner();
      stereo.pan.value = pan[layer];
      bus.connect(stereo).connect(track);
      this.trackNodes.push(bus, stereo);
      if (['lead', 'response', 'harmony', 'drone'].includes(layer)) stereo.connect(highpass);
    }
  }

  private schedule() {
    const ctx = this.ctx!;
    // Resume on the existing grid after a long stall; don't burst stale notes into the output.
    if (this.nextTime < ctx.currentTime - 0.25) {
      const skipped = Math.ceil((ctx.currentTime - this.nextTime) / this.stepDur);
      this.step += skipped;
      this.nextTime += skipped * this.stepDur;
    }
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const p = this.profile!, ctx = this.ctx!;
    if (step % 8 === 0) this.barIntensity = this.intensity;
    const m = arrangementMix(this.barIntensity, this.integrity, step);
    for (const [layer, value] of Object.entries(m))
      this.layers[layer as Layer].gain.setTargetAtTime(value, Math.max(t, ctx.currentTime), 0.22);
    this.layers.drone.gain.setTargetAtTime(p.drone * 0.65, Math.max(t, ctx.currentTime), 0.4);
    for (const event of scoreEvents(this.score!, p, step, this.barIntensity)) {
      const time = t + event.offset * this.stepDur, duration = event.duration * this.stepDur;
      const out = this.layers[event.layer];
      if (event.layer === 'perc') {
        if (p.perc !== 'none') this.drum(p.perc, event.part!, time, event.velocity);
      } else if (event.layer === 'lead') this.leadNote(event.midi!, time, duration, out, event.velocity);
      else if (event.layer === 'response') this.leadNote(event.midi!, time, duration, out, event.velocity, this.score!.arrangement.companion);
      else this.voice(event.layer === 'bass' ? 'bass' : event.duration > 3 ? 'wind' : 'pluck', midiToFreq(event.midi!), time, duration, out, event.velocity);
    }
  }

  private quantize(t: number) {
    if (!this.timer) return t;
    const until = this.nextTime - t;
    return until < 0.09 ? this.nextTime : t;
  }

  // ---------- voices ----------

  /** A melody note on the culture's sampled instrument, or its synth stand-in until samples load. */
  private leadNote(midi: number, t: number, dur: number, out: AudioNode, vel: number, instrument?: string) {
    const inst = instrument ?? this.profile?.samples?.lead;
    const loaded = inst ? (this.manifestData?.melodic[inst] ?? []).filter((x) => this.buffers.has(x.file)) : [];
    const hit = nearestSample(loaded, midi);
    if (hit && inst) return this.sample(this.buffers.get(hit.sample.file)!, t, hit.rate, vel, out, SUSTAINED.has(inst) ? dur : undefined);
    this.voice(instrument ? 'mallet' : this.profile?.lead ?? 'mallet', midiToFreq(midi), t, dur, out, vel);
  }

  /** Play a one-shot; held instruments are cut with a short release at `holdFor`. */
  private sample(buf: AudioBuffer, t: number, rate: number, vel: number, out: AudioNode, holdFor?: number) {
    const ctx = this.ctx!, src = ctx.createBufferSource(), g = gain(ctx, vel, out);
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.connect(g);
    src.onended = () => { src.disconnect(); g.disconnect(); };
    src.start(t);
    if (holdFor === undefined) return;
    const end = t + Math.max(0.12, holdFor);
    g.gain.setValueAtTime(vel, end);
    g.gain.linearRampToValueAtTime(0, end + 0.12);
    src.stop(end + 0.15);
  }

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
    const key = part === 'low' ? this.profile?.samples?.low : this.profile?.samples?.high;
    const buf = key ? this.buffers.get(this.manifestData?.perc[key] ?? '') : undefined;
    if (buf) return this.sample(buf, t, 1, vel * 0.85, out);
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

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
