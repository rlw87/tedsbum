import type { Lane, Judgment } from './types';
import { TIMING } from './types';
import type { Note } from './Note';

export interface HitOutcome {
  judgment: Judgment;
  note: Note | null;
  delta: number;
}

/**
 * Given a tap on a lane at an audio time, find the closest unresolved note
 * in that lane within the hit window and return the judgment.
 */
export class HitDetector {
  private notes: Note[] = [];

  setNotes(notes: Note[]): void {
    this.notes = notes;
  }

  resolveTap(lane: Lane, audioTime: number): HitOutcome {
    let best: Note | null = null;
    let bestAbs = Infinity;
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      if (n.spec.lane !== lane) continue;
      const d = Math.abs(n.spec.time - audioTime);
      if (d < bestAbs) {
        bestAbs = d;
        best = n;
      }
    }
    if (!best || bestAbs > TIMING.miss) {
      return { judgment: 'miss', note: null, delta: bestAbs };
    }
    const delta = best.spec.time - audioTime;
    const abs = Math.abs(delta);
    let judgment: Judgment;
    if (abs <= TIMING.perfect) judgment = 'perfect';
    else if (abs <= TIMING.good) judgment = 'good';
    else judgment = 'miss';
    if (judgment !== 'miss') best.hit = true;
    return { judgment, note: best, delta };
  }

  /** Mark any notes past the miss window so they're flagged as missed. */
  sweepMisses(audioTime: number, onMiss: (n: Note) => void): void {
    for (const n of this.notes) {
      if (n.hit || n.missed) continue;
      if (audioTime - n.spec.time > TIMING.miss) {
        n.missed = true;
        onMiss(n);
      }
    }
  }
}
