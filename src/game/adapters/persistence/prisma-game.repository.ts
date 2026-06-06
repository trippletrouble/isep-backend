import { Injectable } from '@nestjs/common';
import { GameRepositoryPort } from '../../ports/game-repository.port';
import { Game } from '../../domain/model/game';
import { GameMapper } from '../../game.mapper';

@Injectable()
export class PrismaGameRepository implements GameRepositoryPort {
  // constructor(private readonly prisma: PrismaService) {}
  // ^ Uncomment when Prisma schema has a Game model.

  async save(game: Game): Promise<Game> {
    // TODO [BE-X-XX]: Replace with actual Prisma upsert when Game model exists.
    //
    // const record = await this.prisma.game.upsert({
    //   where: { id: game.id },
    //   update: GameMapper.toPersistence(game),
    //   create: GameMapper.toPersistence(game),
    // });
    // return GameMapper.toDomain(record);

    // Stub: return the game as-is (in-memory passthrough)
    return game;
  }

  async findById(id: string): Promise<Game | null> {
    // TODO [BE-X-XX]: Replace with actual Prisma findUnique when Game model exists.
    //
    // const record = await this.prisma.game.findUnique({ where: { id } });
    // return record ? GameMapper.toDomain(record) : null;

    return null;
  }
}
