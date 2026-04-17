import Phaser from 'phaser';
import { nextLevel } from '../levels/levels';
import { loadProgress } from '../utils/storage';

interface ResultData {
  levelId: string;
  title: string;
  score: number;
  accuracy: number;
  perfects: number;
  goods: number;
  misses: number;
  maxCombo: number;
}

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('result');
  }

  create(data: ResultData): void {
    const { width, height } = this.scale;
    const passed = data.accuracy >= 0.7;

    this.add
      .text(width / 2, 100, passed ? '✨ Nice work! ✨' : 'Try again?', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        color: passed ? '#ffe36b' : '#ff6b6b',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 170, data.title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const stats = [
      `Score        ${data.score}`,
      `Accuracy     ${Math.round(data.accuracy * 100)}%`,
      `Perfect      ${data.perfects}`,
      `Good         ${data.goods}`,
      `Missed       ${data.misses}`,
      `Max combo    ${data.maxCombo}`,
    ];

    stats.forEach((line, i) => {
      this.add
        .text(width / 2, 240 + i * 44, line, {
          fontFamily: 'monospace',
          fontSize: '28px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    });

    const next = nextLevel(data.levelId);
    const previouslyCompleted = loadProgress().levels[data.levelId]?.completed ?? false;
    const offset = next ? -120 : 0;

    this.makeButton(width / 2 + offset, height - 100, 'Retry', () => {
      this.scene.start('game', { levelId: data.levelId });
    });

    if (next && (passed || previouslyCompleted)) {
      this.makeButton(width / 2 + 120, height - 100, 'Next level →', () => {
        this.scene.start('game', { levelId: next.id });
      });
    }

    this.makeButton(60, 40, '← Menu', () => this.scene.start('menu'), 160, 50, 18);
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    w = 220,
    h = 70,
    fontSize = 28
  ): void {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, 0xffe36b, 1).setStrokeStyle(3, 0xffffff);
    const txt = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#1a1030',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.preventDefault?.();
      onClick();
    });
    c.on('pointerover', () => bg.setFillStyle(0xffffff));
    c.on('pointerout', () => bg.setFillStyle(0xffe36b));
  }
}
