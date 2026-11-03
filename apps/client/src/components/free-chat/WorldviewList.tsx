import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { RoleGridContainer } from '../agent/RoleGridContainer';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import type { WorldviewItem } from '../../types/api';
import { WorldviewGridCard } from './WorldviewGridCard';

interface WorldviewListProps {
  items: WorldviewItem[];
  onItemPress?: (worldview: WorldviewItem) => void;
  emptyText: string;
}

export function WorldviewList({ items, onItemPress, emptyText }: WorldviewListProps) {

  const { tp, lang } = useI18n();
  const { numColumns, availableWidth, gap } = useRoleGridLayout(20);

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={Typo(styles.emptyText, 'sans', lang)}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
          {items.map((item) => (
            <WorldviewGridCard
              key={item.id}
              item={item}
              roleCountLabel={tp('freeChat.worldviewRoleCountShort', { count: item.role_count })}
              onPress={(worldview) => onItemPress?.(worldview)}
            />
          ))}
        </RoleGridContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', overflow: 'hidden' },
  list: { width: '100%' },
  listContent: { paddingBottom: 32 },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.agents.paleGoldMuted, fontSize: 14 },
});
