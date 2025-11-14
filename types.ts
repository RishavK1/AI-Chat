
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
