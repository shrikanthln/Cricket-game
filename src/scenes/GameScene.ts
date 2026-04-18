import Phaser from 'phaser';
import { buildDeliverySequence } from '../game/BallDelivery';
import { resolveOutcome } from '../game/OutcomeEngine';
import { getPlayerName } from '../game/ScoreStore';
import type { Delivery, SwipeDir, TimingZone } from '../game/types';
import { PHASE_TRAVEL_MS, PHASE_COLOR, TIMING_WINDOWS } from '../game/types';

const TOTAL_BALLS = 60;
const MAX_WICKETS = 3;
const CUE_DURATION = 300; // ms — machine pulse + marker flash
const RESULT_DURATION = 700; // ms — outcome label shown

// X positions for 3 lines (off=right, middle=center, leg=left) in a 390px canvas
const LINE_X: Record<string, number> = { off: 260, middle: 195, leg: 130 };

// Y for pitch landing zones (perspective depth)
const LENGTH_Y: Record<string, number> = { short: 480, good: 560, full: 620, yorker: 680 };

export class GameScene extends Phaser.Scene {
  private deliveries: Delivery[] = [];
  private ballIndex = 0;
  private runs = 0;
  private wickets = 0;

  private ball!: Phaser.GameObjects.Ellipse;
  private ballGlow!: Phaser.GameObjects.Ellipse;
  private machineGlow!: Phaser.GameObjects.Ellipse;
  private pitchMarker!: Phaser.GameObjects.Ellipse;
  private scoreText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;

  private swipeStart: { x: number; y: number; time: number } | null = null;
  private ballArrivalTime = 0;
  private currentDelivery: Delivery | null = null;
  private accepting = false; // true while ball is in flight and we await swipe

