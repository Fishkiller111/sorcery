import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { Ionicons } from '@expo/vector-icons';
import { useThemePage } from '../../src/theme/useThemePage';
import DefaultVipShop from '../../src/pages/default/VipShop';
import { ShellLayout } from '../../src/components/shell/ShellLayout';
import { PageBackground } from '../../src/components/ui/PageBackground';
import { VipSubscribePanel } from '../../src/components/vip/VipSubscribePanel';
import { VipFeatureTable } from '../../src/components/vip/VipFeatureTable';
import {
  DefaultVipProductTabs,
  type VipShopProduct,
} from '../../src/pages/default/components/DefaultVipProductTabs';
import { DefaultSoulPackPanel } from '../../src/pages/default/components/DefaultSoulPackPanel';
import { DefaultWelfarePackPanel } from '../../src/pages/default/components/DefaultWelfarePackPanel';
import { useI18n } from '../../src/i18n/I18nContext';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';
import { COLORS } from '../../src/theme/colors';
import { SIDEBAR_WIDTH } from '../../src/constants/layout';
import type { VipTier } from '../../src/utils/vipPlans';

const DESKTOP_CONTENT_MAX = 880;
/** Soul packs use Stripe/crypto only — hide that tab on iOS so App Review only sees IAP. */
const SHOW_SOUL_TAB = Platform.OS !== 'ios';

export default function VipShop() {
  const ThemedPage = useThemePage({ default: DefaultVipShop });
  if (ThemedPage) return <ThemedPage />;
  return <SovietVipShop />;
}

function SovietVipShop() {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const { width: windowWidth } = useWindowDimensions();
  const [shopProduct, setShopProduct] = useState<VipShopProduct>('vip');
  const [selectedTier, setSelectedTier] = useState<VipTier>('premium');
  const activeProduct: VipShopProduct = SHOW_SOUL_TAB ? shopProduct : 'vip';

  const contentWidth = useMemo(() => {
    if (isDesktop) {
      const frame = Math.min(Math.max(windowWidth - SIDEBAR_WIDTH - 80, 480), DESKTOP_CONTENT_MAX);
      return Math.max(frame - 40, 280);
    }
    return Math.max(windowWidth - 40, 280);
  }, [isDesktop, windowWidth]);

  return (
    <ShellLayout scrollable={false} showLangToggle={false}>
      <PageBackground variant="settings" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isDesktop && styles.contentDesktop,
          pageContentPadding,
          { maxWidth: contentWidth + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeGoBack('/')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('vip.shop.back')}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.agents.paleGoldMuted} />
        </TouchableOpacity>

        {SHOW_SOUL_TAB ? (
          <DefaultVipProductTabs
            value={shopProduct}
            onChange={setShopProduct}
            style={styles.productTabs}
          />
        ) : null}

        {activeProduct === 'vip' ? (
          <>
            <VipSubscribePanel
              contentWidth={contentWidth}
              isDesktop={isDesktop}
              active={activeProduct === 'vip'}
              onTierChange={setSelectedTier}
            />
            <View style={styles.tableSection}>
              <VipFeatureTable selectedTier={selectedTier} width={contentWidth} />
            </View>
          </>
        ) : activeProduct === 'welfare' ? (
          <DefaultWelfarePackPanel isDesktop={isDesktop} active />
        ) : (
          <DefaultSoulPackPanel isDesktop={isDesktop} active={activeProduct === 'soul'} />
        )}
      </ScrollView>
    </ShellLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#000000',
  },
  contentDesktop: {
    paddingTop: 24,
    paddingBottom: 48,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 4,
  },
  productTabs: {
    marginBottom: 16,
  },
  tableSection: {
    marginTop: 8,
    alignItems: 'center',
  },
});
