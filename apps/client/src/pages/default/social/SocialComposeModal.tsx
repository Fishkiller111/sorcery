import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  createMePost,
  createRolePost,
  uploadMePostMedia,
  uploadRolePostMedia,
} from '../../../api/community';
import { createForumPost, createForumRolePost } from '../../../api/forum';
import { listAllRoles } from '../../../api/roles';
import { ApiError } from '../../../api/client';
import { resolveStaticUrl } from '../../../constants/config';
import { useI18n } from '../../../i18n/I18nContext';
import type { ForumBoardSlug, RoleItem } from '../../../types/api';
import { Typo } from '../../../theme/typography';
import { notifyError, notifySuccess, notifyWarning } from '../../../utils/notify';
import { PhotoPermissionDeniedError, pickRoleMedia } from '../../../utils/pickRoleMedia';
import { promptPhotoLibraryAccessSettings } from '../../../utils/promptPhotoLibraryAccessSettings';
import {
  assertUploadHasBytes,
  compressImageForUpload,
  EmptyImageError,
  ImageTooLargeError,
} from '../../../utils/compressImageForUpload';
import { SOCIAL } from './socialTokens';
import { ComposeEmojiPicker } from './ComposeEmojiPicker';
import { themedScrollViewProps } from '../../../theme/webScrollbar';

type Step = 'choose' | 'pick_agent' | 'compose';
type Identity = 'agent' | 'user';

type ComposeMediaItem = {
  key: string;
  url: string;
  previewUri: string;
  isVideo: boolean;
  isGif?: boolean;
};

type SocialComposeModalProps = {
  visible: boolean;
  onClose: () => void;
  onPosted: () => void;
  userAvatarUri?: string | null;
  userDisplayName?: string;
  /** When set, publish via forum APIs to this board (Web forum only). */
  forumBoard?: ForumBoardSlug;
};

const MAX_CHARS = 600;
const MAX_MEDIA = 9;

function isVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.mp4') || lower.includes('video/mp4');
}

