export class DiceNotRolledError extends Error {
  constructor() {
    super('Es wurde noch nicht gewürfelt. Zuerst POST /rolls aufrufen.');
    this.name = 'DiceNotRolledError';
  }
}
