import { buildDeliverySequence } from '../game/BallDelivery.js';
import { resolveOutcome } from '../game/OutcomeEngine.js';
import { getPlayerName } from '../game/ScoreStore.js';
import { TIMING_WINDOWS, speedToColor } from '../game/types.js';

const TOTAL_BALLS  = 30;
const MAX_WICKETS  = 3;
const CUE_DURATION = 220;  // ms — machine pulse + marker flash
const RESULT_SHOW  = 520;  // ms — outcome label visible
const NEXT_DELAY   = 180;  // ms — gap between result clearing and next cue

// Screen X for each ball line (canvas width 390)
const LINE_X = { off: 262, middle: 195, leg: 128 };

// Pitch landing marker Y positions (canvas height 844, shifted up)
const LENGTH_Y = { short: 368, good: 448, full: 512, yorker: 568 };

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.deliveries        = buildDeliverySequence();
    this.ballIndex         = 0;
    this.runs              = 0;
    this.wickets           = 0;
    this.accepting         = false;
    this.swipeStart        = null;
    this.ballArrivalTime   = 0;
    this.currentDelivery   = null;

    this.drawBackground(W, H);
    this.createBall(W, H);
    this.createHUD(W, H);
    this.setupSwipe();

    this.showCountdown(() => this.nextDelivery());
  }

  // ── Background ──────────────────────────────────────────────────────────────

  drawBackground(W, H) {
    // Sky
    this.add.rectangle(W / 2, H * 0.22, W, H * 0.44, 0x1a2a4a);

    const g = this.add.graphics();

    // Outfield grass
    g.fillStyle(0x2d6e1f, 1);
    g.fillRect(0, H * 0.50, W, H * 0.50);

    // Pitch (perspective trapezoid — narrower top for more depth illusion)
    g.fillStyle(0xc8a96e, 1);
    g.fillPoints([
      { x: W * 0.3,  y: H },
      { x: W * 0.7,  y: H },
      { x: W * 0.525, y: H * 0.28 },
      { x: W * 0.475, y: H * 0.28 },
    ], true);

    // Grass tint either side of pitch
    g.fillStyle(0x4a9c2f, 0.30);
    g.fillPoints([
      { x: W * 0.1,  y: H },
      { x: W * 0.3,  y: H },
      { x: W * 0.475, y: H * 0.28 },
      { x: W * 0.36, y: H * 0.28 },
    ], true);
    g.fillPoints([
      { x: W * 0.7,  y: H },
      { x: W * 0.9,  y: H },
      { x: W * 0.64, y: H * 0.28 },
      { x: W * 0.525, y: H * 0.28 },
    ], true);

    // Crease lines
    g.lineStyle(2, 0xffffff, 0.55);
    g.lineBetween(W * 0.24, H * 0.72, W * 0.76, H * 0.72); // batting crease
    g.lineBetween(W * 0.46, H * 0.34, W * 0.54, H * 0.34); // bowling crease

    // Far stumps (bowling end, small — near machine)
    g.lineStyle(2, 0xeeeecc, 0.8);
    [W * 0.487, W * 0.5, W * 0.513].forEach(x => {
      g.lineBetween(x, H * 0.34, x, H * 0.29);
    });
    g.lineStyle(1, 0xeeeecc, 0.8);
    g.lineBetween(W * 0.485, H * 0.29, W * 0.515, H * 0.29);

    // Bowling machine (higher = farther away)
    g.fillStyle(0x888899, 1);
    g.fillEllipse(W * 0.5, H * 0.25, 26, 20);
    g.fillStyle(0x555566, 1);
    g.fillRect(W * 0.5 - 5, H * 0.22, 10, 7);

    // Batsman silhouette (back view, foreground)
    this.drawBatsman(g, W, H);

    // Near stumps (batting end) — slightly lower than before
    g.lineStyle(5, 0xeeeecc, 1);
    [W * 0.46, W * 0.5, W * 0.54].forEach(x => {
      g.lineBetween(x, H * 0.75, x, H * 0.63);
    });
    g.lineStyle(2, 0xeeeecc, 1);
    g.lineBetween(W * 0.455, H * 0.63, W * 0.545, H * 0.63);

    // Machine glow (colored before each delivery)
    this.machineGlow = this.add.ellipse(W * 0.5, H * 0.25, 42, 32, 0xffffff, 0);
  }

  drawBatsman(g, W, H) {
    // Legs / pads
    g.fillStyle(0xddddcc, 1);
    g.fillRect(W * 0.44, H * 0.84, 18, H * 0.16);
    g.fillRect(W * 0.52, H * 0.84, 18, H * 0.16);

    // Body (whites)
    g.fillStyle(0xe8e8e0, 1);
    g.fillRect(W * 0.42, H * 0.71, 46, H * 0.14);

    // Head + helmet
    g.fillStyle(0x223366, 1);
    g.fillEllipse(W * 0.5, H * 0.685, 38, 40);
    g.fillRect(W * 0.5 - 22, H * 0.695, 44, 12);

    // Bat (right side)
    g.fillStyle(0xc8a96e, 1);
    g.fillRect(W * 0.565, H * 0.73, 12, 52);
    g.fillStyle(0x8a6a3a, 1);
    g.fillRect(W * 0.578, H * 0.71, 5, 22);
  }

  // ── Ball ────────────────────────────────────────────────────────────────────

  createBall(W, H) {
    this.pitchMarker = this.add.ellipse(W * 0.5, H * 0.55, 32, 14, 0xffff00, 0).setDepth(3);
    this.ballGlow    = this.add.ellipse(W * 0.5, -50, 44, 44, 0x00ff88, 0).setDepth(5);
    this.ball        = this.add.ellipse(W * 0.5, -50, 20, 20, 0xdd2222, 1).setDepth(6);
    this.ball.setVisible(false);
    this.ballGlow.setVisible(false);
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────

  createHUD(W, H) {
    // Home button — top left
    const homeBg = this.add.rectangle(46, 88, 76, 34, 0x000000, 0.55).setDepth(9);
    const homeLabel = this.add.text(46, 88, '⌂  HOME', {
      fontSize: '13px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#aaccff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(10).setInteractive({ useHandCursor: true });

    homeLabel.on('pointerdown', () => this.scene.start('Home'));
    homeBg.setInteractive({ useHandCursor: true });
    homeBg.on('pointerdown', () => this.scene.start('Home'));

    // Semi-transparent score panel — top right
    const panelW = 148;
    const panelH = 52;
    const panelX = W - panelW / 2 - 8;
    const panelY = panelH / 2 + 62;

    this.add.rectangle(panelX, panelY, panelW, panelH, 0x000000, 0.55)
      .setDepth(9);

    // Over counter (top line, smaller)
    this.overText = this.add.text(panelX, panelY - 10, '0.0 OVR', {
      fontSize: '13px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#aaccff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Runs / wickets (bottom line, big)
    this.scoreText = this.add.text(panelX, panelY + 10, '0 / 0', {
      fontSize: '22px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Result label floats center screen
    this.resultText = this.add.text(W / 2, H * 0.42, '', {
      fontSize: '52px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // Countdown
    this.countdownText = this.add.text(W / 2, H / 2, '', {
      fontSize: '66px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20);
  }

  updateHUD() {
    const over = Math.floor(this.ballIndex / 6);
    const ball  = this.ballIndex % 6;
    this.overText.setText(`${over}.${ball} OVR`);
    this.scoreText.setText(`${this.runs} / ${this.wickets}`);
  }

  // ── Swipe ───────────────────────────────────────────────────────────────────

  setupSwipe() {
    this.input.on('pointerdown', (p) => {
      if (!this.accepting) return;
      this.swipeStart = { x: p.x, y: p.y };
    });

    this.input.on('pointerup', (p) => {
      if (!this.accepting || !this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      this.swipeStart = null;
      this.accepting  = false;

      const dist    = Math.sqrt(dx * dx + dy * dy);
      const isSwipe = dist >= 22;                       // under 22px = tap
      const swipe   = isSwipe ? this.classifySwipe(dx, dy) : 'straight';
      const timing  = this.classifyTiming(this.time.now);
      this.handleShot(swipe, timing, isSwipe);
    });
  }

  classifySwipe(dx, dy) {
    if (Math.abs(dy) > Math.abs(dx) * 0.8) return 'straight';
    return dx > 0 ? 'right' : 'left';
  }

  classifyTiming(swipeTime) {
    const elapsed   = swipeTime - this.ballArrivalTime;
    const travel    = this.currentDelivery.speed;
    const deviation = Math.abs(elapsed) / travel;
    if (deviation <= TIMING_WINDOWS.perfect) return 'perfect';
    if (deviation <= TIMING_WINDOWS.decent)  return 'decent';
    return 'miss';
  }

  // ── Countdown ───────────────────────────────────────────────────────────────

  showCountdown(onDone) {
    const words = ['READY', 'SET', 'PLAY!'];
    let i = 0;
    const next = () => {
      if (i >= words.length) { this.countdownText.setVisible(false); onDone(); return; }
      this.countdownText.setText(words[i]).setVisible(true).setAlpha(1);
      this.tweens.add({
        targets: this.countdownText,
        alpha: 0,
        duration: 450,
        delay: 420,
        onComplete: () => { i++; next(); },
      });
    };
    next();
  }

  // ── Delivery cycle ───────────────────────────────────────────────────────────

  nextDelivery() {
    if (this.ballIndex >= TOTAL_BALLS || this.wickets >= MAX_WICKETS) {
      this.endGame(); return;
    }

    this.currentDelivery = this.deliveries[this.ballIndex];
    const d      = this.currentDelivery;
    const W      = this.scale.width;
    const H      = this.scale.height;
    const travel = d.speed;

    // Machine color pulse — gradient from red (fast) to blue (slow)
    this.machineGlow.setFillStyle(speedToColor(d.speed)).setAlpha(0.9);
    this.tweens.add({ targets: this.machineGlow, alpha: 0, duration: CUE_DURATION });

    // Pitch landing marker
    this.pitchMarker.setPosition(LINE_X[d.line], LENGTH_Y[d.length]).setAlpha(0.9);
    this.tweens.add({ targets: this.pitchMarker, alpha: 0, duration: CUE_DURATION });

    this.time.delayedCall(CUE_DURATION + 60, () => this.launchBall(W, H, d, travel));
  }

  launchBall(W, H, delivery, travel) {
    const startX = W * 0.5;
    const startY = H * 0.25;
    const endX   = LINE_X[delivery.line];
    const endY   = H * 0.71;

    this.ball.setPosition(startX, startY).setScale(0.10).setVisible(true);
    this.ballGlow.setPosition(startX, startY).setScale(0.10).setVisible(true).setAlpha(0);

    this.tweens.add({
      targets: [this.ball, this.ballGlow],
      x: endX, y: endY,
      scaleX: 1, scaleY: 1,
      duration: travel,
      ease: 'Quad.easeIn',
    });

    this.ballArrivalTime = this.time.now + travel;
    this.accepting = true;

    this.scheduleGlow(travel);

    // Auto-miss after decent window expires
    const deadline = travel + TIMING_WINDOWS.decent * travel + 60;
    this.time.delayedCall(deadline, () => {
      if (!this.accepting) return;
      this.accepting = false;
      this.handleShot('straight', 'miss', false);
    });
  }

  scheduleGlow(travel) {
    const pMs = TIMING_WINDOWS.perfect * travel;
    const dMs = TIMING_WINDOWS.decent  * travel;

    this.time.delayedCall(travel - dMs,      () => { this.ballGlow.setFillStyle(0xffaa00).setAlpha(0.55); });
    this.time.delayedCall(travel - pMs,      () => { this.ballGlow.setFillStyle(0x00ff88).setAlpha(0.80); });
    this.time.delayedCall(travel + pMs,      () => { this.ballGlow.setFillStyle(0xff3333).setAlpha(0.55); });
    this.time.delayedCall(travel + dMs + 60, () => { this.ballGlow.setAlpha(0); });
  }

  // ── Shot handling ────────────────────────────────────────────────────────────

  handleShot(swipe, timing, isSwipe = false) {
    const d      = this.currentDelivery;
    const result = resolveOutcome(d.line, swipe, timing, isSwipe);

    this.runs    += result.runs;
    if (result.wicket) this.wickets++;

    this.updateHUD();
    this.showResult(result.label, result.wicket, result.runs);

    this.ball.setVisible(false);
    this.ballGlow.setVisible(false);

    if (result.wicket) {
      this.showBowledAnimation(() => {
        this.ballIndex++;
        this.time.delayedCall(400, () => this.nextDelivery());
      });
    } else {
      this.ballIndex++;
      this.time.delayedCall(RESULT_SHOW + NEXT_DELAY, () => this.nextDelivery());
    }
  }

  showResult(label, isWicket, runs) {
    const color = isWicket ? '#ff4444'
      : runs === 6 ? '#f5c518'
      : runs === 4 ? '#44aaff'
      : '#aaffaa';

    const H = this.scale.height;
    const baseY = H * 0.42;
    this.resultText.setText(label).setColor(color).setY(baseY).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: this.resultText,
      alpha: 0,
      y: baseY - 50,
      duration: RESULT_SHOW,
      onComplete: () => { this.resultText.setVisible(false).setY(baseY); },
    });

    if (runs === 6) this.flashSix();
  }

  flashSix() {
    const W = this.scale.width;
    const H = this.scale.height;
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xf5c518, 0.20).setDepth(9);
    this.tweens.add({ targets: flash, alpha: 0, duration: 420, onComplete: () => flash.destroy() });
  }

  showBowledAnimation(onDone) {
    const W = this.scale.width;
    const H = this.scale.height;
    [W * 0.46, W * 0.5, W * 0.54].forEach((x, i) => {
      const s = this.add.rectangle(x, H * 0.69, 5, 44, 0xeeeecc).setDepth(8);
      const angle = (i - 1) * 40 + (Math.random() - 0.5) * 18;
      this.tweens.add({ targets: s, angle, y: H * 0.81, alpha: 0, duration: 560, ease: 'Quad.easeOut' });
    });
    this.cameras.main.shake(260, 0.010);
    this.time.delayedCall(640, onDone);
  }

  endGame() {
    this.scene.start('End', {
      runs: this.runs,
      wickets: this.wickets,
      balls: this.ballIndex,
      name: getPlayerName(),
    });
  }
}
