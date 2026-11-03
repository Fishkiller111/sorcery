import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FreeChatHeader } from '../../../../src/components/free-chat/FreeChatHeader';
import { FreeChatLayer } from '../../../../src/components/free-chat/FreeChatLayer';
import { InspirationReplies } from '../../../../src/components/free-chat/InspirationReplies';
import {
  VoiceQuotaExceededModal,
} from '../../../../src/components/free-chat/VoiceQuotaExceededModal';
import type { FreeChatUiVariant } from '../../../../src/components/free-chat/freeChatUi';
import { ChatInputBar } from '../../../../src/components/ui/ChatInputBar';
import {
  getWorldInspirationReplies,
  polishChatDraft,
} from '../../../../src/api/playChatEnhance';
import { uploadChatImage } from '../../../../src/api/chat';
import { ApiError } from '../../../../src/api/client';
import { getExploreWorld } from '../../../../src/api/exploreWorlds';
import { useWorldPlay } from '../../../../src/hooks/useWorldPlay';
import { useOwnerContentReport } from '../../../../src/hooks/useOwnerContentReport';
import { useVoiceAsr } from '../../../../src/hooks/useVoiceAsr';
import { useMobilePageContentPaddingStyle, useMobileSafeAreaPadding } from '../../../../src/hooks/useMobileSafeAreaPadding';
import { useI18n } from '../../../../src/i18n/I18nContext';
import { DefaultMainBackground } from '../../../../src/pages/default/components/DefaultMainBackground';
import { SocialReportReasonModal } from '../../../../src/pages/default/social/SocialReportReasonModal';
import { TOKENS } from '../../../../src/pages/default/theme/tokens';
import { useAuthStore } from '../../../../src/stores/authStore';
import { COLORS } from '../../../../src/theme/colors';
import { Typo } from '../../../../src/theme/typography';
import { useTheme } from '../../../../src/theme/useTheme';
import { formatApiError } from '../../../../src/utils/apiError';
import { stellarChatBgSource } from '../../../../src/utils/chatBackgroundStore';
import {
  compressImageForUpload,
  EmptyImageError,
  ImageTooLargeError,
} from '../../../../src/utils/compressImageForUpload';
import { notifyError } from '../../../../src/utils/notify';
import { pickChatImage, PhotoPermissionDeniedError } from '../../../../src/utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../../../src/utils/promptPhotoLibraryAccessSettings';
import { isSimulatorCatalogId } from '../../../../src/utils/exploreCatalogNavigation';
import { toBackendLang } from '../../../../src/utils/userLang';

