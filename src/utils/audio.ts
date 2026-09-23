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
  } else {
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

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

export const playSplash = (volumeMultiplier = 1.0) => {
  if (isMuted) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;

  // Try custom loaded sound first (via efficient decoded Web Audio buffer)
  if (customSplashBuffer) {
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

export const playStoneThrow = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // High to low water plop
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.25);
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
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

export const playDeathDefied = () => {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Quick panic slide
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};
