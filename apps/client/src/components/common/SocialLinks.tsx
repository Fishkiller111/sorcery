import React, { useCallback } from 'react';
import {
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  Text,
} from 'react-native';
import { SOCIAL_LINKS, SocialLink, SocialPlatform } from '../../constants/social';
import { useI18n } from '../../i18n/I18nContext';

const SOCIAL_LABEL_KEYS: Record<SocialPlatform, string> = {
  x: 'social.xLabel',
  telegram: 'social.telegramLabel',
};

/** 中性文本图标，不分发 X / Telegram 品牌图形。 */
function SocialPlatformIcon({ size, color }: { platform: SocialPlatform; size: number; color: string }) {
  return <Text style={{ width: size, height: size, color, fontSize: size * 0.8, textAlign: 'center' }}>↗</Text>;
}

type SocialLinksProps = {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function SocialLinks({
  size = 22,
  color = 'rgba(216, 208, 192, 0.42)',
  style,
}: SocialLinksProps) {
  const { t } = useI18n();
  const openLink = useCallback(async (link: SocialLink) => {
    const supported = await Linking.canOpenURL(link.url);
    if (supported) {
      await Linking.openURL(link.url);
    }
  }, []);

  return (
    <View style={[styles.row, style]}>
      {SOCIAL_LINKS.map((link) => (
        <Pressable
          key={link.platform}
          onPress={() => openLink(link)}
          accessibilityRole="link"
          accessibilityLabel={t(SOCIAL_LABEL_KEYS[link.platform])}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <SocialPlatformIcon platform={link.platform} size={size} color={color} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    padding: 6,
    borderRadius: 4,
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
