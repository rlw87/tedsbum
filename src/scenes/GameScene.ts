import Phaser from 'phaser';
import { Ted } from '../entities/Ted';
import { Hud } from '../ui/Hud';
import { AudioClock } from '../audio/AudioClock';
import { AudioPlayer, synthMetronome } from '../audio/AudioPlayer';
import { NoteSpawner } from '../gameplay/NoteSpawner';
import { HitDetector } from '../gameplay/HitDetector';
import { ScoreManager } from '../gameplay/ScoreManager';
import { generateBeatmap, decodeAudio, hashAudio } from '../gameplay/BeatMapGenerator';
import type { BeatMap, Difficulty, Lane } from '../gameplay/types';
import { findLevel, LEVELS, type LevelDef } from '../levels/levels';
import { getCachedBeatmap, setCachedBeatmap, recordResult } from '../utils/storage';

interface GameSceneData {
  levelId?: string;
  customFile?: File;
  difficulty?: Difficulty;
}

interface Prepared {
  map: BeatMap;
  buffer: AudioBuffer;
  level: LevelDef;
}

export class GameScene extends Phaser.Scene {
  private ted!: Ted;
  private hud!: Hud;
  private clock = new AudioClock();
  private player!: AudioPlayer;
  private spawner: NoteSpawner | null = null;
  private hits = new HitDetector();
  private score = new ScoreManager();
  private level: LevelDef | null = null;
  private finished = false;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private spawnPositions!: Record<Lane, Phaser.Math.Vector2>;

  constructor() {
    super('game');
  }

  async create(data: GameSceneData): Promise<void> {
    const { width, height } = this.scale;
    this.player = new AudioPlayer();
    this.finished = false;

    this.ted = new Ted(this, width / 2, height / 2 + 30);
    this.hud = new Hud(this);

    this.spawnPositions = {
      left: new Phaser.Math.Vector2(-80, height / 2 + 130),
      right: new Phaser.Math.Vector2(width + 80, height / 2 + 130),
      head: new Phaser.Math.Vector2(width / 2, -80),
    };

    (['left', 'right', 'head'] as Lane[]).forEach((lane) => {
      const zone = this.ted.zones[lane];
      zone.on('tapped', (l: Lane) => this.handleTap(l));
    });

    this.makeBackButton();

    this.loadingText = this.add
      .text(width / 2, height - 60, 'Loading beatmap...', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.events.once('shutdown', this.onShutdown, this);

    try {
      const prepared = await this.prepareBeatmap(data);
      this.loadingText.destroy();
      this.loadingText = null;
      this.startGame(prepared);
    } catch (err) {
      if (this.loadingText) this.loadingText.setText(`Error: ${(err as Error).message}`);
      console.error(err);
    }
  }

  private async prepareBeatmap(data: GameSceneData): Promise<Prepared> {
    await this.player.resume();

    if (data.customFile) {
      const difficulty = data.difficulty ?? 'medium';
      const bytes = await data.customFile.arrayBuffer();
      const buffer = await decodeAudio(bytes);
      const key = `${hashAudio(bytes)}_${difficulty}`;
      const cached = getCachedBeatmap<BeatMap>(key);
      const map = cached ?? generateBeatmap(buffer, difficulty);
      if (!cached) setCachedBeatmap(key, map);
      const level: LevelDef = {
        id: 'custom',
        title: data.customFile.name,
        difficulty,
        tedMotion: difficulty === 'hard' ? 'full-chaos' : difficulty === 'medium' ? 'slow-drift' : 'static',
        track: null,
        bpm: map.bpm,
      };
      return { map, buffer, level };
    }

    const level = findLevel(data.levelId ?? LEVELS[0].id) ?? LEVELS[0];
    const difficulty = level.difficulty;

    if (level.track) {
      const res = await fetch(level.track);
      const bytes = await res.arrayBuffer();
      const buffer = await decodeAudio(bytes);
      const key = `${hashAudio(bytes)}_${difficulty}`;
      const cached = getCachedBeatmap<BeatMap>(key);
      const map = cached ?? generateBeatmap(buffer, difficulty);
      if (!cached) setCachedBeatmap(key, map);
      return { map, buffer, level };
    }

    const duration = level.demoDuration ?? 45;
    const buffer = synthMetronome(this.player.ctx, level.bpm, duration);
    const map = generateBeatmap(buffer, difficulty);
    return { map, buffer, level };
  }

  private startGame({ map, buffer, level }: Prepared): void {
    this.level = level;
    this.score = new ScoreManager();
    this.score.setTotalNotes(map.notes.length);
    this.spawner = new NoteSpawner(this, this.ted, map, this.spawnPositions);
    this.ted.setHeadEnabled(level.difficulty !== 'easy');
    this.ted.startMotion(level.tedMotion, { w: this.scale.width, h: this.scale.height });

    const leadIn = 1.5;
    this.player.play(buffer, leadIn);
    this.clock.start(this.player.ctx, this.player.startedAt);

    this.player.onEnded = () => {
      // Called from a browser audio event outside Phaser's loop, so bypass
      // the spawner check — by the time the buffer finishes all notes are past
      // their death window anyway.
      this.finishIfDone(true);
    };

    const countdown = this.add
      .text(this.scale.width / 2, this.scale.height * 0.3, 'Get ready…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: countdown,
      alpha: 0,
      duration: 1200,
      delay: 600,
      onComplete: () => countdown.destroy(),
    });
  }

