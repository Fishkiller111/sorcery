import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSimulatorPlay } from '../../../src/hooks/useSimulatorPlay';
import { useOwnerContentReport } from '../../../src/hooks/useOwnerContentReport';
import { useSimulatorAccess } from '../../../src/hooks/useSimulatorAccess';
import { useVoiceAsr } from '../../../src/hooks/useVoiceAsr';
import { useI18n } from '../../../src/i18n/I18nContext';
import type { Lang } from '../../../src/i18n/types';
import { Typo } from '../../../src/theme/typography';
import { useAuthStore } from '../../../src/stores/authStore';
import { APP_SITE_URL } from '../../../src/constants/config';
import { copyOrShareText } from '../../../src/utils/copyOrShare';
import { notifyError, notifySuccess } from '../../../src/utils/notify';
import { safeGoBack } from '../../../src/utils/safeGoBack';
import {
  useMobilePageContentPaddingStyle,
  useMobileSafeAreaPadding,
} from '../../../src/hooks/useMobileSafeAreaPadding';
import { DefaultMainBackground } from '../../../src/pages/default/components/DefaultMainBackground';
import { SocialReportReasonModal } from '../../../src/pages/default/social/SocialReportReasonModal';
import { TOKENS } from '../../../src/pages/default/theme/tokens';
import type { SimulatorGoalProgress, SimulatorPlayMessage } from '../../../src/types/simulator';
import type { FreeChatMessage } from '../../../src/types/api';
import { FreeChatLayer } from '../../../src/components/free-chat/FreeChatLayer';
import { InspirationReplies } from '../../../src/components/free-chat/InspirationReplies';
import { ChatInputBar } from '../../../src/components/ui/ChatInputBar';
import {
  getSimulatorInspirationReplies,
  polishChatDraft,
} from '../../../src/api/playChatEnhance';
import { uploadChatImage } from '../../../src/api/chat';
import { getExploreSimulator } from '../../../src/api/simulator';
import { ApiError } from '../../../src/api/client';
import { pickChatImage, PhotoPermissionDeniedError } from '../../../src/utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../../src/utils/promptPhotoLibraryAccessSettings';
import {
  compressImageForUpload,
  EmptyImageError,
  ImageTooLargeError,
} from '../../../src/utils/compressImageForUpload';
import { formatApiError } from '../../../src/utils/apiError';

