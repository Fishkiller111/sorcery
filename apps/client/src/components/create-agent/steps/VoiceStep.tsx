import type { Lang } from '../../../i18n/types';
import { useI18n } from '../../../i18n/I18nContext';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../../theme/colors';
import { Typo } from '../../../theme/typography';
import { useVoiceStep } from '../useVoiceStep';

/** 固定 4 列网格（含「更多」入口） */
const VOICE_COLS = 4;
const GRID_GAP = 8;
const isWeb = Platform.OS === 'web';

const cardColStyle = {
  flexBasis: '23%',
  width: '23%',
  maxWidth: '23%',
  flexGrow: 0,
  flexShrink: 0,
  minWidth: 0,
} as const;

/** 音色步骤：展示可选 TTS 声线列表，支持选中与试听预览。 */
type VoiceStepProps = {
  /** 当前选中的 voice_reference_id，未选时为 undefined */
  selectedId?: string;
  /** 用户点选某条音色时回调，id 写入创建请求的 voice_reference_id */
  onSelect: (voiceId: string) => void;
};

/**
 * 创建 Agent 向导 —「音色」步骤。
 * 按 UI 语言优先筛选声线，无匹配时展示全量；网格布局渲染列表。
 */
export function VoiceStep({ selectedId, onSelect }: VoiceStepProps) {
  const { lang } = useI18n();
  const router = useRouter();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const {
    t,
    loading,
    error,
    items,
    load,
    playingId,
    loadingPreviewId,
    previewErrorId,
    handlePreview,
  } = useVoiceStep();

  const openVoiceLibrary = () => {
    router.push('/creation-center/voice');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.agents.paleGold} />
        <Text style={styles.hint}>{t('createAgent.wizard.voiceLoading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || t('createAgent.wizard.voiceLoadFailed')}</Text>
        <Pressable style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryText}>{t('createAgent.wizard.voiceRetry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>{t('createAgent.wizard.voiceSection')}</Text>
      <Text style={styles.hint}>{t('createAgent.wizard.voiceHint')}</Text>
      <View style={[styles.grid, isWeb && styles.gridWeb]}>
        <Pressable
          style={[styles.card, styles.moreCard, !isWeb && styles.cardNative]}
          onPress={openVoiceLibrary}
          accessibilityRole="button"
          accessibilityLabel={t('createAgent.wizard.voiceMoreA11y')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, styles.moreIcon]}>
              <Ionicons name="musical-notes-outline" size={18} color={COLORS.agents.brightGold} />
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.agents.paleGoldMuted} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {t('createAgent.wizard.voiceMore')}
          </Text>
          <Text style={styles.moreHint} numberOfLines={1}>
            {t('createAgent.wizard.voiceMoreHint')}
          </Text>
        </Pressable>

        {items.length === 0 ? (
          <View style={[styles.card, styles.emptyCard, !isWeb && styles.cardNative]}>
            <Text style={styles.hint}>{t('createAgent.wizard.voiceEmpty')}</Text>
          </View>
        ) : (
          items.map((item) => {
            const selected = item.id === selectedId;
            const isPlaying = playingId === item.id;
            const isPreviewLoading = loadingPreviewId === item.id;
            const previewFailed = previewErrorId === item.id;
            return (
              <View
                key={item.id}
                style={[styles.card, !isWeb && styles.cardNative, selected && styles.cardSelected]}
              >
                <View style={styles.cardHeader}>
                  <Pressable
                    style={[styles.iconWrap, selected && styles.iconWrapSelected]}
                    onPress={() => {
                      void handlePreview(item);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPlaying
                        ? t('createAgent.wizard.voicePreviewStop')
                        : t('createAgent.wizard.voicePreviewPlay')
                    }
                  >
                    {isPreviewLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={selected ? '#0a0b0f' : COLORS.agents.paleGold}
                      />
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'stop' : 'play'}
                        size={18}
                        color={selected ? '#0a0b0f' : COLORS.agents.paleGold}
                      />
                    )}
                  </Pressable>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.agents.brightGold} />
                  ) : null}
                </View>
                <Pressable
                  onPress={() => onSelect(item.id)}
                  style={styles.cardSelectBody}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.language ? (
                      <View style={[styles.chip, selected && styles.chipSelected]}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {item.language.toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                    {previewFailed ? (
                      <Text style={styles.previewError}>{t('createAgent.wizard.voicePreviewFailed')}</Text>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  wrap: { gap: 8 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  section: Typo(
    { color: COLORS.agents.paleGold, fontSize: 14, fontWeight: '600', marginBottom: 2 },
    'sans', lang
  ),
  hint: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 13, lineHeight: 20, marginBottom: 8 }, 'sans'),
  error: Typo({ color: COLORS.accent.red, fontSize: 13, textAlign: 'center' }, 'sans', lang),
  retryBtn: {
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    ...(isWeb ? ({ cursor: 'pointer' } as const) : {}),
  },
  retryText: Typo({ color: COLORS.agents.paleGold, fontSize: 13, fontWeight: '600' }, 'sans', lang),
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    width: '100%',
  },
  gridWeb: {
    display: 'grid',
    gridTemplateColumns: `repeat(${VOICE_COLS}, minmax(0, 1fr))`,
  } as object,
  card: {
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 104,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    ...(isWeb ? ({ cursor: 'pointer', minWidth: 0 } as const) : {}),
  },
  moreCard: {
    borderStyle: 'dashed',
    borderColor: COLORS.agents.brightGold,
    backgroundColor: 'rgba(139, 26, 26, 0.18)',
  },
  emptyCard: {
    justifyContent: 'center',
  },
  cardNative: {
    ...cardColStyle,
  },
  cardSelected: {
    borderColor: COLORS.agents.brightGold,
    backgroundColor: 'rgba(139, 26, 26, 0.25)',
  },
  cardSelectBody: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    backgroundColor: 'rgba(0,0,0,0.45)',
    ...(isWeb ? ({ cursor: 'pointer' } as const) : {}),
  },
  moreIcon: {
    borderColor: COLORS.agents.brightGold,
    backgroundColor: 'rgba(232, 213, 181, 0.12)',
  },
  iconWrapSelected: {
    backgroundColor: COLORS.agents.brightGold,
    borderColor: COLORS.agents.brightGold,
  },
  title: Typo({ color: COLORS.agents.paleGold, fontSize: 12, fontWeight: '600', lineHeight: 16 }, 'display', lang),
  titleSelected: Typo({ color: COLORS.agents.paleGold, fontSize: 12, fontWeight: '700', lineHeight: 16 }, 'display', lang),
  moreHint: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 10 }, 'sans', lang),
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    maxWidth: '100%',
  },
  chipSelected: {
    backgroundColor: COLORS.agents.brightGold,
    borderColor: COLORS.agents.brightGold,
  },
  chipText: Typo({ color: COLORS.agents.paleGold, fontSize: 9, fontWeight: '600' }, 'mono', lang),
  chipTextSelected: Typo({ color: '#0a0b0f', fontSize: 9, fontWeight: '700' }, 'mono', lang),
  previewError: Typo({ color: COLORS.accent.red, fontSize: 9, flexShrink: 1 }, 'sans', lang),
});
};
