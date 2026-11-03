import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { AppleAuthReq } from '../../types/api';

type Props = {
  onCredential: (req: AppleAuthReq) => void | Promise<void>;
  disabled?: boolean;
  onReadyChange?: (ready: boolean) => void;
  onError?: (error: unknown) => void;
};

/** Native iOS: Sign in with Apple. Web / Android: no-op (see .web stub). */
export function AppleSignInButton({ onCredential, disabled, onReadyChange, onError }: Props) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS !== 'ios') {
      onReadyChange?.(false);
      return;
    }
    void AppleAuthentication.isAvailableAsync().then((ok) => {
      if (cancelled) return;
      setAvailable(ok);
      onReadyChange?.(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [onReadyChange]);

  if (!available) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
      disabled={disabled || busy}
      onPress={async () => {
        if (disabled || busy) return;
        setBusy(true);
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          if (!credential.identityToken) {
            onError?.(new Error('Apple Sign In did not return an identity token'));
            return;
          }
          const req: AppleAuthReq = {
            identity_token: credential.identityToken,
            authorization_code: credential.authorizationCode ?? undefined,
          };
          if (credential.fullName || credential.email) {
            req.user = {
              email: credential.email ?? undefined,
              name: credential.fullName
                ? {
                    firstName: credential.fullName.givenName ?? undefined,
                    lastName: credential.fullName.familyName ?? undefined,
                  }
                : undefined,
            };
          }
          await onCredential(req);
        } catch (e: unknown) {
          const code =
            e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
          if (code === 'ERR_REQUEST_CANCELED') return;
          onError?.(e);
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
      <View style={styles.inner}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="logo-apple" size={28} color="#fff" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
  },
});
