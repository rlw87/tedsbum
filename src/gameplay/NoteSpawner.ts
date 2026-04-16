import Phaser from 'phaser';
import type { BeatMap, Lane } from './types';
import { TRAVEL_DURATION } from './types';
import { Note } from './Note';
import type { Ted } from '../entities/Ted';

/**
 * Spawns notes from a beatmap just-in-time. `spawnPositions` supply the
 * off-screen origin point for each lane so each note flies in from a
 * sensible direction.
 */
export class NoteSpawner {
  private scene: Phaser.Scene;
  private ted: Ted;
  private map: BeatMap;
  private nextIndex = 0;
  private active: Note[] = [];
  private spawnPositions: Record<Lane, Phaser.Math.Vector2>;

  constructor(
    scene: Phaser.Scene,
    ted: Ted,
    map: BeatMap,
    spawnPositions: Record<Lane, Phaser.Math.Vector2>
  ) {
    this.scene = scene;
    this.ted = ted;
    this.map = map;
    this.spawnPositions = spawnPositions;
  }

  update(audioTime: number): Note[] {
    // spawn upcoming notes
    while (this.nextIndex < this.map.notes.length) {
      const n = this.map.notes[this.nextIndex];
      if (n.time - TRAVEL_DURATION <= audioTime) {
        const zone = this.ted.zones[n.lane];
        const start = this.spawnPositions[n.lane];
        this.active.push(new Note(this.scene, n, zone, start));
        this.nextIndex++;
      } else {
        break;
      }
    }
    // update & reap
    const keep: Note[] = [];
    for (const note of this.active) {
      const dead = note.update(audioTime);
      if (dead || note.hit) {
        note.destroy();
      } else {
        keep.push(note);
      }
    }
    this.active = keep;
    return this.active;
  }

  remaining(): number {
    return this.map.notes.length - this.nextIndex + this.active.length;
  }

  finished(): boolean {
    return this.nextIndex >= this.map.notes.length && this.active.length === 0;
  }
}
