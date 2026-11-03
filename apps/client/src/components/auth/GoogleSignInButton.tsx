import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../../constants/config';
import { isExpoGo } from '../../utils/isExpoGo';

type Props = {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
};

type GoogleNative = typeof import('@react-native-google-signin/google-signin');

let configured = false;
let googleNative: GoogleNative | null = null;

function loadGoogleNative(): GoogleNative | null {
  if (isExpoGo()) return null;
  if (googleNative) return googleNative;
  try {
    // Lazy require — module is not available inside Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleNative = require('@react-native-google-signin/google-signin') as GoogleNative;
    return googleNative;
  } catch {
    return null;
  }
}

function ensureConfigured(): boolean {
  if (!GOOGLE_CLIENT_ID) return false;
  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) return false;
  const sdk = loadGoogleNative();
  if (!sdk) return false;
  if (configured) return true;
  sdk.GoogleSignin.configure({
    webClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
  });
  configured = true;
  return true;
}

/** Native iOS/Android Google Sign-In. Web uses GoogleSignInButton.web.tsx. Hidden in Expo Go. */
export function GoogleSignInButton({ onCredential, disabled, onReadyChange }: Props) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = ensureConfigured();
    setAvailable(ok);
    onReadyChange?.(ok);
  }, [onReadyChange]);

  if (!available) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      disabled={disabled || busy}
      onPress={async () => {
        if (disabled || busy) return;
        const sdk = loadGoogleNative();
        if (!sdk) return;
        setBusy(true);
        try {
          if (Platform.OS === 'android') {
            await sdk.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          }
          const response = await sdk.GoogleSignin.signIn();
          if (!sdk.isSuccessResponse(response)) return;
          let idToken = response.data.idToken;
          if (!idToken) {
            const tokens = await sdk.GoogleSignin.getTokens();
            idToken = tokens.idToken;
          }
          if (!idToken) {
            console.error('[GoogleSignIn] sign-in succeeded but idToken is missing');
            return;
          }
          onCredential(idToken);
        } catch (e: unknown) {
          if (sdk.isErrorWithCode(e) && e.code === sdk.statusCodes.SIGN_IN_CANCELLED) return;
          console.error('[GoogleSignIn] native sign-in failed:', e);
        } finally {
          setBusy(false);
        }
      }}
      style={({ pressed }) => [
        styles.hit,
        (disabled || busy) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#E8EAED" />
      ) : (
        <Ionicons name="logo-google" size={26} color="#E8EAED" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
