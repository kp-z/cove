export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateParams {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface LlmAdapter {
  generateResponse(params: GenerateParams): Promise<string>;
}
