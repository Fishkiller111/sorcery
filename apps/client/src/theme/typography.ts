import type { TextStyle } from 'react-native';
import type { Lang } from '../i18n/types';

/** Loaded via expo-font in app/_layout.tsx */
export const FONT_FAMILY = {
  display: 'BebasNeue_400Regular',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
  serif: 'CormorantGaramond_500Medium',
  serifSemiBold: 'CormorantGaramond_600SemiBold',
} as const;

export const TYPO = {
  display: { fontFamily: FONT_FAMILY.display } satisfies TextStyle,
  sans: { fontFamily: FONT_FAMILY.sans } satisfies TextStyle,
  sansMedium: { fontFamily: FONT_FAMILY.sansMedium } satisfies TextStyle,
  sansSemiBold: { fontFamily: FONT_FAMILY.sansSemiBold } satisfies TextStyle,
  sansBold: { fontFamily: FONT_FAMILY.sansBold } satisfies TextStyle,
  mono: { fontFamily: FONT_FAMILY.mono } satisfies TextStyle,
  monoBold: { fontFamily: FONT_FAMILY.monoBold } satisfies TextStyle,
  serif: { fontFamily: FONT_FAMILY.serif } satisfies TextStyle,
  serifSemiBold: { fontFamily: FONT_FAMILY.serifSemiBold } satisfies TextStyle,
};

function sansFromWeight(weight?: TextStyle['fontWeight']): TextStyle {
  switch (weight) {
    case '700':
    case '800':
    case '900':
    case 'bold':
      return TYPO.sansBold;
    case '600':
      return TYPO.sansSemiBold;
    case '500':
      return TYPO.sansMedium;
    default:
      return TYPO.sans;
  }
}

function monoFromWeight(weight?: TextStyle['fontWeight']): TextStyle {
  switch (weight) {
    case '700':
    case '800':
    case '900':
    case 'bold':
      return TYPO.monoBold;
    default:
      return TYPO.mono;
  }
}

export type TypoRole = 'display' | 'sans' | 'mono' | 'serif';

/**
 * Merge a text style with the correct font face (strips fontWeight for named faces).
 * @param lang 传入且为 `zh` 时：role 为 `display` 改用系统默认字体（不设置 fontFamily）
 */
export function Typo(style: TextStyle, role: TypoRole = 'sans', lang?: Lang): TextStyle {
  const { fontWeight: _fw, ...rest } = style;

  if (role === 'display' && lang === 'zh') {
    return { ...rest };
  }

  const face =
    role === 'display'
      ? TYPO.display
      : role === 'mono'
        ? monoFromWeight(style.fontWeight)
        : role === 'serif'
          ? style.fontWeight === '600' || style.fontWeight === 'bold'
            ? TYPO.serifSemiBold
            : TYPO.serif
          : sansFromWeight(style.fontWeight);
  return { ...face, ...rest };
}
