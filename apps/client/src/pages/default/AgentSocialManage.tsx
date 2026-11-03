import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  deleteRolePost,
  listOwnerRolePosts,
  updateRolePost,
  uploadRolePostMedia,
} from '../../api/community';
import { ApiError } from '../../api/client';
import { resolveStaticUrl } from '../../constants/config';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import type { PostItem } from '../../types/api';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { PhotoPermissionDeniedError, pickRoleMedia } from '../../utils/pickRoleMedia';
import { promptPhotoLibraryAccessSettings } from '../../utils/promptPhotoLibraryAccessSettings';
import {
  assertUploadHasBytes,
  compressImageForUpload,
  EmptyImageError,
  ImageTooLargeError,
} from '../../utils/compressImageForUpload';
import { safeGoBack } from '../../utils/safeGoBack';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { TOKENS } from './theme/tokens';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const PAGE_SIZE = 20;
const MAX_CHARS = 600;
const MAX_MEDIA = 9;

type EditMediaItem = {
  key: string;
  url: string;
  previewUri: string;
  isVideo: boolean;
};

function isVideoUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.mp4') || lower.includes('video/mp4');
}

function mediaFromPost(item: PostItem): EditMediaItem[] {
  return (item.images ?? [])
    .map((img, index) => {
      const url = (img.image_url || '').trim();
      if (!url) return null;
      return {
        key: `${url}-${index}`,
        url,
        previewUri: resolveStaticUrl(img.blur_url || url),
        isVideo: isVideoUrl(url),
      };
    })
    .filter((m): m is EditMediaItem => !!m);
}

function statusLabel(status: string | undefined, t: (k: string) => string): string {
  switch (status) {
    case 'published':
      return t('agent.mediaStatusPublished');
    case 'draft':
      return t('agent.mediaStatusDraft');
    case 'hidden':
      return t('agent.publishPending');
    default:
      return status || '';
  }
}

