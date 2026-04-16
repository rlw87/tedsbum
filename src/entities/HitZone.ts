import Phaser from 'phaser';
import type { Lane } from '../gameplay/types';

/**
 * An invisible tappable rectangle attached to Ted. Emits 'tapped' (lane)
 * so the scene can route the hit to the HitDetector.
 */
export class HitZone extends Phaser.GameObjects.Zone {
  readonly lane: Lane;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, lane: Lane) {
    super(scene, x, y, w, h);
    this.lane = lane;
    scene.add.existing(this);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.preventDefault?.();
      this.emit('tapped', lane);
    });
  }

  /** Absolute world position of the zone's center, including parent container transforms. */
  worldCenter(out: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const m = this.getWorldTransformMatrix();
    out.set(m.tx, m.ty);
    return out;
  }
}
