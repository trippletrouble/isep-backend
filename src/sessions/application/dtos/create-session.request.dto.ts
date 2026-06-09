import {LobbySettings as settings} from '../../domain/model/lobby-settings.model';
export class CreateSessionRequestDto {
  constructor(hostId:string, settings:settings){this.hostId = hostId; this.settings = settings;}
  hostId: string;
  settings: settings;
}
