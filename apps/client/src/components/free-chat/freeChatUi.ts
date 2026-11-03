import { Platform } from 'react-native';

/** Visual variant for Free Chat surfaces (layout shared; tokens differ). */
export type FreeChatUiVariant = 'soviet' | 'default';

export const glassWebStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      } as object)
    : {};
