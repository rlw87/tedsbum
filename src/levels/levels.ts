import type { Difficulty } from '../gameplay/types';
import type { TedMotion } from '../entities/Ted';

export interface LevelDef {
  id: string;
  title: string;
  difficulty: Difficulty;
  tedMotion: TedMotion;
  /** URL to the audio file, or null for a procedurally-generated metronome track. */
  track: string | null;
  /** Fallback BPM for the procedural track, or a hint for the generator. */
  bpm: number;
  /** Duration in seconds for the procedural metronome track. */
  demoDuration?: number;
}

export const LEVELS: LevelDef[] = [
  {
    id: 'l1',
    title: 'Warm-up Wiggle',
    difficulty: 'easy',
    tedMotion: 'static',
    track: null,
    bpm: 90,
    demoDuration: 45,
  },
  {
    id: 'l2',
    title: 'Double Trouble',
    difficulty: 'medium',
    tedMotion: 'slow-drift',
    track: null,
    bpm: 115,
    demoDuration: 55,
  },
  {
    id: 'l3',
    title: 'Ted Goes Wild',
    difficulty: 'hard',
    tedMotion: 'full-chaos',
    track: null,
    bpm: 140,
    demoDuration: 65,
  },
];

export function findLevel(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}
