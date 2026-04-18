import { buildDeliverySequence } from '../game/BallDelivery.js';
import { resolveOutcome }        from '../game/OutcomeEngine.js';
import { getPlayerName }         from '../game/ScoreStore.js';
import { TIMING_WINDOWS, speedToColor } from '../game/types.js';
import {
  playWhoosh, playHit, playCrowd,
  playSix, playFour, playWicket, playDot, playCountdown,
} from '../game/SoundManager.js';

const TOTAL_BALLS  = 30;
const MAX_WICKETS  = 3;
const CUE_DURATION = 220;
const RESULT_SHOW  = 520;
const NEXT_DELAY   = 180;

const LINE_X   = { off: 262, middle: 195, leg: 128 };
const LENGTH_Y = { short: 368, good: 448, full: 512, yorker: 568 };

// Vibration patterns (ms) — silently ignored on desktop
const VIB = {
  hit:    [40],
  four:   [60, 30, 60],
  six:    [80, 30, 80, 30, 80],
  wicket: [200],
  dot:    [15],
};
function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch (_) {}
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.deliveries      = buildDeliverySequence();
    this.ballIndex       = 0;
    this.runs            = 0;
    this.wickets         = 0;
    this.accepting       = false;
    this.swipeStart      = null;
    this.ballArrivalTime = 0;
    this.currentDelivery = null;

    this.drawBackground(W, H);
    this.createBall(W, H);
    this.createBatOverlay(W, H);
    this.createHUD(W, H);
    this.setupSwipe();
    this.showCountdown(() => this.nextDelivery());
  }

  // ── Background ──────────────────────────────────────────────────────────────

  drawBackground(W, H) {
    // Sky gradient (dark blue)
    this.add.rectangle(W / 2, H * 0.22, W, H * 0.44, 0x0d1f3c);

    const g = this.add.graphics();

    // Crowd silhouettes — drawn first so pitch overlays them
    this.drawCrowd(g, W, H);

    // Outfield grass
    g.fillStyle(0x2d6e1f, 1);
    g.fillRect(0, H * 0.50, W, H * 0.50);

    // Pitch (narrow trapezoid — creates strong depth illusion)
    g.fillStyle(0xc8a96e, 1);
    g.fillPoints([
      { x: W * 0.30,  y: H },
      { x: W * 0.70,  y: H },
      { x: W * 0.525, y: H * 0.28 },
      { x: W * 0.475, y: H * 0.28 },
    ], true);

    // Grass tints flanking pitch
    g.fillStyle(0x4a9c2f, 0.28);
    g.fillPoints([
      { x: W * 0.10, y: H }, { x: W * 0.30, y: H },
      { x: W * 0.475, y: H * 0.28 }, { x: W * 0.36, y: H * 0.28 },
    ], true);
    g.fillPoints([
      { x: W * 0.70, y: H }, { x: W * 0.90, y: H },
      { x: W * 0.64, y: H * 0.28 }, { x: W * 0.525, y: H * 0.28 },
    ], true);

    // Crease lines
    g.lineStyle(2, 0xffffff, 0.55);
    g.lineBetween(W * 0.24, H * 0.72, W * 0.76, H * 0.72); // batting
    g.lineBetween(W * 0.46, H * 0.34, W * 0.54, H * 0.34); // bowling

    // Far stumps (small — bowling end)
    g.lineStyle(2, 0xeeeecc, 0.8);
    [W * 0.487, W * 0.5, W * 0.513].forEach(x => g.lineBetween(x, H * 0.34, x, H * 0.29));
    g.lineStyle(1, 0xeeeecc, 0.8);
    g.lineBetween(W * 0.485, H * 0.29, W * 0.515, H * 0.29);

    // Bowling machine
    g.fillStyle(0x778899, 1);
    g.fillEllipse(W * 0.5, H * 0.25, 26, 20);
    g.fillStyle(0x445566, 1);
    g.fillRect(W * 0.5 - 5, H * 0.22, 10, 7);
    // Machine barrel highlight
    g.lineStyle(1, 0xaabbcc, 0.6);
    g.strokeEllipse(W * 0.5, H * 0.25, 26, 20);

    // Batsman silhouette (bat removed — animated separately)
    this.drawBatsman(g, W, H);

    // Near stumps (batting end — drawn in front of batsman)
    g.lineStyle(5, 0xeeeecc, 1);
    [W * 0.46, W * 0.5, W * 0.54].forEach(x => g.lineBetween(x, H * 0.75, x, H * 0.63));
    g.lineStyle(2, 0xeeeecc, 1);
    g.lineBetween(W * 0.455, H * 0.63, W * 0.545, H * 0.63);

    // Machine glow (alpha set per delivery)
    this.machineGlow = this.add.ellipse(W * 0.5, H * 0.25, 42, 32, 0xffffff, 0);
  }

  drawCrowd(g, W, H) {
    // Stand backdrop
    g.fillStyle(0x0a1220, 0.7);
    g.fillRect(0, 0, W, H * 0.22);

    const jerseys = [0x1a44aa, 0xaa2222, 0x228833, 0x886622, 0x551188, 0x226688];
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);

    [
      { y: H * 0.07, count: 26, r: 4.2 },
      { y: H * 0.13, count: 21, r: 5.2 },
      { y: H * 0.19, count: 16, r: 6.0 },
    ].forEach(({ y, count, r }) => {
      const step = W / count;
      for (let i = 0; i < count; i++) {
        const x  = step * i + step / 2 + rand(-3, 3);
        const dy = rand(-3, 3);

        // Jersey body
        g.fillStyle(jerseys[Math.floor(Math.random() * jerseys.length)], 0.85);
        g.fillEllipse(x, y + dy + r * 1.3, r * 1.8, r * 2.5);

        // Head
        g.fillStyle(0xcc9966, 0.9);
        g.fillCircle(x, y + dy - r * 0.15, r * 0.72);
      }
    });
  }

  drawBatsman(g, W, H) {
    // Pads
    g.fillStyle(0xddddcc, 1);
    g.fillRect(W * 0.44, H * 0.84, 18, H * 0.16);
    g.fillRect(W * 0.52, H * 0.84, 18, H * 0.16);
    // Body
    g.fillStyle(0xe8e8e0, 1);
    g.fillRect(W * 0.42, H * 0.71, 46, H * 0.14);
    // Helmet
    g.fillStyle(0x223366, 1);
    g.fillEllipse(W * 0.5, H * 0.685, 38, 40);
    g.fillRect(W * 0.5 - 22, H * 0.695, 44, 12);
    // Right forearm (holds bat handle)
    g.fillStyle(0xe0e0d8, 1);
    g.fillRect(W * 0.565, H * 0.72, 10, 20);
  }

  // ── Ball (container with seam for spin) ─────────────────────────────────────

  createBall(W, H) {
    this.pitchMarker = this.add.ellipse(W * 0.5, H * 0.55, 32, 14, 0xffff00, 0).setDepth(3);
    this.ballGlow    = this.add.ellipse(0, 0, 50, 50, 0x00ff88, 0).setDepth(5);

    const ballG = this.add.graphics();
    this.ballGraphics = ballG;
    this.redrawBall(ballG);

    // Container holds glow + ball body — lets us spin both together
    this.ballContainer = this.add.container(W * 0.5, -60, [this.ballGlow, ballG])
      .setDepth(6).setScale(0.1).setVisible(false);
  }

  redrawBall(g) {
    g.clear();
    // Body
    g.fillStyle(0xcc2020, 1);
    g.fillCircle(0, 0, 10);
    // Seam (two arcs on opposite sides)
    g.lineStyle(1.5, 0xffeedd, 0.65);
    g.beginPath(); g.arc(0, 0, 7, -0.9, 0.9, false); g.strokePath();
    g.beginPath(); g.arc(0, 0, 7, Math.PI - 0.9, Math.PI + 0.9, true); g.strokePath();
  }

  // ── Bat overlay (animated separately from static batsman) ───────────────────

  createBatOverlay(W, H) {
    const g = this.add.graphics();
    g.fillStyle(0x7a5a2a, 1);
    g.fillRect(-3, -24, 6, 24);    // handle
    g.fillStyle(0xc8a96e, 1);
    g.fillRect(-7,   0, 14, 52);   // blade
    g.lineStyle(1, 0xddbb77, 0.5);
    g.strokeRect(-7, 0, 14, 52);

    this.batContainer = this.add.container(W * 0.572, H * 0.73, [g]).setDepth(7);
  }

  swingBat(swipeDir, isSwipe) {
    if (!isSwipe) return; // tap = no swing animation
    const map = {
      left:     { from: 18,  to: -70 },
      straight: { from:  8,  to: -48 },
      right:    { from: -8,  to:  62 },
    };
    const { from, to } = map[swipeDir] || map.straight;
    this.batContainer.setAngle(from);
    this.tweens.add({
      targets: this.batContainer, angle: to,
      duration: 120, ease: 'Quad.easeIn',
      onComplete: () => this.tweens.add({
        targets: this.batContainer, angle: 0,
        duration: 280, delay: 55, ease: 'Quad.easeOut',
      }),
    });
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────

  createHUD(W, H) {
    // Home button — top left
    const homeBg = this.add.rectangle(46, 88, 76, 34, 0x000000, 0.55).setDepth(9)
      .setInteractive({ useHandCursor: true });
    this.add.text(46, 88, '⌂  HOME', {
      fontSize: '13px', fontFamily: 'Arial Black, sans-serif',
      color: '#aaccff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Home'));
    homeBg.on('pointerdown', () => this.scene.start('Home'));

    // Score panel — top right
    const pW = 148, pH = 52;
    const pX = W - pW / 2 - 8, pY = pH / 2 + 62;
    this.add.rectangle(pX, pY, pW, pH, 0x000000, 0.55).setDepth(9);

    this.overText = this.add.text(pX, pY - 10, '0.0 OVR', {
      fontSize: '13px', fontFamily: 'Arial Black, sans-serif',
      color: '#aaccff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.scoreText = this.add.text(pX, pY + 10, '0 / 0', {
      fontSize: '22px', fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // Result label
    this.resultText = this.add.text(W / 2, H * 0.42, '', {
      fontSize: '52px', fontFamily: 'Arial Black, sans-serif',
      color: '#f5c518', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // Countdown
    this.countdownText = this.add.text(W / 2, H / 2, '', {
      fontSize: '66px', fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff', stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(20);
  }

  updateHUD() {
    const over = Math.floor(this.ballIndex / 6);
    const ball = this.ballIndex % 6;
    this.overText.setText(`${over}.${ball} OVR`);
    this.scoreText.setText(`${this.runs} / ${this.wickets}`);
  }

  // ── Swipe/tap detection ──────────────────────────────────────────────────────

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
      const isSwipe = dist >= 22;
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
      const word = words[i];
      playCountdown(word);
      this.countdownText.setText(word).setVisible(true).setAlpha(1);
      this.tweens.add({
        targets: this.countdownText, alpha: 0,
        duration: 450, delay: 420,
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

    // Machine color pulse (gradient by speed)
    this.machineGlow.setFillStyle(speedToColor(d.speed)).setAlpha(0.92);
    this.tweens.add({ targets: this.machineGlow, alpha: 0, duration: CUE_DURATION });

    // Pitch landing marker
    this.pitchMarker.setPosition(LINE_X[d.line], LENGTH_Y[d.length]).setAlpha(0.92);
    this.tweens.add({ targets: this.pitchMarker, alpha: 0, duration: CUE_DURATION });

    this.time.delayedCall(CUE_DURATION + 60, () => this.launchBall(W, H, d, travel));
  }

  launchBall(W, H, delivery, travel) {
    const startX = W * 0.5, startY = H * 0.25;
    const endX   = LINE_X[delivery.line], endY = H * 0.71;

    this.ballContainer
      .setPosition(startX, startY)
      .setScale(0.10)
      .setAngle(0)
      .setVisible(true);

    // Travel tween — ball grows toward camera
    this.tweens.add({
      targets: this.ballContainer,
      x: endX, y: endY,
      scaleX: 1, scaleY: 1,
      duration: travel,
      ease: 'Quad.easeIn',
    });

    // Spin — visible on slower balls (≥ 950ms), subtle on fast balls
    const spinDeg = travel >= 950
      ? (travel >= 1200 ? 900 : 600)   // slow/super-slow: very visible spin
      : travel >= 650 ? 180 : 60;      // medium/fast: slight wobble only
    this.tweens.add({
      targets: this.ballContainer,
      angle: spinDeg,
      duration: travel,
      ease: 'Linear',
    });

    // Whoosh sound
    playWhoosh(delivery.speed);

    this.ballGlow.setAlpha(0);
    this.ballArrivalTime = this.time.now + travel;
    this.accepting = true;

    this.scheduleGlow(travel);

    // Auto-miss deadline
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
    this.time.delayedCall(travel - dMs,      () => this.ballGlow.setFillStyle(0xffaa00).setAlpha(0.55));
    this.time.delayedCall(travel - pMs,      () => this.ballGlow.setFillStyle(0x00ff88).setAlpha(0.82));
    this.time.delayedCall(travel + pMs,      () => this.ballGlow.setFillStyle(0xff3333).setAlpha(0.55));
    this.time.delayedCall(travel + dMs + 60, () => this.ballGlow.setAlpha(0));
  }

  // ── Shot handling ────────────────────────────────────────────────────────────

  handleShot(swipe, timing, isSwipe = false) {
    const d      = this.currentDelivery;
    const result = resolveOutcome(d.line, swipe, timing, isSwipe);

    this.runs    += result.runs;
    if (result.wicket) this.wickets++;

    this.updateHUD();
    this.ballContainer.setVisible(false);

    // Bat swing animation
    this.swingBat(swipe, isSwipe);

    // Sound + vibration
    if (result.wicket) {
      playWicket(); vibrate(VIB.wicket);
    } else if (result.runs === 6) {
      playSix();    vibrate(VIB.six);
    } else if (result.runs === 4) {
      playFour();   vibrate(VIB.four);
    } else if (result.runs > 0) {
      playHit(result.runs); playCrowd(result.runs); vibrate(VIB.hit);
    } else {
      playDot();    vibrate(VIB.dot);
    }

    this.showResult(result.label, result.wicket, result.runs);

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
      : runs >= 2  ? '#aaffaa'
      : '#cccccc';

    const H = this.scale.height;
    const baseY = H * 0.42;
    this.resultText
      .setText(label).setColor(color)
      .setY(baseY).setAlpha(1).setVisible(true);

    this.tweens.add({
      targets: this.resultText,
      alpha: 0, y: baseY - 55,
      duration: RESULT_SHOW,
      onComplete: () => this.resultText.setVisible(false).setY(baseY),
    });

    if (runs === 6) this.flashSix();
  }

  flashSix() {
    const W = this.scale.width, H = this.scale.height;
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xf5c518, 0.18).setDepth(9);
    this.tweens.add({ targets: flash, alpha: 0, duration: 440, onComplete: () => flash.destroy() });
  }

  showBowledAnimation(onDone) {
    const W = this.scale.width, H = this.scale.height;
    [W * 0.46, W * 0.5, W * 0.54].forEach((x, i) => {
      const s = this.add.rectangle(x, H * 0.69, 5, 44, 0xeeeecc).setDepth(8);
      const angle = (i - 1) * 42 + (Math.random() - 0.5) * 20;
      this.tweens.add({ targets: s, angle, y: H * 0.81, alpha: 0, duration: 560, ease: 'Quad.easeOut' });
    });
    this.cameras.main.shake(260, 0.010);
    this.time.delayedCall(650, onDone);
  }

  endGame() {
    this.scene.start('End', {
      runs: this.runs, wickets: this.wickets,
      balls: this.ballIndex, name: getPlayerName(),
    });
  }
}
