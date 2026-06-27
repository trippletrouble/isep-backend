export interface QuizQuestion {
  id: string;
  question: string;
  answers: { id: string; text: string }[];
}

export abstract class QuizClientPort {
  abstract getRandomQuestion(): Promise<QuizQuestion>;
}
