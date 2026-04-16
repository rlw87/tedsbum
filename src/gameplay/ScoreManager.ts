import type { Judgment } from './types';

export class ScoreManager {
  score = 0;
  combo = 0;
  maxCombo = 0;
  hits = 0;
  misses = 0;
  perfects = 0;
  goods = 0;
  totalNotes = 0;

  setTotalNotes(n: number): void {
    this.totalNotes = n;
  }

  register(judgment: Judgment): void {
    switch (judgment) {
      case 'perfect':
        this.perfects++;
        this.hits++;
        this.combo++;
        this.score += 100 + this.combo;
        break;
      case 'good':
        this.goods++;
        this.hits++;
        this.combo++;
        this.score += 50 + Math.floor(this.combo / 2);
        break;
      case 'miss':
        this.misses++;
        this.combo = 0;
        break;
    }
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
  }

  accuracy(): number {
    const judged = this.hits + this.misses;
    if (judged === 0) return 0;
    const weighted = this.perfects * 1.0 + this.goods * 0.5;
    return weighted / judged;
  }
}
