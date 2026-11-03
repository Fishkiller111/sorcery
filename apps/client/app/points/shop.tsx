import type { Lang } from '../../src/i18n/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { useThemePage } from '../../src/theme/useThemePage';
import DefaultPointsShop from '../../src/pages/default/PointsShop';
import { ShellLayout } from '../../src/components/shell/ShellLayout';
import { PageBackground } from '../../src/components/ui/PageBackground';
import { DividerStar } from '../../src/components/ui/DividerStar';
import { useI18n } from '../../src/i18n/I18nContext';
import { useIsDesktop } from '../../src/hooks/useIsDesktop';
import { SIDEBAR_WIDTH } from '../../src/constants/layout';
import { COLORS } from '../../src/theme/colors';
import { Typo } from '../../src/theme/typography';
import { notifyError, notifySuccess, notifyWarning } from '../../src/utils/notify';
import {
  consumePoints,
  getPointsBalance,
  getPointsCatalog,
  getPointsUnlocks,
} from '../../src/api/points';
import type { PointsCatalogItem, PointsUnlockItem } from '../../src/types/api';
import { formatApiError } from '../../src/utils/roleForm';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';
import { resolveStaticUrl } from '../../src/constants/config';

const RED_BUTTON_ASPECT = 990 / 175;
const RED_BUTTON = require('../../assets/images/ui/mode-select/pc-red_button.png');
const RED_BUTTON_MOBILE = require('../../assets/images/ui/mode-select/red_button.png');
const EMBLEM_CCCP = require('../../assets/images/ui/mode-select/pc-emblem_cccp_medal.png');
const EMBLEM_STAR_LAUREL = require('../../assets/images/ui/home/emblem_star_laurel.png');
const LOGO = require('../../assets/images/ui/shell/sidebar_logo_stack.png');

const ACCENT_GOLD = COLORS.agents.paleGold;
const RED_ACCENT = '#9e1b1b';
const PARCHMENT = '#d8d0c0';
const PARCHMENT_MUTED = '#a89f8d';
const PANEL_BORDER = 'rgba(232, 213, 181, 0.32)';
const PANEL_BG = 'rgba(12, 12, 14, 0.94)';
const DESKTOP_CONTENT_MAX = 560;

const PANEL_CLIP_WEB = Platform.OS === 'web'
  ? ({
      clipPath:
        'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%, 0 14px)',
    } as object)
  : {};

const PANEL_SHADOW_WEB = Platform.OS === 'web'
  ? ({
      boxShadow:
        'inset 0 1px 0 rgba(232, 213, 181, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.35)',
    } as object)
  : {};

function redButtonSource(isDesktop: boolean) {
  return isDesktop ? RED_BUTTON : RED_BUTTON_MOBILE;
}

function categoryLabel(t: (k: string) => string, category: string): string {
  switch (category) {
    case 'story_item':
      return t('pointsShop.categoryStoryItem');
    case 'story_unlock':
      return t('pointsShop.categoryStoryUnlock');
    default:
      return t('pointsShop.categoryOther');
  }
}

function categoryIonicon(category: string): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'story_unlock':
      return 'book-outline';
    case 'story_item':
      return 'help-circle-outline';
    default:
      return 'gift-outline';
  }
}

type ItemCategoryIconProps = {
  category: string;
  imageUrl?: string;
  size: number;
  styles: ReturnType<typeof createStyles>;
};

function ItemCategoryIcon({ category, imageUrl, size, styles }: ItemCategoryIconProps) {
  const iconSize = Math.round(size * 0.46);
  const uri = imageUrl ? resolveStaticUrl(imageUrl) : undefined;
  return (
    <View style={[styles.itemIconWrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Ionicons name={categoryIonicon(category)} size={iconSize} color={ACCENT_GOLD} />
      )}
    </View>
  );
}

type SectionPlateProps = {
  label: string;
  width: number;
  isDesktop: boolean;
  styles: ReturnType<typeof createStyles>;
};