export default function WorldPlayScreen() {
  const { worldId: rawWorldId, levelCode: rawLevelCode } = useLocalSearchParams<{
    worldId: string | string[];
    levelCode: string | string[];
  }>();
  const worldId = String(Array.isArray(rawWorldId) ? rawWorldId[0] : rawWorldId || '');
  const levelCode = String(Array.isArray(rawLevelCode) ? rawLevelCode[0] : rawLevelCode || '');
  const router = useRouter();
  const { t, lang } = useI18n();
  const { themeId } = useTheme();
  const uiVariant: FreeChatUiVariant = themeId === 'default' ? 'default' : 'soviet';
  const isDefaultTheme = uiVariant === 'default';
  const insets = useSafeAreaInsets();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const { paddingBottom: safeBottomInset = 0 } = useMobileSafeAreaPadding();
  const inputDockBottomPad = Math.max(safeBottomInset > 0 ? safeBottomInset - 10 : 0, 0);
  const user = useAuthStore((s) => s.user);

  const {
    loading,
    sending,
    loadError,
    session,
    messages,
    levelCleared,
    badEndId,
    leadCast,
    playerCast,
    isThinking,
    send,
    interrupt,
    saveProgress,
    saving,
    voiceEnabled,
    streamingAudioMsgId,
    playingMsgId,
    onToggleAudio,
    stopAllAudio,
    voiceQuotaExceededVisible,
    setVoiceQuotaExceededVisible,
  } = useWorldPlay(worldId, levelCode);

  const [ownerUserId, setOwnerUserId] = useState<string>();
  const { reportOpen, setReportOpen, openReport, submitReport } = useOwnerContentReport({
    ownerUserId,
    detail: `world_play:${worldId}/${levelCode}`,
  });

  useEffect(() => {
    if (isSimulatorCatalogId(worldId)) {
      router.replace(`/simulator/${worldId}/play`);
    }
  }, [router, worldId]);

  useEffect(() => {
    if (!worldId || isSimulatorCatalogId(worldId)) {
      setOwnerUserId(undefined);
      return;
    }
    let cancelled = false;
    void getExploreWorld(worldId, { lang: toBackendLang(lang) })
      .then((resp) => {
        if (!cancelled) setOwnerUserId(resp.world?.owner_user_id);
      })
      .catch(() => {
        if (!cancelled) setOwnerUserId(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [lang, worldId]);

  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pendingImage, setPendingImage] = useState<{ imageUrl: string; previewUri: string } | null>(
    null,
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [polishLoading, setPolishLoading] = useState(false);
  const [inspirationItems, setInspirationItems] = useState<string[]>([]);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const headerHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerAnim = useRef(new Animated.Value(1)).current;
  const messagesTopPadAnim = useRef(
    new Animated.Value((Platform.OS === 'web' ? 12 : 54) + 96),
  ).current;
  const HEADER_AUTO_HIDE_MS = 3000;

  const clearHeaderHideTimer = useCallback(() => {
    if (headerHideTimerRef.current) {
      clearTimeout(headerHideTimerRef.current);
      headerHideTimerRef.current = null;
    }
  }, []);

  const scheduleHeaderHide = useCallback(() => {
    clearHeaderHideTimer();
    headerHideTimerRef.current = setTimeout(() => {
      setHeaderVisible(false);
    }, HEADER_AUTO_HIDE_MS);
  }, [clearHeaderHideTimer]);

  const showHeader = useCallback(() => {
    setHeaderVisible(true);
    scheduleHeaderHide();
  }, [scheduleHeaderHide]);

  useEffect(() => {
    scheduleHeaderHide();
    return clearHeaderHideTimer;
  }, [clearHeaderHideTimer, scheduleHeaderHide]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: headerVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [headerAnim, headerVisible]);

  useEffect(() => {
    const headerPad = Math.max(headerHeight, (Platform.OS === 'web' ? 12 : 54) + 72);
    const goalPad = session?.play_goal && !levelCleared && !loadError ? 64 : 0;
    const target = (headerVisible ? headerPad : 12) + goalPad;
    Animated.timing(messagesTopPadAnim, {
      toValue: target,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [headerHeight, headerVisible, messagesTopPadAnim, session?.play_goal, levelCleared, loadError]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopAllAudio();
      };
    }, [stopAllAudio]),
  );

  const worldSessionId = session?.world_session_id;
  const inputLocked = !!loadError || levelCleared || sending || imageUploading;

  const inspirationAnchor = useMemo(() => {
    const last = messages[messages.length - 1];
    return `${messages.length}:${last?.id ?? ''}:${last?.isStreaming ? 1 : 0}`;
  }, [messages]);

  useEffect(() => {
    if (!worldId || !worldSessionId || loading || sending || levelCleared || loadError) {
      if (sending) setInspirationItems([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      void (async () => {
        setInspirationLoading(true);
        try {
          const resp = await getWorldInspirationReplies(String(worldId), worldSessionId);
          if (!cancelled) {
            setInspirationItems(resp.items ?? []);
          }
        } catch (err) {
          console.warn('Failed to load world inspiration replies:', err);
          if (!cancelled) setInspirationItems([]);
        } finally {
          if (!cancelled) setInspirationLoading(false);
        }
      })();
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [worldId, worldSessionId, loading, sending, levelCleared, loadError, inspirationAnchor]);

  const handleSend = useCallback(
    (text: string) => {
      if (inputLocked) return;
      const trimmed = text.trim();
      const imageUrl = pendingImage?.imageUrl;
      if (!trimmed && !imageUrl) return;
      setPendingImage(null);
      setInspirationItems([]);
      void send(trimmed, imageUrl);
    },
    [inputLocked, pendingImage, send],
  );

  const handleAttachImage = useCallback(async () => {
    if (!worldSessionId || inputLocked || pendingImage) return;
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
      notifyError(t('freeChat.error'), formatApiError(t, err));
    } finally {
      setImageUploading(false);
    }
  }, [worldSessionId, inputLocked, pendingImage, t]);

  const handleRemovePendingImage = useCallback(() => {
    setPendingImage(null);
  }, []);

  const handlePolishDraft = useCallback(
    async (text: string) => {
      const draft = text.trim();
      if (!draft || polishLoading) return;
      setPolishLoading(true);
      try {
        const resp = await polishChatDraft(draft, undefined, lang);
        return resp.text;
      } catch (err) {
        console.warn('Polish draft failed:', err);
        notifyError(
          t('chat.polishFailed'),
          err instanceof ApiError ? err.message : undefined,
        );
      } finally {
        setPolishLoading(false);
      }
    },
    [lang, polishLoading, t],
  );

  const { recording, asrLoading, handleStartRecording, handleStopRecording } = useVoiceAsr({
    onText: handleSend,
    disabled: inputLocked,
    lang,
    userLangs: user ?? undefined,
  });

  const { width: viewportW, height: viewportH } = useWindowDimensions();
  // Unified agent-chat backdrop: Stellar default (not scene / per-cast art).
  const chatBgSource = stellarChatBgSource({ width: viewportW, height: viewportH });
  const agentName = leadCast?.name || session?.scene_title || levelCode;
  const agentAvatar = leadCast?.figure_image;
  const agentColor = isDefaultTheme ? TOKENS.colors.accent : COLORS.accent.gold;
  const moodActivity = [
    playerCast?.name ? `${t('worldPlay.playingAs')} ${playerCast.name}` : '',
    session?.scene_title,
    session?.current_beat,
  ]
    .filter(Boolean)
    .join(' · ');
  const headerRevealZoneHeight = Math.max(insets.top + 28, 48);

  const webHeaderHoverProps =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: showHeader,
        } as Record<string, unknown>)
      : {};

  if (loading) {
    return (
      <View style={[styles.loadingRoot, isDefaultTheme && styles.loadingRootDefault, pageContentPadding]}>
        <ActivityIndicator size="large" color={isDefaultTheme ? TOKENS.colors.accent : COLORS.accent.gold} />
      </View>
    );
  }

  const chatBody = (
    <View style={styles.chatBody}>
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
          moodActivity={moodActivity || undefined}
          onBack={() => router.replace(`/world/${worldId}`)}
          onSave={() => void saveProgress()}
          saveDisabled={!!loadError || levelCleared || !session?.world_session_id}
          saveLoading={saving}
          onReport={ownerUserId ? openReport : undefined}
          variant={uiVariant}
        />
      </Animated.View>

      {!headerVisible ? (
        <Pressable
          style={[styles.headerRevealZone, { height: headerRevealZoneHeight }]}
          onPress={showHeader}
          accessibilityRole="button"
          accessibilityLabel={agentName || t('worldPlay.levelsTitle')}
          {...webHeaderHoverProps}
        />
      ) : null}

      {levelCleared ? (
        <Pressable style={styles.banner} onPress={() => router.replace(`/world/${worldId}`)}>
          <Text style={Typo(styles.bannerText, 'sans', lang)}>{t('worldPlay.levelClearedTap')}</Text>
        </Pressable>
      ) : null}
      {badEndId ? (
        <View style={[styles.banner, styles.bannerBad]}>
          <Text style={Typo(styles.bannerText, 'sans', lang)}>
            {t('worldPlay.badEnd')}: {badEndId}
          </Text>
        </View>
      ) : null}

      {session?.play_goal && !loadError && !levelCleared ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.goalDock,
            isDefaultTheme && styles.goalDockDefault,
            {
              top: headerVisible
                ? Math.max(headerHeight, (Platform.OS === 'web' ? 12 : 54) + 56)
                : Math.max(insets.top + 8, 12),
              opacity: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ]}
        >
          <Text style={Typo(styles.goalLabel, 'mono', lang)}>{t('worldPlay.playGoal')}</Text>
          <Text style={Typo(styles.goalText, 'sans', lang)} numberOfLines={3}>
            {session.play_goal}
          </Text>
        </Animated.View>
      ) : null}

      {loadError ? (
        <Text style={Typo(styles.error, 'sans', lang)}>
          {loadError === 'vip_required'
            ? t('settings.matureVipRequired')
            : loadError === 'locked'
              ? t('worldPlay.levelLocked')
              : loadError}
        </Text>
      ) : (
        <View style={styles.mainContent}>
          <Animated.View style={[styles.messagesLayer, { paddingTop: messagesTopPadAnim }]}>
            <FreeChatLayer
              messages={messages}
              voiceEnabled={voiceEnabled}
              streamingAudioMsgId={streamingAudioMsgId}
              playingMsgId={playingMsgId}
              onToggleAudio={onToggleAudio}
              thinking={isThinking}
              agentName={agentName}
              agentAvatar={agentAvatar}
              agentColor={agentColor}
              variant={uiVariant}
              onBlankPress={showHeader}
            />
          </Animated.View>
        </View>
      )}

      <View
        style={[
          styles.inputArea,
          isDefaultTheme ? styles.inputAreaDefault : styles.inputAreaSoviet,
          { paddingBottom: inputDockBottomPad },
        ]}
      >
        <InspirationReplies
          items={inspirationItems}
          loading={inspirationLoading}
          disabled={inputLocked}
          variant={uiVariant}
          onSelect={(text) => {
            setInspirationItems([]);
            handleSend(text);
          }}
        />
        <ChatInputBar
          onSend={handleSend}
          disabled={inputLocked}
          isGenerating={sending}
          onInterrupt={() => void interrupt()}
          placeholder={sending ? t('chat.sending') : t('worldPlay.inputPlaceholder')}
          recording={recording}
          asrLoading={asrLoading}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onAttachImage={handleAttachImage}
          imageUploading={imageUploading}
          pendingImagePreview={pendingImage?.previewUri ?? null}
          onRemovePendingImage={handleRemovePendingImage}
          onPolishDraft={handlePolishDraft}
          polishLoading={polishLoading}
          variant={isDefaultTheme ? 'soulthread' : 'soviet'}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, isDefaultTheme && styles.rootDefault, pageContentPadding]}>
      <StatusBar style="light" />
      {isDefaultTheme ? <DefaultMainBackground /> : null}
      <ImageBackground
        source={chatBgSource}
        style={StyleSheet.absoluteFill}
        imageStyle={{ opacity: isDefaultTheme ? 0.55 : 0.45 }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {chatBody}
      </KeyboardAvoidingView>
      <VoiceQuotaExceededModal
        visible={voiceQuotaExceededVisible}
        variant={uiVariant}
        onClose={() => setVoiceQuotaExceededVisible(false)}
        onUpgrade={() => {
          setVoiceQuotaExceededVisible(false);
          router.push('/vip/shop');
        }}
      />
      <SocialReportReasonModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSelect={(reason) => void submitReport(reason)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg.primary },
  rootDefault: { backgroundColor: TOKENS.colors.bg },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg.primary,
  },
  loadingRootDefault: { backgroundColor: TOKENS.colors.bg },
  flex: { flex: 1 },
  chatBody: { flex: 1 },
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
    zIndex: 15,
  },
  mainContent: { flex: 1 },
  messagesLayer: { flex: 1 },
  inputArea: {
    flexShrink: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  /** Opaque dock — match free-chat agent input chrome. */
  inputAreaDefault: {
    backgroundColor: TOKENS.colors.bg,
  },
  inputAreaSoviet: {
    backgroundColor: '#08090C',
  },
  banner: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(200,160,60,0.28)',
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
    zIndex: 12,
  },
  bannerBad: {
    backgroundColor: 'rgba(180,40,40,0.28)',
    borderColor: '#c44',
  },
  bannerText: { color: COLORS.text.primary, fontSize: 13 },
  goalDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(8, 10, 14, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 181, 0.28)',
    gap: 4,
  },
  goalDockDefault: {
    backgroundColor: 'rgba(12, 14, 18, 0.82)',
    borderColor: TOKENS.colors.cardBorder,
  },
  goalLabel: {
    color: COLORS.accent.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalText: {
    color: COLORS.agents.paleGold,
    fontSize: 13,
    lineHeight: 18,
  },
  error: { color: '#c44', fontSize: 14, margin: 20, textAlign: 'center' },
});
