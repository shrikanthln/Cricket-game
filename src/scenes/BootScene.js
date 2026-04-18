export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // All graphics drawn procedurally — no assets to load for MVP
  }

  create() {
    this.scene.start('Home');
  }
}
