import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { FreeChatShell } from '../../src/components/shell/FreeChatShell';
import { useI18n } from '../../src/i18n/I18nContext';
import { COLORS } from '../../src/theme/colors';
import { Typo } from '../../src/theme/typography';
import { resolveStaticUrl } from '../../src/constants/config';
import {
  createRoleComment,
  deleteRoleComment,
  getExploreRoleDetail,
  likeExploreRole,
  listRoleComments,
  recordRoleView,
  unlikeExploreRole,
} from '../../src/api/roles';
import type { ExploreRoleDetailResp, RoleCommentItem } from '../../src/types/api';
import { formatApiError } from '../../src/utils/roleForm';
import { notifyError } from '../../src/utils/notify';
import { AgentLangBadges } from '../../src/components/agent/AgentLangBadges';
import { useAuthStore } from '../../src/stores/authStore';
import { requireLoginForAction } from '../../src/utils/requireLogin';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function ExploreRoleDetail() {

  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const { t, tp, lang } = useI18n();
  const router = useRouter();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [detail, setDetail] = useState<ExploreRoleDetailResp | null>(null);
  const [comments, setComments] = useState<RoleCommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentBusy, setCommentBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const d = await getExploreRoleDetail(roleId);
      setDetail(d);
      try {
        const stats = await recordRoleView(roleId, 'detail');
        setDetail((prev) => (prev ? { ...prev, stats } : prev));
      } catch {
        // non-fatal
      }
      const c = await listRoleComments(roleId, 1, 50);
      setComments(c.data);
    } catch (e) {
      notifyError(formatApiError(t, e));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [roleId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggleLike = async () => {
    if (!roleId || !detail || likeBusy) return;
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    setLikeBusy(true);
    try {
      const resp = detail.stats.liked_by_me
        ? await unlikeExploreRole(roleId)
        : await likeExploreRole(roleId);
      setDetail({
        ...detail,
        stats: {
          ...detail.stats,
          liked_by_me: resp.liked,
          like_count: resp.like_count,
        },
      });
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setLikeBusy(false);
    }
  };

  const onPostComment = async () => {
    if (!roleId || !commentText.trim()) return;
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    setCommentBusy(true);
    try {
      const item = await createRoleComment(roleId, commentText.trim());
      setComments((prev) => [item, ...prev]);
      setCommentText('');
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              stats: { ...prev.stats, comment_count: prev.stats.comment_count + 1 },
            }
          : prev,
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setCommentBusy(false);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    if (!roleId) return;
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    try {
      await deleteRoleComment(roleId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                comment_count: Math.max(0, prev.stats.comment_count - 1),
              },
            }
          : prev,
      );
    } catch (e) {
      notifyError(formatApiError(t, e));
    }
  };

  const onStartChat = async () => {
    if (!roleId) return;
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    try {
      const stats = await recordRoleView(roleId, 'chat');
      setDetail((prev) => (prev ? { ...prev, stats } : prev));
    } catch {
      // non-fatal
    }
    router.push(`/free-chat/${roleId}`);
  };

  if (loading) {
    return (
      <FreeChatShell>
        <View style={[styles.stateWrap, pageContentPadding]}>
          <ActivityIndicator color={COLORS.text.muted} />
        </View>
      </FreeChatShell>
    );
  }

  if (!detail) {
    return (
      <FreeChatShell>
        <View style={[styles.stateWrap, pageContentPadding]}>
          <Text style={Typo(styles.error, 'sans', lang)}>{t('explore.empty')}</Text>
        </View>
      </FreeChatShell>
    );
  }

  const figureUri = resolveStaticUrl(detail.figure_url || detail.avatar_url);

  return (
    <FreeChatShell>
      <LinearGradient colors={['#1c1f28', '#0a0b0f', '#0a0b0f']} style={styles.gradient} />
      <ScrollView contentContainerStyle={[styles.content, pageContentPadding]}>
        <Pressable onPress={() => safeGoBack('/')} style={styles.back}>
          <Text style={Typo(styles.backText, 'sans', lang)}>← {t('explore.back')}</Text>
        </Pressable>

        {figureUri ? (
          <Image source={{ uri: figureUri }} style={styles.figure} resizeMode="cover" />
        ) : null}

        <Text style={Typo(styles.name, 'display', lang)}>{detail.name}</Text>
        {detail.scene_name ? <Text style={Typo(styles.scene, 'sans', lang)}>{detail.scene_name}</Text> : null}

        {detail.supported_langs?.length ? (
          <View style={styles.langSection}>
            <Text style={Typo(styles.langLabel, 'sans', lang)}>{t('agent.supportedLangs')}</Text>
            <AgentLangBadges langs={detail.supported_langs} uiLang={lang} />
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={14} color={COLORS.text.secondary} />
            <Text style={Typo(styles.stat, 'sans', lang)}>{tp('explore.views', { n: formatCount(detail.stats.view_count) })}</Text>
          </View>
          <Pressable style={styles.statItem} onPress={onToggleLike} disabled={likeBusy}>
            <Ionicons
              name={detail.stats.liked_by_me ? 'heart' : 'heart-outline'}
              size={14}
              color={detail.stats.liked_by_me ? COLORS.accent.gold : COLORS.text.secondary}
            />
            <Text style={[Typo(styles.stat, 'sans', lang), detail.stats.liked_by_me && Typo(styles.statActive, 'sans', lang)]}>
              {formatCount(detail.stats.like_count)}
            </Text>
          </Pressable>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.text.secondary} />
            <Text style={Typo(styles.stat, 'sans', lang)}>
              {tp('explore.comments', { n: formatCount(detail.stats.comment_count) })}
            </Text>
          </View>
        </View>

        <Text style={Typo(styles.intro, 'sans', lang)}>{detail.introduction}</Text>
        {detail.scene_desc ? <Text style={Typo(styles.sceneDesc, 'sans', lang)}>{detail.scene_desc}</Text> : null}

        <Pressable style={styles.chatBtn} onPress={onStartChat}>
          <Text style={Typo(styles.chatBtnText, 'display', lang)}>{t('freeChat.startChat')}</Text>
        </Pressable>

        <Text style={Typo(styles.sectionTitle, 'display', lang)}>{t('explore.commentSection')}</Text>
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t('explore.commentPlaceholder')}
            placeholderTextColor={COLORS.text.muted}
            multiline
          />
          <Pressable
            style={[styles.postBtn, (!commentText.trim() || commentBusy) && styles.postBtnDisabled]}
            onPress={onPostComment}
            disabled={!commentText.trim() || commentBusy}
          >
            <Text style={Typo(styles.postBtnText, 'sans', lang)}>{t('explore.postComment')}</Text>
          </Pressable>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <Text style={Typo(styles.commentAuthor, 'sans', lang)}>{item.nickname}</Text>
                {item.is_owner ? (
                  <Pressable onPress={() => onDeleteComment(item.id)}>
                    <Text style={Typo(styles.commentDelete, 'sans', lang)}>{t('explore.deleteComment')}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={Typo(styles.commentBody, 'sans', lang)}>{item.content}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={Typo(styles.emptyComments, 'sans', lang)}>{t('explore.noComments')}</Text>}
        />

      </ScrollView>
    </FreeChatShell>
  );
}

