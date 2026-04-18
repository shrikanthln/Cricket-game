// Timing window as fraction of ball travel time
export const TIMING_WINDOWS = {
  perfect: 0.18,
  decent:  0.35,
};

// Speed range in ms (lower = faster ball)
export const SPEED_MIN = 380;  // super fast
export const SPEED_MAX = 1450; // super slow

// Weighted random speed — biased toward medium but with real extremes
export function randomSpeed() {
  const r = Math.random();
  if (r < 0.08) return rand(380, 520);   // super fast
  if (r < 0.25) return rand(520, 720);   // fast
  if (r < 0.65) return rand(720, 1000);  // medium
  if (r < 0.85) return rand(1000, 1220); // slow
  return rand(1220, 1450);               // super slow
}

function rand(lo, hi) {
  return Math.round(lo + Math.random() * (hi - lo));
}

// Interpolate machine glow color: red (fast) → orange → yellow → teal → blue (slow)
export function speedToColor(ms) {
  const t = Math.max(0, Math.min(1, (ms - 380) / (1450 - 380)));
  const stops = [0xff1111, 0xff8800, 0xffdd00, 0x00cc88, 0x4488ff];
  const seg = t * (stops.length - 1);
  const lo  = Math.floor(seg);
  const hi  = Math.min(lo + 1, stops.length - 1);
  return lerpColor(stops[lo], stops[hi], seg - lo);
}

function lerpColor(c1, c2, t) {
  const r = lerp((c1 >> 16) & 0xff, (c2 >> 16) & 0xff, t);
  const g = lerp((c1 >>  8) & 0xff, (c2 >>  8) & 0xff, t);
  const b = lerp( c1        & 0xff,  c2        & 0xff, t);
  return (r << 16) | (g << 8) | b;
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
