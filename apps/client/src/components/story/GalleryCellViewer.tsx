import type { Lang } from '../../i18n/types';
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { GalleryBranchView } from '../../utils/storyGallery';
import { useI18n } from '../../i18n/I18nContext';

type Props = {
  visible: boolean;
  branch: GalleryBranchView | null;
  initialIndex: number;
  onClose: () => void;
};

function branchTypeLabel(type: GalleryBranchView['type'], t: (k: string) => string) {
  if (type === 'reward') return t('gallery.branchReward');
  if (type === 'bad_end') return t('gallery.branchBadEnd');
  return t('gallery.branchParallel');
}

function branchAccent(type: GalleryBranchView['type']) {
  if (type === 'reward') return COLORS.accent.gold;
  if (type === 'bad_end') return COLORS.accent.red;
  return '#7a9ec2';
}

export function GalleryCellViewer({
  visible,
  branch,
  initialIndex,
  onClose,
}: Props) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex, branch?.id]);

  const cells = branch?.cells ?? [];
  const cell = cells[index];
  const accent = branch ? branchAccent(branch.type) : COLORS.accent.gold;
  const hasImage = cell?.hasImage && cell?.imageSource;
  const canPrev = index > 0;
  const canNext = index < cells.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {hasImage ? (
          <Animated.View key={cell!.id} entering={FadeIn} exiting={FadeOut} style={styles.imageLayer}>
            <Image
              source={cell!.imageSource!}
              style={styles.image}
              contentFit="contain"
            />
          </Animated.View>
        ) : (
          <View style={styles.textOnlyBg} />
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={Typo(styles.closeText, 'sans', lang)}>✕</Text>
          </TouchableOpacity>
          <View style={styles.topMeta}>
            {branch ? (
              <>
                <Text style={[styles.typeBadge, { color: accent, borderColor: accent }]}>
                  {branchTypeLabel(branch.type, t)}
                </Text>
                <Text style={styles.branchTitle} numberOfLines={1}>
                  {branch.title}
                </Text>
              </>
            ) : null}
          </View>
          <Text style={styles.stepCounter}>
            {cells.length > 0 ? `${index + 1} / ${cells.length}` : ''}
          </Text>
        </View>

        <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {cell?.label ? (
            <ScrollView
              style={styles.narrationScroll}
              contentContainerStyle={styles.narrationContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.narration}>{cell.label}</Text>
            </ScrollView>
          ) : null}

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, !canPrev && styles.navBtnDisabled]}
              onPress={() => canPrev && setIndex((i) => i - 1)}
              disabled={!canPrev}
            >
              <Text style={[Typo(styles.navBtnText, 'sans', lang), !canPrev && Typo(styles.navBtnTextDisabled, 'sans', lang)]}>
                {t('gallery.prev')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtnPrimary} onPress={onClose}>
              <Text style={Typo(styles.navBtnPrimaryText, 'sans', lang)}>{t('gallery.close')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, !canNext && styles.navBtnDisabled]}
              onPress={() => canNext && setIndex((i) => i + 1)}
              disabled={!canNext}
            >
              <Text style={[Typo(styles.navBtnText, 'sans', lang), !canNext && Typo(styles.navBtnTextDisabled, 'sans', lang)]}>
                {t('gallery.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageLayer: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textOnlyBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0a0b0f',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  closeText: { color: COLORS.text.primary, fontSize: 16 },
  topMeta: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  typeBadge: Typo(
    {
      alignSelf: 'flex-start',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    'mono', lang
  ),
  branchTitle: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 14,
      fontWeight: '700',
      ...(Platform.OS === 'web'
        ? ({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const)
        : {}),
    },
    'display', lang
  ),
  stepCounter: Typo(
    { color: COLORS.text.muted, fontSize: 11, paddingTop: 10, minWidth: 44, textAlign: 'right' },
    'mono', lang
  ),
  bottomPanel: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    zIndex: 2,
    maxHeight: '52%',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  narrationScroll: {
    flexGrow: 0,
    maxHeight: 200,
  },
  narrationContent: {
    paddingBottom: 4,
  },
  narration: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 15,
      lineHeight: 24,
      textAlign: 'left',
    },
    'sans', lang
  ),
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnText: { color: COLORS.text.secondary, fontSize: 13, fontWeight: '600' },
  navBtnTextDisabled: { color: COLORS.text.muted },
  navBtnPrimary: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.accent.gold,
    alignItems: 'center',
  },
  navBtnPrimaryText: { color: '#111', fontSize: 13, fontWeight: '700' },
});
};
