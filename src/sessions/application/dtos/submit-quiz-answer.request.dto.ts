import { IsString } from 'class-validator';

export class SubmitQuizAnswerRequestDto {
  @IsString()
  answerId: string;
}
