import React, { useMemo, useState } from 'react';
import type { Lang } from '../../../../i18n/types';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { glassWebStyle } from '../../../../components/free-chat/freeChatUi';
import { resolveStaticUrl } from '../../../../constants/config';
import { requireLoginForAction } from '../../../../utils/requireLogin';
import type { AiImageGenRecordItem } from '../../../../types/api';
import type { useAiImageGenHistory } from '../../../../hooks/useAiImageGenHistory';
import { formatGenRecordError } from '../../../../utils/apiError';
import { downloadImageToDevice } from '../../../../utils/downloadImage';
import { SubmitToMediaLibraryModal } from './SubmitToMediaLibraryModal';
import { useAuthStore } from '../../../../stores/authStore';

type HistoryVm = ReturnType<typeof useAiImageGenHistory>;

function parseAspectRatio(ratio: string): number {
  const [w, h] = ratio.split(':').map((part) => Number(part.trim()));
  if (!w || !h) return 9 / 16;
  return w / h;
}

function formatRecordDate(ts: number, lang: string): string {
  if (!ts) return '';
  try {
    return new Date(ts * 1000).toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'jp' ? 'ja-JP' : lang);
  } catch {
    return new Date(ts * 1000).toLocaleString();
  }
}

function isImageGenSucceeded(status: string): boolean {
  return status === 'succeeded' || status === 'completed';
}

function statusLabel(status: string, t: (key: string) => string): string {
  if (isImageGenSucceeded(status)) return t('creationCenter.historyStatusCompleted');
  if (status === 'failed') return t('creationCenter.historyStatusFailed');
  if (status === 'pending' || status === 'processing') return t('creationCenter.historyStatusPending');
  return status;
}

