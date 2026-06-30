import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

type GameMode = 'CLASSIC';
type BoardTheme = 'CLASSIC';
type AdditionalRule =
  | 'THROW_AGAIN_ON_6'
  | 'THREE_SIXES_LOSE_TURN'
  | 'PLAGUE_FLY'
  | 'QUIZ_DUEL';

export class LobbySettingsDto {
  constructor(
    numberOfPlayers: number,
    mode: GameMode,
    boardTheme: BoardTheme,
    isPrivate: boolean,
    turnTimeLimitSeconds: number,
    additionalRules: AdditionalRule[],
  ) {
    this.numberOfPlayers = numberOfPlayers;
    this.mode = mode;
    this.boardTheme = boardTheme;
    this.isPrivate = isPrivate;
    this.turnTimeLimitSeconds = turnTimeLimitSeconds;
    this.additionalRules = additionalRules;
  }

  @IsInt()
  @Min(2)
  @Max(4)
  numberOfPlayers: number;

  @IsOptional()
  @IsIn(['CLASSIC'])
  mode: GameMode;

  @IsOptional()
  @IsIn(['CLASSIC'])
  boardTheme: BoardTheme;

  @IsOptional()
  @IsBoolean()
  isPrivate: boolean;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  turnTimeLimitSeconds: number | null;

  @IsOptional()
  @IsArray()
  @IsIn(
    ['THROW_AGAIN_ON_6', 'THREE_SIXES_LOSE_TURN', 'PLAGUE_FLY', 'QUIZ_DUELL'],
    {
      each: true,
    },
  )
  additionalRules: AdditionalRule[];
}
