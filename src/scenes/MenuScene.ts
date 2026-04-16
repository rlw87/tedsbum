import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.3, "Ted's Bum", {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '96px',
        color: '#ffe36b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.42, 'A rhythm game starring Ted the cat', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    const btn = this.makeButton(width / 2, height * 0.6, 'Play', () => {
      this.scene.start('level-select');
    });
    this.tweens.add({
      targets: btn,
      scale: { from: 1, to: 1.05 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.add
      .text(width / 2, height - 40, 'Tap / click on Ted — left, right, or head — in time with the beat', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.6);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 280, 90, 0xffe36b, 1).setStrokeStyle(4, 0xffffff);
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#1a1030',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(280, 90);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.preventDefault?.();
      onClick();
    });
    c.on('pointerover', () => bg.setFillStyle(0xffffff));
    c.on('pointerout', () => bg.setFillStyle(0xffe36b));
    return c;
  }
}
