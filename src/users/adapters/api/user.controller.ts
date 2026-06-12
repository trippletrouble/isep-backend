import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetPublicProfileUseCase } from '../../application/use-cases/get-public-profile.use-case';
import { GetUserStatsUseCase } from '../../application/use-cases/get-user-stats.use-case';
import { PublicProfileResponseDto } from '../../application/dtos/public-profile.response.dto';
import { PlayerStatsResponseDto } from '../../application/dtos/player-stats.response.dto';
import { SessionGuard } from '../../../auth/guards/session.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly getPublicProfileUseCase: GetPublicProfileUseCase,
    private readonly getUserStatsUseCase: GetUserStatsUseCase,
  ) {}

  @Get(':id')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: "Get a player's public profile" })
  @ApiParam({ name: 'id', description: 'Internal user ID' })
  @ApiResponse({
    status: 200,
    description: 'Public profile returned',
    type: PublicProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicProfile(
    @Param('id') id: string,
  ): Promise<PublicProfileResponseDto> {
    return this.getPublicProfileUseCase.execute(id);
  }

  @Get(':id/stats')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: "Get a player's game statistics" })
  @ApiParam({ name: 'id', description: 'Internal user ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistiken geladen.',
    type: PlayerStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserStats(@Param('id') id: string): Promise<PlayerStatsResponseDto> {
    return this.getUserStatsUseCase.execute(id);
  }
}