function SectionPlate({ label, width, isDesktop, styles }: SectionPlateProps) {
  const height = Math.max(30, Math.round(width * 0.085));
  return (
    <View style={[styles.sectionPlate, { width, minHeight: height }]}>
      <Image source={redButtonSource(isDesktop)} style={styles.redBtnImage} resizeMode="stretch" />
      <Text style={styles.sectionPlateText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

type RedButtonProps = {
  label: string;
  width: number;
  isDesktop: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  styles: ReturnType<typeof createStyles>;
};

function RedButton({ label, width, isDesktop, onPress, disabled, loading, styles }: RedButtonProps) {
  const height = Math.max(34, Math.round(width / RED_BUTTON_ASPECT));
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.redBtnWrap,
        { width, height },
        disabled && styles.redBtnDisabled,
      ]}
    >
      <Image source={redButtonSource(isDesktop)} style={styles.redBtnImage} resizeMode="stretch" />
      {loading ? (
        <ActivityIndicator color={PARCHMENT} size="small" />
      ) : (
        <Text style={styles.redBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function PointsShopScreen() {
  const ThemedPage = useThemePage({ default: DefaultPointsShop });
  if (ThemedPage) return <ThemedPage />;
  return <SovietPointsShop />;
}

function SovietPointsShop() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const { width: windowWidth } = useWindowDimensions();
  const [balance, setBalance] = useState(0);
  const [catalog, setCatalog] = useState<PointsCatalogItem[]>([]);
  const [unlocks, setUnlocks] = useState<PointsUnlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const layout = useMemo(() => {
    const contentWidth = isDesktop
      ? Math.min(DESKTOP_CONTENT_MAX, Math.max(windowWidth - SIDEBAR_WIDTH - 96, 400))
      : Math.min(Math.max(windowWidth - 32, 280), 520);
    const balanceHeight = Math.round(contentWidth * 0.19);
    const redeemBtnWidth = Math.round(contentWidth * 0.2);
    const redeemBtnHeight = Math.max(34, Math.round(redeemBtnWidth / RED_BUTTON_ASPECT));
    const backBtnWidth = Math.round(contentWidth * 0.22);
    const backBtnHeight = Math.max(32, Math.round(backBtnWidth / RED_BUTTON_ASPECT));
    const itemRowHeight = Math.round(contentWidth * 0.19);
    const medalSize = Math.round(itemRowHeight * 0.62);
    const sectionPlateWidth = Math.round(contentWidth * 0.34);
    const logoWidth = Math.round(contentWidth * 0.22);
    const logoHeight = Math.round(logoWidth * 1.15);
    const emptyBoxHeight = Math.round(contentWidth * 0.38);
    const footerEmblemWidth = Math.round(contentWidth * 0.2);
    const balanceValueSize = isDesktop ? 42 : 36;

    return {
      contentWidth,
      balanceHeight,
      redeemBtnWidth,
      redeemBtnHeight,
      backBtnWidth,
      backBtnHeight,
      itemRowHeight,
      medalSize,
      sectionPlateWidth,
      logoWidth,
      logoHeight,
      emptyBoxHeight,
      footerEmblemWidth,
      footerEmblemHeight: Math.round(footerEmblemWidth * 0.39),
      balanceValueSize,
    };
  }, [isDesktop, windowWidth]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [balanceResp, catalogResp, unlockResp] = await Promise.all([
        getPointsBalance(),
        getPointsCatalog(),
        getPointsUnlocks(),
      ]);
      setBalance(balanceResp.points);
      setCatalog(catalogResp.items);
      setUnlocks(unlockResp.items);
    } catch (e) {
      notifyError(formatApiError(t, e));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRedeem = async (item: PointsCatalogItem) => {
    if (item.owned) {
      notifyWarning(t('pointsShop.alreadyOwned'));
      return;
    }
    if (balance < item.cost_points) {
      notifyWarning(t('pointsShop.insufficient'));
      return;
    }
    setRedeeming(item.id);
    try {
      const resp = await consumePoints({ catalog_id: item.id });
      setBalance(resp.balance_after);
      notifySuccess(resp.already_owned ? t('pointsShop.alreadyOwned') : t('pointsShop.redeemed'));
      await load();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <ShellLayout scrollable showLangToggle={false}>
      <View style={[styles.page, isDesktop && styles.pageDesktop]}>
        {isDesktop ? <PageBackground variant="settings" /> : null}

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { width: layout.contentWidth }, pageContentPadding]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => safeGoBack('/profile')}
              activeOpacity={0.85}
              style={[
                styles.backBtnWrap,
                { width: layout.backBtnWidth, height: layout.backBtnHeight },
              ]}
            >
              <Image
                source={redButtonSource(isDesktop)}
                style={styles.redBtnImage}
                resizeMode="stretch"
              />
              <Text style={styles.backBtnText}>‹ {t('pointsShop.back')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.titleBlock}>
              <View style={styles.titleRow}>
                <DividerStar color={RED_ACCENT} size={14} />
                <Text style={styles.title}>{t('pointsShop.title')}</Text>
              </View>
              <Text style={styles.subtitle}>{t('pointsShop.subtitle')}</Text>
              <TouchableOpacity onPress={() => router.push('/referral')} activeOpacity={0.8}>
                <Text style={Typo(styles.inviteLink, 'sans', lang)}>{t('pointsShop.inviteLink')} ›</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={LOGO}
              style={{ width: layout.logoWidth, height: layout.logoHeight }}
              resizeMode="contain"
            />
          </View>

          <View
            style={[
              styles.panelFrame,
              styles.balanceCard,
              { width: layout.contentWidth, minHeight: layout.balanceHeight },
            ]}
          >
            <Image
              source={EMBLEM_CCCP}
              style={styles.balanceEmblem}
              resizeMode="contain"
            />
            <View style={styles.balanceInner}>
              <Text style={styles.balanceLabel}>{t('pointsShop.balance')}</Text>
              <View style={styles.balanceValueRow}>
                <Text style={[Typo(styles.balanceValue, 'display', lang), { fontSize: layout.balanceValueSize }]}>
                  {balance}
                </Text>
                <Text style={Typo(styles.balancePts, 'display', lang)}>{t('pointsShop.ptsLabel')}</Text>
              </View>
              <Text style={Typo(styles.notWithdrawableHint, 'sans', lang)}>
                {t('pointsShop.notWithdrawableBadge')} · {t('pointsShop.purchasedNotWithdrawable')}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={ACCENT_GOLD} style={styles.loader} />
          ) : loadFailed ? (
            <View style={styles.errorBox}>
              <TouchableOpacity onPress={() => void load()} activeOpacity={0.85}>
                <RedButton
                  label={t('referral.retry')}
                  width={layout.redeemBtnWidth}
                  isDesktop={isDesktop}
                  styles={styles}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <SectionPlate
                  label={t('pointsShop.title')}
                  width={layout.sectionPlateWidth}
                  isDesktop={isDesktop}
                  styles={styles}
                />
                <View style={[styles.panelFrame, styles.sectionBox, { width: layout.contentWidth }]}>
                  {catalog.length === 0 ? (
                    <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('pointsShop.empty')}</Text>
                  ) : (
                    catalog.map((item, index) => (
                      <View
                        key={item.id}
                        style={[
                          styles.itemRow,
                          { minHeight: layout.itemRowHeight },
                          index < catalog.length - 1 && styles.itemRowDivider,
                        ]}
                      >
                        <ItemCategoryIcon
                          category={item.category}
                          imageUrl={item.image_url}
                          size={layout.medalSize}
                          styles={styles}
                        />
                        <View style={styles.itemMain}>
                          <Text style={Typo(styles.itemName, 'sans', lang)} numberOfLines={2}>{item.name}</Text>
                          <Text style={Typo(styles.itemMeta, 'mono', lang)}>
                            {categoryLabel(t, item.category)} · {item.cost_points}{' '}
                            {t('referral.pointsUnit')}
                          </Text>
                          {item.description ? (
                            <Text style={Typo(styles.itemDesc, 'sans', lang)} numberOfLines={3}>{item.description}</Text>
                          ) : null}
                        </View>
                        {item.owned ? (
                          <Text style={Typo(styles.ownedBadge, 'sans', lang)}>{t('pointsShop.owned')}</Text>
                        ) : (
                          <RedButton
                            label={redeeming === item.id ? '…' : t('pointsShop.redeem')}
                            width={layout.redeemBtnWidth}
                            isDesktop={isDesktop}
                            onPress={() => void onRedeem(item)}
                            disabled={redeeming === item.id}
                            loading={redeeming === item.id}
                            styles={styles}
                          />
                        )}
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <SectionPlate
                  label={t('pointsShop.myUnlocks')}
                  width={layout.sectionPlateWidth}
                  isDesktop={isDesktop}
                  styles={styles}
                />
                <View
                  style={[
                    styles.panelFrame,
                    styles.sectionBox,
                    styles.unlocksBox,
                    {
                      width: layout.contentWidth,
                      minHeight: layout.emptyBoxHeight,
                    },
                  ]}
                >
                  {unlocks.length === 0 ? (
                    <View style={styles.emptyUnlocks}>
                      <Image
                        source={EMBLEM_STAR_LAUREL}
                        style={styles.emptyLaurel}
                        resizeMode="contain"
                      />
                      <Text style={Typo(styles.emptyUnlocksText, 'sans', lang)}>{t('pointsShop.emptyUnlocks')}</Text>
                    </View>
                  ) : (
                    unlocks.map((row, index) => (
                      <View
                        key={`${row.catalog_id}-${row.created_at}`}
                        style={[styles.unlockRow, index < unlocks.length - 1 && styles.unlockRowBorder]}
                      >
                        <Text style={Typo(styles.unlockName, 'sans', lang)}>{row.name}</Text>
                        <Text style={Typo(styles.unlockMeta, 'mono', lang)}>{categoryLabel(t, row.category)}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          )}

          <View style={styles.footer}>
            <View style={styles.footerBar}>
              <View style={styles.footerHintRow}>
                <Ionicons name="information-circle-outline" size={14} color={PARCHMENT_MUTED} />
                <Text style={Typo(styles.footerHint, 'sans', lang)}>{t('pointsShop.footerHint')}</Text>
              </View>
              <Image
                source={EMBLEM_CCCP}
                style={{
                  width: layout.footerEmblemWidth,
                  height: layout.footerEmblemHeight,
                }}
                resizeMode="contain"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </ShellLayout>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  pageDesktop: {
    backgroundColor: 'transparent',
    minHeight: '100%',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 48,
    alignSelf: 'center',
  },
  panelFrame: {
    backgroundColor: PANEL_BG,
    borderWidth: 1,
    borderColor: PANEL_BORDER,
    overflow: 'hidden',
    ...PANEL_CLIP_WEB,
    ...PANEL_SHADOW_WEB,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    width: '100%',
  },
  backBtnWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backBtnText: Typo(
    { color: PARCHMENT, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
    'display', lang
  ),
  redBtnWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  redBtnDisabled: {
    opacity: 0.45,
  },
  redBtnImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  redBtnText: Typo(
    {
      color: PARCHMENT,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'display', lang
  ),
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 18,
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-start',
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: Typo(
    {
      color: ACCENT_GOLD,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    'display', lang
  ),
  subtitle: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'left',
      marginBottom: 10,
    },
    'sans', lang
  ),
  inviteLink: { color: ACCENT_GOLD, fontSize: 13, letterSpacing: 0.3 },
  balanceCard: {
    marginBottom: 22,
    overflow: 'hidden',
  },
  balanceEmblem: {
    position: 'absolute',
    right: '6%',
    top: '8%',
    width: '42%',
    height: '84%',
    opacity: 0.18,
  },
  balanceInner: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    zIndex: 1,
  },
  balanceLabel: Typo(
    { color: PARCHMENT_MUTED, fontSize: 11, letterSpacing: 0.8, marginBottom: 6 },
    'mono', lang
  ),
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  balanceValue: { color: ACCENT_GOLD, fontWeight: '700', letterSpacing: 1 },
  balancePts: { color: ACCENT_GOLD, fontSize: 14, fontWeight: '600', opacity: 0.85 },
  notWithdrawableHint: {
    color: PARCHMENT_MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  loader: { marginVertical: 32 },
  errorBox: { alignItems: 'center', marginVertical: 24 },
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionPlate: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -6,
    zIndex: 2,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  sectionPlateText: Typo(
    { color: PARCHMENT, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, zIndex: 1 },
    'display', lang
  ),
  sectionBox: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  unlocksBox: {
    justifyContent: 'center',
  },
  emptyText: { color: PARCHMENT_MUTED, fontSize: 12, textAlign: 'center' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  itemRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(232, 213, 181, 0.16)',
  },
  itemIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(232, 213, 181, 0.08)',
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  itemName: { color: PARCHMENT, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  itemMeta: { color: COLORS.accent.red, fontSize: 11, marginBottom: 3 },
  itemDesc: { color: PARCHMENT_MUTED, fontSize: 11, lineHeight: 16 },
  ownedBadge: { color: ACCENT_GOLD, fontSize: 11, fontWeight: '700', flexShrink: 0 },
  emptyUnlocks: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    minHeight: 120,
  },
  emptyLaurel: {
    width: 84,
    height: 84,
    marginBottom: 10,
    opacity: 0.22,
  },
  emptyUnlocksText: { color: PARCHMENT_MUTED, fontSize: 13 },
  unlockRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  unlockRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(232, 213, 181, 0.18)',
  },
  unlockName: { color: PARCHMENT, fontSize: 13, marginBottom: 2 },
  unlockMeta: { color: PARCHMENT_MUTED, fontSize: 11 },
  footer: {
    marginTop: 8,
    width: '100%',
    paddingTop: 8,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 213, 181, 0.12)',
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  footerHintRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  footerHint: { color: PARCHMENT_MUTED, fontSize: 11, lineHeight: 16 },
});
};
