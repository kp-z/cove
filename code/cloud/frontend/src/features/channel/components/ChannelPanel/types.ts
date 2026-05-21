export type MessageSender = 'user' | 'agent' | 'system';

export interface Message {
  message_id: string;
  thread_id: string;
  sender: MessageSender;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  timestamp: Date;
  is_streaming?: boolean;
}
