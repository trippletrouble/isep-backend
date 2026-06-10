# Ludo (Mensch ärgere dich nicht) Core Game Logic Context & Specifications

This document provides complete domain context, architectural specifications, coordinate mapping formulas, and core rule validation details for the turn-based Ludo game platform. 

Copy this entire document and paste it into Claude Web AI to generate the core game logic classes.

---

## 1. Architectural Context (Hexagonal Architecture)

The backend is structured using Hexagonal Architecture (Domain-Driven, Ports & Adapters):
1. **Domain Models** (`src/game/domain/model/`): Pure TypeScript classes and types. No NestJS, Prisma, or external framework dependencies. They enforce business rules and validate state transitions.
2. **Outbound Ports** (`src/game/ports/`): Interfaces defining repository contracts (e.g., `GameRepositoryPort`) used by the application layer.
3. **Application Services** (`src/game/application/`): Orchestrate the execution flow, load/save domain entities from/to persistence, update the Redis write-through cache, and coordinate with external microservices (like the Dice Microservice).
4. **Adapters** (`src/game/adapters/`): 
   - **API (Driving)**: Handles HTTP requests, authentication guards (`SessionCookieAuth`), and response wrappers.
   - **Persistence (Driven)**: Implements database storage using Prisma ORM.

---

## 2. Domain Types & Enums

Use these exact TypeScript enums and interfaces for your implementation:

```typescript
export enum GameStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED'
}

export enum PlayerColor {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW'
}

export enum PieceStatus {
  HOME = 'HOME',       // In the yard/base (position = -1)
  ACTIVE = 'ACTIVE',   // On the playable track (position >= 0)
  GOAL = 'GOAL'        // Reached the end goal (position = 45)
}

export enum PlayerType {
  HUMAN = 'HUMAN'
}

export enum GameMode {
  CLASSIC = 'CLASSIC'
}

export enum BoardTheme {
  CLASSIC = 'CLASSIC'
}

export enum AdditionalRule {
  THROW_AGAIN_ON_6 = 'THROW_AGAIN_ON_6',
  THREE_SIXES_LOSE_TURN = 'THREE_SIXES_LOSE_TURN'
}

export enum MoveOutcome {
  MOVED = 'MOVED',
  CAPTURED = 'CAPTURED',
  GOAL = 'GOAL',
  GAME_WON = 'GAME_WON'
}

export enum GameHistoryActionType {
  ROLL = 'ROLL',
  MOVE = 'MOVE',
  CAPTURE = 'CAPTURE',
  GOAL = 'GOAL',
  GAME_START = 'GAME_START',
  GAME_END = 'GAME_END'
}

export enum UserRole {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN'
}
```

### Domain Interfaces (Data Contracts)

