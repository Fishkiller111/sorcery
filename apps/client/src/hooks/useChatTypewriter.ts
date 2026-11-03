import { useCallback, useRef } from 'react';
import { unwrapAssistantContent } from '../utils/llmContent';
import type { FreeChatMessage } from '../types/api';
import { getTypewriterDelay } from '../utils/typewriter';

interface AgentMessageMeta {
  agentName?: string;
  agentAvatar?: string;
  agentColor?: string;
}

export function useChatTypewriter(
  setMessages: React.Dispatch<React.SetStateAction<FreeChatMessage[]>>,
) {
  const pendingTextRef = useRef('');
  const displayedLengthRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTypingIdRef = useRef<string | null>(null);

  const updateMessageText = useCallback(
    (targetId: string, text: string) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === targetId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], text };
        return updated;
      });
    },
    [setMessages],
  );

  const stopTimer = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const clearTypewriter = useCallback(() => {
    stopTimer();
    const remaining = pendingTextRef.current;
    const typingId = currentTypingIdRef.current;
    pendingTextRef.current = '';
    displayedLengthRef.current = 0;
    currentTypingIdRef.current = null;
    if (remaining && typingId) {
      updateMessageText(typingId, remaining);
    }
  }, [stopTimer, updateMessageText]);

  const scheduleTick = useCallback(
    (targetId: string) => {
      const tick = () => {
        const fullText = pendingTextRef.current;
        let i = displayedLengthRef.current;
        if (i >= fullText.length) {
          typingTimerRef.current = null;
          return;
        }
        i += 1;
        displayedLengthRef.current = i;
        updateMessageText(targetId, fullText.slice(0, i));
        const char = fullText[i - 1] ?? '';
        typingTimerRef.current = setTimeout(tick, getTypewriterDelay(char));
      };

      if (!typingTimerRef.current) {
        tick();
      }
    },
    [updateMessageText],
  );

  const ensureAgentBubble = useCallback(
    (newId: string, meta: AgentMessageMeta, text: string, streaming: boolean) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === newId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            text,
            isStreaming: streaming,
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: newId,
            role: 'agent' as const,
            text,
            timestamp: Date.now(),
            agentName: meta.agentName,
            agentAvatar: meta.agentAvatar,
            agentColor: meta.agentColor,
            isStreaming: streaming,
          },
        ];
      });
    },
    [setMessages],
  );

  /** Full WS `text` payloads (proactive, catch-up): skip typewriter to avoid done-race truncation. */
  const handleInstantText = useCallback(
    (content: string, messageId: string | undefined, meta: AgentMessageMeta) => {
      const text = unwrapAssistantContent(content || '');
      if (!text) return;

      stopTimer();
      const newId = messageId || `ws-${Date.now()}`;

      if (currentTypingIdRef.current && currentTypingIdRef.current !== newId) {
        clearTypewriter();
      }

      pendingTextRef.current = text;
      displayedLengthRef.current = text.length;
      currentTypingIdRef.current = newId;
      ensureAgentBubble(newId, meta, text, true);
    },
    [clearTypewriter, ensureAgentBubble, stopTimer],
  );

  const handleTextChunk = useCallback(
    (content: string, messageId: string | undefined, meta: AgentMessageMeta) => {
      const chunk = unwrapAssistantContent(content || '');
      if (!chunk) return;

      const newId = messageId || `ws-${Date.now()}`;

      if (currentTypingIdRef.current && currentTypingIdRef.current !== newId) {
        clearTypewriter();
      }

      if (currentTypingIdRef.current !== newId) {
        pendingTextRef.current = '';
        displayedLengthRef.current = 0;
        currentTypingIdRef.current = newId;
        ensureAgentBubble(newId, meta, '', true);
      }

      pendingTextRef.current += chunk;
      scheduleTick(newId);
    },
    [clearTypewriter, ensureAgentBubble, scheduleTick],
  );

  const finalizeCurrentText = useCallback(() => {
    stopTimer();
    const full = pendingTextRef.current;
    const id = currentTypingIdRef.current;
    if (id && full) {
      displayedLengthRef.current = full.length;
      updateMessageText(id, full);
    }
  }, [stopTimer, updateMessageText]);

  const handleTextFinalize = useCallback(
    (content: string, messageId: string | undefined) => {
      const finalText = unwrapAssistantContent(content || '');
      if (!messageId) return;
      stopTimer();
      pendingTextRef.current = finalText;
      displayedLengthRef.current = finalText.length;
      currentTypingIdRef.current = messageId;
      updateMessageText(messageId, finalText);
    },
    [stopTimer, updateMessageText],
  );

  const cleanup = useCallback(() => {
    clearTypewriter();
  }, [clearTypewriter]);

  return {
    handleInstantText,
    handleTextChunk,
    handleTextFinalize,
    finalizeCurrentText,
    clearTypewriter,
    cleanup,
    currentTypingIdRef,
  };
}
