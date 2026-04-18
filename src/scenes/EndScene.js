import { saveScore } from '../game/ScoreStore.js';

export class EndScene extends Phaser.Scene {
  constructor() { super('End'); }

  create(data) {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1628);

    const over      = Math.floor(data.balls / 6);
    const ball      = data.balls % 6;
    const timestamp = Date.now();
    const isOut     = data.wickets >= 3;

    const rank = saveScore({
      name: data.name || 'Unknown',
      runs: data.runs,
      wickets: data.wickets,
      balls: data.balls,
      timestamp,
    });

    // Header
    this.add.text(W / 2, 90, isOut ? 'GAME OVER' : 'INNINGS COMPLETE', {
      fontSize: '30px',
      fontFamily: 'Arial Black, sans-serif',
      color: isOut ? '#ff4444' : '#f5c518',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(W / 2, 140, data.name || 'Unknown', {
      fontSize: '19px', fontFamily: 'Arial, sans-serif', color: '#aaccff',
    }).setOrigin(0.5);

    // Big run total
    this.add.text(W / 2, 235, `${data.runs}`, {
      fontSize: '100px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(W / 2, 330, `${data.wickets} wkts  •  ${over}.${ball} overs`, {
      fontSize: '17px', fontFamily: 'Arial, sans-serif', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Rank badge
    if (rank !== null) {
      const rankColor = rank === 1 ? '#f5c518' : rank <= 3 ? '#aaaaff' : '#88ffaa';
      this.add.text(W / 2, 380, `#${rank} IN TOP 10  🏏`, {
        fontSize: '21px',
        fontFamily: 'Arial Black, sans-serif',
        color: rankColor,
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);
    }

    // Timestamp
    this.add.text(W / 2, 418, new Date(timestamp).toLocaleString(), {
      fontSize: '12px', fontFamily: 'Arial, sans-serif', color: '#445566',
    }).setOrigin(0.5);

    this.makeButton(W / 2, 510, 'PLAY AGAIN', 0xf5c518, '#0a1628', () => this.scene.start('Game'));
    this.makeButton(W / 2, 590, 'HOME',       0x1a3055, '#ffffff', () => this.scene.start('Home'));
  }

  makeButton(x, y, label, bg, color, cb) {
    const btn = this.add.rectangle(x, y, 220, 56, bg).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontSize: '20px', fontFamily: 'Arial Black, sans-serif', color }).setOrigin(0.5);
    btn.on('pointerdown', cb);
    btn.on('pointerover', () => btn.setAlpha(0.8));
    btn.on('pointerout',  () => btn.setAlpha(1));
  }
}
