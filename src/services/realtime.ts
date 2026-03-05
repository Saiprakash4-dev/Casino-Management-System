export type RealtimeEventType = 'walletUpdated' | 'betResolved' | 'notificationReceived';

export type RealtimeEvent = {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
};