export function SocialComposeModal({
  visible,
  onClose,
  onPosted,
  userAvatarUri,
  userDisplayName,
  forumBoard,
}: SocialComposeModalProps) {
  const { t, lang } = useI18n();
  const isForum = Boolean(forumBoard);
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [step, setStep] = useState<Step>('choose');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [agents, setAgents] = useState<RoleItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<RoleItem | null>(null);
  const [draft, setDraft] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [media, setMedia] = useState<ComposeMediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setStep('choose');
    setIdentity(null);
    setSelectedAgent(null);
    setDraft('');
    setSelection({ start: 0, end: 0 });
    setEmojiOpen(false);
    setMedia([]);
    setUploading(false);
    setSubmitting(false);
    setAgentsLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const clearComposeDraft = useCallback(() => {
    setDraft('');
    setSelection({ start: 0, end: 0 });
    setEmojiOpen(false);
    setMedia([]);
    setUploading(false);
  }, []);

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const all = await listAllRoles(50);
      // Post-as-Agent: only the user's own published agents (never official).
      const ownedPublished = all.filter(
        (r) =>
          r.is_owner === true &&
          (r.publish_status || '').toLowerCase() === 'published',
      );
      setAgents(ownedPublished);
    } catch (err) {
      notifyError(t('social.composeLoadAgentsFailed'), err instanceof Error ? err.message : undefined);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  }, [t]);

  const chooseAgent = () => {
    setIdentity('agent');
    setStep('pick_agent');
    void loadAgents();
  };

  const choosePersonal = () => {
    setIdentity('user');
    setSelectedAgent(null);
    clearComposeDraft();
    setStep('compose');
  };

  const pickAgent = (role: RoleItem) => {
    setSelectedAgent(role);
    clearComposeDraft();
    setStep('compose');
  };

  const composerTitle = useMemo(() => {
    if (step === 'choose') return t('social.composeChooseTitle');
    if (step === 'pick_agent') return t('social.composePickAgentTitle');
    if (identity === 'user') return t('social.composeAsPersonal');
    return selectedAgent?.name?.trim() || t('social.composeAsAgent');
  }, [step, identity, selectedAgent, t]);

  const boardHint = useMemo(() => {
    if (!forumBoard) return '';
    const key =
      forumBoard === 'general'
        ? 'forum.boardGeneral'
        : forumBoard === 'works'
          ? 'forum.boardWorks'
          : forumBoard === 'social'
            ? 'forum.boardSocial'
            : 'forum.boardVerified';
    return `${t('forum.composeBoard')} · ${t(key)}`;
  }, [forumBoard, t]);

  const canSubmit =
    (draft.trim().length > 0 || media.length > 0) && !submitting && !uploading;

  const insertEmoji = useCallback(
    (emoji: string) => {
      const start = Math.min(selection.start, draft.length);
      const end = Math.min(selection.end, draft.length);
      const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
      if ([...next].length > MAX_CHARS) {
        notifyWarning(t('social.composeTooLong'));
        return;
      }
      setDraft(next);
      const pos = start + emoji.length;
      setSelection({ start: pos, end: pos });
    },
    [draft, selection.end, selection.start, t],
  );

  const uploadPickedMedia = async (gifOnly: boolean) => {
    if (uploading || submitting) return;
    if (media.length >= MAX_MEDIA) {
      notifyWarning(t('social.composeTooManyMedia'));
      return;
    }
    if (identity === 'agent' && !selectedAgent?.id) {
      notifyWarning(t('social.composePickAgentFirst'));
      return;
    }
    try {
      const picked = await pickRoleMedia(gifOnly ? { gifOnly: true } : undefined);
      if (!picked) return;
      setUploading(true);
      setEmojiOpen(false);
      let file = picked.file;
      let filename = picked.filename;
      let previewUri = picked.previewUri;
      const isGif = Boolean(picked.isGif);
      if (picked.mediaType === 'image' && !isGif) {
        const compressed = await compressImageForUpload({
          previewUri: picked.previewUri,
          file: picked.file,
          filename: picked.filename,
        });
        file = compressed.file;
        filename = compressed.filename;
        previewUri = compressed.previewUri;
      } else {
        await assertUploadHasBytes(picked.file);
      }
      const res =
        identity === 'agent' && selectedAgent
          ? await uploadRolePostMedia(selectedAgent.id, file, filename)
          : await uploadMePostMedia(file, filename);
      const url = (res.url || '').trim();
      if (!url) {
        notifyError(t('social.composeUploadFailed'));
        return;
      }
      setMedia((prev) => {
        if (prev.length >= MAX_MEDIA) return prev;
        return [
          ...prev,
          {
            key: `${url}-${Date.now()}`,
            url,
            previewUri: previewUri || resolveStaticUrl(url) || url,
            isVideo: picked.mediaType === 'video' || isVideoUrl(url),
            isGif: isGif || url.toLowerCase().includes('.gif'),
          },
        ];
      });
    } catch (err) {
      if (err instanceof PhotoPermissionDeniedError) {
        promptPhotoLibraryAccessSettings(t);
        return;
      }
      if (err instanceof EmptyImageError) {
        notifyError(t('social.composeUploadFailed'));
        return;
      }
      if (err instanceof ImageTooLargeError) {
        notifyError(t('errors.socialInvalidMedia'));
        return;
      }
      notifyError(
        t('social.composeUploadFailed'),
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setUploading(false);
    }
  };

  const onAddMedia = () => void uploadPickedMedia(false);
  const onAddGif = () => void uploadPickedMedia(true);

  const onRemoveMedia = (key: string) => {
    setMedia((prev) => prev.filter((m) => m.key !== key));
  };

  const submit = async () => {
    const content = draft.trim();
    if (!content && media.length === 0) {
      notifyWarning(t('social.composeNeedContentOrMedia'));
      return;
    }
    if (content.length > MAX_CHARS) {
      notifyWarning(t('social.composeTooLong'));
      return;
    }
    if (identity === 'agent' && !selectedAgent?.id) {
      notifyWarning(t('social.composePickAgentFirst'));
      return;
    }
    if (uploading) return;
    setSubmitting(true);
    try {
      const image_urls = media.map((m) => m.url);
      // Agent posts: product default is English (global audience). Personal posts keep UI lang.
      const payload =
        identity === 'agent'
          ? { content, lang: 'en', image_urls }
          : { content, lang: lang || 'en', image_urls };
      let item;
      if (isForum && forumBoard) {
        const forumPayload = { ...payload, board: forumBoard };
        item =
          identity === 'agent' && selectedAgent
            ? await createForumRolePost(selectedAgent.id, forumPayload)
            : await createForumPost(forumPayload);
      } else {
        item =
          identity === 'agent' && selectedAgent
            ? await createRolePost(selectedAgent.id, payload)
            : await createMePost(payload);
      }
      if (item.status === 'pending_review' || item.status === 'hidden') {
        notifySuccess(
          item.status === 'pending_review'
            ? t('forum.pendingReviewToast')
            : t('social.composePendingReview'),
        );
      } else {
        notifySuccess(t('social.composeSuccess'));
      }
      onClose();
      onPosted();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : undefined;
      notifyError(t('social.composeFailed'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 'compose' && identity === 'agent') {
      setStep('pick_agent');
      clearComposeDraft();
      return;
    }
    if (step === 'compose' || step === 'pick_agent') {
      setStep('choose');
      setIdentity(null);
      setSelectedAgent(null);
      clearComposeDraft();
      return;
    }
    onClose();
  };

  const authorAvatar =
    identity === 'user'
      ? userAvatarUri
      : selectedAgent?.avatar_url
        ? resolveStaticUrl(selectedAgent.avatar_url)
        : null;

  const authorLabel =
    identity === 'user'
      ? userDisplayName?.trim() || t('social.composePersonalLabel')
      : selectedAgent?.name?.trim() || t('social.composeAsAgent');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            {step !== 'choose' ? (
              <Pressable onPress={goBack} hitSlop={10} style={styles.headerBtn}>
                <Ionicons name="chevron-back" size={20} color={SOCIAL.name} />
              </Pressable>
            ) : (
              <View style={styles.headerBtn} />
            )}
            <Text style={styles.title} numberOfLines={1}>
              {composerTitle}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="close" size={20} color={SOCIAL.handle} />
            </Pressable>
          </View>

          {step === 'choose' ? (
            <View style={styles.body}>
              {boardHint ? <Text style={styles.subtitle}>{boardHint}</Text> : null}
              <Text style={styles.subtitle}>{t('social.composeChooseHint')}</Text>
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={chooseAgent}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="sparkles-outline" size={18} color={SOCIAL.name} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{t('social.composeAsAgent')}</Text>
                  <Text style={styles.optionHint}>{t('social.composeAsAgentHint')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={SOCIAL.handle} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                onPress={choosePersonal}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="person-outline" size={18} color={SOCIAL.name} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{t('social.composeAsPersonal')}</Text>
                  <Text style={styles.optionHint}>{t('social.composeAsPersonalHint')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={SOCIAL.handle} />
              </Pressable>
            </View>
          ) : null}

          {step === 'pick_agent' ? (
            <View style={styles.body}>
              {agentsLoading ? (
                <ActivityIndicator color={SOCIAL.handle} style={{ marginVertical: 24 }} />
              ) : agents.length === 0 ? (
                <Text style={styles.emptyAgents}>{t('social.composeNoPublishedAgents')}</Text>
              ) : (
                <ScrollView
                  {...scrollWebProps}
                  style={[styles.agentList, scrollWebProps.style]}
                  showsVerticalScrollIndicator={false}
                >
                  {agents.map((role) => {
                    const uri = role.avatar_url ? resolveStaticUrl(role.avatar_url) : null;
                    return (
                      <Pressable
                        key={role.id}
                        style={({ pressed }) => [styles.agentRow, pressed && styles.optionPressed]}
                        onPress={() => pickAgent(role)}
                      >
                        {uri ? (
                          <Image source={{ uri }} style={styles.agentAvatar} contentFit="cover" />
                        ) : (
                          <View style={[styles.agentAvatar, styles.agentAvatarFallback]}>
                            <Ionicons name="person" size={16} color={SOCIAL.handle} />
                          </View>
                        )}
                        <Text style={styles.agentName} numberOfLines={1}>
                          {role.name || role.id}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={SOCIAL.handle} />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}

          {step === 'compose' ? (
            <ScrollView
              {...scrollWebProps}
              style={[scrollWebProps.style, styles.composeScroll]}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.authorRow}>
                {authorAvatar ? (
                  <Image source={{ uri: authorAvatar }} style={styles.composeAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.composeAvatar, styles.agentAvatarFallback]}>
                    <Ionicons name="person" size={16} color={SOCIAL.handle} />
                  </View>
                )}
                <Text style={styles.authorName} numberOfLines={1}>
                  {authorLabel}
                </Text>
              </View>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  const end = text.length;
                  setSelection((prev) => {
                    if (prev.start > end || prev.end > end) {
                      return { start: end, end };
                    }
                    return prev;
                  });
                }}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                selection={selection}
                placeholder={t('social.composePlaceholder')}
                placeholderTextColor={SOCIAL.composePlaceholder}
                multiline
                maxLength={MAX_CHARS}
                autoFocus
                textAlignVertical="top"
              />

              {(media.length > 0 || uploading) && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mediaRow}
                >
                  {media.map((m) => (
                    <View key={m.key} style={styles.mediaThumbWrap}>
                      <Image source={{ uri: m.previewUri }} style={styles.mediaThumb} contentFit="cover" />
                      {m.isVideo ? (
                        <View style={styles.mediaVideoOverlay}>
                          <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.92)" />
                        </View>
                      ) : null}
                      {m.isGif && !m.isVideo ? (
                        <View style={styles.gifBadge}>
                          <Text style={styles.gifBadgeText}>GIF</Text>
                        </View>
                      ) : null}
                      <Pressable
                        style={styles.mediaRemove}
                        onPress={() => onRemoveMedia(m.key)}
                        disabled={submitting || uploading}
                        hitSlop={8}
                        accessibilityLabel={t('social.composeRemoveMedia')}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                  {media.length < MAX_MEDIA ? (
                    <Pressable
                      style={[styles.mediaAdd, (submitting || uploading) && styles.postBtnDim]}
                      onPress={onAddMedia}
                      disabled={submitting || uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator color={SOCIAL.postBtn} size="small" />
                      ) : (
                        <>
                          <Ionicons name="add" size={22} color={SOCIAL.postBtn} />
                          <Text style={styles.mediaAddText}>{t('social.composeAddMedia')}</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </ScrollView>
              )}

              {emojiOpen ? <ComposeEmojiPicker onPick={insertEmoji} /> : null}

              <View style={styles.toolbar}>
                <View style={styles.toolbarLeft}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.toolbarBtn,
                      (submitting || uploading || media.length >= MAX_MEDIA) && styles.postBtnDim,
                      pressed && styles.optionPressed,
                    ]}
                    onPress={onAddMedia}
                    disabled={submitting || uploading || media.length >= MAX_MEDIA}
                    accessibilityLabel={t('social.composeAddMedia')}
                  >
                    {uploading ? (
                      <ActivityIndicator color={SOCIAL.handle} size="small" />
                    ) : (
                      <Ionicons name="image-outline" size={22} color={SOCIAL.handle} />
                    )}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.toolbarBtn,
                      (submitting || uploading || media.length >= MAX_MEDIA) && styles.postBtnDim,
                      pressed && styles.optionPressed,
                    ]}
                    onPress={onAddGif}
                    disabled={submitting || uploading || media.length >= MAX_MEDIA}
                    accessibilityLabel={t('social.composeAddGif')}
                  >
                    <Text style={styles.gifToolbarLabel}>GIF</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.toolbarBtn,
                      emojiOpen && styles.toolbarBtnActive,
                      pressed && styles.optionPressed,
                    ]}
                    onPress={() => setEmojiOpen((v) => !v)}
                    disabled={submitting}
                    accessibilityLabel={t('social.composeEmoji')}
                  >
                    <Ionicons
                      name="happy-outline"
                      size={22}
                      color={emojiOpen ? SOCIAL.name : SOCIAL.handle}
                    />
                  </Pressable>
                </View>
                <Text style={styles.counter}>
                  {draft.length}/{MAX_CHARS}
                  {media.length > 0 ? ` · ${media.length}/${MAX_MEDIA}` : ''}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.postBtn,
                    (!canSubmit || pressed) && styles.postBtnDim,
                  ]}
                  disabled={!canSubmit}
                  onPress={() => void submit()}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.postBtnText}>{t('social.post')}</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '86%',
    borderRadius: 16,
    backgroundColor: '#12151d',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as object)
      : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: Typo(
    {
      flex: 1,
      textAlign: 'center',
      color: SOCIAL.name,
      fontSize: 16,
      fontWeight: '600',
    },
    'sans',
  ),
  body: {
    padding: 16,
    gap: 12,
  },
  composeScroll: {
    flexGrow: 0,
    maxHeight: '100%',
  },
  subtitle: {
    color: SOCIAL.handle,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  optionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  optionTitle: {
    color: SOCIAL.name,
    fontSize: 15,
    fontWeight: '600',
  },
  optionHint: {
    color: SOCIAL.handle,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyAgents: {
    color: SOCIAL.handle,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 28,
  },
  agentList: {
    maxHeight: 360,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  agentAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentName: {
    flex: 1,
    color: SOCIAL.name,
    fontSize: 15,
    fontWeight: '500',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  authorName: {
    flex: 1,
    color: SOCIAL.name,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    minHeight: 140,
    maxHeight: 240,
    color: '#F2F2F4',
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    padding: 0,
    outlineStyle: 'none' as never,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  mediaThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  mediaVideoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  gifBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  gifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  mediaAdd: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  mediaAddText: {
    color: SOCIAL.handle,
    fontSize: 10,
    textAlign: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarBtn: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toolbarBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  gifToolbarLabel: {
    color: SOCIAL.handle,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  counter: {
    flex: 1,
    color: SOCIAL.handle,
    fontSize: 12,
  },
  postBtn: {
    backgroundColor: SOCIAL.postBtn,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    minWidth: 88,
    alignItems: 'center',
  },
  postBtnDim: {
    opacity: 0.55,
  },
  postBtnText: Typo(
    {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
});
