/**
 * Audio Engine - Web Audio API based sound effects
 * No external files needed - all sounds synthesized in real-time
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextConstructor) return null;

      this.ctx = new AudioContextConstructor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled ? 0.3 : 0;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Audio can be blocked until the next user interaction.
      });
    }

    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 0.3 : 0;
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.5,
    detune = 0
  ) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  /** Eat food - satisfying ascending tone */
  playEat(combo = 0) {
    const baseFreq = 440 + combo * 80;
    this.playTone(baseFreq, 0.12, 'sine', 0.4);
    setTimeout(() => {
      this.playTone(baseFreq * 1.5, 0.1, 'sine', 0.3);
    }, 50);
    if (combo > 2) {
      setTimeout(() => {
        this.playTone(baseFreq * 2, 0.15, 'sine', 0.25);
      }, 100);
    }
  }

  /** Eat golden food - sparkle sound */
  playGolden() {
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 0.2, 'sine', 0.3);
      }, i * 60);
    });
  }

  /** Game over - descending tones */
  playGameOver() {
    const freqs = [440, 370, 311, 261];
    freqs.forEach((f, i) => {
      setTimeout(() => {
        this.playTone(f, 0.3, 'sawtooth', 0.15);
      }, i * 120);
    });
  }

  /** Victory - bright ascending fanfare */
  playWin() {
    const freqs = [523, 659, 784, 1047, 1318];
    freqs.forEach((frequency, index) => {
      setTimeout(() => this.playTone(frequency, 0.22, 'sine', 0.28), index * 75);
    });
  }

  /** Button click */
  playClick() {
    this.playTone(800, 0.05, 'sine', 0.2);
  }

  /** Pause/unpause */
  playPause() {
    this.playTone(600, 0.08, 'triangle', 0.2);
  }

  /** Combo milestone */
  playCombo() {
    this.playTone(880, 0.15, 'sine', 0.3);
    setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.25), 80);
    setTimeout(() => this.playTone(1320, 0.2, 'sine', 0.2), 160);
  }
}

export const audio = new AudioEngine();
