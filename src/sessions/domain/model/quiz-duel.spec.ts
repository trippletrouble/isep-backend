import { resolveQuizDuel, isQuizDuelComplete } from './quiz-duel';

describe('Quiz Duel Domain Logic', () => {
  describe('resolveQuizDuel', () => {
    it('should return ATTACKER_WIN and captureProceeds true when attacker is correct and defender is incorrect', () => {
      const result = resolveQuizDuel(true, false);
      expect(result.outcome).toBe('ATTACKER_WIN');
      expect(result.captureProceeds).toBe(true);
    });

    it('should return DEFENDER_WIN and captureProceeds false when attacker is incorrect and defender is correct', () => {
      const result = resolveQuizDuel(false, true);
      expect(result.outcome).toBe('DEFENDER_WIN');
      expect(result.captureProceeds).toBe(false);
    });

    it('should return DRAW and captureProceeds true when both are correct', () => {
      const result = resolveQuizDuel(true, true);
      expect(result.outcome).toBe('DRAW');
      expect(result.captureProceeds).toBe(true);
    });

    it('should return DRAW and captureProceeds true when both are incorrect', () => {
      const result = resolveQuizDuel(false, false);
      expect(result.outcome).toBe('DRAW');
      expect(result.captureProceeds).toBe(true);
    });
  });

  describe('isQuizDuelComplete', () => {
    it('should return false when both answers are null', () => {
      expect(isQuizDuelComplete(null, null)).toBe(false);
    });

    it('should return false when attacker answer is null', () => {
      expect(isQuizDuelComplete(null, 'answer')).toBe(false);
    });

    it('should return false when defender answer is null', () => {
      expect(isQuizDuelComplete('answer', null)).toBe(false);
    });

    it('should return true when both answers are present', () => {
      expect(isQuizDuelComplete('attacker answer', 'defender answer')).toBe(
        true,
      );
    });
  });
});
