import type { Delivery, BallLine, BallLength, Phase } from './types';

const LINES: BallLine[] = ['off', 'middle', 'leg'];
const LENGTHS: BallLength[] = ['short', 'good', 'full', 'yorker'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build 20 deliveries for a phase: 3 lines × 4 lengths = 12 unique,
// shuffled with ~8 repeats so each line appears 6-7 times.
function buildPhase(phase: Phase): Delivery[] {
  const base: Delivery[] = [];
  for (const line of LINES) {
    for (const length of LENGTHS) {
      base.push({ line, length, phase });
    }
  }
  // 12 unique + 8 random picks to reach 20
  const extras: Delivery[] = [];
  const shuffledBase = shuffle(base);
  for (let i = 0; i < 8; i++) {
    extras.push({ ...shuffledBase[i % 12] });
  }
  return shuffle([...base, ...extras]);
}

export function buildDeliverySequence(): Delivery[] {
  return [
    ...buildPhase(1),
    ...buildPhase(2),
    ...buildPhase(3),
  ];
}
