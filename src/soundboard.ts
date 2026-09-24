// Sound test page (sounds.html): one button per sound, calling the same functions the game uses
import './index.css';
import {
  initAudioContext,
  playSelect,
  playSplash,
  playSprint,
  playChomp,
  playCrocStun,
  playCrossSuccess,
  startRiverAmbiance,
  stopRiverAmbiance,
  startMusic,
  stopMusic,
  startMenuMusic,
  stopMenuMusic,
} from './utils/audio';

type OneShot = { name: string; fn: () => void; when: string };
type Loop = { name: string; start: () => void; stop: () => void; when: string };

const effects: OneShot[] = [
  { name: 'Select', fn: playSelect, when: 'Button clicks and menu choices' },
  { name: 'Splash (jump.mp3)', fn: () => playSplash(), when: 'Diving off the bank into the river' },
  { name: 'Splash (generated)', fn: () => playSplash(1, false), when: 'Fallback if jump.mp3 fails to load' },
  { name: 'Sprint', fn: playSprint, when: 'Herd animals hopping while still on land' },
  { name: 'Chomp', fn: playChomp, when: 'Croc bites, and other animals dying' },
  { name: 'Croc stun', fn: playCrocStun, when: 'Hopping clear over croc jaws' },
  { name: 'Cross success', fn: playCrossSuccess, when: 'A wildebeest climbs out at an exit ramp' },
];

const loops: Loop[] = [
  { name: 'Game music', start: startMusic, stop: stopMusic, when: 'During a crossing' },
  { name: 'Menu music', start: startMenuMusic, stop: stopMenuMusic, when: 'Every other screen; fades out over the last 10s before it loops' },
  {
    name: 'River ambience',
    // The river only starts once the audio context is running, which needs this click first
    start: () => { initAudioContext()?.resume().then(startRiverAmbiance); },
    stop: stopRiverAmbiance,
    when: 'During a crossing',
  },
];

const button =
  'font-display font-semibold rounded-full px-4 py-2 text-sm bg-[#c2a078] text-[#1e1a15] hover:brightness-110 active:scale-95 transition shrink-0';

function row(name: string, when: string, control: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'flex items-center justify-between gap-4 bg-panel-raised border border-line rounded-xl px-4 py-3';
  el.innerHTML = `<div class="min-w-0"><div class="font-display font-semibold sb-title">${name}</div><div class="text-sm sb-muted">${when}</div></div>`;
  el.append(control);
  return el;
}

function section(title: string, rows: HTMLElement[]) {
  const el = document.createElement('section');
  el.className = 'space-y-2';
  el.innerHTML = `<h2 class="font-display font-semibold text-lg text-[#c2a078] mt-6 mb-2">${title}</h2>`;
  el.append(...rows);
  return el;
}

function playButton(fn: () => void) {
  const b = document.createElement('button');
  b.className = button;
  b.textContent = 'Play';
  b.onclick = fn;
  return b;
}

function toggleButton(loop: Loop) {
  const b = document.createElement('button');
  b.className = button;
  let on = false;
  const label = () => { b.textContent = on ? 'Stop' : 'Play'; };
  b.onclick = () => {
    on = !on;
    if (on) loop.start(); else loop.stop();
    label();
  };
  label();
  return b;
}

const main = document.createElement('main');
main.className = 'screen-glow min-h-full px-4 py-8';
const panel = document.createElement('div');
panel.className = 'max-w-xl mx-auto bg-panel border border-line rounded-2xl p-6';
panel.innerHTML = `
  <h1 class="font-display font-semibold text-2xl sb-title">Sound test</h1>
  <p class="text-sm sb-muted mt-1">Every sound in the game, played by the same code the game uses.</p>`;
panel.append(
  section('Sound effects', effects.map(e => row(e.name, e.when, playButton(e.fn)))),
  section('Music and ambience', loops.map(l => row(l.name, l.when, toggleButton(l)))),
);
main.append(panel);
document.getElementById('root')!.append(main);
