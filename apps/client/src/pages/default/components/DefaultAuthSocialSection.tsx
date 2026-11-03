import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  APPLE_CLIENT_ID,
  GOOGLE_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  TELEGRAM_BOT_ID,
} from '../../../constants/config';
import { GoogleSignInButton } from '../../../components/auth/GoogleSignInButton';
import { AppleSignInButton } from '../../../components/auth/AppleSignInButton';
import { TelegramSignInButton } from '../../../components/auth/TelegramSignInButton';
import { DefaultAuthDivider } from './DefaultAuthDivider';
import { TOKENS } from '../theme/tokens';
import type { AppleAuthReq, TelegramWidgetAuthReq } from '../../../types/api';

type DefaultAuthSocialSectionProps = {
  dividerLabel: string;
  onGoogleCredential: (idToken: string) => void;
  onAppleCredential: (req: AppleAuthReq) => void;
  onAppleError?: (error: unknown) => void;
  onTelegramCredential?: (req: TelegramWidgetAuthReq) => void;
  onTelegramError?: (error: unknown) => void;
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

/** Telegram Login Widget is web-only for this product. */
function telegramEnabled(): boolean {
  return Platform.OS === 'web' && TELEGRAM_BOT_ID.length > 0;
}

export function DefaultAuthSocialSection({
  dividerLabel,
  onGoogleCredential,
  onAppleCredential,
  onAppleError,
  onTelegramCredential,
  onTelegramError,
  disabled,
}: DefaultAuthSocialSectionProps) {
  const showGoogle = googleEnabled();
  const showApple = appleEnabled();
  const showTelegram = telegramEnabled() && Boolean(onTelegramCredential);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [telegramReady, setTelegramReady] = useState(false);

  if (!showGoogle && !showApple && !showTelegram) return null;

  const anyReady =
    (showGoogle && googleReady) ||
    (showApple && appleReady) ||
    (showTelegram && telegramReady);

  return (
    <>
      {anyReady ? <DefaultAuthDivider label={dividerLabel} /> : null}
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
        {showTelegram && onTelegramCredential ? (
          <View style={[styles.ring, !telegramReady && styles.probe]}>
            <TelegramSignInButton
              onCredential={onTelegramCredential}
              onError={onTelegramError}
              disabled={disabled}
              onReadyChange={setTelegramReady}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 9, 13, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  probe: {
    opacity: 0,
    pointerEvents: 'none',
  },
});
