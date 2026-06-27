import { QuizQuestion } from './types';

export abstract class QuizServicePort {
  abstract getRandomQuestion(): Promise<QuizQuestion | null>;
}
