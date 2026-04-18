import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HomeScene } from './scenes/HomeScene';
import { GameScene } from './scenes/GameScene';
import { EndScene } from './scenes/EndScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  backgroundColor: '#0a1628',
  parent: document.body,
  scene: [BootScene, HomeScene, GameScene, EndScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 1,
  },
};

new Phaser.Game(config);
