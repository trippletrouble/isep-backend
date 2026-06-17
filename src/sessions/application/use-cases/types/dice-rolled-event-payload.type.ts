export type DiceRolledEventPayload = {
  value: number;
  playerId: string;
  hasMoves: boolean;
  rollAgain: boolean;
  consecutiveSixes: number;
  turnForfeit: boolean;
};
