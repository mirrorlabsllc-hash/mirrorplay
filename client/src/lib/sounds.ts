const STORAGE_KEY = "mirror_play_sound_muted";

type SoundName = "spin" | "reward" | "levelUp" | "achievement" | "click" | "success";

class SoundManager {
  private audioContext: AudioContext | null = null;
  private muted: boolean = true;
  private volume: number = 0.3;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.muted = stored === null ? true : stored === "true";
    }
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.getContext();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    localStorage.setItem(STORAGE_KEY, String(muted));
  }

  getMuted(): boolean {
    return this.muted;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }

  playSound(name: SoundName) {
    if (this.muted) return;

    try {
      const ctx = this.getContext();
      const masterGain = ctx.createGain();
      masterGain.gain.value = this.volume;
      masterGain.connect(ctx.destination);

      switch (name) {
        case "click":
          this.playClick(ctx, masterGain);
          break;
        case "spin":
          this.playSpin(ctx, masterGain);
          break;
        case "reward":
          this.playReward(ctx, masterGain);
          break;
        case "levelUp":
          this.playLevelUp(ctx, masterGain);
          break;
        case "achievement":
          this.playAchievement(ctx, masterGain);
          break;
        case "success":
          this.playSuccess(ctx, masterGain);
          break;
      }
    } catch (e) {
      console.warn("Sound playback failed:", e);
    }
  }

  private playClick(ctx: AudioContext, master: GainNode) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  private playSpin(ctx: AudioContext, master: GainNode) {
    const duration = 0.8;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + duration);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playReward(ctx: AudioContext, master: GainNode) {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.08;
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      osc.connect(gain);
      gain.connect(master);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  private playLevelUp(ctx: AudioContext, master: GainNode) {
    const notes = [392, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.1;
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.setValueAtTime(0.3, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      osc.connect(gain);
      gain.connect(master);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  private playAchievement(ctx: AudioContext, master: GainNode) {
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.06;
      const freq = 800 + Math.random() * 600;
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.15);
      
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      
      osc.connect(gain);
      gain.connect(master);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  }

  private playSuccess(ctx: AudioContext, master: GainNode) {
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.12;
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
      
      osc.connect(gain);
      gain.connect(master);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }
}

export const soundManager = new SoundManager();

export function playSound(name: SoundName) {
  soundManager.playSound(name);
}

export function setMuted(muted: boolean) {
  soundManager.setMuted(muted);
}

export function getMuted(): boolean {
  return soundManager.getMuted();
}

export function initSounds() {
  soundManager.init();
}
