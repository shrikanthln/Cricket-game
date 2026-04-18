import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // All graphics are drawn procedurally — nothing to load for MVP.
    // Audio placeholders: add .mp3 files to public/audio/ later.
  }

  create() {
    this.scene.start('Home');
  }
}
