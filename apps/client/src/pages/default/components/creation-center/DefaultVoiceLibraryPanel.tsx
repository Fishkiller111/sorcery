import type { Lang } from '../../../../i18n/types';
import { useI18n } from '../../../../i18n/I18nContext';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { glassWebStyle } from '../../../../components/free-chat/freeChatUi';
import { DefaultFilterChip } from '../DefaultFilterChip';
import { DefaultVoiceDesignModal } from './DefaultVoiceDesignModal';
import { ThemedGeneralConfirmModal } from '../../../../components/ui/ThemedGeneralConfirmModal';
import {
  VOICE_LIBRARY_FILTERS,
  voiceAvatarColor,
  voiceCategoryLabel,
} from '../../../../constants/voiceLibrary';
import {
  useVoiceLibrary,
  isVoicePublic,
  voiceListItemId,
  voiceListItemLanguage,
  voiceListItemProgress,
  voiceListItemTitle,
  type VoiceListItem,
} from '../../../../hooks/useVoiceLibrary';
import { useAuthStore } from '../../../../stores/authStore';
import { requireLoginForAction } from '../../../../utils/requireLogin';

function VoiceFeaturedCard({
  entry,
  playing,
  previewLoading,
  onPress,
  onPreview,
  t,
  tp,
  styles,
}: {
  entry: VoiceListItem;
  playing: boolean;
  previewLoading: boolean;
  onPress: () => void;
  onPreview: () => void;
  t: (key: string) => string;
  tp: (key: string, params: Record<string, string | number>) => string;
  styles: ReturnType<typeof createStyles>;
}) {
  const id = voiceListItemId(entry);
  const title = voiceListItemTitle(entry);
  const language = voiceListItemLanguage(entry);
  const color = voiceAvatarColor(id);
  const canPreview = entry.kind === 'catalog' || entry.kind === 'designed';

  return (
    <Pressable
      style={({ pressed }) => [styles.featuredCard, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarLetter}>{title.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.featuredMeta} numberOfLines={1}>
          {voiceCategoryLabel(title, language, t, tp)}
        </Text>
      </View>
      {canPreview ? (
        <Pressable
          style={styles.previewBtn}
          onPress={(e) => {
            if (Platform.OS === 'web') e.stopPropagation?.();
            onPreview();
          }}
          hitSlop={8}
        >
          {previewLoading ? (
            <ActivityIndicator size="small" color={TOKENS.colors.text} />
          ) : (
            <Ionicons name={playing ? 'stop' : 'play'} size={14} color={TOKENS.colors.text} />
          )}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function VoicePendingCard({
  entry,
  progress,
  onPress,
  t,
  styles,
}: {
  entry: VoiceListItem;
  progress: number;
  onPress?: () => void;
  t: (key: string) => string;
  styles: ReturnType<typeof createStyles>;
}) {
  const id = voiceListItemId(entry);
  const prompt = voiceListItemTitle(entry);
  const status = entry.kind === 'pending' ? entry.item.status : 'processing';
  const isReady = status === 'preview_ready';
  const isFailed = status === 'failed';
  const title = prompt || t('creationCenter.voiceLibrary.generating');
  const percent = Math.round(progress * 100);
  const hint = isFailed
    ? entry.kind === 'pending' && entry.item.error_message
      ? entry.item.error_message
      : t('creationCenter.voiceLibrary.generateFailed')
    : isReady
      ? t('creationCenter.voiceLibrary.readyHint')
      : t('creationCenter.voiceLibrary.generatingHint');

  const body = (
    <>
      <View style={styles.pendingHeader}>
        <View
          style={[
            styles.avatarSm,
            styles.avatarPending,
            isReady && styles.avatarReady,
            isFailed && styles.avatarFailed,
            { backgroundColor: voiceAvatarColor(id) },
          ]}
        >
          {isReady ? (
            <Ionicons name="checkmark" size={16} color="#fff" />
          ) : isFailed ? (
            <Ionicons name="alert" size={16} color="#fff" />
          ) : (
            <ActivityIndicator size="small" color="#fff" />
          )}
        </View>
        <View style={styles.gridBody}>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.pendingMeta} numberOfLines={2}>
            {hint}
          </Text>
        </View>
      </View>
      {!isReady && !isFailed ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{percent}%</Text>
        </>
      ) : null}
      {isReady ? (
        <Text style={styles.readyAction}>{t('creationCenter.voiceLibrary.tapToChoose')}</Text>
      ) : null}
    </>
  );

  if (isReady && onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.pendingCard, pressed && styles.cardPressed]} onPress={onPress}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.pendingCard}>{body}</View>;
}

export function DefaultVoiceLibraryPanel() {
  const router = useRouter();
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const vm = useVoiceLibrary();
  const isDevUser = useAuthStore((s) => s.user?.is_dev === true);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickRecordId, setPickRecordId] = useState<string | null>(null);
  const [renameVoiceId, setRenameVoiceId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (!isDevUser && vm.tab === 'mine') {
      vm.setTab('explore');
    }
  }, [isDevUser, vm.tab, vm.setTab]);

  const onCreateVoice = useCallback(() => {
    if (!isDevUser) return;
    if (!requireLoginForAction(vm.isLoggedIn, router, vm.t('errors.authTokenMissing'))) return;
    setPickRecordId(null);
    setCreateOpen(true);
  }, [isDevUser, router, vm]);

  const openRename = useCallback((voiceId: string, currentTitle: string) => {
    setRenameVoiceId(voiceId);
    setRenameDraft(currentTitle);
  }, []);

  const closeRename = useCallback(() => {
    if (vm.renameBusyId) return;
    setRenameVoiceId(null);
    setRenameDraft('');
  }, [vm.renameBusyId]);

  const confirmRename = useCallback(async () => {
    if (!renameVoiceId) return;
    const ok = await vm.renameVoice(renameVoiceId, renameDraft);
    if (ok) {
      setRenameVoiceId(null);
      setRenameDraft('');
    }
  }, [renameDraft, renameVoiceId, vm]);

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>{vm.t('creationCenter.voiceLibrary.title')}</Text>
        {isDevUser ? (
          <Pressable
            style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
            onPress={onCreateVoice}
          >
            <Text style={styles.createBtnText}>{vm.t('creationCenter.voiceLibrary.create')}</Text>
          </Pressable>
        ) : null}
      </View>

      {isDevUser ? (
        <View style={styles.subTabs}>
          <Pressable onPress={() => vm.setTab('explore')} style={styles.subTab}>
            <Text style={[styles.subTabText, vm.tab === 'explore' && styles.subTabTextActive]}>
              {vm.t('creationCenter.voiceLibrary.tabExplore')}
            </Text>
          </Pressable>
          <Pressable onPress={() => vm.setTab('mine')} style={styles.subTab}>
            <Text style={[styles.subTabText, vm.tab === 'mine' && styles.subTabTextActive]}>
              {vm.t('creationCenter.voiceLibrary.tabMine')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={vm.query}
          onChangeText={vm.setQuery}
          placeholder={vm.t('creationCenter.voiceLibrary.searchPlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {vm.tab === 'explore' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {VOICE_LIBRARY_FILTERS.map((filter) => (
            <DefaultFilterChip
              key={filter.id}
              label={vm.t(filter.labelKey)}
              active={vm.activeFilter === filter.id}
              onPress={() => vm.toggleFilter(filter.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {vm.loading ? (
        <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
      ) : vm.error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{vm.error}</Text>
          <Pressable onPress={() => void vm.load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>{vm.t('freeChat.retry')}</Text>
          </Pressable>
        </View>
      ) : vm.filteredItems.length === 0 ? (
        <Text style={styles.empty}>{vm.t('creationCenter.voiceLibrary.empty')}</Text>
      ) : (
        <>
          {vm.tab === 'explore' && vm.featuredItems.length > 0 ? (
            <View style={styles.featuredRow}>
              {vm.featuredItems.map((entry) => {
                const id = voiceListItemId(entry);
                return (
                  <VoiceFeaturedCard
                    key={id}
                    entry={entry}
                    playing={vm.playingId === id}
                    previewLoading={vm.loadingPreviewId === id}
                    onPress={() => void vm.preview(entry)}
                    onPreview={() => void vm.preview(entry)}
                    t={vm.t}
                    tp={vm.tp}
                    styles={styles}
                  />
                );
              })}
            </View>
          ) : null}

          {(vm.tab === 'mine' ? vm.filteredItems : vm.gridItems).length > 0 ? (
            <View style={styles.grid}>
              {(vm.tab === 'mine' ? vm.filteredItems : vm.gridItems).map((entry) => {
                const id = voiceListItemId(entry);
                if (entry.kind === 'pending') {
                  const progress = voiceListItemProgress(entry, vm.progressNow) ?? 0;
                  return (
                    <VoicePendingCard
                      key={id}
                      entry={entry}
                      progress={progress}
                      onPress={
                        entry.item.status === 'preview_ready'
                          ? () => {
                              setPickRecordId(entry.item.record_id);
                              setCreateOpen(true);
                            }
                          : undefined
                      }
                      t={vm.t}
                      styles={styles}
                    />
                  );
                }
                const title = voiceListItemTitle(entry);
                const language = voiceListItemLanguage(entry);
                const isPublic = isVoicePublic(entry);
                const publishBusy = vm.publishBusyId === id;
                return (
                  <Pressable
                    key={id}
                    style={({ pressed }) => [styles.gridCard, pressed && styles.cardPressed]}
                    onPress={() => void vm.preview(entry)}
                  >
                    <View style={[styles.avatarSm, { backgroundColor: voiceAvatarColor(id) }]}>
                      <Text style={styles.avatarLetterSm}>{title.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.gridBody}>
                      <Text style={styles.gridTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      <Text style={styles.gridMeta} numberOfLines={1}>
                        {voiceCategoryLabel(title, language, vm.t, vm.tp)}
                      </Text>
                      {vm.tab === 'mine' && entry.kind === 'designed' ? (
                        <View style={styles.mineActions}>
                          <Text style={styles.visibilityBadge}>
                            {isPublic
                              ? vm.t('creationCenter.voiceLibrary.publicBadge')
                              : vm.t('creationCenter.voiceLibrary.privateBadge')}
                          </Text>
                          <Pressable
                            style={styles.publishBtn}
                            onPress={(e) => {
                              if (Platform.OS === 'web') e.stopPropagation?.();
                              openRename(id, title);
                            }}
                          >
                            <Text style={styles.publishBtnText}>
                              {vm.t('creationCenter.voiceLibrary.rename')}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles.publishBtn, publishBusy && styles.publishBtnDisabled]}
                            disabled={publishBusy}
                            onPress={(e) => {
                              if (Platform.OS === 'web') e.stopPropagation?.();
                              if (isPublic) {
                                void vm.unpublishVoice(id);
                              } else {
                                void vm.publishVoice(id);
                              }
                            }}
                          >
                            {publishBusy ? (
                              <ActivityIndicator size="small" color={TOKENS.colors.text} />
                            ) : (
                              <Text style={styles.publishBtnText}>
                                {isPublic
                                  ? vm.t('creationCenter.voiceLibrary.unpublish')
                                  : vm.t('creationCenter.voiceLibrary.publish')}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                    {vm.loadingPreviewId === id ? (
                      <ActivityIndicator size="small" color={TOKENS.colors.accent} />
                    ) : vm.playingId === id ? (
                      <Ionicons name="stop" size={14} color={TOKENS.colors.text} />
                    ) : (
                      <Ionicons name="play" size={14} color={TOKENS.colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </>
      )}
      <DefaultVoiceDesignModal
        visible={createOpen && isDevUser}
        pickRecordId={pickRecordId}
        onClose={() => {
          setCreateOpen(false);
          setPickRecordId(null);
        }}
        onSubmitted={() => {
          void vm.loadMine();
          vm.setTab('mine');
        }}
        onSaved={() => {
          void vm.loadMine();
          vm.setTab('mine');
        }}
      />
      <ThemedGeneralConfirmModal
        visible={!!renameVoiceId}
        title={vm.t('creationCenter.voiceLibrary.renameTitle')}
        confirmLabel={vm.t('settings.save')}
        cancelLabel={vm.t('confirmModal.cancel')}
        loading={!!vm.renameBusyId}
        onCancel={closeRename}
        onConfirm={() => void confirmRename()}
        bodyContent={
          <TextInput
            style={styles.renameInput}
            value={renameDraft}
            onChangeText={setRenameDraft}
            placeholder={vm.t('creationCenter.voiceLibrary.voiceNamePlaceholder')}
            placeholderTextColor={TOKENS.colors.textMuted}
            maxLength={64}
            autoFocus
            autoCorrect={false}
            editable={!vm.renameBusyId}
          />
        }
      />
    </View>
  );
}

function createStyles(lang: Lang) {
  const avatarLetterSmStyle = Typo({ color: '#fff', fontSize: 14, fontWeight: '700' }, 'sans', lang);
  const gridTitleStyle = Typo({ color: TOKENS.colors.text, fontSize: 13, fontWeight: '600' }, 'sans', lang);
  const gridMetaStyle = Typo({ color: TOKENS.colors.textMuted, fontSize: 11 }, 'sans', lang);

  return StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 14,
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitle: Typo(
    {
      flex: 1,
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: 0.5,
    },
    'serif', lang
  ),
  createBtn: {
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  createBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  createBtnText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    'sans', lang
  ),
  subTabs: {
    flexDirection: 'row',
    gap: 20,
  },
  subTab: {
    paddingVertical: 4,
  },
  subTabText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans', lang
  ),
  subTabTextActive: {
    color: TOKENS.colors.text,
  },
  searchWrap: {
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    ...glassWebStyle,
  },
  search: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      paddingHorizontal: 18,
      paddingVertical: 14,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
    },
    'sans', lang
  ),
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 8,
  },
  loader: {
    marginTop: 24,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  errorText: Typo({ color: TOKENS.colors.accent, fontSize: 13, textAlign: 'center' }, 'sans'),
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 13, fontWeight: '600' }, 'sans', lang),
  empty: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 32,
    },
    'sans', lang
  ),
  featuredRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featuredCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    padding: 14,
    ...glassWebStyle,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: Typo({ color: '#fff', fontSize: 18, fontWeight: '700' }, 'sans'),
  featuredBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  featuredTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 18,
    },
    'sans', lang
  ),
  featuredMeta: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    'sans', lang
  ),
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  grid: {
    gap: 10,
    marginTop: 8,
  },
  gridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    padding: 12,
    ...glassWebStyle,
  },
  pendingCard: {
    width: '100%',
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.card,
    padding: 12,
    gap: 10,
    ...glassWebStyle,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPending: {
    opacity: 0.9,
  },
  avatarReady: {
    opacity: 1,
  },
  avatarFailed: {
    opacity: 0.85,
  },
  readyAction: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    'sans',
    lang,
  ),
  pendingMeta: Typo({ color: TOKENS.colors.textMuted, fontSize: 11, lineHeight: 15 }, 'sans'),
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: TOKENS.colors.accent,
  },
  progressLabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'right',
    },
    'mono', lang
  ),
  avatarSm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetterSm: avatarLetterSmStyle,
  gridBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  gridTitle: gridTitleStyle,
  gridMeta: gridMetaStyle,
  mineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  visibilityBadge: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    'mono',
    lang,
  ),
  publishBtn: {
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  publishBtnDisabled: {
    opacity: 0.55,
  },
  publishBtnText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    'sans',
    lang,
  ),
  renameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
    backgroundColor: TOKENS.colors.inputBg,
    borderRadius: TOKENS.radius.input,
    color: TOKENS.colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  cardPressed: {
    opacity: 0.9,
  },
});
};
