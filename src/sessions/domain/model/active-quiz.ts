export class ActiveQuizType {
  id: string;
  questionId: string;
  attackerId: string;
  defenderId: string;
  attackerAnswer: string | null;
  defenderAnswer: string | null;
  attackerCorrect: boolean | null;
  defenderCorrect: boolean | null;
  timeLimitSeconds: number;
  pendingFigureId: number;
  pendingFromPos: number;
  pendingToPos: number;
  diceValue: number;
  createdAt: string;
}
