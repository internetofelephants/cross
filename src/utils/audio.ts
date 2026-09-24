import musicUrl from '../assets/audio/mara-river-crossing.mp3';
import transitionMusicUrl from '../assets/audio/transition-music.m4a';
// Web Audio API Synthesizer for retro retro-safari sound effects
let audioCtx: AudioContext | null = null;
let isMuted = false;

// Dynamic support for custom uploaded splash file
let customSplashBuffer: AudioBuffer | null = null;
let hasAttemptedLoad = false;

function initCustomSplash(ctx: AudioContext) {
  if (typeof window === 'undefined') return;
  if (hasAttemptedLoad) return;
  hasAttemptedLoad = true;

  const tryLoadBuffer = async (src: string): Promise<AudioBuffer> => {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    // Check if we received an HTML response (common for 404 routing fallbacks in single page apps)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Not an audio file (HTML page received)');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error('EMPTY_FILE');
    }
    
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const safeResolve = (val: AudioBuffer) => {
        if (isSettled) return;
        isSettled = true;
        resolve(val);
      };
      const safeReject = (err: any) => {
        if (isSettled) return;
        isSettled = true;
        reject(err || new Error('Decode error'));
      };

      try {
        const promise = ctx.decodeAudioData(
          arrayBuffer,
          (decoded) => safeResolve(decoded),
          (err) => safeReject(err)
        );
        if (promise && typeof promise.catch === 'function') {
          promise.then(safeResolve).catch((err) => safeReject(err));
        }
      } catch (err) {
        safeReject(err);
      }
    });
  };

  const sources = ['/jump.mp3', '/jump.wav', '/splash.mp3', '/splash.wav'];
  
  // Try loading sequentially in private scope
  (async () => {
    for (const src of sources) {
      try {
        const buffer = await tryLoadBuffer(src);
        customSplashBuffer = buffer;
        console.log(`Successfully loaded and decoded custom audio: ${src}`);
        break;
      } catch (e) {
        // Try next source silently
      }
    }
  })();
}

function getRawAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Low-volume fast-moving river movement procedural nodes
let riverSource: AudioBufferSourceNode | null = null;
let riverGain: GainNode | null = null;
let riverOsc: OscillatorNode | null = null;

export const stopRiverAmbiance = () => {
  if (riverSource) {
    try {
      riverSource.stop();
      riverSource.disconnect();
    } catch (e) {}
    riverSource = null;
  }
  if (riverOsc) {
    try {
      riverOsc.stop();
      riverOsc.disconnect();
    } catch (e) {}
    riverOsc = null;
  }
  if (riverGain) {
    try {
      riverGain.disconnect();
    } catch (e) {}
    riverGain = null;
  }
};

export const startRiverAmbiance = () => {
  if (isMuted) return;
  const ctx = getRawAudioContext();
  if (!ctx || ctx.state === 'suspended') return;

  if (riverSource) return; // already active

  try {
    const bufferSize = ctx.sampleRate * 2.5; // 2.5 seconds loop duration for memory efficiency
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill with pink-filtered noise cascade for rushing stream organic feel
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut * 0.58 + white * 0.42);
      lastOut = data[i];
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(320, ctx.currentTime);

    const bpFilter = ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.setValueAtTime(260, ctx.currentTime);
    bpFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.6); // smooth fade-in

    // Slow organic LFO wave surge simulation
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // steady 0.12 Hz wave swell cycle

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(35, ctx.currentTime); // frequency modulation range

    lfo.connect(lfoGain);
    lfoGain.connect(bpFilter.frequency);

    source.connect(lpFilter);
    lpFilter.connect(bpFilter);
    bpFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    lfo.start();
    source.start();

    riverSource = source;
    riverOsc = lfo;
    riverGain = gainNode;
  } catch (error) {
    console.warn('Could not start river ambient audio:', error);
  }
};

// Looping music tracks that fade in and out. A track only sounds while it is wanted and sound
// isn't muted; browsers block playback until the player's first click or key press, so a wanted
// track retries then. `tailFade` fades each pass out over its last that-many seconds, so the jump
// back to the start of the loop isn't abrupt.
class LoopTrack {
  private el: HTMLAudioElement | null = null;
  private wanted = false;
  private fade: ReturnType<typeof setInterval> | null = null;
  private level = 0; // fade in/out level; the element's volume is this times the tail fade

