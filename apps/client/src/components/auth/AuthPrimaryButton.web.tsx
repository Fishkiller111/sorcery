import React from 'react';
import {
  Text,
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
  disabled,
  loading,
  style,
}: AuthPrimaryButtonProps) {
  const isDesktop = useIsDesktop();
  const isDisabled = disabled || loading;
  const buttonImage = isDesktop ? AUTH_ASSETS.primaryBtnDesktop : AUTH_ASSETS.primaryBtn;
  const flatStyle = StyleSheet.flatten([
    authSharedStyles.primaryBtn,
    style,
    isDisabled && authSharedStyles.primaryBtnDisabled,
  ]);

  return (
    <button type="submit" disabled={isDisabled} style={{ ...(flatStyle as React.CSSProperties), position: 'relative', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
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
    </button>
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