  update(): void {
    if (!this.spawner || this.finished) return;
    const t = this.clock.now();
    const active = this.spawner.update(t);
    this.hits.setNotes(active);
    this.hits.sweepMisses(t, () => {
      this.score.register('miss');
      this.hud.flashJudgment('miss');
    });
    this.hud.update(this.score.score, this.score.combo, this.score.accuracy());
    if (this.spawner.finished()) {
      this.finishIfDone();
    }
  }

  private handleTap(lane: Lane): void {
    if (!this.spawner || this.finished) return;
    const t = this.clock.now();
    const outcome = this.hits.resolveTap(lane, t);
    this.score.register(outcome.judgment);
    this.hud.flashJudgment(outcome.judgment);
    this.ted.bounceZone(lane);
    if (outcome.note && outcome.judgment !== 'miss') {
      this.spawnHitFx(outcome.note.sprite.x, outcome.note.sprite.y, outcome.judgment);
    }
  }

  private spawnHitFx(x: number, y: number, judgment: 'perfect' | 'good' | 'miss'): void {
    const color = judgment === 'perfect' ? 0xffe36b : 0x6bd1ff;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(x, y, 16);
    g.setDepth(10);
    this.tweens.add({
      targets: g,
      scale: 3,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy(),
    });
  }

  private finishIfDone(force = false): void {
    if (this.finished) return;
    if (!force && (!this.spawner || !this.spawner.finished())) return;
    this.finished = true;
    const accuracy = this.score.accuracy();
    const id = this.level?.id ?? 'custom';
    if (id !== 'custom') recordResult(id, accuracy, this.score.score);
    this.time.delayedCall(400, () => {
      this.scene.start('result', {
        levelId: id,
        title: this.level?.title ?? 'Custom Track',
        score: this.score.score,
        accuracy,
        perfects: this.score.perfects,
        goods: this.score.goods,
        misses: this.score.misses,
        maxCombo: this.score.maxCombo,
      });
    });
  }

  private makeBackButton(): void {
    const t = this.add
      .text(20, this.scale.height - 40, '← Quit', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setDepth(30);
    t.setInteractive({ useHandCursor: true });
    t.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.preventDefault?.();
      this.scene.start('level-select');
    });
  }

  private onShutdown(): void {
    this.player?.stop();
    this.player?.destroy();
    this.ted?.stopMotion();
    this.spawner = null;
  }
}
