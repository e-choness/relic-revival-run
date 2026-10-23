import { AudioDirector } from '../../src/audio/AudioDirector';
import { ARRANGEMENTS } from '../../src/audio/score';
import { CULTURES } from '../../src/data/cultures';

const select = document.querySelector<HTMLSelectElement>('#culture')!;
const combo = document.querySelector<HTMLInputElement>('#combo')!;
const condition = document.querySelector<HTMLInputElement>('#condition')!;
const status = document.querySelector<HTMLElement>('#status')!;
const audio = AudioDirector.get();
let playing = false;
CULTURES.forEach(c => select.add(new Option(`${c.name} · ${c.artifact}`, c.id)));
const selected = () => CULTURES.find(c => c.id === select.value)!;
const updateMix = () => {
  audio.setIntensity(Number(combo.value));
  audio.setIntegrity(Number(condition.value) / 100);
  document.querySelector('#combo-value')!.textContent = combo.value;
  document.querySelector('#condition-value')!.textContent = `${condition.value}%`;
};
const show = () => {
  const c = selected();
  const image = document.querySelector<HTMLImageElement>('#artifact')!;
  image.src = `/assets/artifacts/${c.id}-v1.webp`;
  image.alt = c.artifact;
  document.querySelector('#voices')!.textContent = `Lead sample: ${c.sound.samples?.lead} · Answer: ${ARRANGEMENTS[c.id].companion} · ${ARRANGEMENTS[c.id].harmony} accompaniment · ${c.sound.tempo} BPM`;
};
const play = () => {
  audio.unlock();
  const c = selected();
  audio.preview(c.sound, c.id);
  updateMix();
  playing = true;
  status.textContent = `Playing ${c.name} · an eight-bar theme with evolving support`;
};
document.querySelector('#play')!.addEventListener('click', play);
document.querySelector('#stop')!.addEventListener('click', () => { audio.stop(); playing = false; status.textContent = 'Stopped'; });
const mute = document.querySelector<HTMLButtonElement>('#mute')!;
mute.textContent = audio.muted ? 'Unmute' : 'Mute';
mute.addEventListener('click', () => { mute.textContent = audio.toggleMute() ? 'Unmute' : 'Mute'; });
select.addEventListener('change', () => { show(); if (playing) play(); });
combo.addEventListener('input', updateMix);
condition.addEventListener('input', updateMix);
show();
