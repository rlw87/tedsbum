/**
 * Minimal AudioBuffer player built directly on Web Audio. We bypass Phaser's
 * sound manager because:
 *  - we need the same AudioContext for playback and for decoding user-uploaded
 *    files,
 *  - the AudioClock reads ctx.currentTime as its time source of truth, so the
 *    audio MUST be scheduled on that same context.
 */
export class AudioPlayer {
  readonly ctx: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode;
  /** Context time at which playback began (for the AudioClock). */
  startedAt = 0;
  /** Resolved when the buffer finishes naturally (not on stop()). */
  onEnded: (() => void) | null = null;

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.8;
    this.gain.connect(this.ctx.destination);
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  play(buffer: AudioBuffer, offsetSeconds = 0): void {
    this.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);
    src.onended = () => {
      if (this.source === src && this.onEnded) this.onEnded();
    };
    this.startedAt = this.ctx.currentTime + offsetSeconds;
    src.start(this.startedAt);
    this.source = src;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch {
        // already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.ctx.state !== 'closed') this.ctx.close().catch(() => undefined);
  }
}

/**
 * Synthesise a simple kick/snare metronome track at the given BPM and length.
 * Used for the bundled demo levels so the game is playable before real
 * tracks are added.
 */
export function synthMetronome(ctx: BaseAudioContext, bpm: number, duration: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(duration * sr), sr);
  const data = buffer.getChannelData(0);
  const beatInterval = 60 / bpm;
  const totalBeats = Math.floor(duration / beatInterval);

  for (let b = 0; b < totalBeats; b++) {
    const t = b * beatInterval;
    const isDownbeat = b % 4 === 0;
    const startSample = Math.floor(t * sr);
    const lengthSamples = Math.floor(sr * (isDownbeat ? 0.18 : 0.1));
    // kick-ish: low freq with fast pitch drop, short envelope
    const startFreq = isDownbeat ? 110 : 220;
    const endFreq = isDownbeat ? 55 : 150;
    for (let i = 0; i < lengthSamples; i++) {
      const n = startSample + i;
      if (n >= data.length) break;
      const phase = i / sr;
      const env = Math.exp(-phase * (isDownbeat ? 18 : 30));
      const freq = startFreq + (endFreq - startFreq) * (i / lengthSamples);
      data[n] += Math.sin(2 * Math.PI * freq * phase) * env * (isDownbeat ? 0.9 : 0.55);
    }
    // on every 2nd/4th beat add a tiny snare-ish noise
    if (!isDownbeat) {
      const noiseStart = Math.floor((t + 0.0) * sr);
      const noiseLen = Math.floor(sr * 0.05);
      for (let i = 0; i < noiseLen; i++) {
        const n = noiseStart + i;
        if (n >= data.length) break;
        const env = Math.exp(-(i / sr) * 60);
        data[n] += (Math.random() * 2 - 1) * env * 0.25;
      }
    }
  }
  // soft clip
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0.98) data[i] = 0.98;
    else if (data[i] < -0.98) data[i] = -0.98;
  }
  return buffer;
}
