import Phaser from 'phaser';
import { LEVELS, type LevelDef } from '../levels/levels';
import { loadProgress } from '../utils/storage';

export class LevelSelectScene extends Phaser.Scene {
  private fileInput: HTMLInputElement | null = null;

  constructor() {
    super('level-select');
  }

  create(): void {
    const { width, height } = this.scale;
    const progress = loadProgress();

    this.add
      .text(width / 2, 80, 'Choose a Level', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const cardW = 300;
    const cardH = 320;
    const gap = 40;
    const totalW = LEVELS.length * cardW + (LEVELS.length - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;
    const y = height / 2;

    LEVELS.forEach((lvl, i) => {
      const prev = i === 0 ? null : LEVELS[i - 1];
      const unlocked =
        i === 0 ||
        (prev !== null && (progress.levels[prev.id]?.completed ?? false));
      const x = startX + i * (cardW + gap);
      this.makeCard(x, y, cardW, cardH, lvl, unlocked, progress.levels[lvl.id]?.bestAccuracy ?? 0);
    });

    // Custom track slot
    this.makeCustomTrackButton(width / 2, height - 80);

    this.makeBackButton(60, 40);
  }

  private makeCard(
    x: number,
    y: number,
    w: number,
    h: number,
    lvl: LevelDef,
    unlocked: boolean,
    bestAccuracy: number
  ): void {
    const container = this.add.container(x, y);
    const fill = unlocked ? 0x382066 : 0x1a0f33;
    const stroke = unlocked ? 0xffe36b : 0x555555;
    const bg = this.add.rectangle(0, 0, w, h, fill, 1).setStrokeStyle(4, stroke);

    const title = this.add
      .text(0, -100, lvl.title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: w - 30 },
        align: 'center',
      })
      .setOrigin(0.5);

    const diff = this.add
      .text(0, -50, lvl.difficulty.toUpperCase(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffe36b',
      })
      .setOrigin(0.5);

    const motion = this.add
      .text(0, -15, `Ted: ${lvl.tedMotion}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    const bestLabel = this.add
      .text(0, 30, bestAccuracy > 0 ? `Best: ${Math.round(bestAccuracy * 100)}%` : '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#aaddff',
      })
      .setOrigin(0.5);

    const statusLabel = unlocked ? 'PLAY' : '🔒 Locked';
    const status = this.add
      .text(0, 100, statusLabel, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: unlocked ? '#1a1030' : '#ffffff',
        backgroundColor: unlocked ? '#ffe36b' : undefined,
        padding: { x: 18, y: 8 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, title, diff, motion, bestLabel, status]);
    container.setSize(w, h);

    if (unlocked) {
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event?.preventDefault?.();
        this.scene.start('game', { levelId: lvl.id });
      });
      container.on('pointerover', () => bg.setFillStyle(0x4a2a88));
      container.on('pointerout', () => bg.setFillStyle(fill));
    } else {
      const prevTitle = LEVELS[LEVELS.findIndex((l) => l.id === lvl.id) - 1]?.title;
      const hint = this.add
        .text(0, 140, prevTitle ? `Beat "${prevTitle}" (≥70%)` : '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          wordWrap: { width: w - 40 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setAlpha(0.6);
      container.add(hint);
    }
  }

  private makeCustomTrackButton(x: number, y: number): void {
    const c = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 420, 60, 0x2a1a55, 1).setStrokeStyle(3, 0x6bd1ff);
    const txt = this.add
      .text(0, 0, '+ Play a Custom Track', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(420, 60);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => bg.setFillStyle(0x3a2a75));
    c.on('pointerout', () => bg.setFillStyle(0x2a1a55));
    c.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.preventDefault?.();
      this.openFilePicker();
    });
  }

  private openFilePicker(): void {
    if (!this.fileInput) {
      this.fileInput = document.createElement('input');
      this.fileInput.type = 'file';
      this.fileInput.accept = 'audio/*';
      this.fileInput.style.display = 'none';
      document.body.appendChild(this.fileInput);
    }
    this.fileInput.value = '';
    this.fileInput.onchange = () => {
      const file = this.fileInput!.files?.[0];
      if (!file) return;
      this.scene.start('game', { customFile: file, difficulty: 'medium' });
    };
    this.fileInput.click();
  }

  private makeBackButton(x: number, y: number): void {
    const t = this.add
      .text(x, y, '← Back', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0, 0);
    t.setInteractive({ useHandCursor: true });
    t.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.preventDefault?.();
      this.scene.start('menu');
    });
  }

  shutdown(): void {
    if (this.fileInput) {
      this.fileInput.remove();
      this.fileInput = null;
    }
  }
}
