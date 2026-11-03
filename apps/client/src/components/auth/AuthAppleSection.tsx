import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { AppleAuthReq } from '../../types/api';
import { APPLE_CLIENT_ID } from '../../constants/config';
import { AppleSignInButton } from './AppleSignInButton';
import { AuthSocialDivider } from './AuthSocialDivider';

type AuthAppleSectionProps = {
  label: string;
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

export function AuthAppleSection({
  label,
  onCredential,
  onError,
  disabled,
  hideDivider,
}: AuthAppleSectionProps) {
  const [ready, setReady] = useState(false);

  if (!appleSectionEnabled()) return null;

  return (
    <>
      {ready && !hideDivider ? <AuthSocialDivider label={label} /> : null}
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
