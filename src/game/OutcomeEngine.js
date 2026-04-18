const LINE_SWIPE = { off: 'right', middle: 'straight', leg: 'left' };

// isSwipe: true = player moved finger (directional shot)
//          false = player tapped (no direction chosen, capped outcome)
export function resolveOutcome(line, swipe, timing, isSwipe) {

  // Miss timing — same for tap or swipe
  if (timing === 'miss') {
    if (line === 'middle') return { runs: 0, wicket: true,  label: 'BOWLED!' };
    return                        { runs: 0, wicket: false, label: 'DOT' };
  }

  // TAP — no directional intent, capped at 3 runs
  if (!isSwipe) {
    if (timing === 'perfect') return { runs: 3, wicket: false, label: '3 RUNS' };
    return                           { runs: 1, wicket: false, label: '1 RUN' };
  }

  // SWIPE — direction matters
  const isMatch = LINE_SWIPE[line] === swipe;

  if (isMatch) {
    if (timing === 'perfect') return { runs: 6, wicket: false, label: 'SIX!' };
    return                           { runs: 4, wicket: false, label: 'FOUR!' };
  }

  // Swipe but wrong direction
  if (timing === 'perfect') return { runs: 2, wicket: false, label: '2 RUNS' };
  return                           { runs: 1, wicket: false, label: '1 RUN' };
}
