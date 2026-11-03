import React, { useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../../../constants/config';
import { GoogleSignInButton } from '../../../components/auth/GoogleSignInButton';
import { DefaultAuthDivider } from './DefaultAuthDivider';
import { TOKENS } from '../theme/tokens';

type DefaultAuthGoogleSectionProps = {
  dividerLabel: string;
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

function googleEnabled(): boolean {
  if (!GOOGLE_CLIENT_ID) return false;
  if (Platform.OS === 'ios') return GOOGLE_IOS_CLIENT_ID.length > 0;
  return true;
}

export function DefaultAuthGoogleSection({
  dividerLabel,
  onCredential,
  disabled,
}: DefaultAuthGoogleSectionProps) {
  const [ready, setReady] = useState(false);

  if (!googleEnabled()) return null;

  return (
    <>
      {ready ? <DefaultAuthDivider label={dividerLabel} /> : null}
      <View style={[styles.ring, !ready && styles.probe]}>
        <GoogleSignInButton
          onCredential={onCredential}
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
