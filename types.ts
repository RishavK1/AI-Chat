
export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  content: string;
  isFinal: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type AIProvider = 'default' | 'gemini' | 'openai' | 'claude';

export interface ProviderSettings {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
}
