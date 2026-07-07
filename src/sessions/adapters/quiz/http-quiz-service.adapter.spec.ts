import { HttpQuizServiceAdapter } from './http-quiz-service.adapter';
import { QuizQuestion } from '../../ports';

// Mock fuer appConfig
jest.mock('@common', () => ({
  appConfig: {
    quiz_service_url: 'http://localhost:3101',
  },
}));

describe('HttpQuizServiceAdapter', () => {
  let adapter: HttpQuizServiceAdapter;

  const quizQuestion: QuizQuestion = {
    id: 'q1',
    category: 'general',
    question: 'What is correct?',
    answerOptions: [
      { id: 'a1', text: 'Correct answer' },
      { id: 'a2', text: 'Wrong answer' },
    ],
    correctAnswerId: 'a1',
    timeLimitSeconds: 30,
  };

  beforeEach(() => {
    adapter = new HttpQuizServiceAdapter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRandomQuestion', () => {
    it('should fetch a random question from the quiz service', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(quizQuestion),
      });

      const result = await adapter.getRandomQuestion();

      expect(result).toEqual(quizQuestion);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3101/quiz/random',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it('should return null on quiz service error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(adapter.getRandomQuestion()).resolves.toBeNull();
    });

    it('should return null on quiz service network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      );

      await expect(adapter.getRandomQuestion()).resolves.toBeNull();
    });
  });

  describe('getCorrectAnswerId', () => {
    it('should return the correct answer id from the cached question', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(quizQuestion),
      });

      await adapter.getRandomQuestion();
      const result = await adapter.getCorrectAnswerId('q1');

      expect(result).toBe('a1');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null when the question is not cached', async () => {
      const result = await adapter.getCorrectAnswerId('unknown-question');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
