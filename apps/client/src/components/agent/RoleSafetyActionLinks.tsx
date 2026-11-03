import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { useRoleSafetyActions } from '../../hooks/useRoleSafetyActions';
import { SocialReportReasonModal } from '../../pages/default/social/SocialReportReasonModal';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';

type Props = {
  roleId: string;
  creatorUserId?: string;
  onBlocked?: () => void;
  /** default：AgentMedia；panel：聊天侧栏角色面板 */
  variant?: 'default' | 'panel';
};

/** 角色主页标题旁的「举报 / 拉黑」文字入口。 */
export function RoleSafetyActionLinks({
  roleId,
  creatorUserId,
  onBlocked,
  variant = 'default',
}: Props) {
  const { t } = useI18n();
  const {
    reportOpen,
    blockOpen,
    setReportOpen,
    setBlockOpen,
    openReport,
    openBlock,
    submitReport,
    confirmBlock,
  } = useRoleSafetyActions({ roleId, creatorUserId, onBlocked });

  const isPanel = variant === 'panel';

  return (
    <>
      <View style={styles.col}>
        <Pressable
          onPress={openReport}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('agentMedia.report')}
        >
          <Text style={[styles.link, isPanel && styles.linkPanel]}>{t('agentMedia.report')}</Text>
        </Pressable>
        <Pressable
          onPress={openBlock}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('agentMedia.block')}
        >
          <Text style={[styles.link, styles.blockLink, isPanel && styles.linkPanel]}>
            {t('agentMedia.block')}
          </Text>
        </Pressable>
      </View>

      <SocialReportReasonModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSelect={(reason) => void submitReport(reason)}
      />

      <ThemedGeneralConfirmModal
        visible={blockOpen}
        icon="warning"
        title={t('agentMedia.blockRoleConfirmTitle')}
        subtitle={t('social.blockConfirmBody')}
        subtitleTone="warning"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('agentMedia.block')}
        onCancel={() => setBlockOpen(false)}
        onConfirm={() => void confirmBlock()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  col: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  link: {
    color: '#9aa3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  linkPanel: {
    color: '#AAB1C3',
  },
  blockLink: {
    color: '#c45c5c',
  },
});