#### `Session` (Game State Container)
```typescript
export interface Session {
  id: string;                         // UUID
  status: GameStatus;                 // WAITING | IN_PROGRESS | FINISHED
  mode: GameMode;
  boardTheme: BoardTheme;
  numberOfPlayers: number;            // 2 to 4
  isPrivate: boolean;
  inviteToken?: string;
  turnTimeLimitSeconds?: number;
  additionalRules: AdditionalRule[];   // THROW_AGAIN_ON_6, THREE_SIXES_LOSE_TURN
  hostId: string;                     // Host User UUID
  currentPlayerId?: string;           // Participant UUID of player whose turn it is
  turnNumber: number;                 // Incremented on every turn change
  lastDiceValue?: number;             // 1 to 6
  diceRolledThisTurn: boolean;        // Prevents duplicate rolls
  consecutiveSixes: number;           // Track consecutive 6s for rule checking
  winnerId?: string;                  // Winner Participant UUID
  startedAt?: Date;
  finishedAt?: Date;
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `GameParticipant` (Player Session Reference)
```typescript
export interface GameParticipant {
  id: string;                         // UUID
  sessionId: string;                  // UUID
  userId: string;                     // UUID referencing User table
  color: PlayerColor;                 // RED | BLUE | GREEN | YELLOW
  type: PlayerType;
  isBot: boolean;
  isCurrentTurn: boolean;
  hasFinished: boolean;
  figuresInGoal: number;               // 0 to 4
  placement?: number;                 // 1 (first), 2 (second), etc.
  figuresCaptured: number;            // Capture counter
  joinedAt: Date;
  updatedAt: Date;
}
```

#### `Figure` (Pawn Representation)
Each player owns exactly 4 figures.
```typescript
export interface Figure {
  id: number;                         // 1, 2, 3, or 4 (composite primary key with sessionId)
  sessionId: string;
  participantId: string;
  position: number;                   // -1 (HOME), 0 (START) to 45 (GOAL)
  status: PieceStatus;                // HOME | ACTIVE | GOAL
  updatedAt: Date;
}
```

---

## 3. Ludo Coordinate System & Track Mappings

To implement collision detection and movement paths, we map the game board using a **Relative Coordinates System** mapped to an **Absolute Grid** for collisions.

### Relative Path (Per Player Perspective)
* **`-1` (HOME)**: The figure is in the yard.
* **`0` (START)**: The player's first square on the common board.
* **`0` to `39` (Common Track)**: 40 shared squares on the board.
* **`40` to `44` (Home Run / Safe Zone)**: 5 color-specific private squares leading to the goal.
* **`45` (GOAL)**: The destination base. Once here, status changes to `GOAL`.

### Absolute Board Mapping (Collision Grid)
Collision detection only happens on the **Common Track** (relative positions `0` to `39`). We calculate absolute indices to determine if two players' figures occupy the same space:

| Player Color | Starting Offset (Absolute Space) | Home Run Entry (Relative 40 maps here) |
| :--- | :--- | :--- |
| **RED** | `0` | Returns to absolute `39` |
| **BLUE** | `10` | Returns to absolute `9` |
| **YELLOW** | `20` | Returns to absolute `19` |
| **GREEN** | `30` | Returns to absolute `29` |

#### Conversion Formula:
If a figure has `status === PieceStatus.ACTIVE` and relative position $R$ is between `0` and `39`:
$$\text{Absolute Space} = (\text{Starting Offset} + R) \bmod 40$$

---

## 4. Core Game Engine Rules & State Transitions

### A. Turn Scheduling & Initialization
* The game starts via `POST /sessions/{id}/start` by the host (minimum 2 players).
* Turn order progresses through the active colors: `RED` $\rightarrow$ `BLUE` $\rightarrow$ `YELLOW` $\rightarrow$ `GREEN` (skipping any colors not assigned to a participant).
* Each player's 4 figures start at `position = -1` (`PieceStatus.HOME`).

### B. Dice Rolling (`POST /sessions/{id}/rolls`)
* The active player rolls the dice (handled via application layer requesting from a dice microservice).
* The engine validates that it is indeed the player's turn and that they haven't rolled yet.
* **Rules for Roll Outcomes**:
  1. **Spawn Condition**: If a player rolls a `6` and has at least one figure in `HOME` (`-1`), they can spawn that figure to the starting space (`0`).
  2. **Three Sixes Forfeit**: If `AdditionalRule.THREE_SIXES_LOSE_TURN` is active, and the player rolls a `6` three times in a row (`consecutiveSixes === 3`), the turn is immediately forfeited. The turn resets `consecutiveSixes = 0`, sets `diceRolledThisTurn = false`, and advances the turn to the next player.
  3. **No Possible Moves**: The engine must compute all legal moves for the rolled value. If no figures can move (`hasMoves = false`), the turn automatically passes to the next player.

### C. Figure Movement (`POST /sessions/{id}/moves`)
* Moves are applied to a specific figure using the last rolled dice value.
* **Movement Constraints**:
  * Spawning from `HOME` (`-1`) to `START` (`0`) requires a dice roll of `6`.
  * Movement on the Safe Zone / Home Run (`40` to `44`) and `GOAL` (`45`) requires an **exact roll**. 
  * If the dice value exceeds the remaining steps to `45` (e.g., figure is at `43`, roll is `4`), the figure is blocked from moving.
* **Collisions & Capturing**:
  * Calculate the target absolute space of the moving figure.
  * If an opponent's figure is on that absolute space:
    * Reset the opponent's figure's position to `-1` and status to `HOME`.
    * Increment the active player's `figuresCaptured` counter.
    * Return `MoveOutcome.CAPTURED`.
    * (Standard rule) The capturing player gets an **extra turn** (do not advance the turn, reset `diceRolledThisTurn = false`).
* **Safe Zones**:
  * Safe zones (relative positions `40` to `44`) are private and cannot trigger collisions.
* **Turn Succession**:
  * If the player rolled a `6` (and `THROW_AGAIN_ON_6` is enabled), they keep the turn (reset `diceRolledThisTurn = false` so they can roll again).
  * Otherwise (and if no capture occurred), advance the turn to the next participant.

### D. Winning the Game
* When a figure reaches position `45`, set its status to `GOAL` and increment the participant's `figuresInGoal`.
* A participant finishes the game when all 4 figures are in `GOAL` (`figuresInGoal === 4`).
* Assign `placement = 1` to the first player to finish, `2` to the second, etc.
* Set `status = GameStatus.FINISHED` when the first player wins (MVP behavior) or when all players except one have finished.

---

## 5. API Response Envelope Mapping
All responses returned by the adapters must conform to the following formats:
* **Success**: `{ "status": "success", "timestamp": "...", "data": { ... } }`
* **Error**: `{ "status": "error", "code": "ERR_CODE", "message": "...", "timestamp": "..." }`

---

## 6. Prompt to Give Claude Web AI

Copy and paste this prompt into Claude:

> Please write the core Ludo game engine in TypeScript using the rules, schemas, and coordinate mappings in the attached markdown.
>
> Your implementation must include:
> 
> 1. A domain-only class `LudoEngine` (pure TypeScript, no NestJS or Prisma imports).
> 2. `getPossibleMoves(session: Session, participant: GameParticipant, figures: Figure[], diceValue: number): Figure[]`
>    - Computes which figures can legally move.
> 3. `applyMove(session: Session, participant: GameParticipant, figures: Figure[], movingFigureId: number, diceValue: number): { session: Session; participants: GameParticipant[]; figures: Figure[]; outcome: MoveOutcome; nextPlayerId: string; rollAgain: boolean }`
>    - Moves the figure, handles absolute-coordinate mapping, executes captures, updates goal states, checks for win conditions, and schedules the next turn.
> 4. `handleRoll(session: Session, participant: GameParticipant, figures: Figure[], rolledValue: number): { session: Session; hasMoves: boolean; nextPlayerId: string }`
>    - Processes the roll, increments consecutive sixes, handles three-sixes forfeits, and advances turn if no moves are possible.
>
> Return clean, fully typed, production-ready code.
