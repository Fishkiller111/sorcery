import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { FigureGeneratingOverlay } from '../../../../components/create-agent/FigureGeneratingOverlay';
import { FigureMediaView } from '../../../../components/create-agent/FigureMediaView';

type DefaultCreateAgentPreviewProps = {
  name: string;
  personality: string[];
  figureUri?: string;
  uploading?: boolean;
  generatingPreview?: boolean;
  previewProgress?: number;
  onPickFigure?: () => void;
  onRegeneratePress?: () => void;
};

export function DefaultCreateAgentPreview({
  name,
  personality,
  figureUri,
  uploading,
  generatingPreview,
  previewProgress = 0,
  onPickFigure,
  onRegeneratePress,
}: DefaultCreateAgentPreviewProps) {
  const { t } = useI18n();
  const displayName = name.trim() || t('createAgent.wizard.previewUntitled');
  const pickable = Boolean(onPickFigure);
  const busy = uploading || generatingPreview;
  const showRegenerate = Boolean(figureUri && onRegeneratePress && !busy);

  let figureContent: React.ReactNode;
  if (generatingPreview) {
    figureContent = (
      <FigureGeneratingOverlay
        accentColor={TOKENS.colors.accent}
        trackColor="rgba(255,255,255,0.16)"
        progress={previewProgress}
      />
    );
  } else if (figureUri) {
    figureContent = <FigureMediaView uri={figureUri} style={styles.figure} contentFit="cover" />;
  } else if (uploading) {
    figureContent = <ActivityIndicator color={TOKENS.colors.accent} />;
  } else {
    figureContent = (
      <Text style={styles.placeholder}>
        {pickable
          ? `${t('createAgent.pickImage')}\n${t('createAgent.uploadHint')}`
          : t('createAgent.wizard.previewNoImage')}
      </Text>
    );
  }

  const box = (
    <>
      {figureContent}
      {showRegenerate ? (
        <Pressable
          style={({ pressed }) => [styles.regenBtn, pressed && styles.regenBtnPressed]}
          onPress={(e) => {
            // 避免触发外层选图
            e?.stopPropagation?.();
            onRegeneratePress?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('createAgent.wizard.regenerateA11y')}
          hitSlop={8}
        >
          <Ionicons name="sync" size={18} color="#F2F2F4" />
        </Pressable>
      ) : null}
    </>
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t('createAgent.wizard.previewTitle')}</Text>
      {pickable ? (
        <Pressable
          style={({ pressed }) => [styles.figureBox, pressed && styles.figureBoxPressed]}
          onPress={onPickFigure}
          disabled={uploading}
        >
          {box}
        </Pressable>
      ) : (
        <View style={styles.figureBox}>{box}</View>
      )}

      <Text style={styles.name} numberOfLines={1}>
        {displayName}
      </Text>
      <Text style={styles.tags} numberOfLines={2}>
        {personality.length > 0
          ? personality.join(' · ')
          : t('createAgent.wizard.previewNoTags')}
      </Text>
    </View>
  );
}

const glassBase = Platform.OS === 'web'
  ? ({
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    } as object)
  : {};

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  title: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    'mono',
  ),
  figureBox: {
    // 以宽度为主：240 × 9:16 ≈ 427 高，避免原先过窄过高
    width: '100%',
    maxWidth: 240,
    aspectRatio: 9 / 16,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...glassBase,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
        } as object)
      : {}),
  },
  figureBoxPressed: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    transform: [{ scale: 0.99 }],
  },
  figure: {
    width: '100%',
    height: '100%',
  },
  regenBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  regenBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  placeholder: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    'sans',
  ),
  name: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: 0.4,
      textAlign: 'center',
    },
    'serif',
  ),
  tags: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      maxWidth: 320,
    },
    'sans',
  ),
});
