import React, { useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../../constants/config';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AuthSocialDivider } from './AuthSocialDivider';

type AuthGoogleSectionProps = {
  label: string;
  onCredential: (idToken: string) => void;
  disabled?: boolean;
};

function googleEnabled(): boolean {
  if (!GOOGLE_CLIENT_ID) return false;
  if (Platform.OS === 'ios') return GOOGLE_IOS_CLIENT_ID.length > 0;
  return true;
}

export function AuthGoogleSection({ label, onCredential, disabled }: AuthGoogleSectionProps) {
  const [ready, setReady] = useState(false);

  if (!googleEnabled()) return null;

  return (
    <>
      {ready ? <AuthSocialDivider label={label} /> : null}
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
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(90, 82, 72, 0.65)',
    backgroundColor: 'rgba(8, 9, 12, 0.75)',
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
