import type { TextStyle } from 'react-native';

export type ModernTypoRole = 'display' | 'serif' | 'sans' | 'mono';

/** Modern 主题使用系统默认字体；role 保留供语义标注，不影响 fontFamily。 */
export function modernTypo(style: TextStyle, _role: ModernTypoRole = 'sans'): TextStyle {
  return style;
}

/** 与全局 typo() 同名，便于 Modern 页面 drop-in 替换 */
export const typo = modernTypo;
