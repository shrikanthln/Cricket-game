import Phaser from 'phaser';
import { getPlayerName, savePlayerName, getTopScores } from '../game/ScoreStore';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1628);
    this.drawPitchBg(W, H);

    // Title
    this.add.text(W / 2, 120, 'CRICKET\nBLITZ', {
      fontSize: '52px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Player name
    const name = getPlayerName();
    const nameLabel = this.add.text(W / 2, 240, name ? `Player: ${name}` : 'Tap to enter name', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaccff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nameLabel.on('pointerdown', () => this.promptName(nameLabel));

    // Start button
    const startBtn = this.add.rectangle(W / 2, 360, 220, 64, 0xf5c518, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 360, 'START GAME', {
      fontSize: '22px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#0a1628',
    }).setOrigin(0.5);

    startBtn.on('pointerover', () => startBtn.setFillStyle(0xffd740));
    startBtn.on('pointerout', () => startBtn.setFillStyle(0xf5c518));
    startBtn.on('pointerdown', () => {
      if (!getPlayerName()) {
        this.promptName(nameLabel, () => this.scene.start('Game'));
      } else {
        this.scene.start('Game');
      }
    });

    // Scores section
    this.drawScores(W, H);
  }

  private promptName(label: Phaser.GameObjects.Text, onDone?: () => void) {
    const current = getPlayerName();
    const input = window.prompt('Enter your name:', current);
    if (input && input.trim()) {
      savePlayerName(input.trim());
      label.setText(`Player: ${input.trim()}`);
    }
    onDone?.();
  }

  private drawPitchBg(W: number, H: number) {
    const g = this.add.graphics();
    // Perspective pitch strip
    g.fillStyle(0x4a7c2f, 1);
    g.fillTriangle(W * 0.35, H * 0.55, W * 0.65, H * 0.55, W, H);
    g.fillTriangle(W * 0.35, H * 0.55, 0, H, W, H);
    g.fillStyle(0x5a9c3a, 1);
    g.fillTriangle(W * 0.4, H * 0.55, W * 0.6, H * 0.55, W * 0.75, H);
    g.fillTriangle(W * 0.4, H * 0.55, W * 0.25, H, W * 0.75, H);
    // Crease line
    g.lineStyle(2, 0xffffff, 0.4);
    g.lineBetween(W * 0.25, H * 0.72, W * 0.75, H * 0.72);
  }

  private drawScores(W: number, H: number) {
    this.add.text(W / 2, 450, 'TOP 10', {
      fontSize: '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
    }).setOrigin(0.5);

    const scores = getTopScores();
    if (scores.length === 0) {
      this.add.text(W / 2, 490, 'No scores yet — play your first game!', {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: '#667799',
      }).setOrigin(0.5);
      return;
    }

    scores.slice(0, 10).forEach((s, i) => {
      const date = new Date(s.timestamp).toLocaleDateString();
      const y = 490 + i * 28;
      this.add.text(W * 0.1, y, `${i + 1}.`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#f5c518',
      });
      this.add.text(W * 0.2, y, s.name, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#ffffff',
      });
      this.add.text(W * 0.6, y, `${s.runs} runs`, {
        fontSize: '13px', fontFamily: 'Arial, sans-serif', color: '#aaffaa',
      });
      this.add.text(W * 0.82, y, date, {
        fontSize: '11px', fontFamily: 'Arial, sans-serif', color: '#667799',
      });
    });
  }
}
