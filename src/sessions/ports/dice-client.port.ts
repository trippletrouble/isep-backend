export abstract class DiceClientPort {
  abstract roll(): Promise<number>;
}
