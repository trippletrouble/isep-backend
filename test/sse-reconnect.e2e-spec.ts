import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DiceClientPort } from '../src/sessions/ports/dice-client.port';
import { PlayerColor } from '../src/generated/prisma-client/client';
import * as http from 'http';

describe('SSE Synchronization & Reconnect (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let serverUrl: string;

  const diceMock = {
    roll: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DiceClientPort)
      .useValue(diceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Listen on a random port to allow real HTTP connections for SSE streaming
    await app.listen(0);
    serverUrl = await app.getUrl();
    prisma = app.get(PrismaService);
    jest.setTimeout(15000);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Clean the database
    await prisma.gameHistoryEvent.deleteMany({});
    await prisma.figure.deleteMany({});
    await prisma.gameParticipant.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
  });

  function connectToSse(url: string, cookie: string): Promise<{
    events: any[];
    close: () => void;
  }> {
    return new Promise((resolve, reject) => {
      const events: any[] = [];
      const req = http.get(
        url,
        {
          headers: {
            Accept: 'text/event-stream',
            Cookie: cookie,
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to connect to SSE: ${res.statusCode}`));
            return;
          }

          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const dataStr = line.slice(6);
                  const data = JSON.parse(dataStr);
                  events.push(data);
                } catch (e) {
                  // Ignore parse errors or empty data
                }
              }
            }
          });

          resolve({
            events,
            close: () => {
              req.destroy();
              res.destroy();
            },
          });
        },
      );

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  async function waitForEvents(conn: { events: any[] }, count: number, timeout = 3000): Promise<void> {
    const start = Date.now();
    while (conn.events.length < count) {
      if (Date.now() - start > timeout) {
        throw new Error(`Timeout waiting for ${count} events. Current count: ${conn.events.length}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  it('should synchronize state immediately on connection and distribute updates correctly on reconnect', async () => {
    let sseConn1: any = null;
    let sseConn2: any = null;

    try {
      // 1. Seed two test users
      const user1 = await prisma.user.create({
        data: {
          id: '1a111111-1111-1111-1111-111111111111',
          username: 'user1',
          keycloakSub: 'sub-user-1',
          role: 'PLAYER',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          id: '2b222222-2222-2222-2222-222222222222',
          username: 'user2',
          keycloakSub: 'sub-user-2',
          role: 'PLAYER',
        },
      });

      // 2. User 1 creates session
      const createRes = await request(app.getHttpServer())
        .post('/sessions')
        .set('Cookie', ['session=sub-user-1'])
        .send({
          settings: {
            numberOfPlayers: 2,
            mode: 'CLASSIC',
            boardTheme: 'CLASSIC',
            isPrivate: false,
            additionalRules: [],
          },
        })
        .expect(201);

      const sessionId = createRes.body.id;

      // 3. User 2 joins (injected in DB)
      await prisma.gameParticipant.create({
        data: {
          sessionId,
          userId: user2.id,
          color: PlayerColor.BLUE,
          isCurrentTurn: false,
          isBot: false,
        },
      });

      // 4. Start the session
      const startRes = await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/start`)
        .set('Cookie', ['session=sub-user-1'])
        .expect(200);

      const initialActivePlayerId = startRes.body.currentPlayerId;
      const user1IsActive = initialActivePlayerId === user1.id;
      const activeCookie = user1IsActive ? 'session=sub-user-1' : 'session=sub-user-2';
      const inactiveCookie = user1IsActive ? 'session=sub-user-2' : 'session=sub-user-1';

      // 5. Connect User 1 to SSE updates
      sseConn1 = await connectToSse(
        `${serverUrl}/sessions/${sessionId}/updates`,
        'session=sub-user-1',
      );

      // Wait for initial sync event to arrive
      await waitForEvents(sseConn1, 1);

      // Verify User 1 immediately receives the current game state on connection (Initial Sync)
      expect(sseConn1.events.length).toBe(1);
      expect(sseConn1.events[0].sessionId).toBe(sessionId);
      expect(sseConn1.events[0].status).toBe('IN_PROGRESS');

      // 6. Active player rolls a dice (value: 6, which allows moves since figures can spawn)
      diceMock.roll.mockResolvedValueOnce(6);

      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/rolls`)
        .set('Cookie', [activeCookie])
        .send({})
        .expect(200);

      // Wait for the SSE event to be broadcasted
      await waitForEvents(sseConn1, 2);

      // Verify User 1's SSE connection received the update
      expect(sseConn1.events.length).toBe(2);
      expect(sseConn1.events[1].lastDiceValue).toBe(6);

      // Let's move the figure to start (0) which passes the turn to the other player (since THROW_AGAIN_ON_6 is inactive)
      const figures = await prisma.figure.findMany({
        where: { sessionId, participant: { userId: initialActivePlayerId } },
      });
      const figureIdToMove = figures[0].id;

      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/moves`)
        .set('Cookie', [activeCookie])
        .send({
          figureId: figureIdToMove,
          toPosition: 0,
        })
        .expect(200);

      // Wait for the move SSE event to be broadcasted
      await waitForEvents(sseConn1, 3);
      expect(sseConn1.events.length).toBe(3);
      // Turn passed to opponent, so lastDiceValue is reset to null
      expect(sseConn1.events[2].lastDiceValue).toBeNull();
      expect(sseConn1.events[2].currentPlayerId).toBe(user1IsActive ? user2.id : user1.id);

      // 7. Simulate network disconnect: Close User 1's SSE connection
      sseConn1.close();
      sseConn1 = null;

      // 8. While disconnected, let the new active player roll a 6 (so they are active and lastDiceValue is 6)
      diceMock.roll.mockResolvedValueOnce(6);

      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/rolls`)
        .set('Cookie', [inactiveCookie])
        .send({})
        .expect(200);

      // 9. Reconnect User 1 to SSE stream
      sseConn2 = await connectToSse(
        `${serverUrl}/sessions/${sessionId}/updates`,
        'session=sub-user-1',
      );

      await waitForEvents(sseConn2, 1);

      // Verify User 1 immediately gets the most recent game state upon reconnection (State Restoration)
      expect(sseConn2.events.length).toBe(1);
      expect(sseConn2.events[0].sessionId).toBe(sessionId);
      expect(sseConn2.events[0].lastDiceValue).toBe(6);
      expect(sseConn2.events[0].currentPlayerId).toBe(user1IsActive ? user2.id : user1.id);
    } finally {
      if (sseConn1) sseConn1.close();
      if (sseConn2) sseConn2.close();
    }
  });
});
