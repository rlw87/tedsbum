import Phaser from 'phaser';
import type { Lane, BeatNote } from './types';
import { TRAVEL_DURATION } from './types';
import type { HitZone } from '../entities/HitZone';

const LANE_COLORS: Record<Lane, number> = {
  left: 0x6bd1ff,
  right: 0xff8fb3,
  head: 0xffe36b,
};

/**
 * A single note — spawns at a screen edge based on lane, travels toward the
 * live world position of its target HitZone. Movement is driven by the audio
 * clock (not delta) so it stays synced to music.
 */
export class Note {
  readonly spec: BeatNote;
  readonly target: HitZone;
  readonly sprite: Phaser.GameObjects.Container;
  private spawnPos: Phaser.Math.Vector2;
  private tmp = new Phaser.Math.Vector2();
  hit = false;
  missed = false;

  constructor(scene: Phaser.Scene, spec: BeatNote, target: HitZone, spawnPos: Phaser.Math.Vector2) {
    this.spec = spec;
    this.target = target;
    this.spawnPos = spawnPos.clone();

    const color = LANE_COLORS[spec.lane];
    const container = scene.add.container(spawnPos.x, spawnPos.y);
    const ring = scene.add.graphics();
    ring.lineStyle(6, color, 1);
    ring.strokeCircle(0, 0, 36);
    ring.fillStyle(color, 0.25);
    ring.fillCircle(0, 0, 34);
    const icon = scene.add.text(0, 0, spec.lane === 'head' ? '★' : spec.lane === 'left' ? 'L' : 'R', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    icon.setOrigin(0.5);
    container.add([ring, icon]);
    container.setDepth(5);
    this.sprite = container;
  }

  /** Update position based on current audio time. Returns true if the note is past its death window. */
  update(audioTime: number): boolean {
    const t = (audioTime - (this.spec.time - TRAVEL_DURATION)) / TRAVEL_DURATION;
    const clamped = Math.max(0, Math.min(1.25, t));
    this.target.worldCenter(this.tmp);
    const x = this.spawnPos.x + (this.tmp.x - this.spawnPos.x) * clamped;
    const y = this.spawnPos.y + (this.tmp.y - this.spawnPos.y) * clamped;
    this.sprite.setPosition(x, y);
    // pulse scale toward 1 as we approach
    const s = 0.6 + Math.min(1, clamped) * 0.6;
    this.sprite.setScale(s);
    // fade out after passing
    if (clamped > 1) {
      this.sprite.setAlpha(Math.max(0, 1 - (clamped - 1) * 4));
    } else {
      this.sprite.setAlpha(1);
    }
    return clamped > 1.2;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
