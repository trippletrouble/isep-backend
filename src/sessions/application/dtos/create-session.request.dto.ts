import { LobbySettings as settings } from '../../domain/model/lobby-settings.model';
export class CreateSessionRequestDto {
  constructor(settings: settings) {
    this.settings = settings;
  }
  settings: settings;
}
