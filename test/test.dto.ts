import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class TestCreateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(['active', 'paused', 'finished'])
  status!: string;

  @IsOptional()
  @IsString()
  description?: string;
}