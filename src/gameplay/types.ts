export type Lane = 'left' | 'right' | 'head';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface BeatNote {
  time: number; // seconds from audio start
  lane: Lane;
}

export interface BeatMap {
  bpm: number;
  duration: number;
  difficulty: Difficulty;
  notes: BeatNote[];
}

export type Judgment = 'perfect' | 'good' | 'miss';

export const TIMING = {
  perfect: 0.06,
  good: 0.12,
  miss: 0.18,
} as const;

export const TRAVEL_DURATION = 1.6; // seconds a note takes to travel to target
