import type { BeatMap, BeatNote, Difficulty, Lane } from './types';

/**
 * Offline beatmap generator. Runs energy-based onset detection on any
 * decoded AudioBuffer and assigns notes to lanes based on difficulty.
 *
 * Strategy:
 *  - Downsample to mono.
 *  - Compute short-time energy in ~23ms hops.
 *  - Compute an onset strength = positive energy deltas.
 *  - Pick local peaks above an adaptive (median-based) threshold.
 *  - Enforce a per-difficulty min-gap between onsets.
 *  - Assign lanes based on difficulty + onset strength.
 */

const HOP_MS = 23;

function downmix(buffer: AudioBuffer): Float32Array {
  const ch0 = buffer.getChannelData(0);
  if (buffer.numberOfChannels === 1) return ch0;
  const ch1 = buffer.getChannelData(1);
  const out = new Float32Array(ch0.length);
  for (let i = 0; i < ch0.length; i++) out[i] = (ch0[i] + ch1[i]) * 0.5;
  return out;
}

function detectOnsets(buffer: AudioBuffer): { times: number[]; strengths: number[] } {
  const samples = downmix(buffer);
  const sr = buffer.sampleRate;
  const hop = Math.floor((HOP_MS / 1000) * sr);
  const frames = Math.floor(samples.length / hop);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * hop;
    const end = Math.min(samples.length, start + hop);
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    energy[f] = Math.sqrt(sum / Math.max(1, end - start));
  }

  const flux = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    const d = energy[f] - energy[f - 1];
    flux[f] = d > 0 ? d : 0;
  }

  // adaptive threshold per window
  const window = 43; // ~1s
  const times: number[] = [];
  const strengths: number[] = [];
  for (let f = 2; f < frames - 1; f++) {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, f - window);
    const end = Math.min(frames, f + window);
    for (let i = start; i < end; i++) {
      sum += flux[i];
      count++;
    }
    const mean = sum / Math.max(1, count);
    const threshold = mean * 1.4 + 0.0005;
    if (flux[f] > threshold && flux[f] > flux[f - 1] && flux[f] >= flux[f + 1]) {
      times.push((f * hop) / sr);
      strengths.push(flux[f]);
    }
  }
  return { times, strengths };
}

function enforceGap(times: number[], strengths: number[], minGap: number): { t: number[]; s: number[] } {
  const t: number[] = [];
  const s: number[] = [];
  for (let i = 0; i < times.length; i++) {
    if (t.length === 0 || times[i] - t[t.length - 1] >= minGap) {
      t.push(times[i]);
      s.push(strengths[i]);
    } else if (strengths[i] > s[s.length - 1]) {
      // replace with stronger onset inside gap
      t[t.length - 1] = times[i];
      s[s.length - 1] = strengths[i];
    }
  }
  return { t, s };
}

function assignLanes(times: number[], strengths: number[], difficulty: Difficulty): BeatNote[] {
  const notes: BeatNote[] = [];
  const maxStrength = strengths.reduce((a, b) => Math.max(a, b), 0) || 1;
  let alt: Lane = 'left';
  for (let i = 0; i < times.length; i++) {
    const strong = strengths[i] / maxStrength > 0.6;
    let lane: Lane;
    if (difficulty === 'easy') {
      lane = alt;
      alt = alt === 'left' ? 'right' : 'left';
    } else if (difficulty === 'medium') {
      if (strong && i % 5 === 0) lane = 'head';
      else {
        lane = alt;
        alt = alt === 'left' ? 'right' : 'left';
      }
    } else {
      // hard: more heads, occasional quick same-side doubles
      if (strong && i % 3 === 0) lane = 'head';
      else if (i > 0 && times[i] - times[i - 1] < 0.25) {
        lane = notes[notes.length - 1]?.lane === 'left' ? 'left' : 'right';
      } else {
        lane = alt;
        alt = alt === 'left' ? 'right' : 'left';
      }
    }
    notes.push({ time: times[i], lane });
  }
  return notes;
}

export function generateBeatmap(buffer: AudioBuffer, difficulty: Difficulty): BeatMap {
  const { times, strengths } = detectOnsets(buffer);

  const minGap = difficulty === 'easy' ? 0.45 : difficulty === 'medium' ? 0.3 : 0.2;
  const thinned = enforceGap(times, strengths, minGap);

  // thin further for easy: keep ~half
  let kept = thinned;
  if (difficulty === 'easy') {
    const t: number[] = [];
    const s: number[] = [];
    for (let i = 0; i < thinned.t.length; i++) {
      if (i % 2 === 0) {
        t.push(thinned.t[i]);
        s.push(thinned.s[i]);
      }
    }
    kept = { t, s };
  }

  const notes = assignLanes(kept.t, kept.s, difficulty);

  // Rough BPM estimate: median inter-onset interval → bpm
  const intervals = [];
  for (let i = 1; i < kept.t.length; i++) intervals.push(kept.t[i] - kept.t[i - 1]);
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)] || 0.5;
  const bpm = Math.round(60 / medianInterval);

  return {
    bpm,
    duration: buffer.duration,
    difficulty,
    notes,
  };
}

/** Decode an ArrayBuffer or File into an AudioBuffer using an OfflineAudioContext. */
export async function decodeAudio(data: ArrayBuffer): Promise<AudioBuffer> {
  const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new AC();
  try {
    return await ctx.decodeAudioData(data.slice(0));
  } finally {
    if (ctx.state !== 'closed') ctx.close();
  }
}

/** Fast hash for cache keying (djb2 on a sampled view of the bytes). */
export function hashAudio(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let h = 5381;
  const step = Math.max(1, Math.floor(view.length / 4096));
  for (let i = 0; i < view.length; i += step) {
    h = ((h << 5) + h + view[i]) >>> 0;
  }
  return `${view.length}_${h.toString(16)}`;
}
