import { Game } from './game';

describe('Game Domain Model', () => {
  it('should create a game with WAITING status', () => {
    const now = new Date();
    const game = new Game('123', 'WAITING', now, now);

    expect(game.id).toBe('123');
    expect(game.status).toBe('WAITING');
    expect(game.createdAt).toBe(now);
    expect(game.updatedAt).toBe(now);
  });

  it('should transition status to IN_PROGRESS when starting', () => {
    const now = new Date();
    const game = new Game('123', 'WAITING', now, now);

    game.start();

    expect(game.status).toBe('IN_PROGRESS');
    expect(game.updatedAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('should throw an error when starting a game not in WAITING status', () => {
    const now = new Date();
    const game = new Game('123', 'IN_PROGRESS', now, now);

    expect(() => game.start()).toThrow('Cannot start game in status "IN_PROGRESS"');
  });

  it('should transition status to FINISHED when finishing', () => {
    const now = new Date();
    const game = new Game('123', 'IN_PROGRESS', now, now);

    game.finish();

    expect(game.status).toBe('FINISHED');
    expect(game.updatedAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('should throw an error when finishing a game not in IN_PROGRESS status', () => {
    const now = new Date();
    const game = new Game('123', 'WAITING', now, now);

    expect(() => game.finish()).toThrow('Cannot finish game in status "WAITING"');
  });
});
