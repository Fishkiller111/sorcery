import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FigureGeneratingOverlay } from './FigureGeneratingOverlay';
import { FigureMediaView } from './FigureMediaView';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

type CreateAgentPreviewProps = {
  name: string;
  personality: string[];
  figureUri?: string;
  uploading?: boolean;
  generatingPreview?: boolean;
  previewProgress?: number;
  onPickFigure?: () => void;
  onRegeneratePress?: () => void;
};

export function CreateAgentPreview({
  name,
  personality,
  figureUri,
  uploading,
  generatingPreview,
  previewProgress = 0,
  onPickFigure,
  onRegeneratePress,
}: CreateAgentPreviewProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const displayName = name.trim() || t('createAgent.wizard.previewUntitled');
  const pickable = Boolean(onPickFigure);
  const busy = uploading || generatingPreview;
  const showRegenerate = Boolean(figureUri && onRegeneratePress && !busy);

  let figureContent: React.ReactNode;
  if (generatingPreview) {
    figureContent = (
      <FigureGeneratingOverlay
        accentColor={COLORS.accent.gold}
        trackColor="rgba(255,255,255,0.16)"
        progress={previewProgress}
      />
    );
  } else if (figureUri) {
    figureContent = <FigureMediaView uri={figureUri} style={styles.figure} contentFit="cover" />;
  } else if (uploading) {
    figureContent = <ActivityIndicator color={COLORS.accent.gold} />;
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
          style={styles.regenBtn}
          onPress={(e) => {
            e?.stopPropagation?.();
            onRegeneratePress?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('createAgent.wizard.regenerateA11y')}
          hitSlop={8}
        >
          <Ionicons name="sync" size={18} color={COLORS.text.primary} />
        </Pressable>
      ) : null}
    </>
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t('createAgent.wizard.previewTitle')}</Text>
      {pickable ? (
        <Pressable style={styles.figureBox} onPress={onPickFigure} disabled={uploading}>
          {box}
        </Pressable>
      ) : (
        <View style={styles.figureBox}>{box}</View>
      )}

      <Text style={styles.name} numberOfLines={1}>
        {displayName}
      </Text>
      {personality.length > 0 ? (
        <View style={styles.tagRow}>
          {personality.slice(0, 8).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyTags}>{t('createAgent.wizard.previewNoTags')}</Text>
      )}
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: 'rgba(20,22,28,0.75)',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 280,
  },
  title: Typo({ color: COLORS.text.muted, fontSize: 11, letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }, 'mono', lang),
  figureBox: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,11,15,0.9)',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  figure: { width: '100%', height: '100%' },
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
  placeholder: Typo({ color: COLORS.text.muted, fontSize: 12, textAlign: 'center', padding: 12 }, 'sans', lang),
  name: Typo({ color: COLORS.text.primary, fontSize: 18, fontWeight: '700', marginBottom: 8 }, 'display', lang),
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: 'rgba(180,60,60,0.22)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: Typo({ color: COLORS.text.secondary, fontSize: 11 }, 'sans', lang),
  emptyTags: Typo({ color: COLORS.text.muted, fontSize: 12 }, 'sans', lang),
});
};
