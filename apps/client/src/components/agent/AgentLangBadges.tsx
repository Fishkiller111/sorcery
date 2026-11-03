import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { Lang } from '../../i18n/types';
import { formatLangBadge, normalizeSupportedLangs } from '../../utils/agentLangs';

interface AgentLangBadgesProps {
  langs?: string[];
  uiLang: Lang;
  compact?: boolean;
  tone?: 'default' | 'gold';
}

export function AgentLangBadges({ langs, uiLang, compact, tone = 'default' }: AgentLangBadgesProps) {

  const items = normalizeSupportedLangs(langs);
  if (items.length === 0) return null;

  const isGold = tone === 'gold';

  return (
    <View style={styles.row}>
      {items.map((code) => (
        <View
          key={code}
          style={[
            styles.badge,
            compact && styles.badgeCompact,
            isGold && styles.badgeGold,
          ]}
        >
          <Text
            style={[
              Typo(styles.badgeText, 'mono', uiLang),
              compact && Typo(styles.badgeTextCompact, 'mono', uiLang),
              isGold && Typo(styles.badgeTextGold, 'mono', uiLang),
            ]}
          >
            {formatLangBadge(code, uiLang)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeCompact: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeGold: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: COLORS.agents.borderStrong,
  },
  badgeText: { color: COLORS.text.secondary, fontSize: 11, fontWeight: '600' },
  badgeTextCompact: { fontSize: 10 },
  badgeTextGold: { color: COLORS.agents.paleGold },
});
