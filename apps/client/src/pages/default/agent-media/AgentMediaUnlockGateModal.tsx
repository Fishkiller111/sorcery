import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';
import { ThemedGeneralConfirmModal } from '../../../components/ui/ThemedGeneralConfirmModal';
import { BondProgressBar } from '../../../components/free-chat/BondProgressBar';
import { getChatAffection } from '../../../api/chat';
import type { BondInfo } from '../../../types/api';
import {
  AFFECTION_LOCKED_REASON,
  VIP_LOCKED_REASON,
  type MediaUnlockRequirementsView,
} from '../../../utils/mediaDisplay';

type AgentMediaUnlockGateModalProps = {
  visible: boolean;
  roleId: string;
  lockedReason?: string;
  requirements?: MediaUnlockRequirementsView;
  onClose: () => void;
  onChat: () => void;
  onVip: () => void;
};

function bondTierLabel(t: (key: string) => string, tier?: string): string {
  const key = `agentMedia.bondTier.${(tier || 'stranger').trim() || 'stranger'}`;
  const label = t(key);
  return label === key ? t('agentMedia.bondTier.stranger') : label;
}

/** 真人分身 Unlock 门槛弹窗：解锁条件 + 当前好感度（不展示分数）。 */
export function AgentMediaUnlockGateModal({
  visible,
  roleId,
  lockedReason,
  requirements,
  onClose,
  onChat,
  onVip,
}: AgentMediaUnlockGateModalProps) {
  const { t, tp } = useI18n();
  const [bond, setBond] = useState<BondInfo | null>(null);
  const [loadingBond, setLoadingBond] = useState(false);

  useEffect(() => {
    if (!visible || !roleId) {
      setBond(null);
      return;
    }
    let cancelled = false;
    setLoadingBond(true);
    void getChatAffection({ roleId })
      .then((resp) => {
        if (!cancelled) setBond(resp.bond);
      })
      .catch(() => {
        if (!cancelled) setBond(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingBond(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, roleId]);

  const affectionBlocked =
    lockedReason === AFFECTION_LOCKED_REASON || requirements?.affection_met === false;
  const vipBlocked = lockedReason === VIP_LOCKED_REASON || requirements?.vip_met === false;

  const needLines = useMemo(() => {
    const lines: string[] = [];
    const reqTier = requirements?.min_affection_tier?.trim();
    if (reqTier) {
      lines.push(tp('agentMedia.unlockGateNeedBond', { tier: bondTierLabel(t, reqTier) }));
    } else if (affectionBlocked) {
      lines.push(t('agent.unlockAffection'));
    }
    if ((requirements?.min_vip_tier ?? 0) > 0 || vipBlocked) {
      lines.push(t('agentMedia.unlockGateNeedVip'));
    }
    const soul = requirements?.price_points ?? 0;
    if (soul > 0) {
      lines.push(tp('agentMedia.unlockGateNeedSoul', { n: soul }));
    }
    if (lines.length === 0) {
      lines.push(t('agent.unlockAffection'));
    }
    return lines;
  }, [affectionBlocked, requirements, t, tp, vipBlocked]);

  const confirmChat = affectionBlocked || !vipBlocked;
  const currentLabel = bond?.bond_label?.trim() || t('freeChat.affectionFallback');

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="star"
      title={t('agentMedia.unlockGateTitle')}
      bodyMaxHeight={280}
      cancelLabel={t('agentMedia.unlockGateOk')}
      confirmLabel={confirmChat ? t('agentMedia.unlockGateChat') : t('agentMedia.unlockGateVip')}
      dismissOnBackdrop
      onCancel={onClose}
      onConfirm={confirmChat ? onChat : onVip}
      bodyContent={
        <View style={styles.body}>
          <Text style={styles.sectionLabel}>{t('agentMedia.unlockGateNeed')}</Text>
          {needLines.map((line) => (
            <Text key={line} style={styles.needLine}>
              · {line}
            </Text>
          ))}

          <Text style={[styles.sectionLabel, styles.sectionGap]}>{t('agentMedia.unlockGateCurrentBond')}</Text>
          {loadingBond ? (
            <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
          ) : (
            <>
              <Text style={styles.bondLabel}>{currentLabel}</Text>
              {bond?.bond_hint ? <Text style={styles.bondHint}>{bond.bond_hint}</Text> : null}
              <BondProgressBar progress={bond?.bond_progress ?? 0} style={styles.bar} />
            </>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: 6,
  },
  sectionLabel: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    'sans',
  ),
  sectionGap: {
    marginTop: 12,
  },
  needLine: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
    'sans',
  ),
  bondLabel: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    'sans',
  ),
  bondHint: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    'sans',
  ),
  bar: {
    marginTop: 6,
  },
  loader: {
    marginVertical: 12,
  },
});
