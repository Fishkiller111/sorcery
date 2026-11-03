import type { Lang } from '../../i18n/types';
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useVipStore } from '../../stores/vipStore';
import { VipUpgradeModal } from '../vip/VipUpgradeModal';

interface ProloguePaywallProps {
  visible: boolean;
  rewardSeen: string[];
  chapterClear?: boolean;
}

function countPrologueRewards(seen: string[]): number {
  const ids = ['R02', 'R06', 'R04'];
  return ids.filter((id) => seen.includes(id)).length;
}

export function ProloguePaywall({
 visible, rewardSeen, chapterClear }: ProloguePaywallProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const router = useRouter();
  const vip = useVipStore((s) => s.vip);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const hasStoryVip = vip?.permissions?.story_mode === true;
  const rewardCount = useMemo(() => countPrologueRewards(rewardSeen), [rewardSeen]);

  const goHub = () => router.replace('/story');

  const handlePrimary = () => {
    if (hasStoryVip) {
      goHub();
      return;
    }
    setUpgradeOpen(true);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.backdrop}>
          <LinearGradient
            colors={['#0a0b0f', '#14141c', '#0a0b0f']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.card}>
            {chapterClear ? (
              <Text style={styles.epilogue}>{t('prologuePaywall.epilogue')}</Text>
            ) : null}
            <Text style={styles.vo}>{t('prologuePaywall.vo')}</Text>

            <View style={styles.divider} />

            <Text style={styles.title}>{t('prologuePaywall.title')}</Text>
            <Text style={styles.subtitle}>{t('prologuePaywall.subtitle')}</Text>
            <Text style={styles.countdown}>{t('prologuePaywall.countdown')}</Text>

            <Text style={styles.rewards}>
              {t('prologuePaywall.rewards').replace('{n}', String(rewardCount))}
            </Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={handlePrimary} activeOpacity={0.85}>
              <Text style={Typo(styles.primaryText, 'display', lang)}>
                {hasStoryVip ? t('prologuePaywall.continuePro') : t('prologuePaywall.upgradeSoul')}
              </Text>
            </TouchableOpacity>

            {!hasStoryVip ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={goHub} activeOpacity={0.8}>
                <Text style={Typo(styles.secondaryText, 'sans', lang)}>{t('prologuePaywall.backHub')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      <VipUpgradeModal visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
    backgroundColor: 'rgba(20,22,28,0.95)',
    padding: 24,
  },
  epilogue: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 12,
      textAlign: 'center',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    'sans', lang
  ),
  vo: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: 4,
    },
    'display', lang
  ),
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 18,
  },
  title: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 26,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 34,
    },
    'display', lang
  ),
  subtitle: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 22,
    },
    'sans', lang
  ),
  countdown: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 14,
      fontWeight: '600',
    },
    'mono', lang
  ),
  rewards: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 16,
    },
    'sans', lang
  ),
  primaryBtn: {
    marginTop: 24,
    backgroundColor: COLORS.accent.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#0a0b0f', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: { color: COLORS.text.secondary, fontSize: 14 },
});
};
