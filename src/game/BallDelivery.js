import { randomSpeed } from './types.js';

const LINES   = ['off', 'middle', 'leg'];
const LENGTHS = ['short', 'good', 'full', 'yorker'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 30 balls (5 overs) — each ball is fully random: line, length, speed gradient
export function buildDeliverySequence() {
  return Array.from({ length: 30 }, () => ({
    line:   pick(LINES),
    length: pick(LENGTHS),
    speed:  randomSpeed(),   // ms travel time, varies ball to ball
  }));
}