export function DefaultAgentSocialManageScreen() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ roleId?: string }>();
  const roleId = typeof params.roleId === 'string' ? params.roleId : '';
  const pagePadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const [items, setItems] = useState<PostItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editItem, setEditItem] = useState<PostItem | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editMedia, setEditMedia] = useState<EditMediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [deleteItem, setDeleteItem] = useState<PostItem | null>(null);

  const load = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      if (!roleId) return;
      try {
        const res = await listOwnerRolePosts(roleId, nextPage, PAGE_SIZE);
        const next = res.items ?? [];
        setItems((prev) => (mode === 'append' ? [...prev, ...next] : next));
        setPage(res.pagination?.page ?? nextPage);
        setTotalPages(Math.max(1, res.pagination?.total_pages ?? 1));
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          notifyError(t('agent.notOwner'));
        } else {
          notifyError(t('agent.socialManageLoadFailed'), err instanceof Error ? err.message : undefined);
        }
        if (mode === 'replace') setItems([]);
      }
    },
    [roleId, t],
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        await load(1, 'replace');
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, 'replace');
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loading || loadingMore || refreshing) return;
    if (page >= totalPages) return;
    setLoadingMore(true);
    await load(page + 1, 'append');
    setLoadingMore(false);
  };

  const closeEdit = () => {
    setEditItem(null);
    setEditDraft('');
    setEditMedia([]);
    setUploading(false);
  };

  const openEdit = (item: PostItem) => {
    setEditItem(item);
    setEditDraft(item.content || '');
    setEditMedia(mediaFromPost(item));
  };

  const onAddMedia = async () => {
    if (!roleId || uploading || saving) return;
    if (editMedia.length >= MAX_MEDIA) {
      notifyWarning(t('agent.socialManageTooManyMedia'));
      return;
    }
    try {
      const picked = await pickRoleMedia();
      if (!picked) return;
      setUploading(true);
      let file = picked.file;
      let filename = picked.filename;
      let previewUri = picked.previewUri;
      if (picked.mediaType === 'image') {
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
      const res = await uploadRolePostMedia(roleId, file, filename);
      const url = (res.url || '').trim();
      if (!url) {
        notifyError(t('agent.socialManageUploadFailed'));
        return;
      }
      setEditMedia((prev) => {
        if (prev.length >= MAX_MEDIA) return prev;
        return [
          ...prev,
          {
            key: `${url}-${Date.now()}`,
            url,
            previewUri: previewUri || resolveStaticUrl(url) || url,
            isVideo: picked.mediaType === 'video' || isVideoUrl(url),
          },
        ];
      });
    } catch (err) {
      if (err instanceof PhotoPermissionDeniedError) {
        promptPhotoLibraryAccessSettings(t);
        return;
      }
      if (err instanceof EmptyImageError) {
        notifyError(t('agent.mediaUploadEmpty'));
        return;
      }
      if (err instanceof ImageTooLargeError) {
        notifyError(t('errors.socialInvalidMedia'));
        return;
      }
      notifyError(t('agent.socialManageUploadFailed'), err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const onRemoveMedia = (key: string) => {
    setEditMedia((prev) => prev.filter((m) => m.key !== key));
  };

  const saveEdit = async () => {
    if (!editItem || !roleId) return;
    const content = editDraft.trim();
    const imageUrls = editMedia.map((m) => m.url).filter(Boolean);
    if (!content && imageUrls.length === 0) {
      notifyWarning(t('agent.socialManageNeedContent'));
      return;
    }
    if (content.length > MAX_CHARS) {
      notifyWarning(t('social.composeTooLong'));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateRolePost(roleId, editItem.post_id, {
        content,
        lang: 'en',
        image_urls: imageUrls,
      });
      setItems((prev) => prev.map((p) => (p.post_id === updated.post_id ? { ...p, ...updated } : p)));
      closeEdit();
      notifySuccess(t('agent.socialManageSaved'));
    } catch (err) {
      notifyError(t('agent.socialManageSaveFailed'), err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem || !roleId) return;
    setBusyId(deleteItem.post_id);
    try {
      await deleteRolePost(roleId, deleteItem.post_id);
      setItems((prev) => prev.filter((p) => p.post_id !== deleteItem.post_id));
      setDeleteItem(null);
      notifySuccess(t('agent.socialManageDeleted'));
    } catch (err) {
      notifyError(t('agent.socialManageDeleteFailed'), err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  const header = useMemo(
    () => (
      <View style={styles.topBlock}>
        <View style={styles.topRow}>
          <DefaultBackButton
            onPress={() => safeGoBack('/free-chat', router)}
            accessibilityLabel={t('menu.back')}
          />
          <Text style={styles.heading}>{t('agent.socialManageTitle')}</Text>
          <View style={styles.topSpacer} />
        </View>
        <Text style={styles.hint}>{t('agent.socialManageHint')}</Text>
      </View>
    ),
    [router, t],
  );

  const renderItem = ({ item }: { item: PostItem }) => {
    const thumb = item.images?.[0];
    const thumbUrl = thumb?.image_url;
    const thumbUri = thumb
      ? resolveStaticUrl(thumb.blur_url || thumbUrl)
      : undefined;
    const thumbIsVideo = isVideoUrl(thumbUrl);
    const busy = busyId === item.post_id;
    return (
      <View style={styles.card}>
        <View style={styles.cardMeta}>
          <Text style={styles.status}>{statusLabel(item.status, t)}</Text>
          {item.source ? <Text style={styles.source}>{item.source}</Text> : null}
          {item.trigger ? <Text style={styles.source}>{item.trigger}</Text> : null}
        </View>
        {item.content?.trim() ? (
          <Text style={styles.content}>{item.content.trim()}</Text>
        ) : (
          <Text style={styles.contentMuted}>(无正文)</Text>
        )}
        {thumbUri ? (
          <View style={styles.thumbWrap}>
            <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" />
            {thumbIsVideo ? (
              <View style={styles.videoBadge}>
                <Ionicons name="play" size={12} color="#fff" />
                <Text style={styles.videoBadgeText}>{t('agent.socialManageVideoBadge')}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            onPress={() => openEdit(item)}
            disabled={busy}
          >
            <Text style={styles.actionText}>{t('agent.socialManageEdit')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtnDanger, pressed && styles.actionPressed]}
            onPress={() => setDeleteItem(item)}
            disabled={busy}
          >
            <Text style={styles.actionTextDanger}>{t('agent.socialManageDelete')}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.root, pagePadding]}>
        {header}
        {loading ? (
          <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.post_id}
            renderItem={renderItem}
            {...scrollWebProps}
            style={scrollWebProps.style}
            contentContainerStyle={[styles.listContent, items.length === 0 && styles.listEmpty]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={TOKENS.colors.accent}
              />
            }
            onEndReached={() => void onEndReached()}
            onEndReachedThreshold={0.35}
            ListEmptyComponent={
              <Text style={styles.empty}>{t('agent.socialManageEmpty')}</Text>
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator color={TOKENS.colors.accent} style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        )}
      </View>

      <Modal visible={!!editItem} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.editOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEdit} />
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>{t('agent.socialManageEditTitle')}</Text>
            <TextInput
              style={styles.editInput}
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              maxLength={MAX_CHARS}
              placeholder={t('social.composePlaceholder')}
              placeholderTextColor={TOKENS.colors.textMuted}
              autoFocus
            />
            <Text style={styles.counter}>
              {editDraft.trim().length}/{MAX_CHARS}
            </Text>

            <Text style={styles.mediaSectionLabel}>{t('agent.socialManageMediaHint')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaRow}
            >
              {editMedia.map((m) => (
                <View key={m.key} style={styles.mediaThumbWrap}>
                  <Image source={{ uri: m.previewUri }} style={styles.mediaThumb} contentFit="cover" />
                  {m.isVideo ? (
                    <View style={styles.mediaVideoOverlay}>
                      <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.92)" />
                    </View>
                  ) : null}
                  <Pressable
                    style={styles.mediaRemove}
                    onPress={() => onRemoveMedia(m.key)}
                    disabled={saving || uploading}
                    hitSlop={8}
                    accessibilityLabel={t('agent.socialManageDelete')}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {editMedia.length < MAX_MEDIA ? (
                <Pressable
                  style={[styles.mediaAdd, (saving || uploading) && styles.editSaveDim]}
                  onPress={() => void onAddMedia()}
                  disabled={saving || uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={TOKENS.colors.accent} size="small" />
                  ) : (
                    <>
                      <Ionicons name="add" size={22} color={TOKENS.colors.accent} />
                      <Text style={styles.mediaAddText}>{t('agent.socialManageAddMedia')}</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </ScrollView>

            <View style={styles.editActions}>
              <Pressable style={styles.editCancel} onPress={closeEdit} disabled={saving || uploading}>
                <Text style={styles.editCancelText}>{t('agent.socialManageCancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.editSave, (saving || uploading) && styles.editSaveDim]}
                onPress={() => void saveEdit()}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveText}>{t('agent.socialManageSave')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ThemedGeneralConfirmModal
        visible={!!deleteItem}
        icon="trash"
        title={t('agent.socialManageDelete')}
        subtitle={t('agent.socialManageDeleteConfirm')}
        confirmLabel={t('agent.socialManageDelete')}
        cancelLabel={t('agent.socialManageCancel')}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => void confirmDelete()}
      />
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: TOKENS.layout.contentPadding,
    paddingTop: 24,
  },
  topBlock: {
    gap: 8,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topSpacer: {
    width: 40,
  },
  heading: Typo(
    {
      flex: 1,
      textAlign: 'center',
      color: TOKENS.colors.text,
      fontSize: 18,
      fontWeight: '600',
    },
    'sans',
  ),
  hint: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    color: TOKENS.colors.textMuted,
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  status: {
    color: TOKENS.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  source: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
  },
  content: {
    color: TOKENS.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  contentMuted: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumb: {
    width: 72,
    height: 72,
  },
  videoBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  videoBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionBtnDanger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(186, 60, 71, 0.16)',
  },
  actionPressed: {
    opacity: 0.75,
  },
  actionText: {
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  actionTextDanger: {
    color: '#E0707A',
    fontSize: 13,
    fontWeight: '600',
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: 14,
    backgroundColor: TOKENS.colors.cardSolid,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    padding: 16,
    gap: 10,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as object)
      : {}),
  },
  editTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    'sans',
  ),
  editInput: {
    minHeight: 120,
    maxHeight: 180,
    color: TOKENS.colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    outlineStyle: 'none' as never,
  },
  counter: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
  },
  mediaSectionLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  mediaThumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mediaThumb: {
    width: 88,
    height: 88,
  },
  mediaVideoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  mediaAdd: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  mediaAddText: {
    color: TOKENS.colors.accent,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  editCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editCancelText: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  editSave: {
    backgroundColor: TOKENS.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 88,
    alignItems: 'center',
  },
  editSaveDim: {
    opacity: 0.6,
  },
  editSaveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
