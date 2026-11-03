import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

const STATUS_STYLE: Record<string, { bg: string; fg: string; key: string }> = {
  none: { bg: 'rgba(120,120,130,0.35)', fg: COLORS.text.secondary, key: 'agent.statusPrivate' },
  pending_review: { bg: 'rgba(201,162,39,0.25)', fg: '#e8c547', key: 'agent.publishPending' },
  published: { bg: 'rgba(72,160,120,0.25)', fg: '#7fd4a8', key: 'agent.statusPublished' },
  rejected: { bg: 'rgba(180,60,60,0.3)', fg: '#f0a0a0', key: 'agent.publishRejected' },
};

interface PublishStatusBadgeProps {
  status?: string;
}

export function PublishStatusBadge({ status }: PublishStatusBadgeProps) {

  const { t, lang } = useI18n();
  if (!status || status === 'none') {
    return (
      <View style={[styles.badge, { backgroundColor: STATUS_STYLE.none.bg }]}>
        <Text style={[Typo(styles.text, 'sans', lang), { color: STATUS_STYLE.none.fg }]}>{t(STATUS_STYLE.none.key)}</Text>
      </View>
    );
  }

  const style = STATUS_STYLE[status] ?? STATUS_STYLE.none;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[Typo(styles.text, 'sans', lang), { color: style.fg }]}>{t(style.key)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  text: { fontSize: 10, fontWeight: '600' },
});
