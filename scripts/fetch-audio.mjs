// Fetches open (CC0) instrument samples from the Versilian Community Sample Library and converts them
// into small one-shots for the game: public/assets/audio/{manifest.json, CREDITS.md, *.mp3}.
// Run inside the app container (needs ffmpeg): docker compose run --rm app node scripts/fetch-audio.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'sgossner/VCSL';
const BRANCH = 'master';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;
const OUT = 'public/assets/audio';
const TMP = '/tmp/vcsl';

/** Pitched instruments: several notes are sampled and the game repitches the nearest one. */
const MELODIC = {
  marimba: { dir: 'Idiophones/Struck Idiophones/Marimba/', prefer: /_med_/, len: 1.6 },
  strumstick: { dir: 'Chordophones/Composite Chordophones/Strumstick/', prefer: /_vl2_rr1/, len: 1.8 },
  danTranh: { dir: 'Chordophones/Zithers/Dan Tranh/Normal/', prefer: /_mf_1\./, len: 1.8 },
  altoRecorder: { dir: 'Aerophones/Edge-blown Aerophones/Baroque Alto Recorder/', prefer: /_rr1_Main/, len: 1.2 },
  sopranoRecorder: { dir: 'Aerophones/Edge-blown Aerophones/Baroque Soprano Recorder/', prefer: /_rr1_Main/, len: 1.2 },
  tenorRecorder: { dir: 'Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder/', prefer: /_rr1_Main/, len: 1.2 },
  bowedPsaltery: { dir: 'Chordophones/Zithers/Psaltery, Bowed and Plucked/', prefer: /LongBow_rr1/, len: 2.2 },
  kalimba: { dir: 'Idiophones/Plucked Idiophones/Kalimba, Tanzania/', prefer: /_rr2/, len: 1.6 },
  xylophone: { dir: 'Idiophones/Struck Idiophones/Xylophone/', prefer: /Xylo_Medium_.*_pp_/, len: 1.2 },
  folkHarp: { dir: 'Chordophones/Composite Chordophones/Folk Harp/', prefer: /_v2_RR1/, len: 1.8 },
  vibraphone: { dir: 'Idiophones/Struck Idiophones/Vibraphone/', prefer: /Vibes_soft_/, len: 2.0 },
};

/** Single hits. */
const PERC = {
  slitLow: { dir: 'Idiophones/Struck Idiophones/Slit Drum/', prefer: /LogDrumLo_MedM_v2_rr1/ },
  slitHigh: { dir: 'Idiophones/Struck Idiophones/Slit Drum/', prefer: /LogDrumHi_MedM_v2_rr1/ },
  shaker: { dir: 'Idiophones/Struck Idiophones/Shaker, Small/', prefer: /Mid_ShakerDouble_Down_rr1/ },
  gong: { dir: 'Idiophones/Struck Idiophones/Gong 1/', prefer: /gong_mf/, len: 3.0 },
  woodblock: { dir: 'Idiophones/Struck Idiophones/Woodblock/', prefer: /wood_click_f_rr1/ },
  darbukaLow: { dir: 'Membranophones/Struck Membranophones/Darbuka/', prefer: /Darbuka_1_hit_vl2_rr1/ },
  darbukaHigh: { dir: 'Membranophones/Struck Membranophones/Darbuka/', prefer: /Darbuka_2_hit_vl2_rr1/ },
  frameDrum: { dir: 'Membranophones/Struck Membranophones/Frame Drum/', prefer: /HDrumL_Hit_v2_rr1/ },
  tambourine: { dir: 'Idiophones/Struck Idiophones/Tambourine 1/', prefer: /Tamb1_Hit_v2_rr1/ },
  cajonLow: { dir: 'Idiophones/Struck Idiophones/Cajon/', prefer: /Cajon_hit1_f_rr1/ },
  cajonHigh: { dir: 'Idiophones/Struck Idiophones/Cajon/', prefer: /Cajon_hit2_f_rr1/ },
  bassDrum: { dir: 'Membranophones/Struck Membranophones/Bass Drum 1/', prefer: /BDrumNew_hit_v3_rr1/, len: 1.5 },
  congaLow: { dir: 'Membranophones/Struck Membranophones/Conga/', prefer: /Tumba_HitN_v2_rr1/ },
  congaHigh: { dir: 'Membranophones/Struck Membranophones/Conga/', prefer: /Quinto_HitN_v2_rr1/ },
  bongo: { dir: 'Membranophones/Struck Membranophones/Bongos/', prefer: /BongoH_Hit1_v2_rr1/ },
  agogoLow: { dir: 'Idiophones/Struck Idiophones/Agogo Bells/', prefer: /Agogo_Low_v2_rr1/ },
  agogoHigh: { dir: 'Idiophones/Struck Idiophones/Agogo Bells/', prefer: /Agogo_High_v2_rr1/ },
  fingerCymbals: { dir: 'Idiophones/Struck Idiophones/Finger Cymbals/', prefer: /Fing_Cymb/, len: 2.0 },
};

