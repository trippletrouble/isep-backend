export interface QuizDuelResolution {
  outcome: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW';
  captureProceeds: boolean;
}

export function resolveQuizDuel(
  attackerCorrect: boolean,
  defenderCorrect: boolean,
): QuizDuelResolution {
  if (attackerCorrect && !defenderCorrect) {
    return { outcome: 'ATTACKER_WIN', captureProceeds: true };
  }
  if (!attackerCorrect && defenderCorrect) {
    return { outcome: 'DEFENDER_WIN', captureProceeds: false };
  }
  // Draw (both correct or both wrong) — attacker wins by default
  return { outcome: 'DRAW', captureProceeds: true };
}

export function isQuizDuelComplete(
  attackerAnswer: string | null,
  defenderAnswer: string | null,
): boolean {
  return attackerAnswer !== null && defenderAnswer !== null;
}