function DevGate({
  title,
  desc,
  actionLabel,
  onAction,
}: {
  title: string;
  desc?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.gate}>
      <DefaultMainBackground />
      <View style={styles.gateCard}>
        <Text style={styles.gateTitle}>{title}</Text>
        {desc ? <Text style={styles.gateDesc}>{desc}</Text> : null}
        <Pressable style={styles.gateBtn} onPress={onAction}>
          <Text style={styles.gateBtnText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function toFreeChatMessages(
  messages: SimulatorPlayMessage[],
  opts: {
    castById: Map<string, { name?: string; figure_image?: string }>;
    leadCastId?: string;
    playerCastId?: string;
    playerAvatar?: string;
    agentColor?: string;
  },
): FreeChatMessage[] {
  const lead = opts.leadCastId ? opts.castById.get(opts.leadCastId) : undefined;
  const playerCast = opts.playerCastId ? opts.castById.get(opts.playerCastId) : undefined;
  const fallbackAgent = lead ?? [...opts.castById.values()].find((c) => c.figure_image) ?? [...opts.castById.values()][0];

  return messages.map((m) => {
    if (m.role === 'user') {
      return {
        id: m.id,
        role: 'player' as const,
        text: m.text,
        imageUrl: m.imageUrl,
        timestamp: m.timestamp,
        isStreaming: m.isStreaming,
        playerAvatar: playerCast?.figure_image || opts.playerAvatar,
      };
    }
    if (m.role === 'system') {
      return {
        id: m.id,
        role: 'system' as const,
        text: m.text,
        timestamp: m.timestamp,
        isStreaming: m.isStreaming,
      };
    }
    const cast = (m.castId && opts.castById.get(m.castId)) || fallbackAgent;
    return {
      id: m.id,
      role: 'agent' as const,
      text: m.text,
      imageUrl: m.imageUrl,
      timestamp: m.timestamp,
      isStreaming: m.isStreaming,
      agentName: cast?.name,
      agentAvatar: cast?.figure_image,
      agentColor: opts.agentColor,
    };
  });
}

function GoalProgressStrip({
  progress,
  flagKeys,
  lang,
}: {
  progress: SimulatorGoalProgress | null;
  flagKeys: string[];
  lang: Lang;
}) {
  const { t } = useI18n();
  const goalCount = progress?.matchedGoals.length ?? 0;
  const failCount = progress?.matchedFails.length ?? 0;
  return (
    <View style={styles.progressStrip}>
      <Text style={Typo(styles.progressChip, 'sans', lang)}>
        {t('simulator.goalProgressGoals')} {goalCount}
      </Text>
      <Text style={Typo(styles.progressChip, 'sans', lang)}>
        {t('simulator.goalProgressFails')} {failCount}
      </Text>
      <Text style={Typo(styles.progressChip, 'sans', lang)}>
        {t('simulator.goalProgressFlags')} {flagKeys.length}
      </Text>
      {flagKeys.slice(0, 4).map((key) => (
        <Text key={key} style={Typo(styles.progressFlagChip, 'sans', lang)} numberOfLines={1}>
          {key}
        </Text>
      ))}
    </View>
  );
}

export default function SimulatorPlayScreen() {
  const { simulatorId } = useLocalSearchParams<{ simulatorId: string }>();
  const id = String(simulatorId || '');
  const router = useRouter();
  const { t, tp, lang } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const user = useAuthStore((s) => s.user);
  const { canAccessSimulator } = useSimulatorAccess();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const { paddingBottom: safeBottom } = useMobileSafeAreaPadding();

  const {
    loading,
    sending,
    loadError,
    session,
    messages,
    showIntro,
    settleKind,
    settleText,
    goalProgress,
    abandoning,
    needPlayerCast,
    playableCast,
    selectingCast,
    dismissIntro,
    selectPlayerCast,
    send,
    interrupt,
    abandon,
    replay,
  } = useSimulatorPlay(id);

  const [ownerUserId, setOwnerUserId] = useState<string>();
  const { reportOpen, setReportOpen, openReport, submitReport } = useOwnerContentReport({
    ownerUserId,
    detail: `simulator_play:${id}`,
  });

  useEffect(() => {
    if (!id) {
      setOwnerUserId(undefined);
      return;
    }
    let cancelled = false;
    void getExploreSimulator(id)
      .then((resp) => {
        if (!cancelled) setOwnerUserId(resp.simulator?.owner_user_id);
      })
      .catch(() => {
        if (!cancelled) setOwnerUserId(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const [sharing, setSharing] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ imageUrl: string; previewUri: string } | null>(
    null,
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [polishLoading, setPolishLoading] = useState(false);
  const [inspirationItems, setInspirationItems] = useState<string[]>([]);
  const [inspirationLoading, setInspirationLoading] = useState(false);

  const castById = useMemo(() => {
    const map = new Map<string, { name?: string; figure_image?: string }>();
    for (const c of session?.cast ?? []) {
      map.set(c.cast_id, { name: c.name, figure_image: c.figure_image });
    }
    for (const c of playableCast) {
      if (!map.has(c.cast_id)) {
        map.set(c.cast_id, { name: c.name, figure_image: c.figure_image });
      }
    }
    return map;
  }, [playableCast, session?.cast]);

  const leadCast = useMemo(() => {
    const leadId = session?.lead_cast_id;
    if (leadId && castById.has(leadId)) return { cast_id: leadId, ...castById.get(leadId)! };
    const first = session?.cast?.[0];
    return first ? { cast_id: first.cast_id, name: first.name, figure_image: first.figure_image } : undefined;
  }, [castById, session?.cast, session?.lead_cast_id]);

  const freeChatMessages = useMemo(
    () =>
      toFreeChatMessages(messages, {
        castById,
        leadCastId: session?.lead_cast_id || leadCast?.cast_id,
        playerCastId: session?.player_cast_id,
        playerAvatar: user?.avatar_url,
        agentColor: TOKENS.colors.accent,
      }),
    [
      castById,
      leadCast?.cast_id,
      messages,
      session?.lead_cast_id,
      session?.player_cast_id,
      user?.avatar_url,
    ],
  );
  const inputLocked = sending || !!showIntro || !!settleKind || imageUploading;
  const sessionId = session?.session_id;

  const isThinking = useMemo(() => {
    if (!sending) return false;
    const streamingAgent = [...messages].reverse().find((m) => m.role === 'agent' && m.isStreaming);
    if (!streamingAgent) return true;
    return streamingAgent.text.trim().length === 0;
  }, [sending, messages]);

  const inspirationAnchor = useMemo(() => {
    const last = messages[messages.length - 1];
    return `${messages.length}:${last?.id ?? ''}:${last?.isStreaming ? 1 : 0}`;
  }, [messages]);

  useEffect(() => {
    if (!sessionId || !id || loading || sending || showIntro || settleKind) {
      if (sending) setInspirationItems([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      void (async () => {
        setInspirationLoading(true);
        try {
          const resp = await getSimulatorInspirationReplies(id, sessionId);
          if (!cancelled) {
            setInspirationItems(resp.items ?? []);
          }
        } catch (err) {
          console.warn('Failed to load simulator inspiration replies:', err);
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
  }, [sessionId, id, loading, sending, showIntro, settleKind, inspirationAnchor]);

  const handleSend = useCallback(
    (text: string) => {
      if (sending || settleKind || showIntro || imageUploading) return;
      const trimmed = text.trim();
      const imageUrl = pendingImage?.imageUrl;
      if (!trimmed && !imageUrl) return;
      setPendingImage(null);
      setInspirationItems([]);
      void send(trimmed, imageUrl);
    },
    [sending, settleKind, showIntro, imageUploading, pendingImage, send],
  );

  const handleAttachImage = useCallback(async () => {
    if (!sessionId || sending || showIntro || settleKind || imageUploading || pendingImage) return;
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
  }, [sessionId, sending, showIntro, settleKind, imageUploading, pendingImage, t]);

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

  const onShareSettle = useCallback(async () => {
    if (sharing) return;
    const title = session?.title?.trim() || t('simulator.play');
    const path = `/simulator/${id}`;
    const url = APP_SITE_URL ? `${APP_SITE_URL}${path}` : path;
    const message = [title, settleText.trim(), url].filter(Boolean).join('\n');
    setSharing(true);
    try {
      const result = await copyOrShareText(message, title);
      if (result === 'copied') {
        notifySuccess(t('simulator.shareCopied'));
      }
    } catch (e) {
      notifyError(t('simulator.shareFailed'), e instanceof Error ? e.message : undefined);
    } finally {
      setSharing(false);
    }
  }, [id, session?.title, settleText, sharing, t]);

  const flags = session?.flags ?? goalProgress?.flags ?? {};
  const flagKeys = Object.keys(flags).filter((k) => flags[k]);
  const showProgressStrip = !!goalProgress || flagKeys.length > 0;

  if (!isRestored) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={TOKENS.colors.accent} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <DevGate
        title={t('login.loginRequired')}
        actionLabel={t('login.login')}
        onAction={() => router.push('/login')}
      />
    );
  }

  if (!canAccessSimulator) {
    return (
      <DevGate
        title={t('simulator.devOnlyTitle')}
        desc={t('simulator.devOnlyDesc')}
        actionLabel={t('menu.back')}
        onAction={() => safeGoBack(`/simulator/${id}`, router)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <DefaultMainBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={[styles.header, pageContentPadding]}>
          <Pressable
            onPress={() => safeGoBack(`/simulator/${id}`, router)}
            style={styles.backRow}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={TOKENS.colors.text} />
            <Text style={Typo(styles.backText, 'sans', lang)} numberOfLines={1}>
              {session?.title || t('simulator.play')}
            </Text>
          </Pressable>
          <View style={styles.headerActions}>
            {ownerUserId ? (
              <Pressable onPress={openReport} hitSlop={8} accessibilityRole="button">
                <Text style={Typo(styles.reportText, 'sans', lang)}>{t('agentMedia.report')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void abandon().then(() => safeGoBack(`/simulator/${id}`, router))}
              disabled={abandoning}
              hitSlop={8}
            >
              <Text style={Typo(styles.abandonText, 'sans', lang)}>{t('simulator.abandon')}</Text>
            </Pressable>
          </View>
        </View>

        {session && !needPlayerCast && !loadError ? (
          <View style={[styles.playMetaBar, pageContentPadding]}>
            <Text style={Typo(styles.playMetaRound, 'sans', lang)}>
              {(session.max_rounds ?? 0) > 0
                ? tp('simulator.playRoundWithMax', {
                    current: session.round_count ?? 0,
                    max: session.max_rounds ?? 0,
                  })
                : tp('simulator.playRoundOnly', { current: session.round_count ?? 0 })}
            </Text>
            {session.goal_brief ? (
              <Text style={Typo(styles.playMetaGoal, 'sans', lang)} numberOfLines={2}>
                {t('simulator.playGoalLabel')} · {session.goal_brief}
              </Text>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={TOKENS.colors.accent} />
          </View>
        ) : loadError ? (
          <View style={styles.center}>
            <Text style={Typo(styles.errorText, 'sans', lang)}>{loadError}</Text>
          </View>
        ) : needPlayerCast ? (
          <View style={styles.castPick}>
            <Text style={Typo(styles.castPickTitle, 'serif', lang)}>
              {t('simulator.pickCastTitle')}
            </Text>
            <Text style={Typo(styles.castPickBody, 'sans', lang)}>
              {t('simulator.pickCastBody')}
            </Text>
            {playableCast.map((c) => (
              <Pressable
                key={c.cast_id}
                style={[styles.castBtn, selectingCast && styles.sendDisabled]}
                disabled={selectingCast}
                onPress={() => void selectPlayerCast(c.cast_id)}
              >
                <Text style={Typo(styles.castBtnText, 'sans', lang)}>{c.name}</Text>
              </Pressable>
            ))}
            {selectingCast ? (
              <ActivityIndicator color={TOKENS.colors.accent} style={{ marginTop: 12 }} />
            ) : null}
          </View>
        ) : (
          <>
            {showIntro && session && !settleKind ? (
              <View style={styles.introCard}>
                {session.intro ? (
                  <>
                    <Text style={Typo(styles.introLabel, 'sans', lang)}>{t('simulator.intro')}</Text>
                    <Text style={Typo(styles.introBody, 'sans', lang)}>{session.intro}</Text>
                  </>
                ) : null}
                {session.goal_brief ? (
                  <>
                    <Text style={[Typo(styles.introLabel, 'sans', lang), { marginTop: 12 }]}>
                      {t('simulator.goal')}
                    </Text>
                    <Text style={Typo(styles.introBody, 'sans', lang)}>{session.goal_brief}</Text>
                  </>
                ) : null}
                <Pressable style={styles.introBtn} onPress={dismissIntro}>
                  <Text style={Typo(styles.introBtnText, 'sans', lang)}>
                    {t('simulator.beginChat')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {showProgressStrip ? (
              <GoalProgressStrip progress={goalProgress} flagKeys={flagKeys} lang={lang} />
            ) : null}

            <View style={styles.messagesLayer}>
              <FreeChatLayer
                messages={freeChatMessages}
                thinking={isThinking}
                agentName={leadCast?.name}
                agentAvatar={leadCast?.figure_image}
                agentColor={TOKENS.colors.accent}
                variant="default"
              />
              {!showIntro && freeChatMessages.length === 0 ? (
                <Text style={Typo(styles.emptyChat, 'sans', lang)}>{t('simulator.chatEmpty')}</Text>
              ) : null}
            </View>

            {settleKind ? (
              <View style={styles.settleOverlay}>
                <Text style={Typo(styles.settleTitle, 'serif', lang)}>
                  {settleKind === 'victory'
                    ? t('simulator.victory')
                    : t('simulator.failure')}
                </Text>
                {settleText ? (
                  <Text style={Typo(styles.settleBody, 'sans', lang)}>{settleText}</Text>
                ) : null}
                <Pressable style={styles.primaryBtn} onPress={() => void replay()}>
                  <Text style={Typo(styles.primaryBtnText, 'sans', lang)}>
                    {t('simulator.replay')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryBtn, styles.shareBtn, sharing && styles.sendDisabled]}
                  disabled={sharing}
                  onPress={() => void onShareSettle()}
                >
                  <Text style={Typo(styles.shareBtnText, 'sans', lang)}>
                    {t('simulator.share')}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => safeGoBack(`/simulator/${id}`, router)}
                >
                  <Text style={Typo(styles.secondaryBtnText, 'sans', lang)}>
                    {t('simulator.backToDetail')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.inputDock, { paddingBottom: Math.max(safeBottom, 10) }]}>
                <InspirationReplies
                  items={inspirationItems}
                  loading={inspirationLoading}
                  disabled={inputLocked}
                  variant="default"
                  onSelect={(text) => {
                    setInspirationItems([]);
                    handleSend(text);
                  }}
                />
                <ChatInputBar
                  onSend={handleSend}
                  disabled={inputLocked}
                  isGenerating={sending}
                  onInterrupt={interrupt}
                  placeholder={
                    sending ? t('chat.sending') : t('simulator.inputPlaceholder')
                  }
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
                  variant="soulthread"
                />
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
      <SocialReportReasonModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSelect={(reason) => void submitReport(reason)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TOKENS.colors.bg },
  flex: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.bg,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  playMetaBar: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 4,
  },
  playMetaRound: {
    color: TOKENS.colors.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  playMetaGoal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  backText: { color: TOKENS.colors.text, fontSize: 15, flexShrink: 1 },
  headerActions: { alignItems: 'flex-end', gap: 4 },
  reportText: { color: TOKENS.colors.textSecondary, fontSize: 12, lineHeight: 16 },
  abandonText: { color: TOKENS.colors.textMuted, fontSize: 13 },
  errorText: { color: TOKENS.colors.textSecondary, textAlign: 'center' },
  castPick: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 10,
  },
  castPickTitle: {
    color: TOKENS.colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  castPickBody: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  castBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
    paddingHorizontal: 14,
  },
  castBtnText: { color: TOKENS.colors.text, fontWeight: '700', fontSize: 15 },
  introCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.55)',
  },
  introLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  introBody: { color: TOKENS.colors.text, fontSize: 14, lineHeight: 21 },
  introBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  introBtnText: { color: TOKENS.colors.text, fontWeight: '700', fontSize: 13 },
  progressStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  progressChip: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  progressFlagChip: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    maxWidth: 96,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(186, 60, 71, 0.35)',
    backgroundColor: 'rgba(186, 60, 71, 0.12)',
    overflow: 'hidden',
  },
  messagesLayer: { flex: 1, position: 'relative' },
  emptyChat: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 32,
    color: TOKENS.colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
  },
  inputDock: {
    flexShrink: 0,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.bg,
  },
  sendDisabled: { opacity: 0.4 },
  settleOverlay: {
    margin: 16,
    padding: 20,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.9)',
    gap: 10,
    alignItems: 'center',
  },
  settleTitle: {
    color: TOKENS.colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  settleBody: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: 6,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
  },
  primaryBtnText: { color: TOKENS.colors.text, fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: { color: TOKENS.colors.textMuted, fontSize: 13 },
  shareBtn: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: 10,
    minHeight: 42,
    justifyContent: 'center',
    marginTop: 2,
  },
  shareBtnText: { color: TOKENS.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: TOKENS.colors.bg,
  },
  gateCard: {
    width: '100%',
    maxWidth: 400,
    padding: 28,
    gap: 14,
    alignItems: 'center',
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
  },
  gateTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    'display',
  ),
  gateDesc: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    'sans',
  ),
  gateBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  gateBtnText: Typo({ color: TOKENS.colors.text, fontWeight: '700', fontSize: 15 }, 'sans'),
});
