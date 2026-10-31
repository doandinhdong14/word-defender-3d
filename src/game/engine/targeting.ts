import { EnemyState } from '../../types/game';
import { normalizeInput, typingAnswers } from './typing';

export function findTargetByFirstChar(
  enemies: EnemyState[],
  firstChar: string
): EnemyState | null {
  const normChar = firstChar.toLowerCase();

  // Find all living, non-pending-defeat enemies with an answer starting with normChar
  const eligible = enemies.filter((enemy) =>
    !enemy.pendingDefeat &&
    typingAnswers(enemy.word, enemy.acceptedAnswers, enemy.mode)
      .some((ans) => normalizeInput(ans).startsWith(normChar))
  );

  if (eligible.length === 0) return null;

  // Sort: Largest Y (closest to bottom defense line), then spawnedAt, then ID
  eligible.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 0.01) {
      return b.y - a.y; // larger Y first
    }
    if (a.spawnedAtGameMs !== b.spawnedAtGameMs) {
      return a.spawnedAtGameMs - b.spawnedAtGameMs;
    }
    return a.id.localeCompare(b.id);
  });

  return eligible[0] || null;
}

export function cycleTarget(
  enemies: EnemyState[],
  currentEnemyId: string | null
): EnemyState | null {
  const activeEnemies = enemies.filter((e) => !e.pendingDefeat);
  if (activeEnemies.length === 0) return null;

  // Deterministic order: sorted by Y descending, then X ascending
  const sorted = [...activeEnemies].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 0.01) return b.y - a.y;
    return a.x - b.x;
  });

  if (!currentEnemyId) {
    return sorted[0];
  }

  const currentIndex = sorted.findIndex((e) => e.id === currentEnemyId);
  if (currentIndex === -1) {
    return sorted[0];
  }

  const nextIndex = (currentIndex + 1) % sorted.length;
  return sorted[nextIndex];
}
