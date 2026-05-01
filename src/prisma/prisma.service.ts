import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma-client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('POSTGRES_URL');
    const adapter = new PrismaPg({
      connectionString: databaseUrl!,
    });

    super({ adapter });
  }
}
