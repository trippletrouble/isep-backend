import { ApiProperty } from '@nestjs/swagger';

export class PublicProfileResponseDto {
  @ApiProperty({ description: 'Internal user ID' })
  id: string;

  @ApiProperty({ description: 'Display name of the player' })
  username: string;
}