  constructor(private url: string, private volume: number, private tailFade = 0) {}

  start() {
    this.wanted = true;
    this.resume();
  }

  // Fade out and stop; `rewind` starts it from the top next time
  stop(rewind: boolean) {
    this.wanted = false;
    if (!this.el || this.el.paused) {
      if (this.el && rewind) this.el.currentTime = 0;
      return;
    }
    const el = this.el;
    this.fadeTo(0, () => {
      el.pause();
      if (rewind) el.currentTime = 0;
    });
  }

  // Called after unmuting or on the first interaction
  resume() {
    if (!this.wanted || isMuted) return;
    if (!this.el) {
      this.el = new Audio(this.url);
      this.el.loop = true;
      this.el.volume = 0;
      if (this.tailFade > 0) this.el.addEventListener('timeupdate', () => this.applyVolume());
    }
    if (!this.el.paused && !this.fade) return;
    this.clearFade(); // a fade-out still running would pause it again right after it restarts
    this.el.play().then(() => { if (this.wanted) this.fadeTo(this.volume); }).catch(() => {});
  }

  mute() {
    this.clearFade();
    this.el?.pause();
  }

  private applyVolume() {
    const el = this.el!;
    let tail = 1;
    if (this.tailFade > 0 && el.duration) {
      tail = Math.min(1, Math.max(0, (el.duration - el.currentTime) / this.tailFade));
    }
    el.volume = this.level * tail;
  }

  private fadeTo(target: number, done?: () => void) {
    this.clearFade();
    const step = (target - this.level) / 20; // about 0.6s
    this.fade = setInterval(() => {
      const next = this.level + step;
      if ((step >= 0 && next >= target) || (step < 0 && next <= target)) {
        this.level = target;
        this.applyVolume();
        this.clearFade();
        done?.();
      } else {
        this.level = next;
        this.applyVolume();
      }
    }, 30);
  }

  private clearFade() {
    if (this.fade) clearInterval(this.fade);
    this.fade = null;
  }
}

// In-game music, only while a crossing is being played (see GameCanvas)
const gameMusic = new LoopTrack(musicUrl, 0.35);
// Calmer music for the title, start, between-crossings and game-over screens (see App)
// fading out over the last 10 seconds of each pass
const menuMusic = new LoopTrack(transitionMusicUrl, 0.35, 10);

const unlock = () => {
  gameMusic.resume();
  menuMusic.resume();
};
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

// When the dev server swaps in an edited copy of this file, the old copy's sounds would keep playing
// with nothing left that can stop or mute them, so each copy silences the one before it.
if (import.meta.hot) {
  const g = globalThis as { __crossAudioCleanup?: () => void };
  g.__crossAudioCleanup?.();
  g.__crossAudioCleanup = () => {
    gameMusic.mute();
    menuMusic.mute();
    stopRiverAmbiance();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}

export const startMusic = () => gameMusic.start();
// Pause keeps the position, e.g. while the guide is open
export const pauseMusic = () => gameMusic.stop(false);
export const stopMusic = () => gameMusic.stop(true);

export const startMenuMusic = () => menuMusic.start();
export const stopMenuMusic = () => menuMusic.stop(true);

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const ctx = getRawAudioContext();
  if (ctx) {
    // Proactively initialize custom asset fetches immediately (not blocked by suspension)
    initCustomSplash(ctx);
    
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }
  return ctx;
}

export const initAudioContext = (): AudioContext | null => {
  return getAudioContext();
};

export const toggleMute = (): boolean => {
  isMuted = !isMuted;
  if (isMuted) {
    stopRiverAmbiance();
    gameMusic.mute();
    menuMusic.mute();
  } else {
    gameMusic.resume();
    menuMusic.resume();
    const ctx = getRawAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => startRiverAmbiance());
    } else {
      startRiverAmbiance();
    }
  }
  return isMuted;
};

export const getMuteStatus = (): boolean => {
  return isMuted;
};

