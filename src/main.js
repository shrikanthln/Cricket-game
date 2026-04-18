import { BootScene }  from './scenes/BootScene.js';
import { HomeScene }  from './scenes/HomeScene.js';
import { GameScene }  from './scenes/GameScene.js';
import { EndScene }   from './scenes/EndScene.js';

new Phaser.Game({
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
  input: { activePointers: 1 },
});