  constructor() { super('Game'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.deliveries = buildDeliverySequence();
    this.ballIndex = 0;
    this.runs = 0;
    this.wickets = 0;

    this.drawBackground(W, H);
    this.createBatsman(W, H);
    this.createBall(W);
    this.createHUD(W);
    this.setupSwipe(W, H);

    this.showCountdown(() => this.nextDelivery());
  }

  // ─── Background ────────────────────────────────────────────────────────────

  private drawBackground(W: number, H: number) {
    // Sky
    this.add.rectangle(W / 2, H * 0.3, W, H * 0.6, 0x1a2a4a);

    const g = this.add.graphics();

    // Pitch perspective — narrows toward vanishing point
    g.fillStyle(0x5a9c3a, 1);
    g.fillPoints([
      { x: W * 0.1, y: H },
      { x: W * 0.9, y: H },
      { x: W * 0.58, y: H * 0.42 },
      { x: W * 0.42, y: H * 0.42 },
    ], true);

    // Pitch surface (lighter strip center)
    g.fillStyle(0xc8a96e, 1);
    g.fillPoints([
      { x: W * 0.3, y: H },
      { x: W * 0.7, y: H },
      { x: W * 0.54, y: H * 0.42 },
      { x: W * 0.46, y: H * 0.42 },
    ], true);

    // Crease lines
    g.lineStyle(2, 0xffffff, 0.6);
    g.lineBetween(W * 0.24, H * 0.75, W * 0.76, H * 0.75); // batting crease
    g.lineBetween(W * 0.44, H * 0.48, W * 0.56, H * 0.48); // bowling crease

    // Stumps (behind batsman view = at bottom, near camera)
    g.lineStyle(4, 0xeeeecc, 1);
    [W * 0.46, W * 0.5, W * 0.54].forEach(x => {
      g.lineBetween(x, H * 0.78, x, H * 0.68);
    });
    // Bails
    g.lineStyle(2, 0xeeeecc, 1);
    g.lineBetween(W * 0.455, H * 0.68, W * 0.545, H * 0.68);

    // Bowling machine (small, at vanishing point)
    g.fillStyle(0x888888, 1);
    g.fillEllipse(W * 0.5, H * 0.38, 36, 28);
    g.fillStyle(0x555555, 1);
    g.fillRect(W * 0.5 - 8, H * 0.34, 16, 10);

    // Store machine glow
    this.machineGlow = this.add.ellipse(W * 0.5, H * 0.38, 50, 40, 0xffffff, 0);
  }

  private createBatsman(W: number, H: number) {
    // Simple batsman silhouette (back view)
    const g = this.add.graphics();
    g.fillStyle(0x1a1a2e, 1);
    // Body
    g.fillRect(W * 0.5 - 22, H * 0.78, 44, 90);
    // Head
    g.fillEllipse(W * 0.5, H * 0.76, 34, 38);
    // Helmet ridge
    g.fillStyle(0x2244aa, 1);
    g.fillRect(W * 0.5 - 20, H * 0.735, 40, 10);
    // Arms / bat (default center position)
    g.fillStyle(0x3a3a5e, 1);
    g.fillRect(W * 0.5 + 14, H * 0.80, 10, 60); // bat handle side
    g.fillStyle(0xc8a96e, 1);
    g.fillRect(W * 0.5 + 18, H * 0.84, 14, 40); // bat blade
  }

  private createBall(W: number) {
    // Glow ring (colored by timing zone)
    this.ballGlow = this.add.ellipse(W * 0.5, -40, 38, 38, 0x00ff88, 0);
    // Ball
    this.ball = this.add.ellipse(W * 0.5, -40, 18, 18, 0xdd3333, 1);
    this.ball.setVisible(false);
    this.ballGlow.setVisible(false);

    // Pitch landing marker
    this.pitchMarker = this.add.ellipse(W * 0.5, 500, 28, 14, 0xffff00, 0);
  }

  private createHUD(W: number) {
    // Score top-right
    this.scoreText = this.add.text(W - 14, 14, this.hudText(), {
      fontSize: '16px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'right',
    }).setOrigin(1, 0).setDepth(10);

    // Result label center
    this.resultText = this.add.text(W / 2, 300, '', {
      fontSize: '48px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // Countdown
    this.countdownText = this.add.text(W / 2, this.scale.height / 2, '', {
      fontSize: '64px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20);
  }

  // ─── Swipe detection ───────────────────────────────────────────────────────

  private setupSwipe(W: number, H: number) {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.accepting) return;
      this.swipeStart = { x: p.x, y: p.y, time: p.time };
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.accepting || !this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      const swipeTime = p.time; // ms since game start
      this.swipeStart = null;
      this.accepting = false;

      const swipe = this.classifySwipe(dx, dy);
      const timing = this.classifyTiming(swipeTime);
      this.handleShot(swipe, timing);
    });
  }

  private classifySwipe(dx: number, dy: number): SwipeDir {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // Straight: more vertical than horizontal, or nearly equal
    if (absDy > absDx * 0.8) return 'straight';
    return dx > 0 ? 'right' : 'left';
  }

  private classifyTiming(swipeTime: number): TimingZone {
    const elapsed = swipeTime - this.ballArrivalTime;
    const travel = PHASE_TRAVEL_MS[this.currentDelivery!.phase];
    // elapsed relative to arrival: negative = early, positive = late
    const deviation = Math.abs(elapsed) / travel;
    if (deviation <= TIMING_WINDOWS.perfect) return 'perfect';
    if (deviation <= TIMING_WINDOWS.decent) return 'decent';
    return 'miss';
  }

  // ─── Countdown ─────────────────────────────────────────────────────────────

  private showCountdown(onDone: () => void) {
    const words = ['READY', 'SET', 'PLAY!'];
    let i = 0;
    const next = () => {
      if (i >= words.length) {
        this.countdownText.setVisible(false);
        onDone();
        return;
      }
      this.countdownText.setText(words[i]).setVisible(true).setAlpha(1);
      this.tweens.add({
        targets: this.countdownText,
        alpha: 0,
        duration: 600,
        delay: 400,
        onComplete: () => { i++; next(); },
      });
    };
    next();
  }

  // ─── Delivery cycle ────────────────────────────────────────────────────────

  private nextDelivery() {
    if (this.ballIndex >= TOTAL_BALLS || this.wickets >= MAX_WICKETS) {
      this.endGame();
      return;
    }

    this.currentDelivery = this.deliveries[this.ballIndex];
    const delivery = this.currentDelivery;
    const W = this.scale.width;
    const H = this.scale.height;
    const travel = PHASE_TRAVEL_MS[delivery.phase];

    // 1. Flash machine with phase color
    this.tweens.add({
      targets: this.machineGlow,
      alpha: { from: 0.8, to: 0 },
      duration: CUE_DURATION,
      onStart: () => this.machineGlow.setFillStyle(PHASE_COLOR[delivery.phase]),
    });

    // 2. Flash pitch marker at landing zone
    const markerX = LINE_X[delivery.line];
    const markerY = LENGTH_Y[delivery.length];
    this.pitchMarker.setPosition(markerX, markerY).setAlpha(0);
    this.tweens.add({
      targets: this.pitchMarker,
      alpha: { from: 0.9, to: 0 },
      duration: CUE_DURATION,
    });

    // 3. After cue, launch ball
    this.time.delayedCall(CUE_DURATION + 80, () => {
      this.launchBall(W, H, delivery, travel);
    });
  }

  private launchBall(W: number, H: number, delivery: Delivery, travel: number) {
    const startX = W * 0.5;
    const startY = H * 0.38;
    const endX = LINE_X[delivery.line];
    const endY = H * 0.76; // arrives near batsman

    this.ball.setPosition(startX, startY).setScale(0.15).setVisible(true);
    this.ballGlow.setPosition(startX, startY).setScale(0.15).setVisible(true).setAlpha(0);

    // Ball travels toward camera — grows in size
    this.tweens.add({
      targets: [this.ball, this.ballGlow],
      x: endX,
      y: endY,
      scaleX: 1,
      scaleY: 1,
      duration: travel,
      ease: 'Quad.easeIn',
    });

    // Record when ball arrives
    this.ballArrivalTime = this.time.now + travel;
    this.accepting = true;

    // Glow timeline: green → yellow → red
    this.scheduleGlow(travel);

    // Auto-miss if no swipe by arrival + decent window end
    const missDeadline = travel + TIMING_WINDOWS.decent * travel + 50;
    this.time.delayedCall(missDeadline, () => {
      if (!this.accepting) return;
      this.accepting = false;
      this.handleShot('straight', 'miss');
    });
  }

  private scheduleGlow(travel: number) {
    const perfectMs = TIMING_WINDOWS.perfect * travel;
    const decentMs = TIMING_WINDOWS.decent * travel;

    // Yellow zone starts
    this.time.delayedCall(travel - decentMs, () => {
      this.ballGlow.setFillStyle(0xffaa00).setAlpha(0.5);
    });
    // Green zone starts (perfect)
    this.time.delayedCall(travel - perfectMs, () => {
      this.ballGlow.setFillStyle(0x00ff88).setAlpha(0.7);
    });
    // Red zone (missed)
    this.time.delayedCall(travel + perfectMs, () => {
      this.ballGlow.setFillStyle(0xff3333).setAlpha(0.5);
    });
    // Fade out
    this.time.delayedCall(travel + decentMs + 60, () => {
      this.ballGlow.setAlpha(0);
    });
  }

  // ─── Shot handling ─────────────────────────────────────────────────────────

  private handleShot(swipe: SwipeDir, timing: TimingZone) {
    const delivery = this.currentDelivery!;
    const result = resolveOutcome(delivery.line, swipe, timing);

    this.runs += result.runs;
    if (result.wicket) this.wickets++;

    this.scoreText.setText(this.hudText());
    this.showResult(result.label, result.wicket);

    // Hide ball
    this.ball.setVisible(false);
    this.ballGlow.setVisible(false);

    if (result.wicket) {
      this.showBowledAnimation(() => {
        this.ballIndex++;
        if (this.wickets >= MAX_WICKETS) {
          this.time.delayedCall(600, () => this.endGame());
        } else {
          this.time.delayedCall(600, () => this.nextDelivery());
        }
      });
    } else {
      this.ballIndex++;
      this.time.delayedCall(RESULT_DURATION, () => this.nextDelivery());
    }
  }

  private showResult(label: string, isWicket: boolean) {
    const color = isWicket ? '#ff4444'
      : label === 'SIX!' ? '#f5c518'
      : label === 'FOUR!' ? '#44aaff'
      : '#ffffff';

    this.resultText.setText(label).setColor(color).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: this.resultText,
      alpha: 0,
      y: this.resultText.y - 30,
      duration: RESULT_DURATION,
      onComplete: () => {
        this.resultText.setVisible(false);
        this.resultText.setY(300);
      },
    });

    if (label === 'SIX!') this.fistPump();
  }

