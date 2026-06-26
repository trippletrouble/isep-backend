import { Injectable } from '@nestjs/common';
import { appConfig } from '@common';
import {
  QuizQuestion,
  QuizServicePort,
  QuizValidationResult,
} from '../../ports';

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

  async validateAnswer(
    questionId: string,
    answerOptionId: string,
  ): Promise<QuizValidationResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/quiz/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          answerOptionId,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as unknown;

      return this.mapValidationResult(body);
    } catch {
      return null;
    }
  }
  private mapValidationResult(body: unknown): QuizValidationResult | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const obj = body as Record<string, unknown>;

    if (
      typeof obj.correct !== 'boolean' ||
      typeof obj.correctAnswerId !== 'string'
    ) {
      return null;
    }

    return {
      correct: obj.correct,
      correctAnswerId: obj.correctAnswerId,
    };
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
      typeof obj.correctAnswerId !== 'string' ||
      typeof obj.timeLimitSeconds !== 'number' ||
      !Number.isFinite(obj.timeLimitSeconds) ||
      obj.timeLimitSeconds <= 0
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
      timeLimitSeconds: obj.timeLimitSeconds,
    };
  }
}
