import type { BallLine, SwipeDir, TimingZone, ShotResult } from './types';

// Map line to its matching swipe direction
const LINE_SWIPE: Record<BallLine, SwipeDir> = {
  off: 'right',
  middle: 'straight',
  leg: 'left',
};

export function resolveOutcome(
  line: BallLine,
  swipe: SwipeDir,
  timing: TimingZone
): ShotResult {
  const isMatch = LINE_SWIPE[line] === swipe;

  if (timing === 'miss') {
    if (line === 'middle') {
      return { runs: 0, wicket: true, label: 'BOWLED!' };
    }
    return { runs: 0, wicket: false, label: 'DOT' };
  }

  if (isMatch) {
    if (timing === 'perfect') return { runs: 6, wicket: false, label: 'SIX!' };
    return { runs: 4, wicket: false, label: 'FOUR!' };
  }

  // Mismatch
  if (timing === 'perfect') return { runs: 2, wicket: false, label: '2 RUNS' };
  return { runs: 1, wicket: false, label: '1 RUN' };
}
