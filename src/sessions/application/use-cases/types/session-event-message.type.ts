import { MessageEvent } from '@nestjs/common';
import { SessionEventPayloadMap } from './session-event-payload-map.type';
import { SessionEventType } from './session-event-type.type';

export type SessionEventMessage<T extends SessionEventType = SessionEventType> =
  Omit<MessageEvent, 'type' | 'data'> & {
    type: T;
    data: SessionEventPayloadMap[T];
  };
