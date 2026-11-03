import type { Lang } from '../../../../../i18n/types';
import { StyleSheet, Platform } from 'react-native';
import { Typo } from '../../../../../theme/typography';
import { TOKENS } from '../../../theme/tokens';
import { glassWebStyle } from '../../../../../components/free-chat/freeChatUi';

/** 生图 / 生视频共用的预设槽位与浏览器样式 */
export function createCreationCenterPresetStyles(lang: Lang) {
  return StyleSheet.create({
    desktopSplit: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 20,
    },
    mobileStack: {
      gap: 16,
    },
    controlPanel: {
      gap: 14,
    },
    controlPanelDesktop: {
      width: 320,
      flexShrink: 0,
      padding: 16,
      borderRadius: TOKENS.radius.cardLg,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: TOKENS.colors.card,
      ...glassWebStyle,
    },
    browserPane: {
      flex: 1,
      minWidth: 0,
      padding: 16,
      borderRadius: TOKENS.radius.cardLg,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: 'rgba(8, 10, 15, 0.45)',
      minHeight: 420,
    },
    browserPaneMobile: {
      paddingTop: 4,
    },
    presetsHeading: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.4,
      },
      'sans',
      lang,
    ),
    slotGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    slotRowMobile: {
      flexDirection: 'row',
      gap: 10,
      paddingRight: 8,
    },
    slotCardSize: {
      width: '48%',
      aspectRatio: 9 / 16,
    },
    slotCardCompact: {
      width: 112,
      aspectRatio: 9 / 16,
    },
    slotCard: {
      width: '100%',
      height: '100%',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: TOKENS.colors.cardSolid,
      overflow: 'hidden',
      position: 'relative',
    },
    slotCardActive: {
      borderColor: 'rgba(186, 60, 71, 0.35)',
    },
    slotImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    slotFallback: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#141820',
    },
    slotIconBadge: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    slotIconBadgeActive: {
      backgroundColor: 'rgba(186, 60, 71, 0.14)',
      borderColor: 'rgba(186, 60, 71, 0.35)',
    },
    slotLabelBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    slotLabel: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    slotClear: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    slotClearText: {
      color: '#fff',
      fontSize: 14,
      lineHeight: 16,
      fontWeight: '700',
    },
    slotEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      gap: 2,
    },
    slotEmptyLabel: {
      color: TOKENS.colors.text,
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    slotEmptyHint: {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      textAlign: 'center',
    },
    browserSection: {
      gap: 12,
    },
    browserTitle: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 18,
        fontWeight: '700',
      },
      'sans',
      lang,
    ),
    browserHint: {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: -4,
    },
    uploadCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: TOKENS.colors.cardBorder,
      paddingVertical: 18,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(8,10,15,0.4)',
      overflow: 'hidden',
    },
    uploadCardFilled: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    cardPressed: {
      opacity: 0.88,
    },
    uploadPreviewFrame: {
      width: 96,
      aspectRatio: 9 / 16,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.04)',
      flexShrink: 0,
    },
    uploadPreview: {
      width: '100%',
      height: '100%',
    },
    uploadPreviewMeta: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
      gap: 4,
    },
    uploadEmoji: {
      color: TOKENS.colors.accent,
      fontSize: 22,
      fontWeight: '700',
    },
    uploadText: {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    uploadSub: {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
    },
    uploadSubFilled: {
      textAlign: 'left',
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      width: '100%',
    },
    presetTile: {
      aspectRatio: 9 / 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: TOKENS.colors.cardBorderFaint,
      overflow: 'hidden',
      backgroundColor: TOKENS.colors.cardSolid,
      position: 'relative',
      // 高度主要由 tileWidthStyle 的数值 height 保证（iOS flexWrap 下 aspectRatio 易塌）
    },
    presetTileSymbol: {
      backgroundColor: '#161a24',
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetTileTextOnly: {
      backgroundColor: '#161a24',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 12,
      gap: 6,
    },
    presetTileTextLabel: {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 18,
    },
    presetTileActive: {
      borderColor: TOKENS.colors.accent,
    },
    presetTileImage: {
      ...StyleSheet.absoluteFill,
    },
    presetSymbol: {
      fontSize: 40,
      marginBottom: 28,
    },
    presetTileLabelBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    presetTileLabel: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    customBlock: {
      gap: 8,
    },
    customHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    customHeading: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 14,
        fontWeight: '700',
      },
      'sans',
      lang,
    ),
    customInput: {
      minHeight: 88,
      borderRadius: TOKENS.radius.card,
      borderWidth: 1,
      borderColor: TOKENS.colors.inputBorder,
      backgroundColor: TOKENS.colors.inputBg,
      color: TOKENS.colors.text,
      fontSize: 13,
      lineHeight: 19,
      paddingHorizontal: 12,
      paddingVertical: 10,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
    },
    generateBtn: {
      borderRadius: 14,
      paddingVertical: 16,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: TOKENS.colors.accent,
      borderWidth: 1,
      borderColor: TOKENS.colors.inviteBannerBorder,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
    },
    generateBtnDisabled: {
      opacity: 0.45,
    },
    generateBtnPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.99 }],
    },
    generateBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    generateBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    asyncHint: {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}

export type CreationCenterPresetStyles = ReturnType<typeof createCreationCenterPresetStyles>;
