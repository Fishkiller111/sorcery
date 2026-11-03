import type { Lang } from '../../../../i18n/types';
import React, { useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { glassWebStyle } from '../../../../components/free-chat/freeChatUi';
import { useIsDesktop } from '../../../../hooks/useIsDesktop';
import { themedScrollViewProps } from '../../../../theme/webScrollbar';

export type ImageGenStyleOption = {
  value: string;
  labelKey: string;
  descKey: string;
  badgeKey?: string;
  badgeTone?: 'default' | 'premium' | 'experimental';
  preview: ImageSourcePropType;
};

export const IMAGE_GEN_STYLE_OPTIONS: ImageGenStyleOption[] = [
  {
    value: '',
    labelKey: 'creationCenter.styleDreamy',
    descKey: 'creationCenter.styleDreamyDesc',
    badgeKey: 'creationCenter.styleBadgeDefault',
    badgeTone: 'default',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_dreamy.webp'),
  },
  {
    value: 'realistic',
    labelKey: 'creationCenter.styleRealistic',
    descKey: 'creationCenter.styleRealisticDesc',
    badgeKey: 'creationCenter.styleBadgePremium',
    badgeTone: 'premium',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_realistic.webp'),
  },
  {
    value: 'anime',
    labelKey: 'creationCenter.styleAnime',
    descKey: 'creationCenter.styleAnimeDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_anime.webp'),
  },
  {
    value: 'cinematic',
    labelKey: 'creationCenter.styleCinematic',
    descKey: 'creationCenter.styleCinematicDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_cinematic.webp'),
  },
  {
    value: 'fantasy',
    labelKey: 'creationCenter.styleFantasy',
    descKey: 'creationCenter.styleFantasyDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_fantasy.webp'),
  },
  {
    value: 'photography',
    labelKey: 'creationCenter.stylePhoto',
    descKey: 'creationCenter.stylePhotoDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_photography.webp'),
  },
  {
    value: 'cyberpunk',
    labelKey: 'creationCenter.styleCyberpunk',
    descKey: 'creationCenter.styleCyberpunkDesc',
    badgeKey: 'creationCenter.styleBadgeExperimental',
    badgeTone: 'experimental',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_cyberpunk.webp'),
  },
  {
    value: 'digital-art',
    labelKey: 'creationCenter.styleDigital',
    descKey: 'creationCenter.styleDigitalDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_digital_art.webp'),
  },
  {
    value: '3d-model',
    labelKey: 'creationCenter.style3d',
    descKey: 'creationCenter.style3dDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_3d.webp'),
  },
  {
    value: 'watercolor',
    labelKey: 'creationCenter.styleWatercolor',
    descKey: 'creationCenter.styleWatercolorDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_watercolor.webp'),
  },
  {
    value: 'neonpunk',
    labelKey: 'creationCenter.styleNeon',
    descKey: 'creationCenter.styleNeonDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_neon.webp'),
  },
  {
    value: 'manga',
    labelKey: 'creationCenter.styleManga',
    descKey: 'creationCenter.styleMangaDesc',
    preview: require('../../../../../assets/images/ui/creation-center/image-gen/style_manga.webp'),
  },
];

export type ImageGenAspectOption = {
  ratio: string;
  labelKey: string;
  /** Relative box size for the icon preview */
  boxW: number;
  boxH: number;
  featured?: boolean;
};

