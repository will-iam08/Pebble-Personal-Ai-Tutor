// Gentle, study-friendly Web Audio API chimes for quiz feedback and companion pet care.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.07,
    delay: number = 0,
    endFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.015, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playUiClick() {
    this.playTone(460, 0.04, 'triangle', 0.04, 0, 340);
  }

  public playCorrect() {
    this.playTone(587.33, 0.11, 'triangle', 0.075, 0);
    this.playTone(880.0, 0.15, 'sine', 0.065, 0.06);
  }

  public playIncorrect() {
    this.playTone(230, 0.14, 'triangle', 0.06, 0, 180);
  }

  public playReward() {
    this.playTone(659.25, 0.12, 'triangle', 0.075, 0);
    this.playTone(880, 0.14, 'triangle', 0.075, 0.06);
    this.playTone(1046.5, 0.18, 'sine', 0.065, 0.12);
  }

  public playPetPurr() {
    this.playTone(420, 0.09, 'sine', 0.055, 0, 560);
    this.playTone(560, 0.12, 'sine', 0.06, 0.07, 680);
  }

  public playTreatToss() {
    this.playTone(360, 0.07, 'sine', 0.05, 0, 540);
    this.playTone(600, 0.08, 'triangle', 0.05, 0.11, 480);
  }

  public playLevelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.playTone(f, 0.2, 'triangle', 0.075, i * 0.07);
    });
  }
}

export const soundEngine = new SoundEngine();
