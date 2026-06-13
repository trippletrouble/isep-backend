process.env.POSTGRES_URL = 'postgres://myuser:***@localhost:5432/isep_db';
process.env.POSTGRES_USER = 'myuser';
process.env.POSTGRES_PASSWORD = '***ENTFERNT***';
process.env.POSTGRES_DB = 'isep_db';
process.env.POSTGRES_PORT = '5432';
process.env.BACKEND_PORT = '3000';
process.env.KEYCLOAK_URL = 'http://localhost:8080';
process.env.KEYCLOAK_REALM = 'ludo';
process.env.KEYCLOAK_CLIENT_ID = 'ludo-app';
process.env.KEYCLOAK_CLIENT_SECRET = '***ENTFERNT***';
process.env.KEYCLOAK_CALLBACK_URL = 'http://localhost:3000/auth/oauth/callback';
process.env.SESSION_SECRET = '***ENTFERNT***';
process.env.NODE_ENV = 'test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('GameController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/games (POST) - should create a game', async () => {
    const res = await request(app.getHttpServer())
      .post('/games')
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('WAITING');
  });

  it('/games/:id (GET) - should return 404 for unknown game', async () => {
    await request(app.getHttpServer())
      .get('/games/non-existent-id')
      .expect(404);
  });
});
