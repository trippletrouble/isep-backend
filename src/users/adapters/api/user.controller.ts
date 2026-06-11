import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetPublicProfileUseCase } from '../../application/use-cases/get-public-profile.use-case';
import { PublicProfileResponseDto } from '../../application/dtos/public-profile.response.dto';
import { SessionGuard } from '../../../auth/guards/session.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly getPublicProfileUseCase: GetPublicProfileUseCase,
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
}
