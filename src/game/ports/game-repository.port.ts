import { Game } from '../domain';

export interface GameRepositoryPort {
  save(game: Game): Promise<Game>;
  findById(id: string): Promise<Game | null>;
}

// Symbol serves as the DI token at runtime.
// The interface above provides compile-time type safety.
// Both are exported under the same name — TypeScript resolves
// the correct one based on usage context (type position vs value position).
export const GameRepositoryPort = Symbol('GameRepositoryPort');
