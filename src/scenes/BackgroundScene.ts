import Phaser from 'phaser';

/**
 * Shared animated backdrop — runs underneath menus and the game so transitions
 * feel smoother than stark scene swaps.
 */
export class BackgroundScene extends Phaser.Scene {
  constructor() {
    super('background');
  }

  create(): void {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    const grad = this.add.graphics();
    const paint = () => {
      bg.clear();
      bg.fillStyle(0x120a2e, 1);
      bg.fillRect(0, 0, this.scale.width, this.scale.height);
      grad.clear();
      for (let i = 0; i < 8; i++) {
        const alpha = 0.05;
        const c = Phaser.Display.Color.HSLToColor(0.82 - i * 0.02, 0.6, 0.4).color;
        grad.fillStyle(c, alpha);
        grad.fillCircle(this.scale.width * (0.2 + i * 0.1), this.scale.height * 0.8, 260 - i * 20);
      }
    };
    paint();
    this.scale.on('resize', paint);

    // twinkle dots
    const stars = this.add.group();
    for (let i = 0; i < 40; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 3),
        0xffffff,
        0.6
      );
      stars.add(s);
      this.tweens.add({
        targets: s,
        alpha: { from: 0.2, to: 0.9 },
        duration: Phaser.Math.Between(1200, 2400),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
      });
    }
  }
}