function HistoryDetail({
  record,
  t,
  lang,
  onBack,
}: {
  record: AiImageGenRecordItem;
  t: (key: string) => string;
  lang: Lang;
  onBack: () => void;
}) {
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [submitVisible, setSubmitVisible] = useState(false);
  const imageUri = record.image_url ? resolveStaticUrl(record.image_url) : null;
  const aspect = parseAspectRatio(record.aspect_ratio);

  return (
    <View style={styles.detailWrap}>
      <Pressable style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color={TOKENS.colors.textSecondary} />
        <Text style={Typo(styles.backText, 'sans', lang)}>{t('creationCenter.historyBack')}</Text>
      </Pressable>

      {imageUri && isImageGenSucceeded(record.status) ? (
        <ExpoImage source={{ uri: imageUri }} style={[styles.detailImage, { aspectRatio: aspect }]} contentFit="contain" />
      ) : (
        <View style={[styles.detailPlaceholder, { aspectRatio: aspect }]}>
          {record.status === 'pending' || record.status === 'processing' ? (
            <ActivityIndicator color={TOKENS.colors.accent} />
          ) : (
            <Ionicons name="image-outline" size={32} color={TOKENS.colors.textMuted} />
          )}
        </View>
      )}

      {imageUri && isImageGenSucceeded(record.status) ? (
        <View style={styles.detailActions}>
          <Pressable
            style={styles.detailActionBtn}
            onPress={() => void downloadImageToDevice(imageUri, `soulthread-${record.record_id}.png`, t)}
          >
            <Ionicons name="download-outline" size={16} color={TOKENS.colors.text} />
            <Text style={styles.detailActionText}>{t('creationCenter.downloadImage')}</Text>
          </Pressable>
          <Pressable
            style={styles.detailActionBtn}
            onPress={() => {
              if (!requireLoginForAction(isLoggedIn, router, t('creationCenter.historyLoginRequired'))) return;
              setSubmitVisible(true);
            }}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={TOKENS.colors.text} />
            <Text style={styles.detailActionText}>
              {t('creationCenter.submitToMediaLibrary')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <SubmitToMediaLibraryModal
        visible={submitVisible}
        recordId={record.record_id}
        onClose={() => setSubmitVisible(false)}
      />

      <View style={styles.detailMeta}>
        <Text style={Typo(styles.detailStatus, 'mono', lang)}>{statusLabel(record.status, t)}</Text>
        <Text style={Typo(styles.detailDate, 'sans', lang)}>{formatRecordDate(record.created_at, lang)}</Text>
      </View>

      <Text style={Typo(styles.detailPrompt, 'sans', lang)}>{record.prompt}</Text>

      {record.selected_tags?.length ? (
        <Text style={Typo(styles.detailTags, 'mono', lang)}>
          {record.selected_tags.join(', ')}
        </Text>
      ) : null}

      <Text style={Typo(styles.detailRatio, 'mono', lang)}>{record.aspect_ratio}</Text>

      {record.status === 'failed' || record.error_code || record.error_message ? (
        <Text style={Typo(styles.detailError, 'sans', lang)}>
          {formatGenRecordError(t, record, 'image')}
        </Text>
      ) : null}
    </View>
  );
}

function HistoryCard({
  record,
  t,
  lang,
  onPress,
}: {
  record: AiImageGenRecordItem;
  t: (key: string) => string;
  lang: Lang;
  onPress: () => void;
}) {
  const imageUri = record.image_url ? resolveStaticUrl(record.image_url) : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {imageUri && isImageGenSucceeded(record.status) ? (
        <ExpoImage source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={styles.cardPlaceholder}>
          {record.status === 'pending' || record.status === 'processing' ? (
            <ActivityIndicator size="small" color={TOKENS.colors.accent} />
          ) : (
            <Ionicons name="image-outline" size={22} color={TOKENS.colors.textMuted} />
          )}
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={Typo(styles.cardPrompt, 'sans', lang)} numberOfLines={2}>
          {record.prompt}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={Typo(styles.cardStatus, 'mono', lang)}>{statusLabel(record.status, t)}</Text>
          <Text style={Typo(styles.cardDate, 'sans', lang)}>{formatRecordDate(record.created_at, lang)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function DefaultImageGenHistory({
  vm,
  lang,
  selectedId,
  onSelect,
  onClearSelect,
}: {
  vm: HistoryVm;
  lang: Lang;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelect: () => void;
}) {
  const router = useRouter();

  const selectedRecord = useMemo(
    () => vm.items.find((item) => item.record_id === selectedId) ?? null,
    [selectedId, vm.items],
  );

  if (!vm.isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text style={Typo(styles.emptyText, 'sans', lang)}>{vm.t('creationCenter.historyLoginRequired')}</Text>
        <Pressable
          style={styles.loginBtn}
          onPress={() => requireLoginForAction(false, router, vm.t('errors.authTokenMissing'))}
        >
          <Text style={Typo(styles.loginBtnText, 'sans', lang)}>{vm.t('login.login')}</Text>
        </Pressable>
      </View>
    );
  }

  if (selectedRecord) {
    return (
      <HistoryDetail
        record={selectedRecord}
        t={vm.t}
        lang={lang}
        onBack={onClearSelect}
      />
    );
  }

  if (vm.loading && vm.items.length === 0) {
    return <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />;
  }

  if (vm.error && vm.items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={Typo(styles.errorText, 'sans', lang)}>{vm.error}</Text>
        <Pressable onPress={vm.refresh} style={styles.retryBtn}>
          <Text style={Typo(styles.retryText, 'sans', lang)}>{vm.t('freeChat.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  if (!vm.loading && vm.items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={Typo(styles.emptyText, 'sans', lang)}>{vm.t('creationCenter.historyEmpty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listWrap}>
      <View style={styles.grid}>
        {vm.items.map((record) => (
          <HistoryCard
            key={record.record_id}
            record={record}
            t={vm.t}
            lang={lang}
            onPress={() => onSelect(record.record_id)}
          />
        ))}
      </View>

      {vm.hasMore ? (
        <Pressable
          style={({ pressed }) => [styles.loadMoreBtn, pressed && styles.loadMorePressed]}
          onPress={vm.loadMore}
          disabled={vm.loadingMore}
        >
          {vm.loadingMore ? (
            <ActivityIndicator size="small" color={TOKENS.colors.text} />
          ) : (
            <Text style={Typo(styles.loadMoreText, 'sans', lang)}>{vm.t('creationCenter.historyLoadMore')}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    width: '100%',
    gap: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    minWidth: 150,
    flexGrow: 1,
    maxWidth: 280,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    overflow: 'hidden',
    ...glassWebStyle,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: TOKENS.colors.cardSolid,
  },
  cardPlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.cardSolid,
  },
  cardBody: {
    padding: 10,
    gap: 6,
  },
  cardPrompt: { color: TOKENS.colors.text, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  cardFooter: {
    gap: 2,
  },
  cardStatus: { color: TOKENS.colors.textMuted, fontSize: 10, fontWeight: '600' },
  cardDate: { color: TOKENS.colors.textMuted, fontSize: 10 },
  loadMoreBtn: {
    alignSelf: 'center',
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: TOKENS.colors.card,
    minWidth: 140,
    alignItems: 'center',
    ...glassWebStyle,
  },
  loadMorePressed: {
    opacity: 0.9,
  },
  loadMoreText: { color: TOKENS.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  loader: {
    marginTop: 32,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { color: TOKENS.colors.textSecondary, fontSize: 14, textAlign: 'center' },
  errorText: { color: TOKENS.colors.accent, fontSize: 13, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: TOKENS.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  loginBtn: {
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
  },
  loginBtnText: { color: TOKENS.colors.text, fontSize: 13, fontWeight: '700' },
  detailWrap: {
    width: '100%',
    gap: 12,
    paddingBottom: 32,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  backText: { color: TOKENS.colors.textSecondary, fontSize: 14, fontWeight: '600' },
  detailImage: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.cardSolid,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: TOKENS.colors.cardSolid,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  detailActionText: {
    color: TOKENS.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  detailPlaceholder: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.cardSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailStatus: { color: TOKENS.colors.accent, fontSize: 12, fontWeight: '700' },
  detailDate: { color: TOKENS.colors.textMuted, fontSize: 12 },
  detailPrompt: { color: TOKENS.colors.text, fontSize: 14, lineHeight: 20 },
  detailTags: { color: TOKENS.colors.textMuted, fontSize: 12 },
  detailRatio: { color: TOKENS.colors.textMuted, fontSize: 12 },
  detailError: { color: TOKENS.colors.accent, fontSize: 12, lineHeight: 18 },
});
