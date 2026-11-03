import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import type { ForumBoardSlug } from '../../../types/api';
import { Typo } from '../../../theme/typography';
import { SOCIAL } from './socialTokens';

const BOARDS: ForumBoardSlug[] = ['general', 'works', 'social', 'verified'];

const BOARD_I18N: Record<ForumBoardSlug, string> = {
  general: 'forum.boardGeneral',
  works: 'forum.boardWorks',
  social: 'forum.boardSocial',
  verified: 'forum.boardVerified',
};

type Props = {
  board: ForumBoardSlug;
  onChange: (board: ForumBoardSlug) => void;
  compact?: boolean;
};

export function ForumBoardTabs({ board, onChange, compact }: Props) {
  const { t } = useI18n();
  return (
    <View
      style={[styles.row, compact && styles.rowCompact]}
      accessibilityRole="tablist"
    >
      {BOARDS.map((slug) => {
        const active = board === slug;
        return (
          <Pressable
            key={slug}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(slug)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, compact && styles.labelCompact, active && styles.labelActive]}>
              {t(BOARD_I18N[slug])}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  rowCompact: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 6,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: SOCIAL.divider,
    backgroundColor: 'rgba(242, 242, 244, 0.06)',
  },
  label: Typo(
    {
      color: SOCIAL.tabInactive,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  labelCompact: {
    fontSize: 13,
  },
  labelActive: {
    color: SOCIAL.tabActive,
  },
});
