export interface Contact {
  id: string;
  name: string;
  avatarUrl?: string;
  type: 'room';
  lastMessage?: string;
  timestamp?: number;
  memberCount?: number;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  avatar?: string;
  displayName?: string;
}