const styles = StyleSheet.create({
  gradient: { ...StyleSheet.absoluteFill },
  stateWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  back: { paddingVertical: 8 },
  backText: { color: COLORS.text.muted, fontSize: 14 },
  figure: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    borderRadius: 12,
    marginBottom: 16,
  },
  name: { color: COLORS.text.primary, fontSize: 24, fontWeight: '700' },
  scene: { color: COLORS.text.muted, fontSize: 14, marginTop: 4 },
  langSection: { marginTop: 10, gap: 6 },
  langLabel: { color: COLORS.text.muted, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stat: { color: COLORS.text.secondary, fontSize: 14, lineHeight: 16 },
  statActive: { color: COLORS.accent.gold },
  intro: { color: COLORS.text.primary, fontSize: 15, lineHeight: 22 },
  sceneDesc: { color: COLORS.text.muted, fontSize: 13, marginTop: 8 },
  chatBtn: {
    marginTop: 20,
    backgroundColor: '#8b2e2e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { color: COLORS.text.primary, fontSize: 18, fontWeight: '600', marginTop: 28, marginBottom: 12 },
  commentInputRow: { gap: 8, marginBottom: 16 },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    color: COLORS.text.primary,
    minHeight: 72,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(20,22,28,0.85)',
  },
  postBtn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent.gold,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: '#0a0b0f', fontSize: 13, fontWeight: '700' },
  commentCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(20,22,28,0.85)',
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthor: { color: COLORS.text.secondary, fontSize: 12, fontWeight: '600' },
  commentDelete: { color: '#e57373', fontSize: 12 },
  commentBody: { color: COLORS.text.primary, fontSize: 14 },
  emptyComments: { color: COLORS.text.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
  error: { color: '#e57373', fontSize: 13, marginTop: 12 },
});
