import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import {
  createRoleComment,
  deleteRoleComment,
  likeRoleComment,
  listRoleComments,
  unlikeRoleComment,
} from '../../../api/roles';
import {
  createSimulatorComment,
  deleteSimulatorComment,
  likeSimulatorComment,
  listSimulatorComments,
  unlikeSimulatorComment,
} from '../../../api/simulator';
import type { RoleCommentItem } from '../../../types/api';
import type { SimulatorCommentItem } from '../../../types/simulator';
import { formatApiError } from '../../../utils/apiError';
import { notifyError } from '../../../utils/notify';
import { AGENT_MEDIA } from './agentMediaTokens';
import { TOKENS } from '../theme/tokens';

const PAGE_SIZE = 20;

type CommentItem = RoleCommentItem | SimulatorCommentItem;

type AgentCommentsPanelProps = {
  roleId?: string;
  /** When set, uses simulator comment APIs instead of role APIs. */
  simulatorId?: string;
  isDesktop?: boolean;
  requireLogin: () => boolean;
  onCommentCountChange?: (delta: number) => void;
  /** Detail modal uses TOKENS palette instead of agent-media pink. */
  variant?: 'media' | 'detail';
};

function formatCommentTime(ts: number, lang: string): string {
  if (!ts) return '';
  try {
    return new Date(ts * 1000).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function AgentCommentsPanel({
  roleId,
  simulatorId,
  isDesktop = false,
  requireLogin,
  onCommentCountChange,
  variant = 'media',
}: AgentCommentsPanelProps) {
  const { t, tp, lang } = useI18n();
  const isDetail = variant === 'detail';
  const accent = isDetail ? TOKENS.colors.accent : AGENT_MEDIA.chatBg;
  const textColor = isDetail ? TOKENS.colors.text : AGENT_MEDIA.text;
  const muted = isDetail ? TOKENS.colors.textMuted : AGENT_MEDIA.metaLabel;
  const targetId = simulatorId || roleId || '';
  const useSimulator = Boolean(simulatorId);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [repliesByParent, setRepliesByParent] = useState<Record<string, CommentItem[]>>({});
  const [repliesLoading, setRepliesLoading] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!targetId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const resp = useSimulator
          ? await listSimulatorComments(targetId, nextPage, PAGE_SIZE)
          : await listRoleComments(targetId, nextPage, PAGE_SIZE);
        const items = resp.data ?? [];
        setTotal(resp.pagination?.total ?? items.length);
        setPage(nextPage);
        setComments((prev) => (append ? [...prev, ...items] : items));
      } catch (e) {
        notifyError(formatApiError(t, e));
        if (!append) setComments([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [targetId, useSimulator, t],
  );

  useEffect(() => {
    setReplyTo(null);
    setRepliesByParent({});
    setExpandedReplies({});
    void loadPage(1, false);
  }, [loadPage]);

  const onSend = async () => {
    const content = text.trim();
    if (!content || sending || !targetId) return;
    if (!requireLogin()) return;
    setSending(true);
    try {
      const parentId = replyTo?.id;
      const item = useSimulator
        ? await createSimulatorComment(targetId, content, parentId)
        : await createRoleComment(targetId, content, parentId);
      setText('');
      if (parentId) {
        setRepliesByParent((prev) => ({
          ...prev,
          [parentId]: [item, ...(prev[parentId] ?? [])],
        }));
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId ? { ...c, reply_count: (c.reply_count ?? 0) + 1 } : c,
          ),
        );
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
        setReplyTo(null);
      } else {
        setComments((prev) => [item, ...prev]);
        setTotal((n) => n + 1);
      }
      onCommentCountChange?.(1);
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setSending(false);
    }
  };

  const onDelete = async (commentId: string, parentId?: string) => {
    if (deletingId || !targetId) return;
    if (!requireLogin()) return;
    setDeletingId(commentId);
    try {
      if (useSimulator) {
        await deleteSimulatorComment(targetId, commentId);
      } else {
        await deleteRoleComment(targetId, commentId);
      }
      if (parentId) {
        setRepliesByParent((prev) => ({
          ...prev,
          [parentId]: (prev[parentId] ?? []).filter((c) => c.id !== commentId),
        }));
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, reply_count: Math.max(0, (c.reply_count ?? 1) - 1) }
              : c,
          ),
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setTotal((n) => Math.max(0, n - 1));
      }
      onCommentCountChange?.(-1);
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setDeletingId(null);
    }
  };

  const onToggleLike = async (item: CommentItem, parentId?: string) => {
    if (likingId || !targetId) return;
    if (!requireLogin()) return;
    setLikingId(item.id);
    const liked = Boolean(item.liked_by_me);
    try {
      const resp = useSimulator
        ? liked
          ? await unlikeSimulatorComment(targetId, item.id)
          : await likeSimulatorComment(targetId, item.id)
        : liked
          ? await unlikeRoleComment(targetId, item.id)
          : await likeRoleComment(targetId, item.id);
      const patch = (c: CommentItem): CommentItem =>
        c.id === item.id
          ? { ...c, liked_by_me: resp.liked, like_count: resp.like_count }
          : c;
      if (parentId) {
        setRepliesByParent((prev) => ({
          ...prev,
          [parentId]: (prev[parentId] ?? []).map(patch),
        }));
      } else {
        setComments((prev) => prev.map(patch));
      }
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setLikingId(null);
    }
  };

  const loadReplies = async (parent: CommentItem) => {
    if (repliesLoading || !targetId) return;
    const already = repliesByParent[parent.id];
    if (already && expandedReplies[parent.id]) {
      setExpandedReplies((prev) => ({ ...prev, [parent.id]: false }));
      return;
    }
    if (already) {
      setExpandedReplies((prev) => ({ ...prev, [parent.id]: true }));
      return;
    }
    setRepliesLoading(parent.id);
    try {
      const resp = useSimulator
        ? await listSimulatorComments(targetId, 1, 50, parent.id)
        : await listRoleComments(targetId, 1, 50, parent.id);
      setRepliesByParent((prev) => ({ ...prev, [parent.id]: resp.data ?? [] }));
      setExpandedReplies((prev) => ({ ...prev, [parent.id]: true }));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setRepliesLoading(null);
    }
  };

  const hasMore = comments.length < total;

  const renderComment = (item: CommentItem, isReply = false, parentId?: string) => {
    const timeLabel = formatCommentTime(item.created_at, lang);
    return (
      <View
        key={item.id}
        style={[
          styles.card,
          isDetail && styles.cardDetail,
          isDesktop && !isDetail && styles.cardDesktop,
          isReply && styles.cardReply,
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.author, { color: textColor }]} numberOfLines={1}>
            {item.nickname || t('profile.placeholderUser')}
          </Text>
          <View style={styles.cardHeaderRight}>
            {timeLabel ? <Text style={[styles.time, { color: muted }]}>{timeLabel}</Text> : null}
            {item.is_owner ? (
              <Pressable
                onPress={() => void onDelete(item.id, parentId)}
                disabled={deletingId === item.id}
                hitSlop={8}
                accessibilityRole="button"
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={muted} />
                ) : (
                  <Text style={[styles.delete, { color: accent }]}>
                    {t('agentMedia.commentDelete')}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={[styles.body, { color: textColor }]}>{item.content}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => void onToggleLike(item, parentId)}
            disabled={likingId === item.id}
            hitSlop={6}
          >
            <Ionicons
              name={item.liked_by_me ? 'heart' : 'heart-outline'}
              size={15}
              color={item.liked_by_me ? accent : muted}
            />
            <Text style={[styles.actionText, { color: muted }]}>
              {item.like_count > 0 ? item.like_count : t('agentMedia.commentLike')}
            </Text>
          </Pressable>
          {!isReply ? (
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                if (!requireLogin()) return;
                setReplyTo(item);
              }}
              hitSlop={6}
            >
              <Ionicons name="chatbubble-outline" size={14} color={muted} />
              <Text style={[styles.actionText, { color: muted }]}>
                {t('agentMedia.commentReply')}
              </Text>
            </Pressable>
          ) : null}
          {!isReply && (item.reply_count ?? 0) > 0 ? (
            <Pressable
              style={styles.actionBtn}
              onPress={() => void loadReplies(item)}
              hitSlop={6}
            >
              {repliesLoading === item.id ? (
                <ActivityIndicator size="small" color={muted} />
              ) : (
                <Text style={[styles.actionText, { color: accent }]}>
                  {expandedReplies[item.id]
                    ? t('agentMedia.hideReplies')
                    : tp('agentMedia.viewReplies', { n: item.reply_count ?? 0 })}
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
        {!isReply && expandedReplies[item.id] ? (
          <View style={styles.replies}>
            {(repliesByParent[item.id] ?? []).map((r) => renderComment(r, true, item.id))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.root, isDesktop && styles.rootDesktop]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        {t('agentMedia.tabComments')}
      </Text>

      <View style={[styles.composer, isDesktop && styles.composerDesktop]}>
        {replyTo ? (
          <View style={styles.replyBanner}>
            <Text style={[styles.replyBannerText, { color: muted }]} numberOfLines={1}>
              {tp('agentMedia.replyingTo', { name: replyTo.nickname || '' })}
            </Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <Text style={[styles.replyCancel, { color: accent }]}>{t('confirmModal.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}
        <TextInput
          style={[
            styles.input,
            isDesktop && styles.inputDesktop,
            isDetail && styles.inputDetail,
            { color: textColor, borderColor: isDetail ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.1)' },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={
            replyTo ? t('agentMedia.replyPlaceholder') : t('agentMedia.commentPlaceholder')
          }
          placeholderTextColor={muted}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <Pressable
          onPress={() => void onSend()}
          disabled={!text.trim() || sending}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: accent },
            (!text.trim() || sending) && styles.sendBtnDisabled,
            pressed && styles.sendBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('agentMedia.commentSend')}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>{t('agentMedia.commentSend')}</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={accent} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: muted }]}>{t('agentMedia.commentsEmpty')}</Text>
        </View>
      ) : (
        <View style={[styles.list, isDesktop && styles.listDesktop]}>
          {comments.map((item) => renderComment(item))}
          {hasMore ? (
            <Pressable
              style={[styles.loadMore, { borderColor: muted }]}
              onPress={() => void loadPage(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <Text style={[styles.loadMoreText, { color: accent }]}>
                  {t('agentMedia.loadMoreComments')}
                </Text>
              )}
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 14,
    paddingBottom: 24,
  },
  rootDesktop: {
    maxWidth: 720,
    alignSelf: 'center',
    paddingTop: 4,
  },
  sectionTitle: Typo(
    {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  composer: {
    gap: 10,
  },
  composerDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 12,
  },
  replyBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  replyBannerText: Typo({ fontSize: 12 }, 'sans'),
  replyCancel: Typo({ fontSize: 12, fontWeight: '600' }, 'sans'),
  input: {
    minHeight: 88,
    maxHeight: 160,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(8,10,15,0.55)',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
        } as object)
      : {}),
  },
  inputDetail: {
    minHeight: 64,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputDesktop: {
    flex: 1,
    minHeight: 72,
  },
  sendBtn: {
    alignSelf: 'flex-end',
    minWidth: 88,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  sendBtnPressed: {
    opacity: 0.85,
  },
  sendBtnText: Typo(
    {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  center: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: Typo(
    {
      fontSize: 14,
      textAlign: 'center',
    },
    'sans',
  ),
  list: {
    gap: 10,
  },
  listDesktop: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardDetail: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardDesktop: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardReply: {
    marginLeft: 12,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  author: Typo(
    {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  time: Typo(
    {
      fontSize: 11,
    },
    'sans',
  ),
  delete: Typo(
    {
      fontSize: 12,
      fontWeight: '500',
    },
    'sans',
  ),
  body: Typo(
    {
      fontSize: 14,
      lineHeight: 21,
      opacity: 0.92,
    },
    'sans',
  ),
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: Typo({ fontSize: 12, fontWeight: '500' }, 'sans'),
  replies: {
    gap: 8,
    marginTop: 4,
  },
  loadMore: {
    alignSelf: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  loadMoreText: Typo({ fontSize: 13, fontWeight: '600' }, 'sans'),
});
