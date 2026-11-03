import React, { useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { DefaultVipSubscribePanel } from './components/DefaultVipSubscribePanel';
import { DefaultVipFeatureTable } from './components/DefaultVipFeatureTable';
import { DefaultVipProductTabs, type VipShopProduct } from './components/DefaultVipProductTabs';
import { DefaultSoulPackPanel } from './components/DefaultSoulPackPanel';
import { DefaultWelfarePackPanel } from './components/DefaultWelfarePackPanel';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useI18n } from '../../i18n/I18nContext';
import type { VipTier } from '../../utils/vipPlans';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { safeGoBack } from '../../utils/safeGoBack';

/** Soul packs use Stripe/crypto only — hide that tab on iOS so App Review only sees IAP. */
const SHOW_SOUL_TAB = Platform.OS !== 'ios';

export default function DefaultVipShop() {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const [shopProduct, setShopProduct] = useState<VipShopProduct>('vip');
  const [selectedTier, setSelectedTier] = useState<VipTier>('premium');
  const activeProduct: VipShopProduct = SHOW_SOUL_TAB ? shopProduct : 'vip';

  return (
    <DefaultShell>
      <View style={[styles.content, isDesktop ? styles.contentDesktop : styles.contentMobile, pageContentPadding]}>
        <DefaultBackButton
          onPress={() => safeGoBack('/')}
          accessibilityLabel={t('vip.shop.back')}
        />
        {SHOW_SOUL_TAB ? (
          <DefaultVipProductTabs
            value={shopProduct}
            onChange={setShopProduct}
            style={styles.productTabs}
          />
        ) : null}
        {activeProduct === 'vip' ? (
          <>
            <DefaultVipSubscribePanel
              isDesktop={isDesktop}
              active={activeProduct === 'vip'}
              onTierChange={setSelectedTier}
            />
            <DefaultVipFeatureTable selectedTier={selectedTier} />
          </>
        ) : activeProduct === 'welfare' ? (
          <DefaultWelfarePackPanel isDesktop={isDesktop} active />
        ) : (
          <DefaultSoulPackPanel isDesktop={isDesktop} active={activeProduct === 'soul'} />
        )}
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: 20,
  },
  contentDesktop: {
    paddingTop: 24,
    paddingHorizontal: 40,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  contentMobile: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  productTabs: {
    marginBottom: 4,
  },
});
