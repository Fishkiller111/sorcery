import type { ChatMessageItem, FreeChatMessage } from '../types/api';
import { unwrapAssistantContent } from './llmContent';

export function findLastAgentIndex(messages: FreeChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role === 'agent' && m.messageKind !== 'media') return i;
  }
  return -1;
}

/** Main overlay: full player/agent conversation in chronological order. */
export function selectMainChatMessages(messages: FreeChatMessage[]): FreeChatMessage[] {
  return messages.filter((m) => m.role === 'player' || m.role === 'agent');
}

export function toBackendAssistantItem(msg: FreeChatMessage): ChatMessageItem {
  return {
    id: msg.id,
    role: 'assistant',
    type: 'text',
    content: unwrapAssistantContent(msg.text),
    tone: msg.tone || '',
    action: msg.action || '',
    is_interrupted: msg.isInterrupted ?? false,
    created_at: msg.timestamp,
  };
}

export function replaceMessageId(
  messages: FreeChatMessage[],
  localId: string,
  serverId: string,
): FreeChatMessage[] {
  return messages.map((m) => (m.id === localId ? { ...m, id: serverId } : m));
}

export function replaceBackendMessageId(
  messages: ChatMessageItem[],
  localId: string,
  serverId: string,
): ChatMessageItem[] {
  return messages.map((m) => (m.id === localId ? { ...m, id: serverId } : m));
}
