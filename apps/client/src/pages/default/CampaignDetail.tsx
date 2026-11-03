import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { useI18n } from '../../i18n/I18nContext';
import type { Lang } from '../../i18n/types';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import { notifyError } from '../../utils/notify';
import { fetchCampaignDetail } from '../../api/campaigns';
import type { CampaignDetailResp, CampaignRoleItem } from '../../types/api';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { resolveStaticUrl } from '../../constants/config';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { VerifiedRealPersonBadge } from '../../components/agent/VerifiedRealPersonBadge';

export function DefaultCampaignDetail() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const campaignId = useMemo(() => {
    const value = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }, [rawId]);

  const { t, lang } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [detail, setDetail] = useState<CampaignDetailResp | null>(null);
  const [loading, setLoading] = useState(true);
  const threeCol = windowWidth >= 760;

  const load = useCallback(async () => {
    if (!campaignId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetchCampaignDetail(campaignId);
      setDetail(resp);
    } catch (err) {
      notifyError(t('campaign.loadFailed'), formatApiError(t, err));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const bannerUri = resolveStaticUrl(detail?.banner_url);
  const roles = detail?.roles ?? [];

  return (
    <DefaultShell>
      <View style={[styles.page, pageContentPadding]}>
        <View style={styles.header}>
          <DefaultBackButton
            onPress={() => safeGoBack('/', router)}
            accessibilityLabel={t('vip.shop.back')}
          />
          <Text style={Typo(styles.headerTitle, 'serif', lang)} numberOfLines={1}>
            {detail?.name || t('campaign.detailTitle')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
        ) : !detail ? (
          <Text style={Typo(styles.empty, 'sans', lang)}>{t('campaign.empty')}</Text>
        ) : (
          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {bannerUri ? (
              <View style={styles.hero}>
                <Image source={{ uri: bannerUri }} style={styles.heroImage} resizeMode="cover" />
              </View>
            ) : null}
            <Text style={Typo(styles.title, 'serif', lang)}>{detail.name}</Text>
            {detail.description ? (
              <Text style={Typo(styles.desc, 'sans', lang)}>{detail.description}</Text>
            ) : null}

            <Text style={Typo(styles.section, 'sans', lang)}>{t('campaign.howTitle')}</Text>
            <Text style={Typo(styles.howLead, 'sans', lang)}>{t('campaign.howLead')}</Text>
            <View style={styles.howList}>
              <HowStep
                lang={lang}
                title={t('campaign.howChatTitle')}
                body={t('campaign.howChatBody')}
              />
              <HowStep
                lang={lang}
                title={t('campaign.howUnlockTitle')}
                body={t('campaign.howUnlockBody')}
              />
              <HowStep
                lang={lang}
                title={t('campaign.howPointsTitle')}
                body={t('campaign.howPointsBody')}
              />
            </View>

            <Text style={Typo(styles.section, 'sans', lang)}>{t('campaign.roles')}</Text>
            <View style={[styles.roleGrid, threeCol && styles.roleGridRow]}>
              {roles.map((role) => (
                <RoleStandeeCard
                  key={role.role_id}
                  role={role}
                  lang={lang}
                  chatLabel={t('campaign.goChat')}
                  verifiedLabel={t('agent.verifiedRealPersonLabel')}
                  wide={threeCol}
                  onOpen={() => router.push(`/explore/${role.role_id}`)}
                  onChat={() => router.push(`/free-chat/${encodeURIComponent(role.role_id)}`)}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </DefaultShell>
  );
}

function HowStep({
  lang,
  title,
  body,
}: {
  lang: Lang;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.howItem}>
      <Text style={Typo(styles.howItemTitle, 'sans', lang)}>{title}</Text>
      <Text style={Typo(styles.howItemBody, 'sans', lang)}>{body}</Text>
    </View>
  );
}

function RoleStandeeCard({
  role,
  lang,
  chatLabel,
  verifiedLabel,
  wide,
  onOpen,
  onChat,
}: {
  role: CampaignRoleItem;
  lang: Lang;
  chatLabel: string;
  verifiedLabel: string;
  wide: boolean;
  onOpen: () => void;
  onChat: () => void;
}) {
  const figure = resolveStaticUrl(role.figure_url || role.avatar_url);
  return (
    <View style={[styles.standee, wide && styles.standeeWide]}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={role.role_name}
      >
        <View style={styles.figureWrap}>
          {figure ? (
            <Image source={{ uri: figure }} style={styles.figure} resizeMode="cover" />
          ) : (
            <View style={styles.figure} />
          )}
          <VerifiedRealPersonBadge
            size={18}
            inset={8}
            label={verifiedLabel}
            accessibilityLabel={verifiedLabel}
          />
        </View>
        <Text style={Typo(styles.roleName, 'serif', lang)} numberOfLines={1}>
          {role.role_name}
        </Text>
        {role.introduction ? (
          <Text style={Typo(styles.roleIntro, 'sans', lang)}>
            {role.introduction}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onChat}
        style={({ pressed }) => [styles.chatBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={chatLabel}
      >
        <Text style={Typo(styles.chatBtnText, 'sans', lang)}>{chatLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    color: TOKENS.colors.text,
    fontSize: 18,
  },
  headerSpacer: {
    width: 40,
  },
  loader: {
    marginTop: 40,
  },
  empty: {
    color: TOKENS.colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    aspectRatio: 3.4,
    borderRadius: TOKENS.radius.cardLg,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: TOKENS.colors.cardSolid,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 22,
  },
  desc: {
    marginTop: 8,
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  section: {
    marginTop: 22,
    marginBottom: 12,
    color: TOKENS.colors.text,
    fontSize: 16,
  },
  howLead: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  howList: {
    gap: 10,
  },
  howItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
  },
  howItemTitle: {
    color: TOKENS.colors.text,
    fontSize: 15,
  },
  howItemBody: {
    marginTop: 6,
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  roleGrid: {
    gap: 16,
  },
  roleGridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  standee: {
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    padding: 10,
    paddingBottom: 12,
  },
  standeeWide: {
    flex: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.88,
  },
  figureWrap: {
    position: 'relative',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.cardSolid,
  },
  figure: {
    width: '100%',
    height: '100%',
  },
  roleName: {
    marginTop: 10,
    color: TOKENS.colors.text,
    fontSize: 17,
  },
  roleIntro: {
    marginTop: 6,
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  chatBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
  },
  chatBtnText: {
    color: '#fff',
    fontSize: 13,
  },
});
