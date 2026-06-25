import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiceClientPort } from '../../ports';
import { appConfig } from '@common';

@Injectable()
export class HttpDiceClientAdapter extends DiceClientPort {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async roll(): Promise<number> {
    const baseUrl = appConfig.dice_service_url;

    if (!baseUrl) {
      const vals = [1, 2, 3, 4, 5, 6];
      return vals[Math.floor(Math.random() * 6)];
    }

    const response = await fetch(`${baseUrl}/roll/6`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Dice service request failed');
    }

    const body = (await response.json()) as { sides?: number; result?: number };

    if (!body.result || body.result < 1 || body.result > 6) {
      throw new Error('Dice service returned invalid value');
    }

    return body.result;
  }
}
