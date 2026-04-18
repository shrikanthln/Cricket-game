import type { ScoreEntry } from './types';

const STORE_KEY = 'cricket_scores';
const NAME_KEY = 'cricket_player_name';
const MAX_SCORES = 10;

export function getPlayerName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function savePlayerName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function getTopScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

// Returns rank (1-based) if entry made top 10, else null
export function saveScore(entry: ScoreEntry): number | null {
  const scores = getTopScores();
  scores.push(entry);
  scores.sort((a, b) => b.runs - a.runs);
  const trimmed = scores.slice(0, MAX_SCORES);
  localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  const rank = trimmed.findIndex(s => s.timestamp === entry.timestamp);
  return rank === -1 ? null : rank + 1;
}
