import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiceClientPort } from '../../ports/dice-client.port';

@Injectable()
export class HttpDiceClientAdapter extends DiceClientPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async roll(): Promise<number> {
    const baseUrl = this.config.get<string>('DICE_SERVICE_URL');

    if (!baseUrl) {
      // Für lokale Entwicklung als Fallback.
      // Wenn der Würfelservice zwingend sein soll, stattdessen Error werfen.
      return 6;//Math.floor(Math.random() * 6) + 1;
    }

    const response = await fetch(`${baseUrl}/roll`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Dice service request failed');
    }

    const body = (await response.json()) as { value?: number };

    if (!body.value || body.value < 1 || body.value > 6) {
      throw new Error('Dice service returned invalid value');
    }

    return body.value;
  }
}
