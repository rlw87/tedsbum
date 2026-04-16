export type LevelId = string;

export interface LevelResult {
  bestAccuracy: number;
  bestScore: number;
  completed: boolean;
}

export interface Progress {
  levels: Record<LevelId, LevelResult>;
}

const PROGRESS_KEY = 'tedsbum.progress.v1';
const BEATMAP_PREFIX = 'tedsbum.beatmap.';

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch {
    // ignore
  }
  return { levels: {} };
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function recordResult(levelId: LevelId, accuracy: number, score: number): Progress {
  const p = loadProgress();
  const existing = p.levels[levelId];
  const bestAccuracy = Math.max(existing?.bestAccuracy ?? 0, accuracy);
  const bestScore = Math.max(existing?.bestScore ?? 0, score);
  p.levels[levelId] = {
    bestAccuracy,
    bestScore,
    completed: existing?.completed || accuracy >= 0.7,
  };
  saveProgress(p);
  return p;
}

export function getCachedBeatmap<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(BEATMAP_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setCachedBeatmap<T>(key: string, value: T): void {
  try {
    localStorage.setItem(BEATMAP_PREFIX + key, JSON.stringify(value));
  } catch {
    // quota or serialization — fine, just skip caching
  }
}
