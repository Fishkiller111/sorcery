import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { AppleAuthReq } from '../../../types/api';
import { APPLE_CLIENT_ID } from '../../../constants/config';
import { AppleSignInButton } from '../../../components/auth/AppleSignInButton';
import { DefaultAuthDivider } from './DefaultAuthDivider';
import { TOKENS } from '../theme/tokens';

type DefaultAuthAppleSectionProps = {
  dividerLabel: string;
  onCredential: (req: AppleAuthReq) => void;
  onError?: (error: unknown) => void;
  disabled?: boolean;
  hideDivider?: boolean;
};

function appleSectionEnabled(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS === 'web') return APPLE_CLIENT_ID.length > 0;
  return false;
}

export function DefaultAuthAppleSection({
  dividerLabel,
  onCredential,
  onError,
  disabled,
  hideDivider,
}: DefaultAuthAppleSectionProps) {
  const [ready, setReady] = useState(false);

  if (!appleSectionEnabled()) return null;

  return (
    <>
      {ready && !hideDivider ? <DefaultAuthDivider label={dividerLabel} /> : null}
      <View style={[styles.ring, !ready && styles.probe]}>
        <AppleSignInButton
          onCredential={onCredential}
          onError={onError}
          disabled={disabled}
          onReadyChange={setReady}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 9, 13, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    marginTop: 12,
  },
  probe: {
    position: 'absolute',
    width: 56,
    height: 56,
    opacity: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
});
