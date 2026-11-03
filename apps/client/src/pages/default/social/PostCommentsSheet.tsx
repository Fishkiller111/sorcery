import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import {
  createContentReport,
  createPostComment,
  deletePostComment,
  listPostComments,
  type ContentReportReason,
} from '../../../api/community';
import { likeForumComment, unlikeForumComment } from '../../../api/forum';
import { resolveStaticUrl } from '../../../constants/config';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import type { PostCommentItem } from '../../../types/api';
import { formatApiError } from '../../../utils/apiError';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { SOCIAL } from './socialTokens';
import { SOCIAL_IMAGES } from '../theme/images';
import { SocialReportReasonModal } from './SocialReportReasonModal';

type Props = {
  visible: boolean;
  postId: string;
  currentUserId?: string;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  title?: string;
  placeholder?: string;
  sendLabel?: string;
  emptyLabel?: string;
  requireLogin?: () => boolean;
  /** Forum posts only — show comment like control. */
  enableCommentLikes?: boolean;
};

export function PostCommentsSheet({
  visible,
  postId,
  currentUserId,
  onClose,
  onCountChange,
  title = 'Comments',
  placeholder = 'Write a reply…',
  sendLabel = 'Send',
  emptyLabel = 'No comments yet',
  requireLogin,
  enableCommentLikes = false,
}: Props) {
  const { t } = useI18n();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [items, setItems] = useState<PostCommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const resp = await listPostComments(postId, 1, 80);
      setItems(resp.items ?? []);
      setTotal(resp.pagination?.total ?? resp.items?.length ?? 0);
      onCountChange?.(resp.pagination?.total ?? resp.items?.length ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [onCountChange, postId]);

  useEffect(() => {
    if (visible) {
      void load();
      setDraft('');
    }
  }, [visible, load]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    if (requireLogin && !requireLogin()) return;
    setSending(true);
    try {
      const item = await createPostComment(postId, content);
      setItems((prev) => [...prev, item]);
      setDraft('');
      const next = total + 1;
      setTotal(next);
      onCountChange?.(next);
    } catch (err) {
      notifyError(t('social.commentSendFailed'), formatApiError(t, err));
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = (item: PostCommentItem) => {
    Alert.alert(t('social.commentDeleteConfirmTitle'), t('social.commentDeleteConfirmBody'), [
      { text: t('confirmModal.cancel'), style: 'cancel' },
      {
        text: t('social.commentDelete'),
        style: 'destructive',
        onPress: () => void deleteComment(item),
      },
    ]);
  };

  const deleteComment = async (item: PostCommentItem) => {
    if (deletingId) return;
    setDeletingId(item.comment_id);
    try {
      await deletePostComment(postId, item.comment_id);
      setItems((prev) => prev.filter((x) => x.comment_id !== item.comment_id));
      const next = Math.max(0, total - 1);
      setTotal(next);
      onCountChange?.(next);
      notifySuccess(t('social.commentDeleteOk'));
    } catch (err) {
      notifyError(t('social.commentDeleteFailed'), formatApiError(t, err));
    } finally {
      setDeletingId(null);
    }
  };

  const submitReport = async (reason: ContentReportReason) => {
    const commentId = reportCommentId;
    setReportCommentId(null);
    if (!commentId) return;
    try {
      await createContentReport({
        target_type: 'post_comment',
        target_id: commentId,
        reason_code: reason,
      });
      notifySuccess(t('social.reportSubmitted'));
    } catch (err) {
      notifyError(t('social.reportFailed'), formatApiError(t, err));
    }
  };

  const toggleCommentLike = async (item: PostCommentItem) => {
    if (!enableCommentLikes || likeBusyId) return;
    if (requireLogin && !requireLogin()) return;
    setLikeBusyId(item.comment_id);
    try {
      const resp = item.liked_by_me
        ? await unlikeForumComment(postId, item.comment_id)
        : await likeForumComment(postId, item.comment_id);
      setItems((prev) =>
        prev.map((c) =>
          c.comment_id === item.comment_id
            ? { ...c, liked_by_me: resp.liked, like_count: resp.like_count }
            : c,
        ),
      );
    } catch (err) {
      notifyError(t('social.likeFailed'), formatApiError(t, err));
    } finally {
      setLikeBusyId(null);
    }
  };

  const isOwnComment = (item: PostCommentItem) =>
    Boolean(
      currentUserId &&
        item.author_type === 'user' &&
        item.user_id &&
        item.user_id === currentUserId,
    );

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable
          style={styles.root}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close replies"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetAvoid}
            pointerEvents="box-none"
          >
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.handle} />
              <Text style={styles.title}>{title}</Text>
              {loading ? (
                <ActivityIndicator color={SOCIAL.handle} style={{ marginVertical: 24 }} />
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(it) => it.comment_id}
                  {...scrollWebProps}
                  style={[styles.list, scrollWebProps.style]}
                  contentContainerStyle={items.length ? undefined : styles.emptyWrap}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={<Text style={styles.empty}>{emptyLabel}</Text>}
                  renderItem={({ item }) => {
                    const avatar = item.author_avatar
                      ? resolveStaticUrl(item.author_avatar)
                      : undefined;
                    const own = isOwnComment(item);
                    return (
                      <View style={styles.row}>
                        {avatar ? (
                          <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
                        ) : (
                          <Image
                            source={SOCIAL_IMAGES.avatarFallback}
                            style={styles.avatar}
                            contentFit="cover"
                          />
                        )}
                        <View style={styles.body}>
                          <View style={styles.nameRow}>
                            <Text style={styles.name} numberOfLines={1}>
                              {item.author_name}
                              {item.author_type === 'agent' ? ' · Agent' : ''}
                            </Text>
                            {own ? (
                              <Pressable
                                onPress={() => confirmDelete(item)}
                                disabled={deletingId === item.comment_id}
                                hitSlop={8}
                              >
                                <Text style={styles.deleteText}>
                                  {deletingId === item.comment_id
                                    ? '…'
                                    : t('social.commentDelete')}
                                </Text>
                              </Pressable>
                            ) : item.author_type === 'user' ? (
                              <Pressable
                                onPress={() => {
                                  if (requireLogin && !requireLogin()) return;
                                  setReportCommentId(item.comment_id);
                                }}
                                hitSlop={8}
                              >
                                <Text style={styles.reportText}>{t('social.reportPost')}</Text>
                              </Pressable>
                            ) : null}
                          </View>
                          <Text style={styles.content}>{item.content}</Text>
                          {enableCommentLikes ? (
                            <Pressable
                              style={styles.likeRow}
                              disabled={likeBusyId === item.comment_id}
                              onPress={() => void toggleCommentLike(item)}
                              hitSlop={8}
                            >
                              <Text
                                style={[
                                  styles.likeGlyph,
                                  item.liked_by_me && styles.likeGlyphActive,
                                ]}
                              >
                                {item.liked_by_me ? '♥' : '♡'}
                              </Text>
                              <Text
                                style={[
                                  styles.likeCount,
                                  item.liked_by_me && styles.likeCountActive,
                                ]}
                              >
                                {item.like_count ?? 0}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  }}
                />
              )}
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={placeholder}
                  placeholderTextColor={SOCIAL.handle}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendDisabled]}
                  disabled={!draft.trim() || sending}
                  onPress={() => void send()}
                >
                  <Text style={styles.sendText}>{sendLabel}</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <SocialReportReasonModal
        visible={Boolean(reportCommentId)}
        onClose={() => setReportCommentId(null)}
        onSelect={(reason) => void submitReport(reason)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetAvoid: { width: '100%' },
  sheet: {
    maxHeight: '78%',
    backgroundColor: '#141414',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 10,
    marginBottom: 8,
  },
  title: Typo({ color: SOCIAL.name, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 8 }, 'sans'),
  list: { paddingHorizontal: 16, minHeight: 120 },
  emptyWrap: { paddingVertical: 40, alignItems: 'center' },
  empty: Typo({ color: SOCIAL.handle, fontSize: 13 }, 'sans'),
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#222' },
  body: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: Typo({ color: SOCIAL.name, fontSize: 13, fontWeight: '600', flex: 1 }, 'sans'),
  deleteText: Typo({ color: '#c45c5c', fontSize: 12, fontWeight: '600' }, 'sans'),
  reportText: Typo({ color: SOCIAL.handle, fontSize: 12, fontWeight: '600' }, 'sans'),
  content: Typo({ color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 20 }, 'sans'),
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  likeGlyph: Typo({ color: SOCIAL.action, fontSize: 14 }, 'sans'),
  likeGlyphActive: { color: SOCIAL.postBtn },
  likeCount: Typo({ color: SOCIAL.action, fontSize: 12, fontWeight: '500' }, 'sans'),
  likeCountActive: { color: SOCIAL.postBtn },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: SOCIAL.name,
    fontSize: 14,
  },
  sendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SOCIAL.name,
  },
  sendDisabled: { opacity: 0.4 },
  sendText: Typo({ color: '#111', fontSize: 13, fontWeight: '600' }, 'sans'),
});
