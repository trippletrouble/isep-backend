import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DiceClientPort } from '../src/sessions/ports/dice-client.port';
import { PlayerColor, PieceStatus } from '../src/generated/prisma-client/client';

describe('Core Gameloop (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  
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
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Clean the database in dependency order
    await prisma.gameHistoryEvent.deleteMany({});
    await prisma.figure.deleteMany({});
    await prisma.gameParticipant.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('should run a complete core gameloop with 2 players via HTTP requests', async () => {
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

    // 2. User 1 creates a session
    const createRes = await request(app.getHttpServer())
      .post('/sessions')
      .set('Cookie', ['session=sub-user-1'])
      .send({
        settings: {
          numberOfPlayers: 2,
          mode: 'CLASSIC',
          boardTheme: 'CLASSIC',
          isPrivate: false,
          additionalRules: ['THROW_AGAIN_ON_6', 'THREE_SIXES_LOSE_TURN'],
        },
      })
      .expect(201);

    const sessionId = createRes.body.id;
    expect(sessionId).toBeDefined();

    // 3. User 2 joins the session
    // Since there is no Join Session endpoint yet, we inject User 2 directly as a participant
    const hostParticipant = await prisma.gameParticipant.findFirst({
      where: { sessionId, userId: user1.id },
    });
    expect(hostParticipant).toBeDefined();

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

    expect(startRes.body.status).toBe('IN_PROGRESS');
    const currentPlayerId = startRes.body.currentPlayerId;
    expect(currentPlayerId).toBeDefined();

    // Determine starting player's color
    const redIsCurrent = currentPlayerId === user1.id;
    const activeCookie = redIsCurrent ? 'session=sub-user-1' : 'session=sub-user-2';
    const inactiveCookie = redIsCurrent ? 'session=sub-user-2' : 'session=sub-user-1';
    const activeUserId = redIsCurrent ? user1.id : user2.id;
    const inactiveUserId = redIsCurrent ? user2.id : user1.id;

    // 5. Verification of Error: DICE_NOT_ROLLED
    // Trying to move a figure before rolling should fail with 409
    await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/moves`)
      .set('Cookie', [activeCookie])
      .send({
        figureId: 1,
        toPosition: 0,
      })
      .expect(409)
      .then((res) => {
        expect(res.body.code).toBe('DICE_NOT_ROLLED');
      });

    // 6. Verification of Error: NOT_YOUR_TURN
    // Inactive player tries to roll the dice, should fail with 403
    await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/rolls`)
      .set('Cookie', [inactiveCookie])
      .send({})
      .expect(403)
      .then((res) => {
        expect(res.body.code).toBe('NOT_YOUR_TURN');
      });

    // 7. Active player rolls a 3 (no moves possible as all figures are at -1)
    diceMock.roll.mockResolvedValueOnce(3);

    const rollRes1 = await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/rolls`)
      .set('Cookie', [activeCookie])
      .send({})
      .expect(200);

    expect(rollRes1.body.value).toBe(3);
    expect(rollRes1.body.hasMoves).toBe(false);

    // Turn should automatically advance to the next player
    const updatedStateAfterRoll1 = rollRes1.body.gameState;
    expect(updatedStateAfterRoll1.currentPlayerId).toBe(inactiveUserId);

    // 8. Now the second player is active. Let's mock a 6 so they can spawn.
    diceMock.roll.mockResolvedValueOnce(6);

    const rollRes2 = await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/rolls`)
      .set('Cookie', [inactiveCookie])
      .send({})
      .expect(200);

    expect(rollRes2.body.value).toBe(6);
    expect(rollRes2.body.hasMoves).toBe(true);
    expect(rollRes2.body.possibleMoves.length).toBeGreaterThan(0);

    const movableFigureId = rollRes2.body.possibleMoves[0].figureId;

    // Verification of Error: INVALID_MOVE
    // Attempting to move to an illegal position (e.g. 5 instead of 0) should fail with 400
    await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/moves`)
      .set('Cookie', [inactiveCookie])
      .send({
        figureId: movableFigureId,
        toPosition: 5,
      })
      .expect(400)
      .then((res) => {
        expect(res.body.code).toBe('INVALID_MOVE');
      });

    // Move figure from HOME (-1) to START (0)
    const moveRes = await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/moves`)
      .set('Cookie', [inactiveCookie])
      .send({
        figureId: movableFigureId,
        toPosition: 0,
      })
      .expect(200);

    expect(moveRes.body.outcome).toBe('MOVED');
    expect(moveRes.body.toPosition).toBe(0);

    // 9. Win condition simulation
    // We update RED's figures to be near victory so that we can trigger a win condition check
    const redParticipant = await prisma.gameParticipant.findFirst({
      where: { sessionId, userId: user1.id },
    });
    if (!redParticipant) {
      throw new Error('Host participant not found');
    }

    const redFigures = await prisma.figure.findMany({
      where: { sessionId, participantId: redParticipant.id },
      orderBy: { id: 'asc' },
    });
    expect(redFigures.length).toBe(4);

    // Place 3 figures directly in GOAL (56), and 1 figure at 54 (needs a 2 to win)
    await prisma.figure.update({
      where: { sessionId_id: { sessionId, id: redFigures[0].id } },
      data: { position: 56, status: PieceStatus.GOAL },
    });
    await prisma.figure.update({
      where: { sessionId_id: { sessionId, id: redFigures[1].id } },
      data: { position: 56, status: PieceStatus.GOAL },
    });
    await prisma.figure.update({
      where: { sessionId_id: { sessionId, id: redFigures[2].id } },
      data: { position: 56, status: PieceStatus.GOAL },
    });
    await prisma.figure.update({
      where: { sessionId_id: { sessionId, id: redFigures[3].id } },
      data: { position: 54, status: PieceStatus.ACTIVE },
    });

    // Set RED player as the current active player
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        currentPlayerId: user1.id,
        diceRolledThisTurn: false,
        lastDiceValue: null,
      },
    });

    await prisma.gameParticipant.updateMany({
      where: { sessionId },
      data: { isCurrentTurn: false },
    });

    await prisma.gameParticipant.update({
      where: { sessionId_userId: { sessionId, userId: user1.id } },
      data: { isCurrentTurn: true },
    });

    // RED rolls a 2
    diceMock.roll.mockResolvedValueOnce(2);

    const rollRes3 = await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/rolls`)
      .set('Cookie', ['session=sub-user-1'])
      .send({})
      .expect(200);

    expect(rollRes3.body.value).toBe(2);
    expect(rollRes3.body.possibleMoves).toContainEqual({
      figureId: redFigures[3].id,
      fromPosition: 54,
      toPosition: 56,
      capturesOpponent: false,
    });

    // RED moves the 4th figure to 56
    const finalMoveRes = await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/moves`)
      .set('Cookie', ['session=sub-user-1'])
      .send({
        figureId: redFigures[3].id,
        toPosition: 56,
      })
      .expect(200);

    expect(finalMoveRes.body.outcome).toBe('GAME_WON');
    expect(finalMoveRes.body.toPosition).toBe(56);
    expect(finalMoveRes.body.gameState.status).toBe('FINISHED');
    expect(finalMoveRes.body.gameState.winnerId).toBe(user1.id);
  });
});
