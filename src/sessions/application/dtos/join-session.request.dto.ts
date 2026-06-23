import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PlayerColor } from '$gen/prisma-client/enums';

export class JoinSessionRequestDto {
  @IsOptional()
  @IsEnum(PlayerColor)
  color?: PlayerColor;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}
