import React from 'react';
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
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { useVoiceStep } from '../../../../components/create-agent/useVoiceStep';
import { DefaultCreateAgentSectionLabel } from './DefaultCreateAgentSectionLabel';
import { TOKENS } from '../../theme/tokens';

/** 固定 4 列网格（含「更多」入口） */
const VOICE_COLS = 4;
const GRID_GAP = 8;
const isWeb = Platform.OS === 'web';

const glassBase = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    } as object)
  : {};

const cardColStyle = {
  flexBasis: '23%',
  width: '23%',
  maxWidth: '23%',
  flexGrow: 0,
  flexShrink: 0,
  minWidth: 0,
} as const;

type DefaultVoiceStepProps = {
  selectedId?: string;
  onSelect: (voiceId: string) => void;
};

export function DefaultVoiceStep({ selectedId, onSelect }: DefaultVoiceStepProps) {
  const { t } = useI18n();
  const router = useRouter();
  const {
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
      <View style={styles.wrap}>
        <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.voiceSection')} />
        <View style={styles.center}>
          <ActivityIndicator color={TOKENS.colors.accent} />
          <Text style={styles.hint}>{t('createAgent.wizard.voiceLoading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.wrap}>
        <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.voiceSection')} />
        <View style={styles.center}>
          <Text style={styles.error}>{error || t('createAgent.wizard.voiceLoadFailed')}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            onPress={() => void load()}
          >
            <Text style={styles.retryText}>{t('createAgent.wizard.voiceRetry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.voiceSection')} />

      <Text style={styles.heading}>{t('createAgent.wizard.voiceSection')}</Text>
      <Text style={styles.hint}>{t('createAgent.wizard.voiceHint')}</Text>

      <View style={[styles.grid, isWeb && styles.gridWeb]}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            styles.moreCard,
            !isWeb && styles.cardNative,
            pressed && styles.cardPressed,
          ]}
          onPress={openVoiceLibrary}
          accessibilityRole="button"
          accessibilityLabel={t('createAgent.wizard.voiceMoreA11y')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.playBtn, styles.moreIcon]}>
              <Ionicons name="musical-notes-outline" size={16} color={TOKENS.colors.accent} />
            </View>
            <Ionicons name="chevron-forward" size={16} color={TOKENS.colors.textMuted} />
          </View>
          <Text style={styles.voiceTitle} numberOfLines={2}>
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
                style={[
                  styles.card,
                  !isWeb && styles.cardNative,
                  selected && styles.cardSelected,
                ]}
              >
                <View style={styles.cardHeader}>
                  <Pressable
                    style={[
                      styles.playBtn,
                      selected && styles.playBtnSelected,
                    ]}
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
                        color={selected ? '#FFFFFF' : TOKENS.colors.text}
                      />
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'stop' : 'play'}
                        size={16}
                        color={selected ? '#FFFFFF' : TOKENS.colors.text}
                      />
                    )}
                  </Pressable>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={18} color={TOKENS.colors.accent} />
                  ) : null}
                </View>

                <Pressable
                  onPress={() => onSelect(item.id)}
                  style={({ pressed }) => [styles.cardSelectBody, pressed && styles.cardPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.voiceTitle, selected && styles.voiceTitleSelected]} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.metaRow}>
                    {item.language ? (
                      <View style={[styles.langChip, selected && styles.langChipSelected]}>
                        <Text style={[styles.langChipText, selected && styles.langChipTextSelected]}>
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

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  heading: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 22,
      fontWeight: '600',
      letterSpacing: 0.3,
      marginTop: 4,
    },
    'serif',
  ),
  hint: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 8,
      maxWidth: 520,
    },
    'sans',
  ),
  error: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 13,
      textAlign: 'center',
    },
    'sans',
  ),
  retryBtn: {
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: TOKENS.colors.card,
    ...glassBase,
    ...(isWeb ? ({ cursor: 'pointer' } as const) : {}),
  },
  retryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  retryText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
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
    minHeight: 108,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    backgroundColor: TOKENS.colors.card,
    ...glassBase,
    ...(isWeb ? ({ cursor: 'pointer', minWidth: 0 } as const) : {}),
  },
  moreCard: {
    borderStyle: 'dashed',
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.08)',
  },
  emptyCard: {
    justifyContent: 'center',
  },
  cardNative: {
    ...cardColStyle,
  },
  cardSelected: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  cardSelectBody: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    ...(isWeb ? ({ cursor: 'pointer' } as const) : {}),
  },
  moreIcon: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  playBtnSelected: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  voiceTitle: Typo(
    {
      color: TOKENS.colors.navTextInactive,
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 15,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  voiceTitleSelected: {
    color: TOKENS.colors.text,
    fontWeight: '700',
  },
  moreHint: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      letterSpacing: 0.3,
    },
    'sans',
  ),
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  langChip: {
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: TOKENS.colors.lineFaint,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    maxWidth: '100%',
  },
  langChipSelected: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
  },
  langChipText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    'mono',
  ),
  langChipTextSelected: {
    color: TOKENS.colors.text,
  },
  previewError: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 9,
      flexShrink: 1,
    },
    'sans',
  ),
});
