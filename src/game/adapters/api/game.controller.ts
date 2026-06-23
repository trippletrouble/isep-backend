import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { GameService } from '../../application';
import { GameResponseDto } from './game.response.dto';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  async create(): Promise<GameResponseDto> {
    const game = await this.gameService.createGame();
    return GameResponseDto.fromDomain(game);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<GameResponseDto> {
    const game = await this.gameService.findGameById(id);
    if (!game) {
      throw new NotFoundException(`Game ${id} not found`);
    }
    return GameResponseDto.fromDomain(game);
  }
}
