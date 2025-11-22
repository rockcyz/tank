
let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

const getContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const createNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
};

export const playShootSound = (type: string) => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    switch (type) {
      case 'LASER':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'RAPID': // Machine gun like
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        break;
      case 'HEAVY': // Deep boom
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        break;
      case 'AP_SABOT': // High pitch snap
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        break;
      case 'MISSILE': // Swoosh
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'VENOM': // Toxic squelch/laser hybrid
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        // Add a secondary low oscillator for "bubble" effect
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(100, now);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc2.start(now);
        osc2.stop(now + 0.15);
        break;
      default: // STANDARD/BULLET
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        break;
    }
    
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    // Ignore audio errors
  }
};

export const playImpactSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
};

export const playCollisionSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Create a low frequency thud for heavy metal collision
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Lowpass filter to make it dull
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    // Low pitch sawtooth/square mix roughly approximated by lowpassed saw
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + 0.1);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {}
};

export const playExplosionSound = (isLarge: boolean = false) => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    if (!noiseBuffer) noiseBuffer = createNoiseBuffer(ctx);

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = isLarge ? 400 : 800;

    const gain = ctx.createGain();
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const duration = isLarge ? 0.8 : 0.3;
    
    gain.gain.setValueAtTime(isLarge ? 0.4 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    source.start(now);
    source.stop(now + duration);
  } catch (e) {}
};
