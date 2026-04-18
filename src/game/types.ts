export type BallLine = 'off' | 'middle' | 'leg';
export type BallLength = 'short' | 'good' | 'full' | 'yorker';
export type SwipeDir = 'left' | 'straight' | 'right';
export type TimingZone = 'perfect' | 'decent' | 'miss';
export type Phase = 1 | 2 | 3;

export interface Delivery {
  line: BallLine;
  length: BallLength;
  phase: Phase;
}

export interface ShotResult {
  runs: number;
  wicket: boolean;
  label: string; // e.g. "SIX!", "FOUR!", "BOWLED!", "DOT"
}

export interface ScoreEntry {
  name: string;
  runs: number;
  wickets: number;
  balls: number;
  timestamp: number;
}

// Phase travel times in ms
export const PHASE_TRAVEL_MS: Record<Phase, number> = {
  1: 1400,
  2: 1100,
  3: 800,
};

// Phase color pulses (for bowling machine)
export const PHASE_COLOR: Record<Phase, number> = {
  1: 0x4488ff, // blue = slow
  2: 0xff8800, // orange = medium
  3: 0xff2222, // red = fast
};

export const PHASE_LABEL: Record<Phase, string> = {
  1: 'SLOW',
  2: 'MED',
  3: 'FAST',
};

// Timing window as fraction of travel time
// Ball glows green during PERFECT window, yellow during DECENT
export const TIMING_WINDOWS = {
  perfect: 0.18, // ±18% of travel time around arrival
  decent: 0.35,  // ±35%
};
