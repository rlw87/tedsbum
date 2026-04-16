/**
 * Single source of truth for "what time are we at in the track", in seconds.
 * Uses the Web Audio context's currentTime — this is the smoothest and most
 * drift-free clock the browser offers, and is what the audio itself is
 * scheduled against. Everything in the game (note positions, spawn timing,
 * hit judgments) is driven by this.
 */
export class AudioClock {
  private ctx: AudioContext | null = null;
  private startTime = 0;
  private started = false;

  start(ctx: AudioContext, when: number): void {
    this.ctx = ctx;
    this.startTime = when;
    this.started = true;
  }

  now(): number {
    if (!this.started || !this.ctx) return 0;
    return this.ctx.currentTime - this.startTime;
  }
}
