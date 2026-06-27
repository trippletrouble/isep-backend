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
