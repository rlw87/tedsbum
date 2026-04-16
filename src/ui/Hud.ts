import Phaser from 'phaser';
import type { Judgment } from '../gameplay/types';

export class Hud {
  private scene: Phaser.Scene;
  private scoreText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private accuracyText: Phaser.GameObjects.Text;
  private judgmentText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    };
    this.scoreText = scene.add.text(20, 16, 'Score: 0', style).setDepth(20);
    this.accuracyText = scene.add.text(20, 52, 'Accuracy: 0%', style).setDepth(20);
    this.comboText = scene.add
      .text(scene.scale.width - 20, 16, 'Combo: 0', style)
      .setOrigin(1, 0)
      .setDepth(20);
    this.judgmentText = scene.add
      .text(scene.scale.width / 2, scene.scale.height - 120, '', {
        ...style,
        fontSize: '56px',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
  }

  update(score: number, combo: number, accuracy: number): void {
    this.scoreText.setText(`Score: ${score}`);
    this.comboText.setText(`Combo: ${combo}`);
    this.accuracyText.setText(`Accuracy: ${Math.round(accuracy * 100)}%`);
  }

  flashJudgment(j: Judgment): void {
    const colors: Record<Judgment, string> = {
      perfect: '#ffe36b',
      good: '#6bd1ff',
      miss: '#ff6b6b',
    };
    this.judgmentText.setText(j.toUpperCase());
    this.judgmentText.setColor(colors[j]);
    this.judgmentText.setAlpha(1);
    this.judgmentText.setScale(1.2);
    this.scene.tweens.add({
      targets: this.judgmentText,
      alpha: 0,
      scale: 1,
      duration: 450,
      ease: 'Sine.out',
    });
  }
}
