import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

interface SceneClearCardProps {
  visible: boolean;
  flags: Record<string, boolean>;
  rewardSeen: string[];
  onRestart: () => void;
}

export function SceneClearCard({ visible, flags, rewardSeen, onRestart }: SceneClearCardProps) {
  const { t } = useI18n();
  const rewardCount = rewardSeen.includes('R02') ? 1 : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('sceneClear.title')}</Text>
          <Text style={styles.subtitle}>{t('sceneClear.subtitle')}</Text>

          <View style={styles.divider} />

          <Text style={styles.section}>{t('sceneClear.flags')}</Text>
          {Object.entries(flags)
            .filter(([k]) => !k.startsWith('bad_end_seen'))
            .map(([k, v]) => (
              <View key={k} style={styles.flagRow}>
                <Text style={styles.flagName}>{k}</Text>
                <Text style={styles.flagValue}>{v ? '✓' : '○'}</Text>
              </View>
            ))}

          <Text style={styles.section}>{t('sceneClear.rewards')}</Text>
          <Text style={styles.progress}>{`${rewardCount}/3 (R02 ${rewardCount > 0 ? '✓' : '○'})`}</Text>

          <TouchableOpacity style={styles.button} onPress={onRestart} activeOpacity={0.8}>
            <Text style={styles.buttonText}>{t('sceneClear.replay')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bg.elevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.accent.gold,
    padding: 22,
  },
  title: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    'display',
  ),
  subtitle: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 4,
    },
    'sans',
  ),
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  section: Typo(
    {
      color: COLORS.text.secondary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    'sans',
  ),
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  flagName: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 12,
    },
    'mono',
  ),
  flagValue: Typo(
    {
      color: COLORS.accent.gold,
      fontSize: 12,
    },
    'mono',
  ),
  progress: Typo(
    {
      color: COLORS.text.primary,
      fontSize: 14,
    },
    'sans',
  ),
  button: {
    marginTop: 20,
    backgroundColor: COLORS.accent.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: Typo(
    {
      color: '#0a0b0f',
      fontWeight: '700',
      fontSize: 14,
    },
    'display',
  ),
});
