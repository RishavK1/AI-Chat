
export interface ChatMessage {
  id: number;
  role: 'user' | 'model';
  content: string;
  isFinal: boolean;
}
