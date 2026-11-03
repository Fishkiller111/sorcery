import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Typo } from '../../theme/typography';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { AUTH_ASSETS, AUTH_OFF_WHITE, authSharedStyles } from './authTheme';

type AuthPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AuthPrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: AuthPrimaryButtonProps) {
  const isDesktop = useIsDesktop();
  const isDisabled = disabled || loading;
  const buttonImage = isDesktop ? AUTH_ASSETS.primaryBtnDesktop : AUTH_ASSETS.primaryBtn;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        authSharedStyles.primaryBtn,
        style,
        isDisabled && authSharedStyles.primaryBtnDisabled,
      ]}
    >
      <Image source={buttonImage} style={styles.buttonImage} resizeMode="stretch" />
      {loading ? (
        <ActivityIndicator size="small" color={AUTH_OFF_WHITE} style={styles.buttonContent} />
      ) : (
        <Text
          style={[styles.label, styles.buttonContent]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  buttonContent: {
    zIndex: 1,
  },
  label: Typo(
    {
      color: AUTH_OFF_WHITE,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display',
  ),
});
