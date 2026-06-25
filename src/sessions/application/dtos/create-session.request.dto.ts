import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { LobbySettingsDto } from './lobby-settings.dto';

export class CreateSessionRequestDto {
  constructor(settings: LobbySettingsDto) {
    this.settings = settings;
  }

  @IsDefined()
  @ValidateNested()
  @Type(() => LobbySettingsDto)
  settings: LobbySettingsDto;
}