export const playSelect = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Soft rounded "pip": a gentle upward blip with a quiet octave on top, a few ms of attack so it
  // doesn't click, and a quick fade
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  gain.connect(ctx.destination);

  [{ freq: 523, level: 1 }, { freq: 1046, level: 0.25 }].forEach(({ freq, level }) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.85, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.03);
    oscGain.gain.value = level;
    osc.connect(oscGain);
    oscGain.connect(gain);
    osc.start(now);
    osc.stop(now + 0.15);
  });
};

// `useRecording` false skips jump.mp3 and plays the generated splash (used by the sound test page)
export const playSplash = (volumeMultiplier = 1.0, useRecording = true) => {
  if (isMuted) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;

  // Try custom loaded sound first (via efficient decoded Web Audio buffer)
  if (customSplashBuffer && useRecording) {
    try {
      const source = ctx.createBufferSource();
      source.buffer = customSplashBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(Math.min(1.0, Math.max(0.0, 0.40 * volumeMultiplier)), ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      return; // Handled successfully!
    } catch (e) {
      // Fallback to procedural sound below
    }
  }

  const now = ctx.currentTime;

  // 1. White Noise spray layer
  const bufferSize = ctx.sampleRate * 0.4; // 0.4 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;
  
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1200, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(350, now + 0.35);
  noiseFilter.Q.setValueAtTime(2.0, now);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.12 * volumeMultiplier, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  
  noiseNode.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noiseNode.start(now);
  noiseNode.stop(now + 0.4);

  // 2. Heavy water displacement "glug" layer (low triangle sweep)
  const oscLow = ctx.createOscillator();
  const gainLow = ctx.createGain();
  
  oscLow.type = 'triangle';
  oscLow.frequency.setValueAtTime(140, now);
  oscLow.frequency.exponentialRampToValueAtTime(50, now + 0.25);
  
  gainLow.gain.setValueAtTime(0.18 * volumeMultiplier, now);
  gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  
  oscLow.connect(gainLow);
  gainLow.connect(ctx.destination);
  
  oscLow.start(now);
  oscLow.stop(now + 0.25);

  // 3. High-pitched droplet bubble glissandos ("gloop" triggers)
  const droplets = [
    { delay: 0.02, startFreq: 320, endFreq: 680, duration: 0.10, vol: 0.08 },
    { delay: 0.07, startFreq: 450, endFreq: 850, duration: 0.09, vol: 0.06 },
    { delay: 0.14, startFreq: 380, endFreq: 750, duration: 0.11, vol: 0.05 },
  ];

  droplets.forEach(d => {
    const oscD = ctx.createOscillator();
    const gainD = ctx.createGain();
    
    oscD.type = 'sine';
    oscD.frequency.setValueAtTime(d.startFreq, now + d.delay);
    oscD.frequency.exponentialRampToValueAtTime(d.endFreq, now + d.delay + d.duration);
    
    gainD.gain.setValueAtTime(0.0, now);
    gainD.gain.linearRampToValueAtTime(d.vol * volumeMultiplier, now + d.delay + 0.01);
    gainD.gain.exponentialRampToValueAtTime(0.001, now + d.delay + d.duration);
    
    oscD.connect(gainD);
    gainD.connect(ctx.destination);
    
    oscD.start(now + d.delay);
    oscD.stop(now + d.delay + d.duration);
  });
};

export const playChomp = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Snapping/Crushing crocodile jaws
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, ctx.currentTime);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.15);

  // High frequency snap layered on top
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(500, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
  gain2.gain.setValueAtTime(0.2, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start();
  osc2.stop(ctx.currentTime + 0.08);
};

export const playSprint = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // High-pitched rush
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(250, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};

export const playCrossSuccess = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Harmonious little double note
  const now = ctx.currentTime;
  const notes = [330, 440, 550]; // E4, A4, C#5
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    
    gain.gain.setValueAtTime(0.12, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.25);
  });
};

export const playCrocStun = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Dizzy disoriented ringing
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  
  // Frequency wobble
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  
  mod.type = 'sine';
  mod.frequency.value = 15; // Hz
  modGain.gain.value = 50; // wobble range
  
  mod.connect(modGain);
  modGain.connect(osc.frequency);
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  mod.start();
  osc.start();
  
  mod.stop(ctx.currentTime + 0.6);
  osc.stop(ctx.currentTime + 0.6);
};
