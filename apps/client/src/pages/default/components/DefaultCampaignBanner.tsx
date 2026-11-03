import React, { useState } from 'react';
import {
  Image as RNImage,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { resolveStaticUrl } from '../../../constants/config';
import { Typo } from '../../../theme/typography';
import { useI18n } from '../../../i18n/I18nContext';
import { TOKENS } from '../theme/tokens';
import { COVER_IMAGE_FILL } from '../../../theme/absoluteFill';

export type HomeBannerSlide = {
  key: string;
  name: string;
  banner_url?: string;
  onPress: () => void;
};

type DefaultCampaignBannerProps = {
  slides: HomeBannerSlide[];
};

/**
 * Home 分类条下方的活动 Banner 轮播。
 * 合并多个活动/造角赛等数据源；仅展示有 banner 图的条目。
 */
export function DefaultCampaignBanner({ slides }: DefaultCampaignBannerProps) {
  const { t, lang } = useI18n();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedKeys, setFailedKeys] = useState<Record<string, true>>({});

  const visible = slides.filter((item) => Boolean(String(item.banner_url || '').trim()));
  if (visible.length === 0) return null;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(idx, visible.length - 1)));
  };

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled={visible.length > 1}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
      >
        {visible.map((item) => {
          const uri = resolveStaticUrl(item.banner_url);
          const failed = Boolean(failedKeys[item.key]);
          return (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.card,
                width > 0 ? { width } : null,
                pressed && styles.cardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.name || t('campaign.bannerA11y')}
            >
              {uri && !failed ? (
                Platform.OS === 'web' ? (
                  <ExpoImage
                    source={{ uri }}
                    style={styles.image}
                    contentFit="cover"
                    recyclingKey={item.key}
                    transition={0}
                    onError={() => setFailedKeys((prev) => ({ ...prev, [item.key]: true }))}
                  />
                ) : (
                  <RNImage
                    source={{ uri }}
                    style={styles.image}
                    resizeMode="cover"
                    onError={() => setFailedKeys((prev) => ({ ...prev, [item.key]: true }))}
                  />
                )
              ) : (
                <View style={styles.image} />
              )}
              <View style={styles.overlay}>
                <Text style={Typo(styles.title, 'serif', lang)} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {visible.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {visible.map((item, index) => (
            <View
              key={item.key}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  card: {
    minWidth: 280,
    aspectRatio: 3.4,
    borderRadius: TOKENS.radius.cardLg,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.cardSolid,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    position: 'relative',
  },
  cardPressed: {
    opacity: 0.92,
  },
  image: {
    ...COVER_IMAGE_FILL,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(8, 10, 15, 0.38)',
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 14,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.cardBorderFaint,
    opacity: 0.7,
  },
  dotActive: {
    width: 16,
    backgroundColor: TOKENS.colors.accent,
    opacity: 1,
  },
});
