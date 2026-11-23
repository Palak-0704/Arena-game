// Flowbound: Masters of Four - Procedural WebAudio Sound Synthesizer

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.surfOsc = null;
    this.surfGain = null;
    this.isMuted = false;

    // Initialize audio context on first user interaction
    const initCtx = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      window.removeEventListener('click', initCtx);
      window.removeEventListener('keydown', initCtx);
    };
    window.addEventListener('click', initCtx);
    window.addEventListener('keydown', initCtx);
  }

  ensureContext() {
    if (this.isMuted) return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx) {
      if (this.isMuted) {
        try { this.ctx.suspend(); } catch (e) {}
      } else {
        try { this.ctx.resume(); } catch (e) {}
      }
    }
    return this.isMuted;
  }

  // 1. Water Whip Slash (Bullwhip Crack + Water Swoosh)
  playWhipSlash() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.18);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // 2. Continuous Ice Surfing Rushing Wind & Skate Friction
  startSurfAudio() {
    this.ensureContext();
    if (!this.ctx || this.surfOsc) return;

    const t = this.ctx.currentTime;
    
    // Noise buffer for rushing wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3.0, t);

    this.surfGain = this.ctx.createGain();
    this.surfGain.gain.setValueAtTime(0.01, t);
    this.surfGain.gain.linearRampToValueAtTime(0.25, t + 0.2);

    whiteNoise.connect(filter);
    filter.connect(this.surfGain);
    this.surfGain.connect(this.ctx.destination);

    whiteNoise.start(t);
    this.surfOsc = whiteNoise;
  }

  stopSurfAudio() {
    if (this.surfGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.surfGain.gain.linearRampToValueAtTime(0.001, t + 0.15);
      setTimeout(() => {
        if (this.surfOsc) {
          this.surfOsc.stop();
          this.surfOsc = null;
          this.surfGain = null;
        }
      }, 160);
    }
  }

  // 3. Water Chakram Projectile Throw
  playChakramThrow() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.linearRampToValueAtTime(920, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // 4. Ice Wall Freezing Eruption (Tectonic Crackle + Glass Thump)
  playIceWallSpawn() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  // 5. Ghost Dash Evasive Whoosh
  playGhostDash() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.1);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  // 6. Confirmed Hit Hitmarker Tick (Crisp 4.2 kHz)
  playHitmarker() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // 7. Guard Break (Shattering Glass & Resonance)
  playGuardBreak() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1400, t);
    osc1.frequency.exponentialRampToValueAtTime(220, t + 0.4);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, t);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.65);
    osc2.stop(t + 0.65);
  }

  // 8. Round Victory (Taiko Drum & Triumphant Gong)
  playRoundVictory() {
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Low Taiko Drum Thump
    const drum = this.ctx.createOscillator();
    const drumGain = this.ctx.createGain();
    drum.type = 'triangle';
    drum.frequency.setValueAtTime(180, t);
    drum.frequency.exponentialRampToValueAtTime(35, t + 0.6);
    drumGain.gain.setValueAtTime(0.8, t);
    drumGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    drum.connect(drumGain);
    drumGain.connect(this.ctx.destination);
    drum.start(t);
    drum.stop(t + 0.75);

    // Resonant Gong Harmonic
    const gong = this.ctx.createOscillator();
    const gongGain = this.ctx.createGain();
    gong.type = 'sine';
    gong.frequency.setValueAtTime(520, t + 0.1);
    gongGain.gain.setValueAtTime(0.5, t + 0.1);
    gongGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    gong.connect(gongGain);
    gongGain.connect(this.ctx.destination);
    gong.start(t + 0.1);
    gong.stop(t + 1.85);
  }

  playFootstep() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playJump() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(340, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  playOctopus() {
    this.playWhipSlash();
    this.playIceWallSpawn();
  }

  playCountdownBeep(isFight = false) {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isFight) {
      // Powerful resonating martial gong
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(130, t + 0.8);
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    } else {
      // Crisp temple chime for 3, 2, 1
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.35);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.42);
    }
  }

  // Heavy martial physical body impact / shove collision
  playBodyCollision() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Spectacular elemental projectile clash: boom, crackle, and steam sizzle
  playElementalClash(type = 'steam') {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Resonating low boom
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.35);
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);

    // 2. High-frequency explosive crackle / sizzle noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    if (type === 'steam') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.linearRampToValueAtTime(800, t + 0.35);
    } else {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(2.0, t);
    }

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
  }

  // 12. Tension Low-Health Heartbeat (Deep Thump-Thump)
  playHeartbeat() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const createThud = (timeOffset, freq, vol) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(32, t + timeOffset + 0.14);

      gain.gain.setValueAtTime(vol, t + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + timeOffset);
      osc.stop(t + timeOffset + 0.18);
    };

    // First beat (lub)
    createThud(0.0, 72, 0.45);
    // Second beat (dub)
    createThud(0.18, 58, 0.35);
  }

  // 13. Dramatic Slow-Motion Fatal KO Stinger
  playDramaticSlowMoStinger() {
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Deep sub-bass boom
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.9);
    subGain.gain.setValueAtTime(0.9, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 1.25);

    // Resonant shimmering gong chime
    const gong = this.ctx.createOscillator();
    const gongGain = this.ctx.createGain();
    gong.type = 'triangle';
    gong.frequency.setValueAtTime(440, t + 0.05);
    gong.frequency.exponentialRampToValueAtTime(220, t + 1.4);
    gongGain.gain.setValueAtTime(0.6, t + 0.05);
    gongGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    gong.connect(gongGain);
    gongGain.connect(this.ctx.destination);
    gong.start(t + 0.05);
    gong.stop(t + 1.65);
  }
}
