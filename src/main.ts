import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH, attachOrientationPrompt } from './utils/responsive';
import { BackgroundScene } from './scenes/BackgroundScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

attachOrientationPrompt();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0c0720',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  input: {
    activePointers: 3,
  },
  // Phaser's own sound manager is unused (we run Web Audio directly), but
  // disabling avoids it auto-creating a context we don't want.
  audio: { disableWebAudio: true, noAudio: true },
  scene: [BackgroundScene, MenuScene, LevelSelectScene, GameScene, ResultScene],
};

const game = new Phaser.Game(config);

game.events.once('ready', () => {
  game.scene.start('background');
  game.scene.start('menu');
});
