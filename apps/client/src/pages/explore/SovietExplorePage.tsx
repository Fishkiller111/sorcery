import type { Lang } from '../../i18n/types';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ExploreRoleCard } from '../../components/explore/ExploreRoleCard';
import { RoleGridContainer } from '../../components/agent/RoleGridContainer';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import { listExploreCategories, listExploreRoles } from '../../api/roles';
import { sortExploreRolesPinned } from '../../utils/homeAgentRank';
import type { ExploreRoleCategory, ExploreRoleItem } from '../../types/api';
import { resolveRoleCategoryName, ROLE_CATEGORY_HISTORY_ID, sortRoleCategories } from '../../utils/roleCategory';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const H_PADDING = 20;
const EMBLEM_CCCP = require('../../../assets/images/ui/agents/emblem_cccp_badge.png');

export function SovietExplorePage() {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { numColumns, availableWidth, gap } = useRoleGridLayout(H_PADDING);
  const isListLayout = numColumns === 1;
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('soviet'), []);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [roles, setRoles] = useState<ExploreRoleItem[]>([]);
  const [categories, setCategories] = useState<ExploreRoleCategory[]>([]);
  const [hasChattedRoles, setHasChattedRoles] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const displayCategories = React.useMemo(() => {
    const base = sortRoleCategories(
      categories.map((cat) => ({
        ...cat,
        name: resolveRoleCategoryName(cat.category_id, cat.name, t),
      })),
    );
    if (!hasChattedRoles) return base;
    return [
      { category_id: ROLE_CATEGORY_HISTORY_ID, name: t('explore.categoryHistory') },
      ...base,
    ];
  }, [categories, hasChattedRoles, t]);

  const loadCategories = useCallback(async () => {
    try {
      const resp = await listExploreCategories();
      setCategories(resp.items ?? []);
    } catch (e) {
      console.error('explore categories load', e);
      setCategories([]);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await listExploreRoles({
        q: debouncedQ || undefined,
        category_id: categoryId || undefined,
      });
      setRoles(sortExploreRolesPinned(resp.roles, '', true));
      setHasChattedRoles(Boolean(resp.has_chatted_roles));
    } catch (e) {
      console.error('explore load', e);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, categoryId, lang]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const onOpenRole = useCallback(
    (id: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      router.push(`/explore/${id}`);
    },
    [isLoggedIn, router, t],
  );

  return (
    <View style={styles.pageRoot}>
      <LinearGradient colors={['#12141a', '#0a0b0f', '#050608']} style={styles.gradient} />

      <View style={[styles.content, pageContentPadding]}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Image source={EMBLEM_CCCP} style={styles.titleEmblem} resizeMode="contain" />
            <Text style={styles.title}>{t('explore.forYou')}</Text>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={COLORS.agents.paleGoldMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.search}
              value={q}
              onChangeText={setQ}
              placeholder={t('explore.searchPlaceholder')}
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
                {t('explore.allCategories')}
              </Text>
            </Pressable>
            {displayCategories.map((cat) => {
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
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.agents.brightGold} />
        ) : roles.length === 0 ? (
          <Text style={styles.empty}>{t('explore.empty')}</Text>
        ) : (
          <ScrollView
            {...scrollWebProps}
            style={[styles.list, scrollWebProps.style]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
              {roles.map((item) => (
                <ExploreRoleCard
                  key={item.id}
                  item={item}
                  variant={isListLayout ? 'list' : 'grid'}
                  uiLang={lang}
                  onPress={onOpenRole}
                />
              ))}
            </RoleGridContainer>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  pageRoot: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  gradient: { ...StyleSheet.absoluteFill },
  content: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    zIndex: 1,
  },
  list: { flex: 1, width: '100%' },
  header: {
    gap: 12,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleEmblem: {
    width: 28,
    height: 42,
  },
  title: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'display', lang
  ),
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
  loader: { marginTop: 32 },
  empty: Typo({
    color: COLORS.agents.paleGoldMuted,
    textAlign: 'center',
    marginTop: 32,
  }, 'sans'),
  listContent: {
    flexGrow: 0,
    paddingBottom: 32,
  },
});
};