/** Curated aspect ratios shown in settings (merged with API list if present). */
export const IMAGE_GEN_ASPECT_OPTIONS: ImageGenAspectOption[] = [
  { ratio: '4:5', labelKey: 'creationCenter.aspectPortrait45', boxW: 40, boxH: 50, featured: true },
  { ratio: '5:4', labelKey: 'creationCenter.aspectLandscape54', boxW: 50, boxH: 40, featured: true },
  { ratio: '9:16', labelKey: 'creationCenter.aspect916', boxW: 27, boxH: 48 },
  { ratio: '16:9', labelKey: 'creationCenter.aspect169', boxW: 48, boxH: 27 },
  { ratio: '1:1', labelKey: 'creationCenter.aspect11', boxW: 40, boxH: 40 },
  { ratio: '3:4', labelKey: 'creationCenter.aspect34', boxW: 36, boxH: 48 },
  { ratio: '4:3', labelKey: 'creationCenter.aspect43', boxW: 48, boxH: 36 },
  { ratio: '2:3', labelKey: 'creationCenter.aspect23', boxW: 32, boxH: 48 },
  { ratio: '3:2', labelKey: 'creationCenter.aspect32', boxW: 48, boxH: 32 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
  stylePreset: string;
  onStylePresetChange: (value: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  /** Extra ratios from API meta */
  extraAspectRatios?: string[];
};

export function DefaultImageGenSettingsModal({
  visible,
  onClose,
  aspectRatio,
  onAspectRatioChange,
  stylePreset,
  onStylePresetChange,
  negativePrompt,
  onNegativePromptChange,
  extraAspectRatios,
}: Props) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isDesktop = useIsDesktop();
  const { height: windowHeight } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const aspectOptions = useMemo((): ImageGenAspectOption[] => {
    const seen = new Set(IMAGE_GEN_ASPECT_OPTIONS.map((a) => a.ratio));
    const extras: ImageGenAspectOption[] = (extraAspectRatios || [])
      .filter((r) => r && !seen.has(r))
      .map((ratio) => {
        const [w, h] = ratio.split(':').map(Number);
        const safeW = Number.isFinite(w) && w > 0 ? w : 1;
        const safeH = Number.isFinite(h) && h > 0 ? h : 1;
        const scale = 40 / Math.max(safeW, safeH);
        return {
          ratio,
          labelKey: '',
          boxW: Math.round(safeW * scale),
          boxH: Math.round(safeH * scale),
        };
      });
    return [...IMAGE_GEN_ASPECT_OPTIONS, ...extras];
  }, [extraAspectRatios]);

  const featured = aspectOptions.filter((a) => a.featured);
  const rest = aspectOptions.filter((a) => !a.featured);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            isDesktop ? styles.cardDesktop : styles.cardMobile,
            { maxHeight: Math.min(windowHeight * 0.88, 720) },
          ]}
        >
          <View style={styles.header}>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={TOKENS.colors.textSecondary} />
            </Pressable>
            <Text style={styles.title}>{t('creationCenter.settings')}</Text>
          </View>

          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={[
              styles.body,
              isDesktop ? styles.bodyDesktop : styles.bodyMobile,
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.col, isDesktop && styles.colStyle]}>
              <Text style={styles.sectionTitle}>{t('creationCenter.stylePreset')}</Text>
              <View style={styles.styleList}>
                {IMAGE_GEN_STYLE_OPTIONS.map((opt) => {
                  const active = stylePreset === opt.value;
                  return (
                    <Pressable
                      key={opt.value || 'default'}
                      onPress={() => onStylePresetChange(opt.value)}
                      style={[styles.styleCard, active && styles.styleCardActive]}
                    >
                      <ExpoImage
                        source={opt.preview}
                        style={styles.styleThumb}
                        contentFit="cover"
                        contentPosition="top"
                        recyclingKey={`style-${opt.value || 'dreamy'}`}
                      />
                      <View style={styles.styleMeta}>
                        <View style={styles.styleTitleRow}>
                          <Text style={styles.styleName} numberOfLines={1}>
                            {t(opt.labelKey)}
                          </Text>
                          {opt.badgeKey ? (
                            <View
                              style={[
                                styles.badge,
                                opt.badgeTone === 'premium' && styles.badgePremium,
                                opt.badgeTone === 'experimental' && styles.badgeExperimental,
                                opt.badgeTone === 'default' && styles.badgeDefault,
                              ]}
                            >
                              <Text style={styles.badgeText}>{t(opt.badgeKey)}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.styleDesc} numberOfLines={2}>
                          {t(opt.descKey)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.col, isDesktop && styles.colParams]}>
              <Text style={styles.sectionTitle}>{t('creationCenter.aspectRatio')}</Text>
              {featured.length > 0 ? (
                <View style={styles.aspectFeaturedRow}>
                  {featured.map((opt) => (
                    <AspectChip
                      key={opt.ratio}
                      opt={opt}
                      active={aspectRatio === opt.ratio}
                      onPress={() => onAspectRatioChange(opt.ratio)}
                      label={opt.labelKey ? t(opt.labelKey) : opt.ratio}
                      styles={styles}
                      featured
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.aspectGrid}>
                {rest.map((opt) => (
                  <AspectChip
                    key={opt.ratio}
                    opt={opt}
                    active={aspectRatio === opt.ratio}
                    onPress={() => onAspectRatioChange(opt.ratio)}
                    label={opt.labelKey ? t(opt.labelKey) : opt.ratio}
                    styles={styles}
                  />
                ))}
              </View>

              <Text style={[styles.sectionTitle, styles.negTitle]}>
                {t('creationCenter.negativePrompt')}
              </Text>
              <TextInput
                style={styles.negInput}
                value={negativePrompt}
                onChangeText={onNegativePromptChange}
                placeholder={t('creationCenter.negativePromptPlaceholder')}
                placeholderTextColor={TOKENS.colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AspectChip({
  opt,
  active,
  onPress,
  label,
  styles,
  featured,
}: {
  opt: ImageGenAspectOption;
  active: boolean;
  onPress: () => void;
  label: string;
  styles: ReturnType<typeof createStyles>;
  featured?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.aspectChip,
        featured && styles.aspectChipFeatured,
        active && styles.aspectChipActive,
      ]}
    >
      <View
        style={[
          styles.aspectIcon,
          {
            width: opt.boxW,
            height: opt.boxH,
          },
          active && styles.aspectIconActive,
        ]}
      />
      <Text style={[styles.aspectLabel, active && styles.aspectLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: '#12151c',
      overflow: 'hidden',
      ...glassWebStyle,
    },
    cardDesktop: {
      maxWidth: 860,
    },
    cardMobile: {
      maxWidth: 520,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: TOKENS.colors.cardBorderFaint,
      flexShrink: 0,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    title: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 18,
        fontWeight: '700',
      },
      'sans',
      lang,
    ),
    scroll: {
      flexShrink: 1,
    },
    body: {
      padding: 16,
      gap: 18,
    },
    bodyDesktop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bodyMobile: {
      flexDirection: 'column',
    },
    col: {
      gap: 12,
    },
    colStyle: {
      flex: 1.05,
      minWidth: 0,
    },
    colParams: {
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 15,
        fontWeight: '700',
      },
      'sans',
      lang,
    ),
    styleList: {
      gap: 8,
    },
    styleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: 'rgba(8,10,15,0.55)',
    },
    styleCardActive: {
      borderColor: TOKENS.colors.accent,
      backgroundColor: 'rgba(186, 60, 71, 0.1)',
    },
    styleThumb: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: '#1c2230',
      overflow: 'hidden',
      flexShrink: 0,
    },
    styleMeta: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    styleTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    styleName: {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    styleDesc: {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    badge: {
      borderRadius: TOKENS.radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 2,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    badgeDefault: {
      backgroundColor: 'rgba(80, 140, 220, 0.22)',
    },
    badgePremium: {
      backgroundColor: 'rgba(186, 60, 71, 0.22)',
    },
    badgeExperimental: {
      backgroundColor: 'rgba(60, 160, 100, 0.22)',
    },
    badgeText: {
      color: TOKENS.colors.text,
      fontSize: 10,
      fontWeight: '700',
    },
    aspectFeaturedRow: {
      flexDirection: 'row',
      gap: 10,
    },
    aspectGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    aspectChip: {
      minWidth: 72,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: 'rgba(8,10,15,0.55)',
      alignItems: 'center',
      gap: 8,
    },
    aspectChipFeatured: {
      flex: 1,
      minWidth: 120,
      paddingVertical: 14,
    },
    aspectChipActive: {
      borderColor: TOKENS.colors.accent,
      backgroundColor: 'rgba(186, 60, 71, 0.12)',
    },
    aspectIcon: {
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    aspectIconActive: {
      borderColor: TOKENS.colors.accent,
      backgroundColor: 'rgba(186, 60, 71, 0.25)',
    },
    aspectLabel: {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    aspectLabelActive: {
      color: TOKENS.colors.text,
    },
    negTitle: {
      marginTop: 8,
    },
    negInput: {
      minHeight: 96,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 20,
      backgroundColor: TOKENS.colors.inputBg,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
    },
  });
}
