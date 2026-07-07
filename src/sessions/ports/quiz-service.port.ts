import { QuizQuestion } from './types';

export abstract class QuizServicePort {
  abstract getRandomQuestion(): Promise<QuizQuestion | null>;
  abstract getCorrectAnswerId(questionId: string): Promise<string | null>;
}
