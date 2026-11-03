import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../../src/i18n/I18nContext';
import { COLORS } from '../../src/theme/colors';
import { useAuthStore } from '../../src/stores/authStore';
import { useAiDataConsentStore } from '../../src/stores/aiDataConsentStore';
import { resolveStaticUrl } from '../../src/constants/config';
import {
  getMessages,
  createChatSession,
  interrupt,
  getChatState,
  getChatQuota,
  getVoiceQuota,
  getInspirationReplies,
  uploadChatImage,
  requestPhoto,
} from '../../src/api/chat';
import { sendMessageStream, regenerateMessageStream, triggerEventStream, type ChatStreamCallbacks } from '../../src/api/chatStream';
import { ApiError } from '../../src/api/client';
import { getRole } from '../../src/api/roles';
import { getMe, updateUser } from '../../src/api/user';
import { ChatWebSocket } from '../../src/api/websocket';
import { FreeChatLayer } from '../../src/components/free-chat/FreeChatLayer';
import { ChatQuotaExceededModal } from '../../src/components/free-chat/ChatQuotaExceededModal';
import { ChatSoftUpsellModal } from '../../src/components/free-chat/ChatSoftUpsellModal';
import {
  VoiceQuotaExceededModal,
  shouldShowVoiceQuotaExceededModal,
} from '../../src/components/free-chat/VoiceQuotaExceededModal';
import { ChatInputBar } from '../../src/components/ui/ChatInputBar';
import { InspirationReplies } from '../../src/components/free-chat/InspirationReplies';
import { ChatHistoryDrawer } from '../../src/components/free-chat/ChatHistoryDrawer';
import {
  ChatAgentHistorySidebar,
} from '../../src/components/free-chat/ChatAgentHistorySidebar';
import { FreeChatIconNavRail } from '../../src/components/free-chat/FreeChatIconNavRail';
import { EventMenu } from '../../src/components/free-chat/EventMenu';
import { CharacterInfoPanel } from '../../src/components/free-chat/CharacterInfoPanel';
import { EroticAddictionUnlockModal } from '../../src/components/free-chat/EroticAddictionUnlockModal';
import { FreeChatHeader } from '../../src/components/free-chat/FreeChatHeader';
import { ChatBackgroundPickerModal } from '../../src/components/free-chat/ChatBackgroundPickerModal';
import { VoiceCallOverlay } from '../../src/components/free-chat/VoiceCallOverlay';
import { VipUpgradeModal } from '../../src/components/vip/VipUpgradeModal';
import { ThemedGeneralConfirmModal } from '../../src/components/ui/ThemedGeneralConfirmModal';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import { notifyError, notifyWarning } from '../../src/utils/notify';
import {
  type ChatBackgroundPreference,
  loadChatBackgroundPreference,
  resolveChatBackgroundSource,
  resolveChatBackgroundUri,
} from '../../src/utils/chatBackgroundStore';
import { formatApiError } from '../../src/utils/apiError';
import { streamAudioPlayer, unlockWebAudioAutoplay } from '../../src/utils/streamAudioPlayer';
import { audioPlayer, stopFullAudio } from '../../src/utils/audioPlayer';
import { saveAudio, getAudioBundle } from '../../src/utils/audioStorage';
import { useChatTypewriter } from '../../src/hooks/useChatTypewriter';
import { useVoiceAsr } from '../../src/hooks/useVoiceAsr';
import { useTheme } from '../../src/theme/useTheme';
import type { BondUpdatePayload, EroticAddictionUnlockedWsPayload } from '../../src/types/api';
import type { EroticAddictionUnlockedPayload } from '../../src/api/eroticKinks';
import { DefaultMainBackground } from '../../src/pages/default/components/DefaultMainBackground';
import { TOKENS } from '../../src/pages/default/theme/tokens';
import type { FreeChatUiVariant } from '../../src/components/free-chat/freeChatUi';
import {
  findLastAgentIndex,
  selectMainChatMessages,
  toBackendAssistantItem,
  replaceMessageId,
  replaceBackendMessageId,
} from '../../src/utils/chatMessages';
import { resolveChatQuotaGate } from '../../src/utils/chatQuotaGate';
import { countPlayerMessages, shouldShowFreeChatSoftUpsell } from '../../src/utils/freeChatSoftUpsell';
import { canUseVoiceCall, canRequestPhoto } from '../../src/utils/vipPlans';
import { canUserSeeMature } from '../../src/utils/agentRatingDisplay';
import { isIosSafeContentMode } from '../../src/utils/matureOptIn';
import type { PhotoRequestStyle } from '../../src/components/ui/ChatInputBar';
import { pickChatImage, PhotoPermissionDeniedError } from '../../src/utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../src/utils/promptPhotoLibraryAccessSettings';
import {
  compressImageForUpload,
  EmptyImageError,
  ImageTooLargeError,
} from '../../src/utils/compressImageForUpload';
import { unwrapAssistantContent } from '../../src/utils/llmContent';
import { useMobilePageContentPaddingStyle, useMobileSafeAreaPadding } from '../../src/hooks/useMobileSafeAreaPadding';
import type {
  ChatMessageItem,
  ChatConversationListItem,
  FreeChatMessage,
  RoleDetailResp,
  ChatStateResp,
  ChatQuotaResp,
  VoiceQuotaResp,
} from '../../src/types/api';

function mapBackendMessage(
  msg: ChatMessageItem,
  agentName?: string,
  agentAvatar?: string,
  agentColor?: string,
  playerAvatar?: string,
): FreeChatMessage | null {
  let role: FreeChatMessage['role'] = 'system';
  if (msg.role === 'user') role = 'player';
  else if (msg.role === 'assistant') role = 'agent';

  if (msg.type === 'media') {
    const imageUrl = msg.image_url || parseMediaImageUrl(msg.content);
    if (!imageUrl && role !== 'agent') return null;
    return {
      id: msg.id,
      role,
      text: '',
      imageUrl: imageUrl || undefined,
      messageKind: 'media',
      timestamp: msg.created_at,
      agentName,
      agentAvatar: role === 'agent' ? agentAvatar : undefined,
      agentColor,
      playerAvatar: role === 'player' ? playerAvatar : undefined,
    };
  }

  return {
    id: msg.id,
    role,
    text: msg.role === 'assistant' ? unwrapAssistantContent(msg.content) : msg.content,
    imageUrl: msg.image_url,
    messageKind: msg.type === 'image' ? 'image' : 'text',
    timestamp: msg.created_at,
    agentName,
    agentAvatar: role === 'agent' ? agentAvatar : undefined,
    agentColor,
    playerAvatar: role === 'player' ? playerAvatar : undefined,
    tone: msg.tone,
    action: msg.action,
    isInterrupted: msg.is_interrupted,
  };
}

function parseMediaImageUrl(content: string): string {
  try {
    const parsed = JSON.parse(content) as {
      file_url?: string;
      image_url?: string;
      cover_url?: string;
      content_rating?: string;
      locked_reason?: string;
    };
    const rating = (parsed.content_rating || '').toLowerCase();
    if (rating === 'r' || rating === 'mature' || rating === 'r18' || parsed.locked_reason === 'mature_required') {
      if (isIosSafeContentMode()) return '';
    }
    return parsed.file_url || parsed.image_url || parsed.cover_url || '';
  } catch {
    return '';
  }
}

const GENERATION_TIMEOUT_MS = 90_000;

function withoutEmptyStreamingAgents(messages: FreeChatMessage[]): FreeChatMessage[] {
  return messages.filter((m) => !(m.role === 'agent' && m.isStreaming && !m.text.trim()));
}

