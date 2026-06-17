import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import {
  CreateSessionUseCase,
  ListOpenSessionsUseCase,
  GetHistoryUseCase,
  GameHistoryEventDto,
  LeaveSessionUseCase,
  ReconnectUseCase,
  DeleteSessionUseCase,
  GetSessionPlayersUseCase,
  JoinSessionUseCase,
  GenerateInviteUseCase,
  GetResultsUseCase,
  MoveFigureUseCase,
  StartSessionUseCase,
  GetPossibleMovesUseCase,
  GetLobbyUseCase,
  UpdateLobbySettingsUseCase,
} from '../../application';
import { GetGameStateUseCase } from '../../application/use-cases/get-game-state.use-case';
import { RollDiceUseCase } from '../../application/use-cases/roll-dice.use-case';
import { SessionNotFoundError } from '../../application/use-cases/errors';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from '../../../auth/application/auth.service';
import { ThrottlerModule } from '@nestjs/throttler';

describe('SessionsController', () => {
  let controller: SessionsController;
  let mockGetHistoryUseCase: jest.Mocked<GetHistoryUseCase>;

  beforeEach(async () => {
    mockGetHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetHistoryUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 10 * 60 * 1000,
            limit: 1000,
          },
        ]),
      ],
      controllers: [SessionsController],
      providers: [
        { provide: CreateSessionUseCase, useValue: {} },
        { provide: ListOpenSessionsUseCase, useValue: {} },
        { provide: GetGameStateUseCase, useValue: {} },
        { provide: LeaveSessionUseCase, useValue: {} },
        { provide: ReconnectUseCase, useValue: {} },
        { provide: RollDiceUseCase, useValue: {} },
        { provide: MoveFigureUseCase, useValue: {} },
        { provide: StartSessionUseCase, useValue: {} },
        { provide: GetPossibleMovesUseCase, useValue: {} },
        { provide: GetLobbyUseCase, useValue: {} },
        { provide: UpdateLobbySettingsUseCase, useValue: {} },
        { provide: DeleteSessionUseCase, useValue: {} },
        { provide: GetSessionPlayersUseCase, useValue: {} },
        { provide: JoinSessionUseCase, useValue: {} },
        { provide: GenerateInviteUseCase, useValue: {} },
        { provide: GetResultsUseCase, useValue: {} },
        { provide: GetHistoryUseCase, useValue: mockGetHistoryUseCase },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  describe('getHistory', () => {
    it('should return game history on success', async () => {
      const history: GameHistoryEventDto[] = [
        {
          id: 1,
          sequenceNr: 1,
          sessionId: 'session-1',
          participantId: 'part-1',
          actionType: 'ROLL',
          diceValue: 6,
          figureId: null,
          fromPosition: null,
          toPosition: null,
          outcome: null,
          createdAt: '2026-06-13T12:00:00.000Z',
        },
      ];
      mockGetHistoryUseCase.execute.mockResolvedValue(history);

      const response = await controller.getHistory('session-1');
      expect(response).toBe(history);
      expect(mockGetHistoryUseCase.execute).toHaveBeenCalledWith('session-1');
    });

    it('should throw NotFoundException if session is not found', async () => {
      mockGetHistoryUseCase.execute.mockRejectedValue(new SessionNotFoundError());

      await expect(controller.getHistory('session-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
