export interface IEventPublisher {
  publish(eventType: string, channelId: string, payload: Record<string, unknown>): Promise<void>;
}
