import { getPlayerName, savePlayerName, getTopScores } from '../game/ScoreStore.js';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1628);
    this.drawPitchBg(W, H);

    // Title
    this.add.text(W / 2, 110, 'CRICKET\nBLITZ', {
      fontSize: '52px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Player name
    const name = getPlayerName();
    const nameLabel = this.add.text(W / 2, 235, name ? `Player: ${name}` : 'Tap to enter your name', {
      fontSize: '17px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaccff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nameLabel.on('pointerdown', () => this.promptName(nameLabel));

    // Start button
    const startBg = this.add.rectangle(W / 2, 320, 220, 62, 0xf5c518)
      .setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 320, 'START GAME', {
      fontSize: '22px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#0a1628',
    }).setOrigin(0.5);

    startBg.on('pointerover', () => startBg.setFillStyle(0xffd740));
    startBg.on('pointerout',  () => startBg.setFillStyle(0xf5c518));
    startBg.on('pointerdown', () => {
      if (!getPlayerName()) {
        this.promptName(nameLabel, () => this.scene.start('Game'));
      } else {
        this.scene.start('Game');
      }
    });

    this.drawScores(W, H);
  }

  promptName(label, onDone) {
    const current = getPlayerName();
    const input = window.prompt('Enter your name:', current);
    if (input && input.trim()) {
      savePlayerName(input.trim());
      label.setText(`Player: ${input.trim()}`);
    }
    onDone?.();
  }

  drawPitchBg(W, H) {
    const g = this.add.graphics();
    g.fillStyle(0x4a7c2f, 1);
    g.fillPoints([
      { x: W * 0.1, y: H }, { x: W * 0.9, y: H },
      { x: W * 0.6, y: H * 0.55 }, { x: W * 0.4, y: H * 0.55 },
    ], true);
    g.fillStyle(0xc8a96e, 0.5);
    g.fillPoints([
      { x: W * 0.3, y: H }, { x: W * 0.7, y: H },
      { x: W * 0.55, y: H * 0.55 }, { x: W * 0.45, y: H * 0.55 },
    ], true);
  }

  drawScores(W, H) {
    this.add.text(W / 2, 400, 'TOP 10', {
      fontSize: '15px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
    }).setOrigin(0.5);

    const scores = getTopScores();
    if (scores.length === 0) {
      this.add.text(W / 2, 432, 'No scores yet — play your first game!', {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#556677',
      }).setOrigin(0.5);
      return;
    }

    scores.slice(0, 10).forEach((s, i) => {
      const date = new Date(s.timestamp).toLocaleDateString();
      const y = 432 + i * 26;
      this.add.text(W * 0.08, y, `${i + 1}.`,  { fontSize: '12px', fontFamily: 'Arial', color: '#f5c518' });
      this.add.text(W * 0.18, y, s.name,        { fontSize: '12px', fontFamily: 'Arial', color: '#ffffff' });
      this.add.text(W * 0.58, y, `${s.runs} runs`, { fontSize: '12px', fontFamily: 'Arial', color: '#aaffaa' });
      this.add.text(W * 0.82, y, date,          { fontSize: '11px', fontFamily: 'Arial', color: '#556677' });
    });
  }
}
