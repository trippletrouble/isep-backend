export type QuizQuestion = {
  id: string;
  category: string;
  question: string;
  answerOptions: {
    id: string;
    text: string;
  }[];
  correctAnswerId: string;
  timeLimitSeconds: number;
};

export type QuizValidationResult = {
  correct: boolean;
  correctAnswerId?: string;
};

export abstract class QuizServicePort {
  abstract getRandomQuestion(): Promise<QuizQuestion | null>;

  abstract validateAnswer(
    questionId: string,
    answerOptionId: string,
  ): Promise<QuizValidationResult | null>;
}
