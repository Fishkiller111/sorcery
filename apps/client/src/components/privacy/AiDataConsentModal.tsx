import React, { useEffect } from 'react';
import { Linking, Pressable, Text, View, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { VIP_PRIVACY_URL } from '../vip/VipSubscriptionLegalLinks';
import { useAiDataConsentStore } from '../../stores/aiDataConsentStore';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { Typo } from '../../theme/typography';

const PRIVACY_URL = VIP_PRIVACY_URL;

/** First-run gate: disclose third-party AI data sharing before chat / voice / story. */
export function AiDataConsentModal() {
  const { t } = useI18n();
  const loaded = useAiDataConsentStore((s) => s.loaded);
  const visible = useAiDataConsentStore((s) => s.modalVisible);
  const hydrate = useAiDataConsentStore((s) => s.hydrate);
  const accept = useAiDataConsentStore((s) => s.accept);
  const decline = useAiDataConsentStore((s) => s.decline);

  useEffect(() => {
    if (!loaded) void hydrate();
  }, [hydrate, loaded]);

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="warning"
      title={t('aiDataConsent.title')}
      subtitle={t('aiDataConsent.subtitle')}
      subtitleTone="body"
      bodyMaxHeight={220}
      cancelLabel={t('aiDataConsent.notNow')}
      confirmLabel={t('aiDataConsent.agree')}
      hideConfirm={!PRIVACY_URL}
      onCancel={decline}
      onConfirm={() => {
        void accept();
      }}
      dismissOnBackdrop={false}
      bodyContent={
        <View style={styles.body}>
          <Text style={styles.bullet}>{t('aiDataConsent.what')}</Text>
          <Text style={styles.bullet}>{t('aiDataConsent.who')}</Text>
          <Text style={styles.bullet}>{t('aiDataConsent.example')}</Text>
          {PRIVACY_URL ? <Pressable
            accessibilityRole="link"
            onPress={() => {
              void Linking.openURL(PRIVACY_URL);
            }}
          >
            <Text style={styles.link}>{t('aiDataConsent.privacyLink')}</Text>
          </Pressable> : <Text style={styles.bullet}>{t('login.legalConfigMissing')}</Text>}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 8,
    paddingTop: 4,
  },
  bullet: Typo(
    {
      color: '#c8c2b8',
      fontSize: 12,
      lineHeight: 18,
    },
    'sans',
  ),
  link: Typo(
    {
      color: '#e8d5b5',
      fontSize: 12,
      textDecorationLine: 'underline',
      marginTop: 4,
    },
    'sans',
  ),
});
