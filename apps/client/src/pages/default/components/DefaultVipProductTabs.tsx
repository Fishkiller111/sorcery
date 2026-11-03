import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

export type VipShopProduct = 'vip' | 'welfare' | 'soul';

const PRODUCTS: VipShopProduct[] =
  Platform.OS === 'ios' ? ['vip'] : ['vip', 'welfare', 'soul'];

type DefaultVipProductTabsProps = {
  value: VipShopProduct;
  onChange: (value: VipShopProduct) => void;
  style?: StyleProp<ViewStyle>;
};

export function DefaultVipProductTabs({ value, onChange, style }: DefaultVipProductTabsProps) {
  const { t } = useI18n();

  return (
    <View style={[styles.tabs, style]}>
      {PRODUCTS.map((product) => {
        const active = value === product;
        return (
          <Pressable
            key={product}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(product)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {t(`vip.shop.product.${product}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(8, 10, 15, 0.72)',
    borderRadius: TOKENS.radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    alignSelf: 'center',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: TOKENS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  tabActive: {
    backgroundColor: TOKENS.colors.accent,
  },
  tabText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'mono',
  ),
  tabTextActive: {
    color: '#fff',
  },
});
