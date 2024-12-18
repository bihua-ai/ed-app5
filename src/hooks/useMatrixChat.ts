import { useState, useRef, useCallback, useEffect } from 'react';
import { MatrixClientUtil } from '../utils/matrixClient';
import { useMessageProfiles } from './useMessageProfiles';
import type { Message } from '../types/matrix';

export function useMatrixChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceMessageSending, setIsVoiceMessageSending] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  
  const clientRef = useRef<any>(null);
  const processedMessagesRef = useRef(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getOrFetchProfile } = useMessageProfiles();

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !isConnected) return;

    try {
      await MatrixClientUtil.sendMessage(newMessage.trim());
      setNewMessage('');
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('发送消息失败');
    }
  }, [newMessage, isConnected]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleVoiceRecording = useCallback(async (blob: Blob) => {
    if (!clientRef.current || !isConnected) return;

    setIsVoiceMessageSending(true);

    try {
      const client = await MatrixClientUtil.initialize();
      const uploadResponse = await client.uploadContent(blob);
      
      const content = {
        body: 'Voice message',
        info: {
          size: blob.size,
          mimetype: blob.type,
        },
        msgtype: 'm.audio',
        url: uploadResponse.content_uri,
      };

      await client.sendMessage(MatrixClientUtil.getDefaultRoomId(), content);
      setIsVoiceMessageSending(false);
      setError(null);
    } catch (err) {
      console.error('Error sending voice message:', err);
      setIsVoiceMessageSending(false);
      setError('发送语音消息失败');
    }
  }, [isConnected]);

  const handleChatAction = useCallback((action: string) => {
    switch (action) {
      case 'analyze':
        // Handle data analysis
        break;
      case 'graph':
        // Handle graph drawing
        break;
      case 'report':
        // Handle report generation
        break;
      case 'new':
        setMessages([]);
        break;
    }
  }, []);

  const processPendingMessages = useCallback(async () => {
    const processedMessages = await Promise.all(
      pendingMessages.map(async (message) => {
        const profile = await getOrFetchProfile(message.sender);
        return {
          ...message,
          avatar: profile?.avatar_url,
          displayName: profile?.displayname || message.sender.split(':')[0].substring(1)
        };
      })
    );

    setMessages(prev => {
      const newMessages = [...prev, ...processedMessages]
        .sort((a, b) => a.timestamp - b.timestamp);
      
      return Array.from(
        new Map(newMessages.map(msg => [msg.id, msg])).values()
      );
    });
    
    setPendingMessages([]);
    setTimeout(scrollToBottom, 100);
  }, [pendingMessages, getOrFetchProfile, scrollToBottom]);

  useEffect(() => {
    if (pendingMessages.length > 0) {
      processPendingMessages();
    }
  }, [pendingMessages, processPendingMessages]);

  const handleTimelineEvent = useCallback(async (event: any) => {
    if (event.getType() === 'm.room.message' && 
        event.getRoomId() === MatrixClientUtil.getDefaultRoomId() &&
        !processedMessagesRef.current.has(event.getId())) {
          
      const messageId = event.getId();
      const sender = event.getSender();
      processedMessagesRef.current.add(messageId);
      
      setPendingMessages(prev => [...prev, {
        id: messageId,
        content: event.getContent().body,
        sender: sender,
        timestamp: event.getTs()
      }]);
    }
  }, []);

  useEffect(() => {
    const initMatrix = async () => {
      try {
        const client = await MatrixClientUtil.initialize();
        clientRef.current = client;
        setIsConnected(true);
        setError(null);

        client.on('Room.timeline', handleTimelineEvent);
        setTimeout(scrollToBottom, 500);

        return () => {
          client.removeListener('Room.timeline', handleTimelineEvent);
        };
      } catch (err) {
        console.error('Matrix init error:', err);
        setError('无法连接到聊天服务器');
        setIsConnected(false);
      }
    };

    initMatrix();

    return () => {
      MatrixClientUtil.cleanup();
    };
  }, [handleTimelineEvent, scrollToBottom]);

  return {
    messages,
    newMessage,
    isConnected,
    error,
    isVoiceMessageSending,
    clientRef,
    messagesEndRef,
    setNewMessage,
    handleSend,
    handleKeyPress,
    handleVoiceRecording,
    handleChatAction,
    scrollToBottom
  };
}