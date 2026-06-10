import { IsInt } from 'class-validator';

export class MoveFigureRequestDto {
  @IsInt()
  figureId: number;

  @IsInt()
  toPosition: number;
}
