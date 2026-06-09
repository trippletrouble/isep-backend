export type StartSessionInfoType = {
  sessionId: string;
  status: string;
  currentPlayerId: string;
  playerOrder: string[];
  figures: Array<{
    id: number;
    sessionId: string;
    participantId: string;
    position: number;
    status: string;
  }>;
};
