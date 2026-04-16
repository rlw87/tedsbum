import Phaser from 'phaser';
import { HitZone } from './HitZone';
import type { Lane } from '../gameplay/types';

export type TedMotion = 'static' | 'slow-drift' | 'full-chaos';

/**
 * Ted the cat — a container holding placeholder art + three hit zones.
 * Art is drawn procedurally so the game is playable without external assets;
 * once real sprites exist, swap the graphics calls for image() calls.
 */
export class Ted extends Phaser.GameObjects.Container {
  readonly zones: Record<Lane, HitZone>;
  private motionTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    const art = scene.add.graphics();

    // body — chonky oval
    art.fillStyle(0xf4c27b, 1);
    art.fillEllipse(0, 40, 360, 280);
    // belly
    art.fillStyle(0xffe2bd, 1);
    art.fillEllipse(0, 70, 240, 180);

    // bum cheeks
    art.fillStyle(0xf4c27b, 1);
    art.fillCircle(-70, 130, 80);
    art.fillCircle(70, 130, 80);
    // tail curl between the cheeks
    art.lineStyle(18, 0xf4c27b, 1);
    art.beginPath();
    art.moveTo(0, 60);
    art.lineTo(0, 200);
    art.strokePath();

    // head
    art.fillStyle(0xf4c27b, 1);
    art.fillCircle(0, -140, 95);
    // ears
    art.fillTriangle(-80, -200, -40, -250, -20, -180);
    art.fillTriangle(80, -200, 40, -250, 20, -180);
    // inner ear
    art.fillStyle(0xffa6a6, 1);
    art.fillTriangle(-66, -200, -42, -232, -32, -194);
    art.fillTriangle(66, -200, 42, -232, 32, -194);
    // eyes (we're looking at Ted's back so tiny peek-over eyes)
    art.fillStyle(0x1a1a1a, 1);
    art.fillCircle(-28, -150, 7);
    art.fillCircle(28, -150, 7);
    // nose
    art.fillStyle(0xffa6a6, 1);
    art.fillTriangle(-8, -128, 8, -128, 0, -116);
    // whiskers
    art.lineStyle(3, 0x1a1a1a, 1);
    art.lineBetween(-40, -122, -90, -130);
    art.lineBetween(-40, -118, -90, -118);
    art.lineBetween(40, -122, 90, -130);
    art.lineBetween(40, -118, 90, -118);

    this.add(art);

    // hit zones sized generously for touch
    const leftZone = new HitZone(scene, -70, 130, 170, 170, 'left');
    const rightZone = new HitZone(scene, 70, 130, 170, 170, 'right');
    const headZone = new HitZone(scene, 0, -140, 200, 200, 'head');
    this.add([leftZone, rightZone, headZone]);

    this.zones = { left: leftZone, right: rightZone, head: headZone };

    this.setSize(400, 500);
  }

  setHeadEnabled(enabled: boolean): void {
    this.zones.head.setActive(enabled);
    this.zones.head.setVisible(enabled);
    this.zones.head.input!.enabled = enabled;
  }

  /** Visual tap feedback. */
  bounceZone(lane: Lane): void {
    const z = this.zones[lane];
    this.scene.tweens.add({
      targets: z,
      scale: { from: 1.0, to: 1.25 },
      duration: 90,
      yoyo: true,
    });
  }

  startMotion(mode: TedMotion, bounds: { w: number; h: number }): void {
    this.stopMotion();
    if (mode === 'static') return;
    const cx = bounds.w / 2;
    const cy = bounds.h / 2;
    if (mode === 'slow-drift') {
      this.motionTween = this.scene.tweens.add({
        targets: this,
        x: { from: cx - 80, to: cx + 80 },
        y: { from: cy - 20, to: cy + 20 },
        duration: 3200,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    } else {
      // full-chaos — bigger range + scale pulsing
      this.motionTween = this.scene.tweens.add({
        targets: this,
        x: { from: cx - 220, to: cx + 220 },
        y: { from: cy - 60, to: cy + 60 },
        duration: 1700,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });
      this.scene.tweens.add({
        targets: this,
        scale: { from: 0.9, to: 1.05 },
        duration: 900,
        ease: 'Sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }
  }

  stopMotion(): void {
    if (this.motionTween) {
      this.motionTween.stop();
      this.motionTween = null;
    }
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
  }
}
