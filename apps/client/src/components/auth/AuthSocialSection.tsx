import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, APPLE_CLIENT_ID } from '../../constants/config';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AppleSignInButton } from './AppleSignInButton';
import { AuthSocialDivider } from './AuthSocialDivider';
import type { AppleAuthReq } from '../../types/api';

type AuthSocialSectionProps = {
  label: string;
  onGoogleCredential: (idToken: string) => void;
  onAppleCredential: (req: AppleAuthReq) => void;
  onAppleError?: (error: unknown) => void;
  disabled?: boolean;
};

function appleEnabled(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS === 'web') return APPLE_CLIENT_ID.length > 0;
  return false;
}

function googleEnabled(): boolean {
  if (!GOOGLE_CLIENT_ID) return false;
  if (Platform.OS === 'ios') return GOOGLE_IOS_CLIENT_ID.length > 0;
  return true;
}

export function AuthSocialSection({
  label,
  onGoogleCredential,
  onAppleCredential,
  onAppleError,
  disabled,
}: AuthSocialSectionProps) {
  const showGoogle = googleEnabled();
  const showApple = appleEnabled();
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  if (!showGoogle && !showApple) return null;

  const anyReady = (showGoogle && googleReady) || (showApple && appleReady);

  return (
    <>
      {anyReady ? <AuthSocialDivider label={label} /> : null}
      <View style={styles.row}>
        {showGoogle ? (
          <View style={[styles.ring, !googleReady && styles.probe]}>
            <GoogleSignInButton
              onCredential={onGoogleCredential}
              disabled={disabled}
              onReadyChange={setGoogleReady}
            />
          </View>
        ) : null}
        {showApple ? (
          <View style={[styles.ring, !appleReady && styles.probe]}>
            <AppleSignInButton
              onCredential={onAppleCredential}
              onError={onAppleError}
              disabled={disabled}
              onReadyChange={setAppleReady}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    alignSelf: 'center',
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(90, 82, 72, 0.65)',
    backgroundColor: 'rgba(8, 9, 12, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  probe: {
    opacity: 0,
    pointerEvents: 'none',
  },
});
