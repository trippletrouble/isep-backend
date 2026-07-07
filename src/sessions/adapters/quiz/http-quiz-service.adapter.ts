import { Injectable } from '@nestjs/common';
import { appConfig } from '@common';
import { QuizQuestion, QuizServicePort } from '../../ports';

@Injectable()
export class HttpQuizServiceAdapter extends QuizServicePort {
  private readonly baseUrl: string;
  private readonly questionCache: Map<string, QuizQuestion> = new Map();

  constructor() {
    super();
    this.baseUrl = appConfig.quiz_service_url;
  }

  async getRandomQuestion(): Promise<QuizQuestion | null> {
    try {
      const response = await fetch(`${this.baseUrl}/quiz/random`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as unknown;
      const question = this.mapQuestion(body);

      if (question) {
        this.questionCache.set(question.id, question);
      }

      return question;
    } catch {
      return null;
    }
  }
  private mapQuestion(body: unknown): QuizQuestion | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const obj = body as Record<string, unknown>;

    if (
      typeof obj.id !== 'string' ||
      typeof obj.category !== 'string' ||
      typeof obj.question !== 'string' ||
      !Array.isArray(obj.answerOptions) ||
      typeof obj.correctAnswerId !== 'string'
    ) {
      return null;
    }

    const mappedOptions: QuizQuestion['answerOptions'] = [];

    for (const option of obj.answerOptions) {
      if (!option || typeof option !== 'object') {
        return null;
      }

      const optionObj = option as Record<string, unknown>;

      if (
        typeof optionObj.id !== 'string' ||
        typeof optionObj.text !== 'string'
      ) {
        return null;
      }

      mappedOptions.push({
        id: optionObj.id,
        text: optionObj.text,
      });
    }

    if (!mappedOptions.some((option) => option.id === obj.correctAnswerId)) {
      return null;
    }

    return {
      id: obj.id,
      category: obj.category,
      question: obj.question,
      answerOptions: mappedOptions,
      correctAnswerId: obj.correctAnswerId,
      timeLimitSeconds:
        typeof obj.timeLimitSeconds === 'number' ? obj.timeLimitSeconds : 15,
    };
  }

  async getCorrectAnswerId(questionId: string): Promise<string | null> {
    const cached = this.questionCache.get(questionId);
    return cached?.correctAnswerId ?? null;
  }
}
