import React, { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { RoleGridContainer } from '../../components/agent/RoleGridContainer';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import { listExploreCategories, listExploreRoles } from '../../api/roles';
import { resolveStaticUrl } from '../../constants/config';
import { typo } from './theme/typography';
import type { ExploreRoleCategory, ExploreRoleItem } from '../../types/api';
import { VerifiedRealPersonBadge } from '../../components/agent/VerifiedRealPersonBadge';
import { VerifiedRealPersonGlowFrame } from '../../components/agent/VerifiedRealPersonGlowFrame';
import { isVerifiedRealPerson } from '../../utils/verifiedRealPerson';
import { sortExploreRolesPinned } from '../../utils/homeAgentRank';
import { resolveRoleCategoryName, ROLE_CATEGORY_HISTORY_ID, sortRoleCategories } from '../../utils/roleCategory';
import { ModernShell } from './theme/components/ModernShell';
import { TOKENS } from './theme/tokens';
import { useAuthStore } from '../../stores/authStore';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { requireLoginForAction } from '../../utils/requireLogin';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';

const H_PADDING = 20;

function formatCount(n?: number): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function ModernExploreRoleCard({
  item,
  variant,
  onPress,
}: {
  item: ExploreRoleItem;
  variant: 'grid' | 'list';
  onPress: (id: string) => void;
}) {
  const { t } = useI18n();
  const name = item.name || t('common.notAvailable');
  const coverUrl = item.figure_url || item.avatar_url;
  const cover = coverUrl ? resolveStaticUrl(coverUrl) : null;
  const isList = variant === 'list';
  const verified = isVerifiedRealPerson(item);

  return (
    <VerifiedRealPersonGlowFrame active={verified} radius={TOKENS.radius.lg}>
    <Pressable
      onPress={() => onPress(item.id)}
      style={[
        styles.roleCard,
        isList && styles.roleCardList,
        verified && styles.roleCardInGlow,
      ]}
    >
      <View style={{ position: 'relative' }}>
        {cover ? (
          <Image source={{ uri: cover }} style={[styles.roleCover, isList && styles.roleCoverList]} />
        ) : (
          <View style={[styles.roleCover, styles.roleCoverPlaceholder, isList && styles.roleCoverList]}>
            <Ionicons name="person" size={28} color={TOKENS.colors.textSubtle} />
          </View>
        )}
        {verified ? (
          <VerifiedRealPersonBadge
            size={18}
            inset={6}
            label={t('agent.verifiedRealPersonLabel')}
            accessibilityLabel={t('agent.verifiedRealPersonLabel')}
          />
        ) : null}
      </View>
      <View style={styles.roleInfo}>
        <Text style={styles.roleName} numberOfLines={isList ? 1 : 2}>
          {name}
        </Text>
        <View style={styles.roleStatsRow}>
          <View style={styles.roleStat}>
            <Ionicons name="eye-outline" size={12} color={TOKENS.colors.textSubtle} />
            <Text style={styles.roleMeta}>{formatCount(item.view_count)}</Text>
          </View>
          <View style={styles.roleStat}>
            <Ionicons name="heart-outline" size={12} color={TOKENS.colors.textSubtle} />
            <Text style={styles.roleMeta}>{formatCount(item.like_count)}</Text>
          </View>
          <View style={styles.roleStat}>
            <Ionicons name="chatbubble-outline" size={12} color={TOKENS.colors.textSubtle} />
            <Text style={styles.roleMeta}>{formatCount(item.comment_count)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
    </VerifiedRealPersonGlowFrame>
  );
}

export function ModernExplore() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { numColumns, availableWidth, gap } = useRoleGridLayout(H_PADDING);
  const isListLayout = numColumns === 1;

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
    } catch {
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
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, categoryId, lang]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const onOpenRole = useCallback(
    (id: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      router.push(`/explore/${id}`);
    },
    [isLoggedIn, router, t],
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>{t('explore.forYou')}</Text>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={TOKENS.colors.textSubtle} />
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder={t('explore.searchPlaceholder')}
          placeholderTextColor={TOKENS.colors.textSubtle}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {q.length > 0 ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={TOKENS.colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <FilterChip
          label={t('explore.allCategories')}
          active={!categoryId}
          onPress={() => setCategoryId('')}
        />
        {displayCategories.map((cat) => {
          const active = categoryId === cat.category_id;
          return (
            <FilterChip
              key={cat.category_id}
              label={cat.name}
              active={active}
              onPress={() => setCategoryId(active ? '' : cat.category_id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <ModernShell scrollable={false}>
      <View style={[styles.content, !isDesktop && styles.contentMobile, !isDesktop && pageContentPadding]}>
        {header}
        {loading ? (
          <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />
        ) : roles.length === 0 ? (
          <Text style={styles.empty}>{t('explore.empty')}</Text>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
              {roles.map((item) => (
                <ModernExploreRoleCard
                  key={item.id}
                  item={item}
                  variant={isListLayout ? 'list' : 'grid'}
                  onPress={onOpenRole}
                />
              ))}
            </RoleGridContainer>
          </ScrollView>
        )}
      </View>
    </ModernShell>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: H_PADDING,
    paddingTop: 48,
  },
  contentMobile: {
    paddingTop: 12,
  },
  header: {
    gap: 12,
    marginBottom: 12,
  },
  title: typo(
    {
      color: TOKENS.colors.text,
      fontSize: 24,
      fontWeight: '700',
    },
    'sans',
  ),
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.md,
    backgroundColor: TOKENS.colors.card,
    paddingHorizontal: 12,
  },
  search: {
    flex: 1,
    paddingVertical: 10,
    color: TOKENS.colors.text,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.card,
  },
  filterChipActive: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  filterChipText: typo(
    { color: TOKENS.colors.textMuted, fontSize: 12, fontWeight: '600' },
    'sans',
  ),
  filterChipTextActive: typo(
    { color: TOKENS.colors.text, fontSize: 12, fontWeight: '700' },
    'sans',
  ),
  loader: { marginTop: 32 },
  empty: typo({
    color: TOKENS.colors.textSubtle,
    textAlign: 'center',
    marginTop: 32,
  }, 'sans'),
  listContent: {
    paddingBottom: 32,
  },
  roleCard: {
    width: '100%',
    minWidth: 0,
    backgroundColor: TOKENS.colors.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.lg,
    overflow: 'hidden',
  },
  roleCardInGlow: {
    borderWidth: 0,
  },
  roleCardList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleCover: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: TOKENS.colors.bgElevated,
  },
  roleCoverList: {
    width: 72,
    height: 72,
    aspectRatio: undefined,
    borderRadius: TOKENS.radius.md,
    margin: 10,
  },
  roleCoverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    padding: 12,
    gap: 4,
    flex: 1,
  },
  roleName: typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  roleStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  roleStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleMeta: typo(
    {
      color: TOKENS.colors.textSubtle,
      fontSize: 11,
    },
    'sans',
  ),
});
