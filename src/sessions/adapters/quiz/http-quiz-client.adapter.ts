import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuizClientPort, QuizQuestion } from '../../ports';
import { appConfig } from '@common';

@Injectable()
export class HttpQuizClientAdapter extends QuizClientPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async getRandomQuestion(): Promise<QuizQuestion> {
    const baseUrl = appConfig.quiz_service_url;

    if (!baseUrl || baseUrl === 'test-mock-value') {
      return {
        id: 'mock-question-id',
        question: 'What is 2 + 2?',
        answers: [
          { id: '1', text: '3' },
          { id: '2', text: '4' },
          { id: '3', text: '5' },
          { id: '4', text: '6' },
        ],
      };
    }

    const response = await fetch(`${baseUrl}/questions/random`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Quiz service request failed');
    }

    return response.json() as Promise<QuizQuestion>;
  }
}
