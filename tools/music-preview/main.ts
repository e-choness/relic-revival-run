import { AudioDirector } from '../../src/audio/AudioDirector';
import { STYLES } from '../../src/audio/styles';
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
  const style = STYLES[c.id];
  const meter = style.meter.sub === 3 ? `${style.meter.beats * 3}/8` : `${style.meter.beats}/4`;
  const voices = [style.lead.instrument, style.comp?.instrument, ...style.counters.map((v) => `${v.instrument} (${v.mode})`)].filter(Boolean).join(', ');
  document.querySelector('#voices')!.textContent = `${meter} at ${c.sound.tempo} beats/min · ${voices} · drums: ${style.perc.map((v) => v.sample).join(', ') || 'none'}`;
};
const play = () => {
  audio.unlock();
  const c = selected();
  audio.preview(c.sound, c.id);
  updateMix();
  playing = true;
  status.textContent = `Playing ${c.name} · the full form A A B A; raise the combo to bring in more players`;
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
