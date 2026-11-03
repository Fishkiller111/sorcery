import type { Lang } from '../../i18n/types';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { RoleGridCard } from '../agent/RoleGridCard';
import { RoleGridContainer } from '../agent/RoleGridContainer';
import type { Agent } from './AgentCard';
import { roleItemToAgent } from './AgentCard';
import type { RoleItem } from '../../types/api';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import {
  collectRoleCategories,
  filterRoles,
  roleItemToGridCard,
} from '../../utils/roleGrid';

const H_PADDING = 0;

interface AgentListProps {
  roles: RoleItem[];
  onAgentPress?: (agent: Agent) => void;
  onSettingsPress?: (agent: Agent) => void;
}

export function AgentList({
 roles, onAgentPress, onSettingsPress }: AgentListProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const { numColumns, availableWidth, gap } = useRoleGridLayout(20);
  const isListLayout = numColumns === 1;

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const categories = useMemo(() => collectRoleCategories(roles, t), [roles, t]);
  const filteredRoles = useMemo(
    () => filterRoles(roles, debouncedQ, categoryId),
    [roles, debouncedQ, categoryId],
  );

  const handlePress = (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (role) onAgentPress?.(roleItemToAgent(role));
  };

  const handleSettings = (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (role) onSettingsPress?.(roleItemToAgent(role));
  };

  if (roles.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('freeChat.emptyAgents')}</Text>
      </View>
    );
  }

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={COLORS.agents.paleGoldMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder={t('freeChat.searchPlaceholder')}
          placeholderTextColor={COLORS.agents.paleGoldMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {q.length > 0 ? (
          <Pressable onPress={() => setQ('')} hitSlop={8} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={16} color={COLORS.agents.paleGoldMuted} />
          </Pressable>
        ) : null}
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            style={[styles.filterChip, !categoryId && styles.filterChipActive]}
            onPress={() => setCategoryId('')}
          >
            <Text style={[styles.filterChipText, !categoryId && styles.filterChipTextActive]}>
              {t('freeChat.allCategories')}
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const active = categoryId === cat.category_id;
            return (
              <Pressable
                key={cat.category_id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setCategoryId(active ? '' : cat.category_id)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {listHeader}
      {filteredRoles.length === 0 ? (
        <Text style={styles.emptyFilter}>{t('freeChat.noFilterResults')}</Text>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
            {filteredRoles.map((item) => (
              <RoleGridCard
                key={item.id}
                item={roleItemToGridCard(item)}
                variant={isListLayout ? 'list' : 'grid'}
                uiLang={lang}
                onPress={handlePress}
                onSettingsPress={handleSettings}
                showPublishBadge
              />
            ))}
          </RoleGridContainer>
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  container: { flex: 1, width: '100%', overflow: 'hidden' },
  list: { flex: 1, width: '100%' },
  header: { gap: 12, marginBottom: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  search: {
    flex: 1,
    paddingVertical: 10,
    color: COLORS.agents.paleGold,
    fontSize: 14,
  },
  clearBtn: { paddingLeft: 4 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: H_PADDING,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  filterChipActive: {
    backgroundColor: COLORS.agents.brightGold,
    borderColor: COLORS.agents.brightGold,
  },
  filterChipText: Typo(
    { color: COLORS.agents.paleGold, fontSize: 12, fontWeight: '600' },
    'sans', lang
  ),
  filterChipTextActive: Typo(
    { color: '#0a0b0f', fontSize: 12, fontWeight: '700' },
    'sans', lang
  ),
  listContent: { flexGrow: 0, paddingBottom: 32 },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 14 }, 'sans'),
  emptyFilter: Typo(
    { color: COLORS.agents.paleGoldMuted, fontSize: 14, textAlign: 'center', marginTop: 24 },
    'sans', lang
  ),
});
};
