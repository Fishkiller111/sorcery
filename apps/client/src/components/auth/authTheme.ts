import { Platform, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';

export const AUTH_RED = '#c43e3e';
export const AUTH_LABEL = '#8a8278';
export const AUTH_GOLD = '#c9a86c';
export const AUTH_OFF_WHITE = '#d1cec7';

export const AUTH_ASSETS = {
  emblem: require('../../../assets/images/ui/mode-select/pc-emblem_cccp_medal.png'),
  formPanelBg: require('../../../assets/images/ui/login/form_panel_bg.png'),
  primaryBtn: require('../../../assets/images/ui/mode-select/red_button.png'),
  primaryBtnDesktop: require('../../../assets/images/ui/mode-select/pc-red_button.png'),
} as const;

export const authSharedStyles = StyleSheet.create({
  inputShell: {
    width: '100%',
    minHeight: 44,
    backgroundColor: 'rgba(8, 9, 12, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(90, 82, 72, 0.55)',
    borderRadius: 4,
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: 13,
    paddingVertical: 10,
    paddingHorizontal: 4,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          borderWidth: 0,
          backgroundColor: 'transparent',
        } as object)
      : {}),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingRight: 12,
  },
  iconSlot: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  sendCodeBtn: {
    minHeight: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.agents.tabActive,
    borderWidth: 1,
    borderColor: 'rgba(196, 62, 62, 0.65)',
  },
});

export const authInputShellStyles = StyleSheet.create({
  transition:
    Platform.OS === 'web'
      ? ({
          transitionProperty: 'border-color, box-shadow',
          transitionDuration: '200ms',
          transitionTimingFunction: 'ease',
        } as object)
      : {},
  focused: {
    borderColor: 'rgba(201, 168, 108, 0.75)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 0 1px rgba(201, 168, 108, 0.3)',
        } as object)
      : {}),
  },
});
