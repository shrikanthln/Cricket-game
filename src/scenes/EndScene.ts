import Phaser from 'phaser';
import { saveScore } from '../game/ScoreStore';

interface EndData {
  runs: number;
  wickets: number;
  balls: number;
  name: string;
}

export class EndScene extends Phaser.Scene {
  constructor() { super('End'); }

  create(data: EndData) {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1628);

    const over = Math.floor(data.balls / 6);
    const ball = data.balls % 6;
    const timestamp = Date.now();

    const rank = saveScore({
      name: data.name || 'Unknown',
      runs: data.runs,
      wickets: data.wickets,
      balls: data.balls,
      timestamp,
    });

    // Title
    const isGameOver = data.wickets >= 3;
    this.add.text(W / 2, 100, isGameOver ? 'GAME OVER' : 'INNINGS COMPLETE', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: isGameOver ? '#ff4444' : '#f5c518',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Player name
    this.add.text(W / 2, 155, data.name, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaccff',
    }).setOrigin(0.5);

    // Big score
    this.add.text(W / 2, 240, `${data.runs}`, {
      fontSize: '96px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(W / 2, 330, `${data.wickets} wkts  •  ${over}.${ball} overs`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Rank badge
    if (rank !== null) {
      const rankColor = rank === 1 ? '#f5c518' : rank <= 3 ? '#aaaaff' : '#88ffaa';
      this.add.text(W / 2, 395, `#${rank} IN TOP 10!`, {
        fontSize: '22px',
        fontFamily: 'Arial Black, sans-serif',
        color: rankColor,
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);
    }

    // Date / time
    const dateStr = new Date(timestamp).toLocaleString();
    this.add.text(W / 2, 435, dateStr, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#556677',
    }).setOrigin(0.5);

    // Play Again button
    this.makeButton(W / 2, 520, 'PLAY AGAIN', 0xf5c518, '#0a1628', () => {
      this.scene.start('Game');
    });

    // Home button
    this.makeButton(W / 2, 600, 'HOME', 0x223355, '#ffffff', () => {
      this.scene.start('Home');
    });
  }

  private makeButton(x: number, y: number, label: string, bg: number, textColor: string, cb: () => void) {
    const btn = this.add.rectangle(x, y, 220, 56, bg, 1)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontSize: '20px',
      fontFamily: 'Arial Black, sans-serif',
      color: textColor,
    }).setOrigin(0.5);
    btn.on('pointerdown', cb);
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout', () => btn.setAlpha(1));
  }
}