const NOTE = /(?:^|[_/])([A-Ga-g]#?)(-?\d)(?=[_.])/;
const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const midiOf = (file) => {
  const m = file.split('/').pop().match(NOTE);
  return m ? 12 * (Number(m[2]) + 1) + PC[m[1].toUpperCase()] : null;
};

/** Notes spread across the game's melodic range, at least 4 semitones apart. */
function spread(midis, lo = 50, hi = 90, gap = 4, max = 8) {
  const out = [];
  for (const m of [...new Set(midis)].filter((n) => n >= lo && n <= hi).sort((a, b) => a - b))
    if (out.length < max && (out.length === 0 || m - out[out.length - 1] >= gap)) out.push(m);
  return out;
}

function pick(files, prefer) {
  return files.find((f) => prefer.test(f)) ?? files[0];
}

async function download(path, to) {
  const res = await fetch(RAW + path.split('/').map(encodeURIComponent).join('/'));
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  writeFileSync(to, Buffer.from(await res.arrayBuffer()));
}

/** Mono MP3: leading silence removed, length capped with a fade-out, loudness evened out. */
function convert(src, dest, len) {
  const fade = Math.min(0.3, len / 4);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-af',
    `silenceremove=start_periods=1:start_threshold=-50dB,atrim=0:${len},afade=t=out:st=${(len - fade).toFixed(2)}:d=${fade},loudnorm=I=-20:TP=-2`,
    '-ac', '1', '-ar', '44100', '-b:a', '96k', dest]);
}

const treeRes = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
if (!treeRes.ok) throw new Error(`tree: ${treeRes.status}`);
const wavs = (await treeRes.json()).tree.filter((e) => e.type === 'blob' && e.path.endsWith('.wav')).map((e) => e.path).sort();

rmSync(OUT, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const manifest = { source: `https://github.com/${REPO}`, license: 'CC0-1.0', melodic: {}, perc: {} };
const credits = [];

for (const [id, spec] of Object.entries(MELODIC)) {
  const files = wavs.filter((p) => p.startsWith(spec.dir));
  const byNote = new Map();
  for (const f of files) {
    const m = midiOf(f);
    if (m !== null) (byNote.get(m) ?? byNote.set(m, []).get(m)).push(f);
  }
  mkdirSync(join(OUT, id), { recursive: true });
  manifest.melodic[id] = [];
  for (const midi of spread([...byNote.keys()])) {
    const src = pick(byNote.get(midi), spec.prefer);
    const file = `${id}/${midi}.mp3`;
    await download(src, join(TMP, 'in.wav'));
    convert(join(TMP, 'in.wav'), join(OUT, file), spec.len);
    manifest.melodic[id].push({ midi, file });
    credits.push(`| ${file} | ${src} |`);
  }
  console.log(`${id}: ${manifest.melodic[id].map((s) => s.midi).join(' ')}`);
}

for (const [id, spec] of Object.entries(PERC)) {
  const src = pick(wavs.filter((p) => p.startsWith(spec.dir)), spec.prefer);
  if (!src) throw new Error(`no files for ${id}`);
  const file = `${id}.mp3`;
  await download(src, join(TMP, 'in.wav'));
  convert(join(TMP, 'in.wav'), join(OUT, file), spec.len ?? 1.0);
  manifest.perc[id] = file;
  credits.push(`| ${file} | ${src} |`);
  console.log(`${id}: ${src.split('/').pop()}`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(OUT, 'CREDITS.md'), `# Audio credits

All instrument samples are from the **Versilian Community Sample Library (VCSL)** by Versilian Studios LLC,
https://github.com/${REPO}, released under **CC0 1.0** (public domain dedication).
They were trimmed, faded, loudness-normalised and converted to mono MP3 by \`scripts/fetch-audio.mjs\`.
The music itself is composed at runtime by the game from each culture's scales and rhythms (\`src/audio/\`).

| File | VCSL source |
|---|---|
${credits.join('\n')}
`);
console.log(`wrote ${credits.length} clips`);