export default function RoleChatScreen() {
  const { roleId } = useLocalSearchParams();
  const { t, lang } = useI18n();
  const { themeId } = useTheme();
  const uiVariant: FreeChatUiVariant = themeId === 'default' ? 'default' : 'soviet';
  const isDefaultTheme = uiVariant === 'default';
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const user = useAuthStore((s) => s.user);
  const playerAvatar = user?.avatar_url;
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const insets = useSafeAreaInsets();
  const { width: viewportW, height: viewportH } = useWindowDimensions();
  const { paddingBottom: safeBottomInset } = useMobileSafeAreaPadding();
  /** Keep dock flush to the home indicator; slight reduce so controls sit lower. */
  const inputDockBottomPad = Math.max(safeBottomInset > 0 ? safeBottomInset - 10 : 0, 0);

  const [headerVisible, setHeaderVisible] = useState(true);
  const headerHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerAnim = useRef(new Animated.Value(1)).current;
  const messagesTopPadAnim = useRef(
    new Animated.Value((Platform.OS === 'web' ? 12 : 54) + 96),
  ).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const HEADER_AUTO_HIDE_MS = 3000;

  const roleIdValue = Array.isArray(roleId) ? roleId[0] : roleId;

  const [role, setRole] = useState<RoleDetailResp | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FreeChatMessage[]>([]);
  const [backendMessages, setBackendMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatState, setChatState] = useState<ChatStateResp | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  /** 左栏跨 Agent 列表刷新计数；新建对话后递增 */
  const [conversationRefreshKey, setConversationRefreshKey] = useState(0);
  /** PC 默认展开聊天列表；移动端默认折叠 */
  const [agentHistoryCollapsed, setAgentHistoryCollapsed] = useState(() => !isDesktop);
  /** 左侧图标轨是否展开文字标签（桌面专属；与聊天列表互斥） */
  const [iconRailExpanded, setIconRailExpanded] = useState(false);
  /** PC 默认展开右侧角色信息；移动端默认关闭 */
  const [infoVisible, setInfoVisible] = useState(() => isDesktop);
  const agentHistoryUserToggledRef = useRef(false);
  const infoUserToggledRef = useRef(false);
  // 断点变化时同步默认展开态（用户手动切换过则不再干预）
  useEffect(() => {
    if (!agentHistoryUserToggledRef.current) {
      setAgentHistoryCollapsed(!isDesktop);
      if (isDesktop) setIconRailExpanded(false);
    }
    if (!infoUserToggledRef.current) {
      setInfoVisible(isDesktop);
    }
  }, [isDesktop]);
  const [eventMenuVisible, setEventMenuVisible] = useState(false);
  const [bgPickerVisible, setBgPickerVisible] = useState(false);
  const [eroticUnlockPayload, setEroticUnlockPayload] =
    useState<EroticAddictionUnlockedPayload | null>(null);
  const eroticUnlockSeenRef = useRef<Set<string>>(new Set());
  const [chatBgPref, setChatBgPref] = useState<ChatBackgroundPreference | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [chatQuota, setChatQuota] = useState<ChatQuotaResp | null>(null);
  const [voiceQuota, setVoiceQuota] = useState<VoiceQuotaResp | null>(null);
  const [streamingAudioMsgId, setStreamingAudioMsgId] = useState<string | null>(null);
  const [awaitingTtsMessageId, setAwaitingTtsMessageId] = useState<string | null>(null);
  const [quotaExceededVisible, setQuotaExceededVisible] = useState(false);
  const [softUpsellVisible, setSoftUpsellVisible] = useState(false);
  const softUpsellShownRef = useRef(false);
  const [fairUseLimitedVisible, setFairUseLimitedVisible] = useState(false);
  const [vipUpgradeVisible, setVipUpgradeVisible] = useState(false);
  const [photoRequestLoading, setPhotoRequestLoading] = useState(false);
  const [voiceCallVisible, setVoiceCallVisible] = useState(false);
  /** Locks overlay shell before /call/start: voice → eleven UI, video → livekit UI. */
  const [voiceCallPreferredPath, setVoiceCallPreferredPath] = useState<'eleven' | 'livekit'>(
    'eleven',
  );
  const [voiceQuotaExceededVisible, setVoiceQuotaExceededVisible] = useState(false);
  const [dominance, setDominance] = useState(50);
  const [inspirationItems, setInspirationItems] = useState<string[]>([]);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ imageUrl: string; previewUri: string } | null>(null);

  const clearHeaderHideTimer = useCallback(() => {
    if (headerHideTimerRef.current) {
      clearTimeout(headerHideTimerRef.current);
      headerHideTimerRef.current = null;
    }
  }, []);

  const scheduleHeaderHide = useCallback(() => {
    clearHeaderHideTimer();
    if (historyVisible || infoVisible || eventMenuVisible || bgPickerVisible) return;
    headerHideTimerRef.current = setTimeout(() => {
      headerHideTimerRef.current = null;
      setHeaderVisible(false);
    }, HEADER_AUTO_HIDE_MS);
  }, [clearHeaderHideTimer, historyVisible, infoVisible, eventMenuVisible, bgPickerVisible]);

  const showHeader = useCallback(() => {
    setHeaderVisible(true);
    scheduleHeaderHide();
  }, [scheduleHeaderHide]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: headerVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [headerVisible, headerAnim]);

  const collapsedMessagesTop = Math.max(8, Math.round(insets.top * 0.2));
  const expandedMessagesTop =
    headerHeight > 0 ? headerHeight : (Platform.OS === 'web' ? 12 : insets.top) + 96;

  useEffect(() => {
    Animated.timing(messagesTopPadAnim, {
      toValue: headerVisible ? expandedMessagesTop : collapsedMessagesTop,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [headerVisible, expandedMessagesTop, collapsedMessagesTop, messagesTopPadAnim]);

  useEffect(() => {
    if (loading) return;
    if (historyVisible || infoVisible || eventMenuVisible || bgPickerVisible) {
      clearHeaderHideTimer();
      setHeaderVisible(true);
      return;
    }
    scheduleHeaderHide();
    return () => clearHeaderHideTimer();
  }, [
    loading,
    historyVisible,
    infoVisible,
    eventMenuVisible,
    bgPickerVisible,
    scheduleHeaderHide,
    clearHeaderHideTimer,
  ]);

  const headerRevealZoneHeight = (Platform.OS === 'web' ? 12 : insets.top) + 28;
  const webHeaderHoverProps =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: showHeader,
        } as Record<string, unknown>)
      : {};

  const voiceEnabled = useMemo(() => {
    if (!voiceQuota?.enabled) return false;
    if (voiceQuota.unlimited) return true;
    return (voiceQuota.remaining_hint ?? 0) > 0;
  }, [voiceQuota]);

  const voiceEnabledRef = useRef(voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  const refreshChatQuota = useCallback(async () => {
    try {
      const resp = await getChatQuota();
      setChatQuota(resp);
    } catch (err) {
      console.warn('Failed to load chat quota:', err);
    }
  }, []);

  const refreshVoiceQuota = useCallback(async () => {
    try {
      const resp = await getVoiceQuota();
      setVoiceQuota(resp);
    } catch (err) {
      console.warn('Failed to load voice quota:', err);
    }
  }, []);

  const scheduleRefreshVoiceQuota = useCallback(() => {
    if (refreshVoiceQuotaTimerRef.current) {
      clearTimeout(refreshVoiceQuotaTimerRef.current);
    }
    refreshVoiceQuotaTimerRef.current = setTimeout(() => {
      refreshVoiceQuotaTimerRef.current = null;
      void refreshVoiceQuota();
    }, 800);
  }, [refreshVoiceQuota]);

  const tryShowVoiceQuotaExceeded = useCallback(async () => {
    if (!(await shouldShowVoiceQuotaExceededModal())) return;
    setVoiceQuotaExceededVisible(true);
  }, []);

  const showQuotaGate = useCallback((gate: ReturnType<typeof resolveChatQuotaGate>) => {
    if (gate === 'upgrade') {
      setVipUpgradeVisible(true);
    } else if (gate === 'exhausted') {
      setQuotaExceededVisible(true);
    }
  }, []);

  /** 免费用户本会话玩家消息超过 10 条时弹一次软提醒（不阻断发送） */
  const maybeShowSoftUpsell = useCallback(
    (nextMessages: FreeChatMessage[]) => {
      if (
        !shouldShowFreeChatSoftUpsell({
          unlimited: chatQuota?.unlimited,
          playerMessageCount: countPlayerMessages(nextMessages),
          alreadyShown: softUpsellShownRef.current,
        })
      ) {
        return;
      }
      softUpsellShownRef.current = true;
      setSoftUpsellVisible(true);
    },
    [chatQuota?.unlimited],
  );

  const handleChatQuotaApiError = useCallback(
    (err: ApiError): boolean => {
      if (err.code === 'CHAT_008') {
        void refreshChatQuota();
        setQuotaExceededVisible(true);
        return true;
      }
      if (err.code === 'CHAT_009') {
        setFairUseLimitedVisible(true);
        return true;
      }
      if (err.code === 'CHAT_007') {
        setVipUpgradeVisible(true);
        return true;
      }
      return false;
    },
    [refreshChatQuota],
  );

  const wsRef = useRef<ChatWebSocket | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const generatingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesRef = useRef<FreeChatMessage[]>([]);
  const ttsStreamedRef = useRef(new Set<string>());
  const awaitingTtsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingTtsMessageIdRef = useRef<string | null>(null);
  const streamingAudioMsgIdRef = useRef<string | null>(null);
  const playingMsgIdRef = useRef<string | null>(null);
  const finishAwaitingTtsRef = useRef<(messageId?: string) => void>(() => {});
  const pendingAudioPatchRef = useRef(new Map<string, { data: string; format: 'mp3' | 'wav' }>());
  const refreshVoiceQuotaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TTS_AWAIT_TIMEOUT_MS = 90_000;
  const roleMetaRef = useRef({
    agentName: undefined as string | undefined,
    agentAvatar: undefined as string | undefined,
    agentColor: COLORS.accent.gold,
  });
  const tRef = useRef(t);
  tRef.current = t;

  const { handleInstantText, handleTextChunk, handleTextFinalize, finalizeCurrentText, clearTypewriter, cleanup } =
    useChatTypewriter(setMessages);

  const chatCallbacksRef = useRef({
    handleInstantText,
    handleTextChunk,
    handleTextFinalize,
    finalizeCurrentText,
    clearTypewriter,
    cleanup,
    patchLastAgent: (_patch: Partial<FreeChatMessage>) => {},
    syncAssistantToBackend: (_agentMsg: FreeChatMessage) => {},
    patchMessageAudio: (_msgId: string, _data: string, _format: string) => {},
    stopAllAudio: () => {},
    refreshVoiceQuota: async () => {},
    markAwaitingTts: (_messageId?: string) => {},
    finishAwaitingTts: (_messageId?: string) => {},
    handleStreamAudioChunk: (_data: string, _seq: number, _format: string, _messageId?: string) => {},
    handleStreamAudioDone: (_data: string, _format: string, _messageId?: string) => {},
  });

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const clearWelcomePoll = useCallback(() => {
    if (welcomePollRef.current) {
      clearInterval(welcomePollRef.current);
      welcomePollRef.current = null;
    }
  }, []);

  const agentName = role?.name;
  const agentAvatar = role?.avatar_url;
  const agentColor = isDefaultTheme ? TOKENS.colors.accent : COLORS.accent.gold;
  // Default: agent 立绘 cover-fitted to viewport (web landscape + mobile portrait).
  const resolvedBg = useMemo(
    () =>
      resolveChatBackgroundUri(
        chatBgPref,
        { width: viewportW, height: viewportH },
        role?.figure_url,
        role?.avatar_url,
      ),
    [chatBgPref, viewportH, viewportW, role?.avatar_url, role?.figure_url],
  );
  const backgroundSource = useMemo(
    () => resolveChatBackgroundSource(resolvedBg.uri),
    [resolvedBg.uri],
  );
  const backgroundFallbackColor = resolvedBg.fallbackColor;
  const bgImageStyle =
    resolvedBg.kind === 'figure'
      ? styles.chatBgImageDimFigure
      : isDefaultTheme
        ? styles.chatBgImageDimDefault
        : styles.chatBgImageDim;

  useEffect(() => {
    if (!roleIdValue) {
      setChatBgPref(null);
      return;
    }
    let cancelled = false;
    void loadChatBackgroundPreference(roleIdValue).then((pref) => {
      if (!cancelled) setChatBgPref(pref);
    });
    return () => {
      cancelled = true;
    };
  }, [roleIdValue]);

  const canVoiceCall = canUseVoiceCall(user?.vip);
  const canPhotoRequest = canRequestPhoto(user?.vip);
  const showNsfwPhotoStyle = canUserSeeMature(user);
  const showSexyPhotoStyle = !isIosSafeContentMode();
  const hasElevenVoice = Boolean(role?.voice_reference_id?.trim());
  const callDisabled = !sessionId || isGenerating || voiceCallVisible;

  const mainMessages = useMemo(() => selectMainChatMessages(messages), [messages]);

  const isThinking = useMemo(() => {
    if (!isGenerating) return false;
    const streamingAgent = [...messages].reverse().find((m) => m.role === 'agent' && m.isStreaming);
    if (!streamingAgent) return true;
    return streamingAgent.text.trim().length === 0;
  }, [isGenerating, messages]);

  const inspirationAnchor = useMemo(() => {
    for (let i = backendMessages.length - 1; i >= 0; i--) {
      const msg = backendMessages[i];
      if (msg.role === 'assistant' || msg.role === 'user') {
        return msg.id;
      }
    }
    return 'empty';
  }, [backendMessages]);

  useEffect(() => {
    awaitingTtsMessageIdRef.current = awaitingTtsMessageId;
  }, [awaitingTtsMessageId]);

  useEffect(() => {
    streamingAudioMsgIdRef.current = streamingAudioMsgId;
  }, [streamingAudioMsgId]);

  useEffect(() => {
    playingMsgIdRef.current = playingMsgId;
  }, [playingMsgId]);

  const shouldDeferInspiration = useCallback(() => {
    return (
      !!awaitingTtsMessageIdRef.current ||
      !!streamingAudioMsgIdRef.current ||
      !!playingMsgIdRef.current ||
      streamAudioPlayer.isAnyPlaying() ||
      audioPlayer.isPlaying()
    );
  }, []);

  useEffect(() => {
    if (!sessionId || !roleIdValue || loading || isGenerating || shouldDeferInspiration()) {
      if (isGenerating) {
        setInspirationItems([]);
      }
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled || shouldDeferInspiration()) return;
      void (async () => {
        if (cancelled || shouldDeferInspiration()) return;
        setInspirationLoading(true);
        try {
          const resp = await getInspirationReplies(sessionId, roleIdValue);
          if (!cancelled && !shouldDeferInspiration()) {
            setInspirationItems(resp.items ?? []);
          }
        } catch (err) {
          console.warn('Failed to load inspiration replies:', err);
          if (!cancelled) {
            setInspirationItems([]);
          }
        } finally {
          if (!cancelled) {
            setInspirationLoading(false);
          }
        }
      })();
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    sessionId,
    roleIdValue,
    loading,
    isGenerating,
    inspirationAnchor,
    awaitingTtsMessageId,
    streamingAudioMsgId,
    playingMsgId,
    shouldDeferInspiration,
  ]);

  const syncAssistantToBackend = useCallback((agentMsg: FreeChatMessage) => {
    const item = toBackendAssistantItem(agentMsg);
    setBackendMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = item;
        return updated;
      }
      return [...prev, item];
    });
  }, []);

  const patchLastAgent = useCallback(
    (patch: Partial<FreeChatMessage>) => {
      setMessages((prev) => {
        const idx = findLastAgentIndex(prev);
        if (idx < 0) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...patch };
        return updated;
      });
    },
    [],
  );

  const handleUnauthorized = useCallback(() => {
    logout();
    router.replace('/login');
  }, [logout, router]);

  const isMessageAudioActive = useCallback((msgId: string) => {
    return (
      streamingAudioMsgIdRef.current === msgId ||
      playingMsgIdRef.current === msgId ||
      streamAudioPlayer.isPlaying(msgId) ||
      (audioPlayer.isPlaying() && audioPlayer.currentMessageId() === msgId)
    );
  }, []);

  const applyMessageAudioPatch = useCallback((msgId: string, data: string, format: 'mp3' | 'wav') => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        audioData: data,
        audioFormat: format,
      };
      return updated;
    });
  }, []);

  const flushPendingAudioPatch = useCallback(
    (msgId?: string) => {
      if (msgId) {
        const pending = pendingAudioPatchRef.current.get(msgId);
        if (pending) {
          pendingAudioPatchRef.current.delete(msgId);
          applyMessageAudioPatch(msgId, pending.data, pending.format);
        }
        return;
      }
      for (const [id, pending] of pendingAudioPatchRef.current.entries()) {
        applyMessageAudioPatch(id, pending.data, pending.format);
      }
      pendingAudioPatchRef.current.clear();
    },
    [applyMessageAudioPatch],
  );

  const patchMessageAudio = useCallback(
    (msgId: string, data: string, format: string) => {
      const fmt = format === 'mp3' ? 'mp3' : 'wav';
      void saveAudio(msgId, data, fmt);
      if (isMessageAudioActive(msgId)) {
        pendingAudioPatchRef.current.set(msgId, { data, format: fmt });
        return;
      }
      applyMessageAudioPatch(msgId, data, fmt);
    },
    [applyMessageAudioPatch, isMessageAudioActive],
  );

  const clearAwaitingTts = useCallback((messageId?: string) => {
    setAwaitingTtsMessageId((prev) => {
      if (messageId && prev && prev !== messageId) return prev;
      return null;
    });
    if (awaitingTtsTimerRef.current) {
      clearTimeout(awaitingTtsTimerRef.current);
      awaitingTtsTimerRef.current = null;
    }
  }, []);

  const markAwaitingTts = useCallback(
    (messageId?: string) => {
      clearAwaitingTts();
      if (!messageId || !voiceEnabledRef.current) return;
      setAwaitingTtsMessageId(messageId);
      awaitingTtsTimerRef.current = setTimeout(() => {
        awaitingTtsTimerRef.current = null;
        setAwaitingTtsMessageId(null);
        void scheduleRefreshVoiceQuota();
      }, TTS_AWAIT_TIMEOUT_MS);
    },
    [clearAwaitingTts, scheduleRefreshVoiceQuota],
  );

  const finishAwaitingTts = useCallback(
    (messageId?: string) => {
      clearAwaitingTts(messageId);
      scheduleRefreshVoiceQuota();
    },
    [clearAwaitingTts, scheduleRefreshVoiceQuota],
  );

  useEffect(() => {
    finishAwaitingTtsRef.current = finishAwaitingTts;
  }, [finishAwaitingTts]);

  const handleStreamAudioChunk = useCallback((data: string, seq: number, format: string, messageId?: string) => {
    if (!messageId || !data) return;
    ttsStreamedRef.current.add(messageId);
    setStreamingAudioMsgId(messageId);
    streamAudioPlayer.feedChunk(messageId, data, seq, format === 'wav' ? 'wav' : 'mp3');
  }, []);

  const handleStreamAudioDone = useCallback(
    (data: string, format: string, messageId?: string) => {
      if (!messageId) return;
      const fmt = format === 'mp3' ? 'mp3' : 'wav';
      const receivedChunks = ttsStreamedRef.current.has(messageId);
      const wasStreaming =
        receivedChunks ||
        streamAudioPlayer.isPlaying(messageId) ||
        streamAudioPlayer.isAnyPlaying();

      const merged = !data ? streamAudioPlayer.getConcatenatedBase64(messageId) : null;
      const audioData = data || merged?.data || '';
      const audioFmt = merged?.format ?? fmt;

      if (audioData) {
        patchMessageAudio(messageId, audioData, audioFmt);
      }

      streamAudioPlayer.finalize(messageId);

      const onPlaybackEnd = (playing: boolean) => {
        setPlayingMsgId(playing ? messageId : null);
        if (!playing) {
          flushPendingAudioPatch(messageId);
          finishAwaitingTts(messageId);
        }
      };

      const playFullAudio = () => {
        if (!audioData || !voiceEnabledRef.current) return;
        streamAudioPlayer.stopMessage(messageId);
        void audioPlayer.play(messageId, audioData, audioFmt, onPlaybackEnd);
      };

      const streamStarted = streamAudioPlayer.hasStartedPlayback(messageId);

      if (audioData && voiceEnabledRef.current && !wasStreaming) {
        playFullAudio();
      } else if (
        audioData &&
        voiceEnabledRef.current &&
        receivedChunks &&
        !streamStarted &&
        !streamAudioPlayer.isAnyPlaying()
      ) {
        // MSE never started — replay merged chunks as a single clip.
        playFullAudio();
      } else if (
        !streamAudioPlayer.isAnyPlaying() &&
        !streamAudioPlayer.isPlaying(messageId) &&
        !audioPlayer.isPlaying()
      ) {
        finishAwaitingTts(messageId);
      }

      ttsStreamedRef.current.delete(messageId);
    },
    [patchMessageAudio, finishAwaitingTts, flushPendingAudioPatch],
  );

  const stopAllAudio = useCallback(() => {
    streamAudioPlayer.stopAll();
    stopFullAudio();
    setPlayingMsgId(null);
    setStreamingAudioMsgId(null);
  }, []);

  const handleCallPress = useCallback(() => {
    if (!sessionId || !roleIdValue || voiceCallVisible) return;
    if (!canVoiceCall) {
      notifyWarning(t('voiceCall.vipRequired'));
      setVipUpgradeVisible(true);
      return;
    }
    if (!hasElevenVoice) {
      notifyWarning(t('voiceCall.noElevenVoice'));
      return;
    }
    stopAllAudio();
    setVoiceCallPreferredPath('eleven');
    setVoiceCallVisible(true);
  }, [
    sessionId,
    roleIdValue,
    voiceCallVisible,
    canVoiceCall,
    hasElevenVoice,
    t,
    stopAllAudio,
  ]);

  /** Agent detail → 视频通话：仅 is_dev 可见；开发预览跳过 VIP 门槛，仍需角色音色。 */
  const handleVideoCallFromInfo = useCallback(() => {
    infoUserToggledRef.current = true;
    setInfoVisible(false);
    if (!sessionId || !roleIdValue || voiceCallVisible) return;
    if (user?.is_dev !== true) return;
    if (!hasElevenVoice) {
      notifyWarning(t('voiceCall.noElevenVoice'));
      return;
    }
    stopAllAudio();
    setVoiceCallPreferredPath('livekit');
    setVoiceCallVisible(true);
  }, [
    sessionId,
    roleIdValue,
    voiceCallVisible,
    user?.is_dev,
    hasElevenVoice,
    t,
    stopAllAudio,
  ]);

  const handleRequestPhoto = useCallback(
    async (style: PhotoRequestStyle) => {
      if (!sessionId || !roleIdValue || isGenerating || photoRequestLoading) return;
      if (!canPhotoRequest) {
        notifyWarning(t('requestPhoto.vipRequired'));
        setVipUpgradeVisible(true);
        return;
      }
      setPhotoRequestLoading(true);
      try {
        const resp = await requestPhoto({
          session_id: sessionId,
          role_id: roleIdValue,
          style,
        });
        const imageUrl = resp.image_url || resp.file_url || resp.cover_url;
        if (!imageUrl) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === resp.message_id)) return prev;
          return [
            ...prev,
            {
              id: resp.message_id,
              role: 'agent',
              text: '',
              imageUrl,
              messageKind: 'media',
              timestamp: Date.now(),
              agentName: role?.name,
              agentAvatar: role?.avatar_url ? resolveStaticUrl(role.avatar_url) : undefined,
            },
          ];
        });
      } catch (err) {
        notifyError(t('freeChat.error'), formatApiError(t, err) || t('requestPhoto.failed'));
      } finally {
        setPhotoRequestLoading(false);
      }
    },
    [
      sessionId,
      roleIdValue,
      isGenerating,
      photoRequestLoading,
      canPhotoRequest,
      t,
      role?.name,
      role?.avatar_url,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopAllAudio();
      };
    }, [stopAllAudio]),
  );

  useEffect(() => {
    roleMetaRef.current = {
      agentName: role?.name,
      agentAvatar: role?.avatar_url,
      agentColor,
    };
  }, [role?.name, role?.avatar_url, agentColor]);

  useEffect(() => {
    chatCallbacksRef.current = {
      handleInstantText,
      handleTextChunk,
      handleTextFinalize,
      finalizeCurrentText,
      clearTypewriter,
      cleanup,
      patchLastAgent,
      syncAssistantToBackend,
      patchMessageAudio,
      stopAllAudio,
      refreshVoiceQuota,
      markAwaitingTts,
      finishAwaitingTts,
      handleStreamAudioChunk,
      handleStreamAudioDone,
    };
  }, [
    handleInstantText,
    handleTextChunk,
    handleTextFinalize,
    finalizeCurrentText,
    clearTypewriter,
    cleanup,
    patchLastAgent,
    syncAssistantToBackend,
    patchMessageAudio,
    stopAllAudio,
    refreshVoiceQuota,
    markAwaitingTts,
    finishAwaitingTts,
    handleStreamAudioChunk,
    handleStreamAudioDone,
  ]);

  const clearGeneratingFallback = useCallback(() => {
    if (generatingFallbackRef.current) {
      clearTimeout(generatingFallbackRef.current);
      generatingFallbackRef.current = null;
    }
  }, []);

  const applyMessagesResp = useCallback(
    async (
      messagesResp: Awaited<ReturnType<typeof getMessages>>,
      options?: { reconnectWs?: boolean; preserveAudioCache?: boolean },
    ) => {
      const reconnectWs = options?.reconnectWs ?? false;
      const preserveAudioCache = options?.preserveAudioCache ?? true;
      const userResp = await getMe();
      const meta = roleMetaRef.current;
      const mapped = (
        await Promise.all(
          messagesResp.messages.map(async (m) => {
            const base = mapBackendMessage(
              m,
              meta.agentName,
              meta.agentAvatar,
              meta.agentColor,
              userResp.avatar_url,
            );
            if (!base) return null;
            if (m.role === 'assistant' && m.id) {
              const bundle = await getAudioBundle(m.id);
              if (bundle) {
                return { ...base, audioData: bundle.data, audioFormat: bundle.format };
              }
            }
            return base;
          }),
        )
      ).filter((m): m is FreeChatMessage => m != null);

      // 切换会话时重置软提醒，避免跨会话只弹一次
      if (sessionIdRef.current !== messagesResp.session_id) {
        softUpsellShownRef.current = false;
        setSoftUpsellVisible(false);
      }
      setSessionId(messagesResp.session_id);
      setBackendMessages(messagesResp.messages);
      setMessages((prev) => {
        if (!preserveAudioCache) return mapped;
        const audioById = new Map<string, { data: string; format: 'mp3' | 'wav' }>();
        for (const m of prev) {
          if (m.id && m.audioData && m.audioFormat) {
            audioById.set(m.id, { data: m.audioData, format: m.audioFormat });
          }
        }
        return mapped.map((m) => {
          if (m.audioData || !m.id) return m;
          const cached = audioById.get(m.id);
          if (!cached) return m;
          return { ...m, audioData: cached.data, audioFormat: cached.format };
        });
      });
      setInspirationItems([]);

      try {
        const stateResp = await getChatState(messagesResp.session_id, roleIdValue!);
        setChatState(stateResp);
      } catch (err) {
        console.warn('Failed to load chat state:', err);
      }

      if (reconnectWs && token) {
        wsRef.current?.connect(messagesResp.session_id);
      }
    },
    [roleIdValue, token],
  );

  const reloadMessagesFromServer = useCallback(async () => {
    if (!roleIdValue) return;
    try {
      const messagesResp = sessionId
        ? await getMessages({ sessionId })
        : await getMessages({ roleId: roleIdValue });
      await applyMessagesResp(messagesResp, { reconnectWs: false, preserveAudioCache: true });
    } catch (err) {
      console.warn('Failed to reload messages:', err);
    }
  }, [roleIdValue, sessionId, applyMessagesResp]);

  const finishGenerating = useCallback(() => {
    clearWelcomePoll();
    clearGeneratingFallback();
    isGeneratingRef.current = false;
    setIsGenerating(false);
  }, [clearGeneratingFallback, clearWelcomePoll]);

  const switchToSession = useCallback(
    async (targetSessionId: string) => {
      if (!roleIdValue) return;
      try {
        streamAbortRef.current?.abort();
        streamAbortRef.current = null;
        stopAllAudio();
        finishGenerating();
        clearTypewriter();
        const messagesResp = await getMessages({ sessionId: targetSessionId });
        await applyMessagesResp(messagesResp, { reconnectWs: true, preserveAudioCache: false });
      } catch (err) {
        console.error('Failed to switch session:', err);
        notifyError(formatApiError(tRef.current, err));
        throw err;
      }
    },
    [roleIdValue, applyMessagesResp, stopAllAudio, finishGenerating, clearTypewriter],
  );

  /** 左栏选中：同角色切会话，跨角色跳转聊天页 */
  const handleSelectConversation = useCallback(
    (item: ChatConversationListItem) => {
      if (!item.role_id) return;
      if (item.role_id === roleIdValue) {
        if (item.session_id && item.session_id !== sessionId) {
          void switchToSession(item.session_id);
        }
        return;
      }
      router.push(`/free-chat/${encodeURIComponent(item.role_id)}`);
    },
    [roleIdValue, sessionId, switchToSession, router],
  );

  const handleGenerationFailure = useCallback(
    (reason: 'timeout' | 'error') => {
      finishGenerating();
      chatCallbacksRef.current.clearTypewriter();
      setMessages((prev) => withoutEmptyStreamingAgents(prev));
      notifyWarning(
        tRef.current(reason === 'timeout' ? 'chat.generationTimeout' : 'chat.generationFailed'),
      );
      void reloadMessagesFromServer();
    },
    [finishGenerating, reloadMessagesFromServer],
  );

  const beginGenerating = useCallback(() => {
    isGeneratingRef.current = true;
    setIsGenerating(true);
    clearGeneratingFallback();
    generatingFallbackRef.current = setTimeout(() => {
      generatingFallbackRef.current = null;
      handleGenerationFailure('timeout');
    }, GENERATION_TIMEOUT_MS);
  }, [clearGeneratingFallback, handleGenerationFailure]);

  /** 新会话开场白异步生成：展示 thinking，WS 未到则轮询落盘结果。 */
  const awaitWelcomeIfPending = useCallback(
    (pending: boolean | undefined, pollSessionId: string) => {
      clearWelcomePoll();
      if (!pending || !pollSessionId) return;
      beginGenerating();
      let attempts = 0;
      const maxAttempts = 30;
      welcomePollRef.current = setInterval(() => {
        attempts += 1;
        const localHasAgent = messagesRef.current.some(
          (m) => m.role === 'agent' && Boolean(m.text?.trim()),
        );
        if (localHasAgent) {
          clearWelcomePoll();
          return;
        }
        void (async () => {
          try {
            const resp = await getMessages({ sessionId: pollSessionId });
            const hasAssistant = resp.messages.some(
              (m) => m.role === 'assistant' && (m.type === 'text' || !m.type),
            );
            if (hasAssistant) {
              clearWelcomePoll();
              await applyMessagesResp(resp, { reconnectWs: false, preserveAudioCache: true });
              finishGenerating();
              return;
            }
            if ((!resp.welcome_pending && attempts >= 3) || attempts >= maxAttempts) {
              clearWelcomePoll();
              await applyMessagesResp(resp, { reconnectWs: false, preserveAudioCache: true });
              finishGenerating();
            }
          } catch (err) {
            console.warn('welcome poll failed:', err);
            if (attempts >= maxAttempts) {
              clearWelcomePoll();
              finishGenerating();
            }
          }
        })();
      }, 1000);
    },
    [applyMessagesResp, beginGenerating, clearWelcomePoll, finishGenerating],
  );

  const handleNewConversation = useCallback(async () => {
    if (!roleIdValue) return;
    try {
      streamAbortRef.current?.abort();
      streamAbortRef.current = null;
      stopAllAudio();
      finishGenerating();
      clearTypewriter();
      softUpsellShownRef.current = false;
      setSoftUpsellVisible(false);
      const created = await createChatSession(roleIdValue);
      const messagesResp = await getMessages({ sessionId: created.session_id });
      await applyMessagesResp(messagesResp, { reconnectWs: true, preserveAudioCache: false });
      awaitWelcomeIfPending(
        created.welcome_pending || messagesResp.welcome_pending,
        created.session_id,
      );
      // 刷新左栏：该 Agent 应排到最新并显示新会话预览
      setConversationRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to create chat session:', err);
      notifyError(formatApiError(tRef.current, err));
      throw err;
    }
  }, [
    roleIdValue,
    applyMessagesResp,
    stopAllAudio,
    finishGenerating,
    clearTypewriter,
    awaitWelcomeIfPending,
  ]);

  const completeAgentReply = useCallback(() => {
    clearWelcomePoll();
    clearGeneratingFallback();
    setMessages((prev) => {
      const idx = findLastAgentIndex(prev);
      if (idx < 0) {
        return withoutEmptyStreamingAgents(prev);
      }
      if (!prev[idx].text.trim()) {
        return prev.filter((_, i) => i !== idx);
      }
      isGeneratingRef.current = false;
      setIsGenerating(false);
      const updated = [...prev];
      updated[idx] = { ...updated[idx], isStreaming: false };
      chatCallbacksRef.current.syncAssistantToBackend(updated[idx]);
      return updated;
    });
    // 回复完成后刷新左栏预览 / 排序
    setConversationRefreshKey((k) => k + 1);
  }, [clearGeneratingFallback, clearWelcomePoll]);

  const touchGenerating = useCallback(() => {
    if (!isGeneratingRef.current) {
      beginGenerating();
      return;
    }
    isGeneratingRef.current = true;
    setIsGenerating(true);
  }, [beginGenerating]);

  const generationRef = useRef({
    beginGenerating,
    touchGenerating,
    completeAgentReply,
    finishGenerating,
    handleGenerationFailure,
    reloadMessagesFromServer,
    clearGeneratingFallback,
    refreshVoiceQuota,
    awaitWelcomeIfPending,
    clearWelcomePoll,
  });
  generationRef.current = {
    beginGenerating,
    touchGenerating,
    completeAgentReply,
    finishGenerating,
    handleGenerationFailure,
    reloadMessagesFromServer,
    clearGeneratingFallback,
    refreshVoiceQuota,
    awaitWelcomeIfPending,
    clearWelcomePoll,
  };

  const handleUnauthorizedRef = useRef(handleUnauthorized);
  handleUnauthorizedRef.current = handleUnauthorized;

  // 超时计时器被意外清掉但 isGenerating 仍为 true 时（如 WS effect 重跑）自动重新挂钟
  useEffect(() => {
    if (!isGenerating || generatingFallbackRef.current) return;
    generatingFallbackRef.current = setTimeout(() => {
      generatingFallbackRef.current = null;
      generationRef.current.handleGenerationFailure('timeout');
    }, GENERATION_TIMEOUT_MS);
  }, [isGenerating]);

  useEffect(() => {
    streamAudioPlayer.setPlaybackListener((messageId, playing) => {
      if (playing) {
        setPlayingMsgId(messageId);
        setStreamingAudioMsgId(messageId);
        return;
      }

      const audioPlayerActive =
        audioPlayer.isPlaying() && audioPlayer.currentMessageId() === messageId;
      if (audioPlayerActive) {
        return;
      }

      setPlayingMsgId((prev) => (prev === messageId ? null : prev));
      setStreamingAudioMsgId((prev) => (prev === messageId ? null : prev));
      flushPendingAudioPatch(messageId);
      finishAwaitingTtsRef.current(messageId);
    });
    return () => streamAudioPlayer.setPlaybackListener(null);
  }, [flushPendingAudioPatch]);

  useEffect(() => {
    if (!roleIdValue || !token) {
      if (!token) {
        notifyWarning(t('errors.authTokenMissing'));
        router.replace('/login');
      }
      return;
    }

    let isMounted = true;
    let ws: ChatWebSocket | null = null;

    const load = async () => {
      try {
        const [roleResp, messagesResp, userResp] = await Promise.all([
          getRole(roleIdValue),
          getMessages({ roleId: roleIdValue }),
          getMe(),
        ]);

        if (!isMounted) return;

        setRole(roleResp);
        setSessionId(messagesResp.session_id);
        setBackendMessages(messagesResp.messages);

        const mapped = (
          await Promise.all(
            messagesResp.messages.map(async (m) => {
              const base = mapBackendMessage(
                m,
                roleResp.name,
                roleResp.avatar_url,
                agentColor,
                userResp.avatar_url,
              );
              if (!base) return null;
              if (m.role === 'assistant' && m.id) {
                const bundle = await getAudioBundle(m.id);
                if (bundle) {
                  return { ...base, audioData: bundle.data, audioFormat: bundle.format };
                }
              }
              return base;
            }),
          )
        ).filter((m): m is FreeChatMessage => m != null);
        setMessages(mapped);
        setLoading(false);
        void refreshChatQuota();
        void refreshVoiceQuota();
        void refreshUser();
        generationRef.current.awaitWelcomeIfPending(
          messagesResp.welcome_pending,
          messagesResp.session_id,
        );

        if (typeof userResp.free_chat_dominance === 'number') {
          setDominance(userResp.free_chat_dominance);
        }

        try {
          const stateResp = await getChatState(messagesResp.session_id, roleIdValue);
          if (isMounted) setChatState(stateResp);
        } catch (err) {
          console.warn('Failed to load chat state:', err);
        }

        ws = new ChatWebSocket(token, {
          onAuthOk: () => {
            console.log('WebSocket auth ok');
          },
          onText: (content, messageId) => {
            if (!isMounted) return;
            generationRef.current.touchGenerating();
            const meta = roleMetaRef.current;
            chatCallbacksRef.current.handleInstantText(content, messageId, {
              agentName: meta.agentName,
              agentAvatar: meta.agentAvatar,
              agentColor: meta.agentColor,
            });
          },
          onTextDelta: (content, messageId) => {
            if (!isMounted) return;
            generationRef.current.touchGenerating();
            const meta = roleMetaRef.current;
            chatCallbacksRef.current.handleTextChunk(content, messageId, {
              agentName: meta.agentName,
              agentAvatar: meta.agentAvatar,
              agentColor: meta.agentColor,
            });
          },
          onTextFinalize: (content, messageId) => {
            if (!isMounted) return;
            chatCallbacksRef.current.handleTextFinalize(content, messageId);
          },
          onTone: (tone) => {
            if (!isMounted) return;
            chatCallbacksRef.current.patchLastAgent({ tone });
          },
          onAction: (action) => {
            if (!isMounted) return;
            chatCallbacksRef.current.patchLastAgent({ action });
          },
          onDone: (messageId) => {
            chatCallbacksRef.current.finalizeCurrentText();
            generationRef.current.completeAgentReply();
            chatCallbacksRef.current.markAwaitingTts(messageId);
          },
          onInterrupted: () => {
            if (!isMounted) return;
            generationRef.current.finishGenerating();
            chatCallbacksRef.current.clearTypewriter();
            setMessages((prev) => {
              const idx = findLastAgentIndex(prev);
              if (idx < 0) return withoutEmptyStreamingAgents(prev);
              const updated = [...prev];
              updated[idx] = { ...updated[idx], isStreaming: false, isInterrupted: true };
              chatCallbacksRef.current.syncAssistantToBackend(updated[idx]);
              return updated;
            });
          },
          onAudio: (data, format, messageId) => {
            if (!messageId || !data) return;
            const fmt = format === 'mp3' ? 'mp3' : 'wav';
            saveAudio(messageId, data, fmt);
            chatCallbacksRef.current.patchMessageAudio(messageId, data, fmt);
            if (voiceEnabledRef.current) {
              void audioPlayer.play(messageId, data, fmt, (playing) => {
                setPlayingMsgId(playing ? messageId : null);
                if (!playing) {
                  chatCallbacksRef.current.finishAwaitingTts(messageId);
                }
              });
            } else {
              chatCallbacksRef.current.finishAwaitingTts(messageId);
            }
          },
          onAudioChunk: (data, seq, format, messageId) => {
            chatCallbacksRef.current.handleStreamAudioChunk(data, seq, format, messageId);
          },
          onAudioDone: (data, format, messageId) => {
            chatCallbacksRef.current.handleStreamAudioDone(data, format, messageId);
          },
          onError: (content) => {
            console.error('WS error:', content);
            if (content.startsWith('VOICE_002') || content.startsWith('tts_failed')) {
              chatCallbacksRef.current.finishAwaitingTts();
              generationRef.current.finishGenerating();
              void generationRef.current.refreshVoiceQuota();
              if (content.startsWith('VOICE_002')) {
                void tryShowVoiceQuotaExceeded();
              }
              return;
            }
            if (content === 'CHAT_GENERATION_FAILED' || content === 'CHAT_BUSY') {
              generationRef.current.handleGenerationFailure('error');
              return;
            }
            generationRef.current.finishGenerating();
            chatCallbacksRef.current.clearTypewriter();
            setMessages((prev) => withoutEmptyStreamingAgents(prev));
          },
          onClose: () => {
            console.log('Listen WebSocket closed');
          },
          onReconnecting: () => {
            // 断线重连期间保持 thinking，等待 WS catch-up 或轮询补拉
          },
          onBondUpdate: (raw) => {
            if (!isMounted || !raw) return;
            try {
              const payload = JSON.parse(raw) as BondUpdatePayload;
              if (!payload.bond_state || !payload.bond_label) return;
              setChatState((prev) =>
                prev
                  ? {
                      ...prev,
                      bond: {
                        bond_state: payload.bond_state,
                        bond_label: payload.bond_label,
                        bond_hint: payload.bond_hint || '',
                        bond_progress:
                          typeof payload.bond_progress === 'number'
                            ? payload.bond_progress
                            : prev.bond?.bond_progress,
                        tier_changed_recently: Boolean(payload.tier_changed),
                      },
                    }
                  : prev,
              );
            } catch {
              /* ignore malformed */
            }
          },
          onEroticAddictionUnlocked: (raw) => {
            if (!isMounted || !raw) return;
            try {
              const payload = JSON.parse(raw) as EroticAddictionUnlockedWsPayload;
              if (!payload.category || !payload.role_id) return;
              if (roleIdValue && payload.role_id !== roleIdValue) return;
              const dedupeKey = `${payload.role_id}:${payload.category}:${payload.active_count}:${payload.all9_achieved ? 1 : 0}`;
              if (eroticUnlockSeenRef.current.has(dedupeKey)) return;
              eroticUnlockSeenRef.current.add(dedupeKey);
              setEroticUnlockPayload({
                role_id: payload.role_id,
                category: payload.category,
                label: payload.label || '',
                active_count: payload.active_count ?? 0,
                is_first_for_role: Boolean(payload.is_first_for_role),
                all9_achieved: Boolean(payload.all9_achieved),
                reward_points: payload.reward_points ?? 0,
              });
            } catch {
              /* ignore malformed */
            }
          },
          onMedia: ({ messageId, imageUrl }) => {
            if (!isMounted || !imageUrl) return;
            const id = messageId || `media-${Date.now()}`;
            setMessages((prev) => {
              if (prev.some((m) => m.id === id)) return prev;
              return [
                ...prev,
                {
                  id,
                  role: 'agent',
                  text: '',
                  imageUrl,
                  messageKind: 'media',
                  timestamp: Date.now(),
                  agentName: roleResp.name,
                  agentAvatar: roleResp.avatar_url
                    ? resolveStaticUrl(roleResp.avatar_url)
                    : undefined,
                },
              ];
            });
          },
        });

        ws.connect(messagesResp.session_id);
        wsRef.current = ws;
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load chat:', err);
        const errMessage = formatApiError(tRef.current, err);
        if (err instanceof ApiError && err.status === 401) {
          handleUnauthorizedRef.current();
          return;
        }
        notifyError(tRef.current('freeChat.error'), errMessage);
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      ws?.disconnect();
      wsRef.current = null;
      chatCallbacksRef.current.cleanup();
      generationRef.current.clearWelcomePoll();
      generationRef.current.finishGenerating();
    };
  }, [roleIdValue, token]);

  useEffect(() => {
    if (!roleIdValue || !token) return;
    getRole(roleIdValue)
      .then((resp) => setRole(resp))
      .catch((err) => console.error('Failed to refresh role detail:', err));
    if (sessionId) {
      getChatState(sessionId, roleIdValue)
        .then((resp) => setChatState(resp))
        .catch((err) => console.warn('Failed to refresh chat state:', err));
    }
  }, [lang, roleIdValue, token, sessionId]);

  useEffect(() => {
    if (!playerAvatar) return;
    setMessages((prev) =>
      prev.map((m) => (m.role === 'player' ? { ...m, playerAvatar } : m)),
    );
  }, [playerAvatar]);

  const buildChatStreamCallbacks = useCallback(
    (opts?: { localId?: string }): ChatStreamCallbacks => ({
      onUserMessage: (messageId) => {
        if (!opts?.localId) return;
        setMessages((prev) => replaceMessageId(prev, opts.localId!, messageId));
        setBackendMessages((prev) => replaceBackendMessageId(prev, opts.localId!, messageId));
      },
      onText: (content, messageId) => {
        generationRef.current.touchGenerating();
        const meta = roleMetaRef.current;
        chatCallbacksRef.current.handleInstantText(content, messageId, {
          agentName: meta.agentName,
          agentAvatar: meta.agentAvatar,
          agentColor: meta.agentColor,
        });
      },
      onTextDelta: (content, messageId) => {
        generationRef.current.touchGenerating();
        const meta = roleMetaRef.current;
        chatCallbacksRef.current.handleTextChunk(content, messageId, {
          agentName: meta.agentName,
          agentAvatar: meta.agentAvatar,
          agentColor: meta.agentColor,
        });
      },
      onTextFinalize: (content, messageId) => {
        chatCallbacksRef.current.handleTextFinalize(content, messageId);
      },
      onTone: (tone) => {
        chatCallbacksRef.current.patchLastAgent({ tone });
      },
      onAction: (action) => {
        chatCallbacksRef.current.patchLastAgent({ action });
      },
      onDone: (messageId) => {
        chatCallbacksRef.current.finalizeCurrentText();
        generationRef.current.completeAgentReply();
        chatCallbacksRef.current.markAwaitingTts(messageId);
      },
      onInterrupted: () => {
        generationRef.current.finishGenerating();
        chatCallbacksRef.current.clearTypewriter();
        setMessages((prev) => {
          const idx = findLastAgentIndex(prev);
          if (idx < 0) return withoutEmptyStreamingAgents(prev);
          const updated = [...prev];
          updated[idx] = { ...updated[idx], isStreaming: false, isInterrupted: true };
          chatCallbacksRef.current.syncAssistantToBackend(updated[idx]);
          return updated;
        });
      },
      onAudioChunk: (data, seq, format, messageId) => {
        chatCallbacksRef.current.handleStreamAudioChunk(data, seq, format, messageId);
      },
      onAudioDone: (data, format, messageId) => {
        chatCallbacksRef.current.handleStreamAudioDone(data, format, messageId);
      },
      onError: (content) => {
        console.error('Stream error:', content);
        if (content.startsWith('VOICE_002') || content.startsWith('tts_failed')) {
          chatCallbacksRef.current.finishAwaitingTts();
          generationRef.current.finishGenerating();
          void generationRef.current.refreshVoiceQuota();
          if (content.startsWith('VOICE_002')) {
            void tryShowVoiceQuotaExceeded();
          }
          return;
        }
        if (content === 'CHAT_GENERATION_FAILED' || content === 'CHAT_BUSY') {
          generationRef.current.handleGenerationFailure('error');
          return;
        }
        generationRef.current.finishGenerating();
        chatCallbacksRef.current.clearTypewriter();
        setMessages((prev) => withoutEmptyStreamingAgents(prev));
      },
    }),
    [tryShowVoiceQuotaExceeded],
  );

  const handleSendImage = useCallback(
    async (imageUrl: string, caption: string): Promise<boolean> => {
      if (!sessionId || !roleIdValue || isGenerating) return false;

      const consented = await useAiDataConsentStore.getState().ensureConsent();
      if (!consented) return false;

      unlockWebAudioAutoplay();

      const quotaGate = resolveChatQuotaGate(chatQuota);
      if (quotaGate !== 'ok') {
        showQuotaGate(quotaGate);
        return false;
      }
      if (chatQuota && !chatQuota.unlimited && chatQuota.remaining_messages_hint < 2) {
        showQuotaGate('exhausted');
        return false;
      }

      const trimmedCaption = caption.trim();
      const displayText = trimmedCaption || '[Image]';
      const localId = `local-img-${Date.now()}`;
      const playerMsg: FreeChatMessage = {
        id: localId,
        role: 'player',
        text: displayText,
        imageUrl,
        timestamp: Date.now(),
        playerAvatar,
      };
      const nextMessages = [...messagesRef.current, playerMsg];
      setMessages(nextMessages);
      maybeShowSoftUpsell(nextMessages);
      setBackendMessages((prev) => [
        ...prev,
        {
          id: localId,
          role: 'user',
          type: 'image',
          content: displayText,
          image_url: imageUrl,
          tone: '',
          action: '',
          is_interrupted: false,
          created_at: Date.now(),
        },
      ]);

      beginGenerating();
      chatCallbacksRef.current.stopAllAudio();
      chatCallbacksRef.current.clearTypewriter();

      streamAbortRef.current?.abort();
      const abort = new AbortController();
      streamAbortRef.current = abort;

      try {
        await sendMessageStream(
          {
            session_id: sessionId,
            role_id: roleIdValue,
            content: trimmedCaption,
            type: 'image',
            image_url: imageUrl,
          },
          buildChatStreamCallbacks({ localId }),
          abort.signal,
        );
        void refreshChatQuota();
        return true;
      } catch (err) {
        if (abort.signal.aborted) return false;
        console.error('Send image failed:', err);
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        setBackendMessages((prev) => prev.filter((m) => m.id !== localId));
        finishGenerating();
        if (err instanceof ApiError) {
          if (err.code === 'CHAT_003') {
            notifyWarning(t('chat.stillResponding'));
            return false;
          }
          if (handleChatQuotaApiError(err)) {
            return false;
          }
          if (err.status === 401) {
            handleUnauthorized();
            return false;
          }
        }
        notifyError(t('freeChat.error'), formatApiError(t, err));
        return false;
      } finally {
        if (streamAbortRef.current === abort) {
          streamAbortRef.current = null;
        }
      }
    },
    [sessionId, roleIdValue, isGenerating, chatQuota, handleUnauthorized, t, refreshChatQuota, showQuotaGate, handleChatQuotaApiError, playerAvatar, beginGenerating, finishGenerating, buildChatStreamCallbacks, maybeShowSoftUpsell],
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId || !roleIdValue || isGenerating) return;

      const consented = await useAiDataConsentStore.getState().ensureConsent();
      if (!consented) return;

      const trimmed = text.trim();
      if (pendingImage) {
        const sent = await handleSendImage(pendingImage.imageUrl, trimmed);
        if (sent) {
          setPendingImage(null);
        }
        return;
      }
      if (!trimmed) return;

      unlockWebAudioAutoplay();

      const quotaGate = resolveChatQuotaGate(chatQuota);
      if (quotaGate !== 'ok') {
        showQuotaGate(quotaGate);
        return;
      }

      const localId = `local-${Date.now()}`;
      const playerMsg: FreeChatMessage = {
        id: localId,
        role: 'player',
        text: trimmed,
        timestamp: Date.now(),
        playerAvatar,
      };
      const nextMessages = [...messagesRef.current, playerMsg];
      setMessages(nextMessages);
      maybeShowSoftUpsell(nextMessages);
      setBackendMessages((prev) => [
        ...prev,
        {
          id: localId,
          role: 'user',
          type: 'text',
          content: trimmed,
          tone: '',
          action: '',
          is_interrupted: false,
          created_at: Date.now(),
        },
      ]);

      beginGenerating();
      chatCallbacksRef.current.stopAllAudio();
      chatCallbacksRef.current.clearTypewriter();

      streamAbortRef.current?.abort();
      const abort = new AbortController();
      streamAbortRef.current = abort;

      try {
        await sendMessageStream(
          {
            session_id: sessionId,
            role_id: roleIdValue,
            content: trimmed,
            type: 'text',
          },
          buildChatStreamCallbacks({ localId }),
          abort.signal,
        );
        void refreshChatQuota();
      } catch (err) {
        if (abort.signal.aborted) return;
        console.error('Send message failed:', err);
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        setBackendMessages((prev) => prev.filter((m) => m.id !== localId));
        finishGenerating();
        if (err instanceof ApiError) {
          if (err.code === 'CHAT_003') {
            notifyWarning(t('chat.stillResponding'));
            return;
          }
          if (handleChatQuotaApiError(err)) {
            return;
          }
          if (err.status === 401) {
            handleUnauthorized();
            return;
          }
        }
        if (err instanceof ApiError && err.status === 401) {
          handleUnauthorized();
          return;
        }
        notifyError(t('freeChat.error'), formatApiError(t, err));
      } finally {
        if (streamAbortRef.current === abort) {
          streamAbortRef.current = null;
        }
      }
    },
    [sessionId, roleIdValue, isGenerating, chatQuota, pendingImage, handleSendImage, handleUnauthorized, t, refreshChatQuota, showQuotaGate, handleChatQuotaApiError, playerAvatar, beginGenerating, finishGenerating, buildChatStreamCallbacks, maybeShowSoftUpsell],
  );

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (!sessionId || !roleIdValue || isGenerating) return;

      const consented = await useAiDataConsentStore.getState().ensureConsent();
      if (!consented) return;

      const lastAgentIdx = findLastAgentIndex(messages);
      if (lastAgentIdx < 0) return;
      const target = messages[lastAgentIdx];
      if (target.id !== messageId || target.isStreaming || !target.text.trim()) return;

      const quotaGate = resolveChatQuotaGate(chatQuota);
      if (quotaGate !== 'ok') {
        showQuotaGate(quotaGate);
        return;
      }

      unlockWebAudioAutoplay();

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setBackendMessages((prev) => prev.filter((m) => m.id !== messageId));

      beginGenerating();
      chatCallbacksRef.current.stopAllAudio();
      chatCallbacksRef.current.clearTypewriter();

      streamAbortRef.current?.abort();
      const abort = new AbortController();
      streamAbortRef.current = abort;

      try {
        await regenerateMessageStream(
          {
            session_id: sessionId,
            role_id: roleIdValue,
            message_id: messageId,
          },
          buildChatStreamCallbacks(),
          abort.signal,
        );
        void refreshChatQuota();
      } catch (err) {
        if (abort.signal.aborted) return;
        console.error('Regenerate message failed:', err);
        finishGenerating();
        void reloadMessagesFromServer();
        if (err instanceof ApiError) {
          if (err.code === 'CHAT_003') {
            notifyWarning(t('chat.stillResponding'));
            return;
          }
          if (err.code === 'CHAT_010') {
            notifyWarning(t('chat.regenerateFailed'));
            return;
          }
          if (handleChatQuotaApiError(err)) {
            return;
          }
          if (err.status === 401) {
            handleUnauthorized();
            return;
          }
        }
        notifyError(t('freeChat.error'), formatApiError(t, err) || t('chat.regenerateFailed'));
      } finally {
        if (streamAbortRef.current === abort) {
          streamAbortRef.current = null;
        }
      }
    },
    [
      sessionId,
      roleIdValue,
      isGenerating,
      messages,
      chatQuota,
      showQuotaGate,
      beginGenerating,
      finishGenerating,
      buildChatStreamCallbacks,
      refreshChatQuota,
      reloadMessagesFromServer,
      handleChatQuotaApiError,
      handleUnauthorized,
      t,
    ],
  );

  const handleAttachImage = useCallback(async () => {
    if (!sessionId || !roleIdValue || isGenerating || imageUploading || pendingImage) return;
    try {
      const picked = await pickChatImage();
      if (!picked) return;

      setImageUploading(true);
      const compressed = await compressImageForUpload(
        {
          previewUri: picked.previewUri,
          file: picked.file,
          filename: picked.filename,
        },
        { maxBytes: 4.5 * 1024 * 1024, maxEdge: 1600 },
      );
      const uploaded = await uploadChatImage(compressed.file, compressed.filename);
      setPendingImage({ imageUrl: uploaded.image_url, previewUri: compressed.previewUri });
    } catch (err) {
      console.error('Upload chat image failed:', err);
      if (err instanceof PhotoPermissionDeniedError) {
        promptPhotoLibraryAccessSettings(t);
        return;
      }
      if (err instanceof EmptyImageError) {
        notifyError(t('freeChat.error'), t('agent.mediaUploadEmpty'));
        return;
      }
      if (err instanceof ImageTooLargeError) {
        notifyError(t('freeChat.error'), t('errors.chatImageTooLarge'));
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        handleUnauthorized();
        return;
      }
      notifyError(t('freeChat.error'), formatApiError(t, err));
    } finally {
      setImageUploading(false);
    }
  }, [sessionId, roleIdValue, isGenerating, imageUploading, pendingImage, handleUnauthorized, t]);

  const handleRemovePendingImage = useCallback(() => {
    setPendingImage(null);
  }, []);

  const { recording, asrLoading, handleStartRecording, handleStopRecording } = useVoiceAsr({
    onText: handleSend,
    disabled: isGenerating,
    lang,
    userLangs: user ?? undefined,
  });

  const handleStartRecordingWithConsent = useCallback(async () => {
    const consented = await useAiDataConsentStore.getState().ensureConsent();
    if (!consented) return;
    handleStartRecording();
  }, [handleStartRecording]);

  const handleTriggerEvent = useCallback(
    async (eventName: string, displayName: string) => {
      if (!sessionId || !roleIdValue || isGenerating) return;

      const consented = await useAiDataConsentStore.getState().ensureConsent();
      if (!consented) return;

      const quotaGate = resolveChatQuotaGate(chatQuota);
      if (quotaGate !== 'ok') {
        showQuotaGate(quotaGate);
        return;
      }

      const localId = `event-${Date.now()}`;
      const playerMsg: FreeChatMessage = {
        id: localId,
        role: 'player',
        text: displayName,
        timestamp: Date.now(),
      };
      const nextMessages = [...messagesRef.current, playerMsg];
      setMessages(nextMessages);
      maybeShowSoftUpsell(nextMessages);
      setBackendMessages((prev) => [
        ...prev,
        {
          id: localId,
          role: 'user',
          type: 'event_r',
          content: displayName,
          tone: '',
          action: '',
          is_interrupted: false,
          created_at: Date.now(),
        },
      ]);
      beginGenerating();
      chatCallbacksRef.current.stopAllAudio();
      chatCallbacksRef.current.clearTypewriter();

      streamAbortRef.current?.abort();
      const abort = new AbortController();
      streamAbortRef.current = abort;

      try {
        await triggerEventStream(
          {
            session_id: sessionId,
            role_id: roleIdValue,
            event_name: eventName,
          },
          buildChatStreamCallbacks({ localId }),
          abort.signal,
        );
      } catch (err) {
        if (abort.signal.aborted) return;
        console.error('Trigger event failed:', err);
        if (err instanceof ApiError && err.status === 429) {
          setMessages((prev) => prev.filter((m) => m.id !== localId));
          setBackendMessages((prev) => prev.filter((m) => m.id !== localId));
          notifyWarning(t('chat.stillResponding'));
          return;
        }
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        setBackendMessages((prev) => prev.filter((m) => m.id !== localId));
        finishGenerating();
        if (err instanceof ApiError && err.status === 401) {
          handleUnauthorized();
          return;
        }
        notifyError(t('freeChat.error'), formatApiError(t, err));
      } finally {
        if (streamAbortRef.current === abort) {
          streamAbortRef.current = null;
        }
      }
    },
    [sessionId, roleIdValue, isGenerating, chatQuota, handleUnauthorized, t, showQuotaGate, beginGenerating, finishGenerating, buildChatStreamCallbacks, maybeShowSoftUpsell],
  );

  const handleInterrupt = useCallback(async () => {
    if (!sessionId) return;
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    chatCallbacksRef.current.finishAwaitingTts();
    chatCallbacksRef.current.stopAllAudio();
    chatCallbacksRef.current.clearTypewriter();
    finishGenerating();
    try {
      await interrupt(sessionId);
    } catch (err) {
      console.error('Interrupt failed:', err);
    }
  }, [sessionId, finishGenerating]);

  const resolveMessageAudio = useCallback(
    async (msgId: string, msg?: FreeChatMessage) => {
      const pending = pendingAudioPatchRef.current.get(msgId);
      if (pending) return pending;
      if (msg?.audioData && msg.audioFormat) {
        return { data: msg.audioData, format: msg.audioFormat };
      }
      const bundle = await getAudioBundle(msgId);
      if (bundle) return bundle;
      return null;
    },
    [],
  );

  const handleToggleAudio = useCallback(
    async (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      const streamActive =
        streamingAudioMsgId === msgId || streamAudioPlayer.isPlaying(msgId);
      const replayActive =
        playingMsgId === msgId && audioPlayer.currentMessageId() === msgId;

      if (streamActive) {
        streamAudioPlayer.stopMessage(msgId);
        setStreamingAudioMsgId((prev) => (prev === msgId ? null : prev));
        setPlayingMsgId((prev) => (prev === msgId ? null : prev));
        return;
      }

      const bundle = await resolveMessageAudio(msgId, msg);
      if (!bundle) return;

      if (replayActive) {
        await audioPlayer.play(msgId, bundle.data, bundle.format, (playing) => {
          setPlayingMsgId(playing ? msgId : null);
        });
        return;
      }

      stopAllAudio();
      await audioPlayer.play(msgId, bundle.data, bundle.format, (playing) => {
        setPlayingMsgId(playing ? msgId : null);
        if (!playing) {
          flushPendingAudioPatch(msgId);
        }
      });
    },
    [messages, stopAllAudio, playingMsgId, streamingAudioMsgId, resolveMessageAudio, flushPendingAudioPatch],
  );

  const handleDominanceChange = useCallback(
    async (value: number) => {
      setDominance(value);
      try {
        await updateUser({ free_chat_dominance: value });
      } catch (err) {
        console.error('Failed to update dominance preference:', err);
      }
    },
    [],
  );

  if (loading) {
    return (
      <View style={[styles.loadingRoot, isDefaultTheme && styles.loadingRootDefault, pageContentPadding]}>
        <ActivityIndicator size="large" color={isDefaultTheme ? TOKENS.colors.accent : COLORS.accent.gold} />
      </View>
    );
  }

  const chatBody = (
    <View style={styles.chatShell}>
      {/* 桌面专属：左侧图标轨（移动端用底部导航，不占宽） */}
      {isDesktop ? (
        <FreeChatIconNavRail
          variant={uiVariant}
          railExpanded={iconRailExpanded}
          onToggleRailExpanded={() => {
            setIconRailExpanded((prev) => {
              const next = !prev;
              // 展开导航文字时，收起聊天列表
              if (next) {
                agentHistoryUserToggledRef.current = true;
                setAgentHistoryCollapsed(true);
              }
              return next;
            });
          }}
        />
      ) : null}
      <ChatAgentHistorySidebar
        activeRoleId={roleIdValue}
        activeSessionId={sessionId}
        refreshKey={conversationRefreshKey}
        collapsed={agentHistoryCollapsed}
        /** 移动端悬浮抽屉展开，不挤占聊天区 */
        overlay={!isDesktop}
        onToggleCollapsed={() => {
          agentHistoryUserToggledRef.current = true;
          setAgentHistoryCollapsed((prev) => {
            const next = !prev;
            // 展开聊天列表时，收起导航文字
            if (!next) {
              setIconRailExpanded(false);
            }
            return next;
          });
        }}
        onSelectConversation={(item) => {
          handleSelectConversation(item);
          // 移动端选中后收起悬浮列表
          if (!isDesktop) {
            agentHistoryUserToggledRef.current = true;
            setAgentHistoryCollapsed(true);
          }
        }}
        onDeletedCurrent={handleNewConversation}
        variant={uiVariant}
        bond={chatState?.bond ?? null}
      />
      <View
        style={[
          styles.chatBody,
          // 仅桌面内联侧栏需要留白；移动端悬浮抽屉不占宽
          isDesktop
            ? agentHistoryCollapsed
              ? styles.chatBodySidebarCollapsed
              : styles.chatBodyWithSidebar
            : null,
        ]}
      >
      <Animated.View
        pointerEvents={headerVisible ? 'auto' : 'none'}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && h !== headerHeight) setHeaderHeight(h);
        }}
        style={[
          styles.headerOverlay,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
        ]}
        {...(Platform.OS === 'web'
          ? ({
              onMouseEnter: () => {
                clearHeaderHideTimer();
                setHeaderVisible(true);
              },
              onMouseLeave: scheduleHeaderHide,
            } as Record<string, unknown>)
          : {})}
      >
        <FreeChatHeader
          agentName={agentName}
          agentAvatar={agentAvatar}
          agentColor={agentColor}
          moodActivity={chatState ? `${chatState.mood} · ${chatState.activity}` : undefined}
          onBack={() => router.replace('/')}
          onAgentList={
            isDesktop
              ? undefined
              : () => {
                  agentHistoryUserToggledRef.current = true;
                  setAgentHistoryCollapsed(false);
                }
          }
          onCall={handleCallPress}
          callDisabled={callDisabled}
          onHistory={() => setHistoryVisible(true)}
          onEvents={() => setEventMenuVisible(true)}
          onBackground={() => setBgPickerVisible(true)}
          backgroundActive={bgPickerVisible}
          onInfo={() => {
            infoUserToggledRef.current = true;
            setInfoVisible((v) => !v);
          }}
          infoActive={infoVisible}
          variant={uiVariant}
          verifiedRealPerson={Boolean(role?.verified_real_person)}
        />
      </Animated.View>

      {!headerVisible ? (
        <Pressable
          style={[styles.headerRevealZone, { height: headerRevealZoneHeight }]}
          onPress={showHeader}
          accessibilityRole="button"
          accessibilityLabel={agentName || t('freeChat.title')}
          {...webHeaderHoverProps}
        />
      ) : null}

      <View style={styles.mainContent}>
        <Animated.View style={[styles.messagesLayer, { paddingTop: messagesTopPadAnim }]}>
          <FreeChatLayer
            messages={mainMessages}
            voiceEnabled={voiceEnabled}
            streamingAudioMsgId={streamingAudioMsgId}
            playingMsgId={playingMsgId}
            onToggleAudio={handleToggleAudio}
            onRegenerate={handleRegenerate}
            regenerating={isGenerating}
            thinking={isThinking}
            agentName={agentName}
            agentAvatar={agentAvatar}
            agentColor={agentColor}
            variant={uiVariant}
            onBlankPress={showHeader}
            verifiedRealPerson={Boolean(role?.verified_real_person)}
          />
        </Animated.View>
      </View>

      <View
        style={[
          styles.inputArea,
          isDefaultTheme ? styles.inputAreaDefault : styles.inputAreaSoviet,
          !isDesktop && styles.inputAreaMobileFullBleed,
          { paddingBottom: inputDockBottomPad },
        ]}
      >
        <InspirationReplies
          items={inspirationItems}
          loading={inspirationLoading}
          disabled={isGenerating}
          variant={uiVariant}
          onSelect={(text) => {
            setInspirationItems([]);
            void handleSend(text);
          }}
        />
        <ChatInputBar
          onSend={handleSend}
          disabled={isGenerating || imageUploading || voiceCallVisible}
          isGenerating={isGenerating}
          onInterrupt={handleInterrupt}
          placeholder={isGenerating ? t('chat.sending') : t('chat.placeholder')}
          recording={recording}
          asrLoading={asrLoading}
          onStartRecording={handleStartRecordingWithConsent}
          onStopRecording={handleStopRecording}
          onAttachImage={handleAttachImage}
          imageUploading={imageUploading}
          pendingImagePreview={pendingImage?.previewUri ?? null}
          onRemovePendingImage={handleRemovePendingImage}
          onRequestPhoto={handleRequestPhoto}
          photoRequestEnabled={canPhotoRequest}
          photoRequestLoading={photoRequestLoading}
          showNsfwPhotoStyle={showNsfwPhotoStyle}
          showSexyPhotoStyle={showSexyPhotoStyle}
          variant={isDefaultTheme ? 'soulthread' : 'soviet'}
        />
      </View>
      </View>
      {/* 桌面：右侧角色信息栏（常挂载以播完收起动画） */}
      {isDesktop ? (
        <CharacterInfoPanel
          mode="docked"
          visible={infoVisible}
          role={role}
          onClose={() => {
            infoUserToggledRef.current = true;
            setInfoVisible(false);
          }}
          onNewChat={handleNewConversation}
          onVideoCall={handleVideoCallFromInfo}
          videoCallDisabled={callDisabled}
          variant={uiVariant}
          bond={chatState?.bond ?? null}
          dominance={dominance}
          onDominanceChange={handleDominanceChange}
          dominanceDisabled={isGenerating}
        />
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDefaultTheme && styles.containerDefault]}
    >
      <StatusBar style="light" />
      {isDefaultTheme ? (
        <View style={[styles.container, backgroundFallbackColor ? { backgroundColor: backgroundFallbackColor } : null]}>
          {/* Solid templates replace the default atmospheric bg; image templates layer on top. */}
          {!backgroundFallbackColor || backgroundSource ? <DefaultMainBackground /> : null}
          {backgroundSource ? (
            <ImageBackground
              source={backgroundSource}
              style={styles.container}
              resizeMode="cover"
              imageStyle={bgImageStyle}
            >
              {chatBody}
            </ImageBackground>
          ) : (
            chatBody
          )}
        </View>
      ) : backgroundSource ? (
        <ImageBackground
          source={backgroundSource}
          style={[
            styles.container,
            backgroundFallbackColor ? { backgroundColor: backgroundFallbackColor } : null,
          ]}
          resizeMode="cover"
          imageStyle={bgImageStyle}
        >
          {chatBody}
        </ImageBackground>
      ) : (
        <View
          style={[
            styles.container,
            backgroundFallbackColor ? { backgroundColor: backgroundFallbackColor } : null,
          ]}
        >
          {chatBody}
        </View>
      )}

      <ChatBackgroundPickerModal
        visible={bgPickerVisible}
        roleId={roleIdValue || ''}
        preference={chatBgPref}
        onClose={() => setBgPickerVisible(false)}
        onApplied={setChatBgPref}
        variant={uiVariant}
      />

      <ChatHistoryDrawer
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        roleId={roleIdValue || ''}
        currentSessionId={sessionId}
        onSelectSession={switchToSession}
        onNewChat={handleNewConversation}
        onDeletedCurrent={handleNewConversation}
        variant={uiVariant}
      />

      <EventMenu
        visible={eventMenuVisible}
        events={role?.events || []}
        onClose={() => setEventMenuVisible(false)}
        onTrigger={handleTriggerEvent}
        disabled={isGenerating}
        variant={uiVariant}
      />

      <EroticAddictionUnlockModal
        visible={Boolean(eroticUnlockPayload)}
        payload={eroticUnlockPayload}
        onClose={() => setEroticUnlockPayload(null)}
        onViewKinks={() => {
          setEroticUnlockPayload(null);
          infoUserToggledRef.current = true;
          setInfoVisible(true);
        }}
      />

      {!isDesktop ? (
        <CharacterInfoPanel
          mode="modal"
          visible={infoVisible}
          role={role}
          onClose={() => {
            infoUserToggledRef.current = true;
            setInfoVisible(false);
          }}
          onNewChat={handleNewConversation}
          onVideoCall={handleVideoCallFromInfo}
          videoCallDisabled={callDisabled}
          variant={uiVariant}
          bond={chatState?.bond ?? null}
          dominance={dominance}
          onDominanceChange={handleDominanceChange}
          dominanceDisabled={isGenerating}
        />
      ) : null}

      <ChatQuotaExceededModal
        visible={quotaExceededVisible}
        onClose={() => setQuotaExceededVisible(false)}
        onUpgrade={() => {
          setQuotaExceededVisible(false);
          setVipUpgradeVisible(true);
        }}
      />

      <ChatSoftUpsellModal
        visible={softUpsellVisible}
        onLater={() => setSoftUpsellVisible(false)}
        onSubscribe={() => {
          setSoftUpsellVisible(false);
          setVipUpgradeVisible(true);
        }}
      />

      <VipUpgradeModal visible={vipUpgradeVisible} onClose={() => setVipUpgradeVisible(false)} />

      {sessionId && roleIdValue && voiceCallVisible ? (
        <VoiceCallOverlay
          visible
          sessionId={sessionId}
          roleId={roleIdValue}
          agentName={agentName}
          agentAvatar={agentAvatar}
          preferredPath={voiceCallPreferredPath}
          onClose={() => setVoiceCallVisible(false)}
          onBeforeConnect={stopAllAudio}
        />
      ) : null}

      <ThemedGeneralConfirmModal
        visible={fairUseLimitedVisible}
        icon="warning"
        title={t('chat.fairUseLimitedTitle')}
        subtitle={t('chat.fairUseLimitedMessage')}
        subtitleTone="body"
        cancelLabel={t('chat.close')}
        confirmLabel={t('chat.close')}
        hideCancel
        onCancel={() => setFairUseLimitedVisible(false)}
        onConfirm={() => setFairUseLimitedVisible(false)}
      />

      <VoiceQuotaExceededModal
        visible={voiceQuotaExceededVisible}
        variant={uiVariant}
        onClose={() => setVoiceQuotaExceededVisible(false)}
        onUpgrade={() => {
          setVoiceQuotaExceededVisible(false);
          router.push('/vip/shop');
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  containerDefault: {
    backgroundColor: TOKENS.colors.bg,
  },
  /** RN Web needs explicit 100% size or the bitmap stays at intrinsic width. */
  chatBgImageDim: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  chatBgImageDimDefault: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.22,
  },
  /** Agent 立绘 default — readable over chat, still fills web + mobile via cover. */
  chatBgImageDimFigure: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.42,
    ...(Platform.OS === 'web'
      ? ({
          objectFit: 'cover',
          objectPosition: 'center top',
        } as object)
      : {}),
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRootDefault: {
    backgroundColor: TOKENS.colors.bg,
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  /** 左栏历史 + 右侧聊天区 */
  chatShell: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
  },
  chatBody: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    position: 'relative',
  },
  /** 左栏展开时：中间内容与侧栏之间留白 */
  chatBodyWithSidebar: {
    paddingLeft: 20,
    paddingRight: 16,
  },
  /** 左栏折叠为窄轨时仍留一点呼吸间距 */
  chatBodySidebarCollapsed: {
    paddingLeft: 12,
    paddingRight: 12,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerRevealZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 19,
  },
  messagesLayer: {
    flex: 1,
    minHeight: 0,
    zIndex: 2,
    paddingHorizontal: 16,
  },
  inputArea: {
    flexShrink: 0,
    paddingHorizontal: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  /** 移动端输入区铺满底部，去掉左右 inset */
  inputAreaMobileFullBleed: {
    paddingHorizontal: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  /** Opaque dock so home-indicator inset shares one block with the input bar (same as header/notch). */
  inputAreaDefault: {
    backgroundColor: TOKENS.colors.bg,
  },
  inputAreaSoviet: {
    backgroundColor: '#08090C',
  },
});
