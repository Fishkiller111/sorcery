import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { RoleGridContainer } from '../../components/agent/RoleGridContainer';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import { listAllRoles } from '../../api/roles';
import type { RoleItem } from '../../types/api';
import { useAuthStore } from '../../stores/authStore';
import { requireLoginForAction } from '../../utils/requireLogin';
import { notifyError } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { ThemedAgentDetailModal } from '../../components/ui/ThemedAgentDetailModal';
import {
  collectRoleCategories,
  filterRoles,
  roleItemToGridCard,
} from '../../utils/roleGrid';
import { DefaultShell } from './components/DefaultShell';
import { DefaultFilterChip } from './components/DefaultFilterChip';
import { DefaultAgentRoleCard } from './components/DefaultAgentRoleCard';
import { TOKENS } from './theme/tokens';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const H_PADDING = TOKENS.layout.contentPadding;

export function DefaultAgentsScreen() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const { numColumns, availableWidth, gap } = useRoleGridLayout(H_PADDING);
  const isListLayout = numColumns === 1;

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  /** Only user-created agents on this page. */
  const ownedRoles = useMemo(() => roles.filter((role) => role.is_owner === true), [roles]);

  const categories = useMemo(() => collectRoleCategories(ownedRoles, t), [ownedRoles, t]);
  const filteredRoles = useMemo(
    () => filterRoles(ownedRoles, debouncedQ, categoryId),
    [ownedRoles, debouncedQ, categoryId],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      if (!isLoggedIn) {
        setRoles([]);
        return;
      }
      const rolesResp = await listAllRoles();
      setRoles(rolesResp);
    } catch (err) {
      console.error('Failed to load agents data:', err);
      notifyError(t('freeChat.error'), formatApiError(t, err));
      setRoles([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, t]);

  useFocusEffect(
    useCallback(() => {
      if (!isRestored) return;
      void loadData();
    }, [isRestored, loadData]),
  );

  const onAgentPress = useCallback(
    (id: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      const role = ownedRoles.find((r) => r.id === id) ?? null;
      setSelectedRole(role);
    },
    [isLoggedIn, ownedRoles, router, t],
  );

  const handleCloseConfirm = useCallback(() => {
    setSelectedRole(null);
  }, []);

  const handleManage = useCallback(
    (roleId: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      setSelectedRole(null);
      router.push(`/agent/${roleId}/settings`);
    },
    [isLoggedIn, router, t],
  );

  const handleSocialManage = useCallback(
    (roleId: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      setSelectedRole(null);
      router.push(`/agent/${roleId}/posts` as never);
    },
    [isLoggedIn, router, t],
  );

  const handleStartChat = useCallback(
    (roleId: string) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      setSelectedRole(null);
      router.push(`/free-chat/${roleId}`);
    },
    [isLoggedIn, router, t],
  );

  const handleViewMedia = useCallback(
    (roleId: string) => {
      setSelectedRole(null);
      router.push(`/agent/${roleId}/media` as never);
    },
    [router],
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>{t('freeChat.title')}</Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={TOKENS.colors.searchAccent} style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder={t('freeChat.searchPlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {q.length > 0 ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={TOKENS.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <DefaultFilterChip
            label={t('freeChat.allCategories')}
            active={!categoryId}
            onPress={() => setCategoryId('')}
          />
          {categories.map((cat) => {
            const active = categoryId === cat.category_id;
            return (
              <DefaultFilterChip
                key={cat.category_id}
                label={cat.name}
                active={active}
                onPress={() => setCategoryId(active ? '' : cat.category_id)}
              />
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  const renderBody = () => {
    if (loading) {
      return <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />;
    }
    if (loadFailed) {
      return (
        <View style={styles.errorWrap}>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void loadData()} activeOpacity={0.8}>
            <Text style={styles.retryText}>{t('freeChat.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!isLoggedIn || ownedRoles.length === 0) {
      return <Text style={styles.empty}>{t('freeChat.emptyAgents')}</Text>;
    }
    if (filteredRoles.length === 0) {
      return <Text style={styles.empty}>{t('freeChat.noFilterResults')}</Text>;
    }
    return (
      <ScrollView
        {...scrollWebProps}
        style={[styles.list, scrollWebProps.style]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
          {filteredRoles.map((item) => (
            <DefaultAgentRoleCard
              key={item.id}
              item={roleItemToGridCard(item)}
              uiLang={lang}
              variant={isListLayout ? 'list' : 'grid'}
              onPress={onAgentPress}
              nameFallback={t('freeChat.defaultAgentName')}
            />
          ))}
        </RoleGridContainer>
      </ScrollView>
    );
  };

  if (!isRestored) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={TOKENS.colors.accent} />
      </View>
    );
  }

  return (
    <DefaultShell scrollable={false}>
      <View style={styles.content}>
        {header}
        {renderBody()}
      </View>

      <ThemedAgentDetailModal
        visible={selectedRole !== null}
        role={selectedRole}
        mode="library"
        onClose={handleCloseConfirm}
        onStartChat={handleStartChat}
        onViewMedia={handleViewMedia}
        onManage={handleManage}
        onSocialManage={handleSocialManage}
      />
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: H_PADDING,
    paddingTop: 40,
    paddingBottom: 24,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    gap: 16,
    marginBottom: 20,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
    },
    'serif',
  ),
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8, 9, 13, 0.72)',
    paddingHorizontal: 18,
    minHeight: 48,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        } as object)
      : {}),
  },
  searchIcon: {
    marginRight: 10,
  },
  search: Typo(
    {
      flex: 1,
      color: TOKENS.colors.text,
      fontSize: 15,
      paddingVertical: 12,
      ...(Platform.OS === 'web'
        ? ({ outlineStyle: 'none', outlineWidth: 0 } as object)
        : {}),
    },
    'sans',
  ),
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 8,
  },
  loader: {
    marginTop: 40,
  },
  errorWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  retryBtn: {
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    'sans',
  ),
  empty: Typo(
    {
      color: TOKENS.colors.textSecondary,
      textAlign: 'center',
      marginTop: 40,
    },
    'sans',
  ),
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
});