  private fistPump() {
    // Quick screen flash on six
    const W = this.scale.width;
    const H = this.scale.height;
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xf5c518, 0.25).setDepth(9);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
  }

  private showBowledAnimation(onDone: () => void) {
    const W = this.scale.width;
    const H = this.scale.height;

    // Stump scatter
    const positions = [W * 0.46, W * 0.5, W * 0.54];
    const stumps: Phaser.GameObjects.Rectangle[] = positions.map(x => {
      return this.add.rectangle(x, H * 0.73, 4, 40, 0xeeeecc).setDepth(8);
    });

    stumps.forEach((s, i) => {
      const angle = (i - 1) * 35 + (Math.random() - 0.5) * 20;
      this.tweens.add({
        targets: s,
        angle,
        y: H * 0.85,
        alpha: 0,
        duration: 600,
        ease: 'Quad.easeOut',
      });
    });

    // Screen shake
    this.cameras.main.shake(300, 0.012);

    this.time.delayedCall(700, onDone);
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  private hudText(): string {
    const over = Math.floor(this.ballIndex / 6);
    const ball = this.ballIndex % 6;
    return `${over}.${ball}  ${this.runs}/${this.wickets}`;
  }

  private endGame() {
    this.scene.start('End', {
      runs: this.runs,
      wickets: this.wickets,
      balls: this.ballIndex,
      name: getPlayerName(),
    });
  }
}
