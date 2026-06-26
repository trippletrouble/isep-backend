import { HttpQuizServiceAdapter } from './http-quiz-service.adapter';
import { QuizValidationResult } from '../../ports';

// Mock für appConfig
jest.mock('@common', () => ({
  appConfig: {
    quiz_service_url: 'http://localhost:3101',
  },
}));

describe('HttpQuizServiceAdapter', () => {
  let adapter: HttpQuizServiceAdapter;

  beforeEach(() => {
    adapter = new HttpQuizServiceAdapter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAnswer', () => {
    const questionId = 'q1';
    const correctAnswerId = 'a1';

    it('should send answer to quiz service and return correct validation result', async () => {
      const mockValidationResponse: QuizValidationResult = {
        correct: true,
        correctAnswerId: 'a1',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockValidationResponse),
      });

      const result = await adapter.validateAnswer(questionId, correctAnswerId);

      expect(result).toEqual({
        correct: true,
        correctAnswerId: 'a1',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3101/quiz/validate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionId,
            answerOptionId: correctAnswerId,
          }),
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should return null on validation service error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await adapter.validateAnswer(questionId, correctAnswerId);

      expect(result).toBeNull();
    });

    it('should return null on validation network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      );

      const result = await adapter.validateAnswer(questionId, correctAnswerId);

      expect(result).toBeNull();
    });
  });
});