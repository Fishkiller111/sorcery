import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listOwnedWorlds } from '../../api/worldEditor';
import type { WorldEditorItem } from '../../types/worldDocument';
import { RoleGridContainer } from '../../components/agent/RoleGridContainer';
import { useRoleGridLayout } from '../../hooks/useRoleGridLayout';
import { computeCardWidth } from '../../utils/roleGrid';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { requireLoginForAction } from '../../utils/requireLogin';
import { useAuthStore } from '../../stores/authStore';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { ApiError } from '../../api/client';
import { notifyError } from '../../utils/notify';
import { DefaultShell } from './components/DefaultShell';
import { DefaultOwnedWorldCard } from './components/DefaultOwnedWorldCard';
import { TOKENS } from './theme/tokens';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const H_PADDING = TOKENS.layout.contentPadding;
const HOME_MOBILE_H_PADDING = 12;
const HOME_MIN_CARD_WIDTH = 148;
const HOME_MOBILE_COLUMNS = 2;
const HOME_GRID_GAP = 8;

export function DefaultMyWorldsScreen() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const homeHPadding = isDesktop ? H_PADDING : HOME_MOBILE_H_PADDING;
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const {
    numColumns: autoColumns,
    cardWidth: autoCardWidth,
    availableWidth,
    gap,
  } = useRoleGridLayout(homeHPadding, {
    minCardWidth: HOME_MIN_CARD_WIDTH,
    maxColumns: isDesktop ? undefined : HOME_MOBILE_COLUMNS,
    gap: HOME_GRID_GAP,
  });
  const numColumns = isDesktop ? autoColumns : HOME_MOBILE_COLUMNS;
  const cardWidth = isDesktop
    ? autoCardWidth
    : computeCardWidth(availableWidth, HOME_MOBILE_COLUMNS, gap);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [worlds, setWorlds] = useState<WorldEditorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!isLoggedIn) {
        setWorlds([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const resp = await listOwnedWorlds(50);
        setWorlds(resp.worlds ?? []);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t('worldPlay.loadFailed');
        setError(msg);
        notifyError(msg);
        setWorlds([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isLoggedIn, t],
  );

  useFocusEffect(
    useCallback(() => {
      if (!isRestored) return;
      if (!isLoggedIn) {
        requireLoginForAction(false, router, t('errors.authTokenMissing'));
        return;
      }
      void load('initial');
    }, [isRestored, isLoggedIn, load, router, t]),
  );

  const filtered = useMemo(() => {
    if (!debouncedQ) return worlds;
    const needle = debouncedQ.toLowerCase();
    return worlds.filter((w) => {
      const hay = `${w.title} ${w.code} ${w.tagline ?? ''} ${(w.tags ?? []).join(' ')}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [worlds, debouncedQ]);

  const onPressWorld = useCallback(
    (item: WorldEditorItem) => {
      router.push(`/world/${item.world_id}`);
    },
    [router],
  );

  const onEditWorld = useCallback(
    (item: WorldEditorItem) => {
      router.push(`/world/${item.world_id}/edit`);
    },
    [router],
  );

  const onCreate = useCallback(() => {
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    router.push('/create-world');
  }, [isLoggedIn, router, t]);

  const initialLoading = loading && worlds.length === 0;
  const showEmpty = !initialLoading && !refreshing && filtered.length === 0;

  if (!isRestored) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={TOKENS.colors.accent} />
      </View>
    );
  }

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.content, pageContentPadding, { paddingHorizontal: homeHPadding }]}>
        <ScrollView
          {...scrollWebProps}
          style={[styles.list, scrollWebProps.style]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={TOKENS.colors.accent}
            />
          }
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backRow}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('worldPlay.back')}
            >
              <Ionicons name="chevron-back" size={20} color={TOKENS.colors.text} />
              <Text style={Typo(styles.backText, 'sans', lang)}>{t('worldPlay.back')}</Text>
            </Pressable>

            <Text style={Typo(styles.title, 'serif', lang)}>{t('worldPlay.listTitle')}</Text>

            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={18}
                color={TOKENS.colors.searchAccent}
                style={styles.searchIcon}
              />
              <TextInput
                style={Typo(styles.search, 'sans', lang)}
                value={q}
                onChangeText={setQ}
                placeholder={t('freeChat.searchWorldsPlaceholder')}
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

            <View style={styles.toolbar}>
              <View style={styles.toolbarSpacer} />
              <Pressable
                onPress={onCreate}
                style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t('worldEditor.create.heading')}
                hitSlop={6}
              >
                <Ionicons name="add" size={22} color={TOKENS.colors.text} />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={Typo(styles.error, 'sans', lang)}>{error}</Text> : null}

          {initialLoading ? (
            <ActivityIndicator style={styles.loader} color={TOKENS.colors.accent} />
          ) : showEmpty ? (
            <Text style={Typo(styles.empty, 'sans', lang)}>
              {worlds.length === 0 ? t('worldPlay.emptyList') : t('worldPlay.noFilterResults')}
            </Text>
          ) : (
            <RoleGridContainer numColumns={numColumns} availableWidth={availableWidth} gap={gap}>
              {filtered.map((item) => (
                <View
                  key={item.world_id}
                  style={[
                    styles.gridItem,
                    Platform.OS !== 'web' && numColumns > 1 ? { width: cardWidth } : null,
                  ]}
                >
                  <DefaultOwnedWorldCard
                    item={item}
                    onPress={onPressWorld}
                    onEdit={onEditWorld}
                  />
                </View>
              ))}
            </RoleGridContainer>
          )}
        </ScrollView>
      </View>
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
    paddingTop: 40,
    paddingBottom: 0,
    position: 'relative',
    zIndex: 1,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 40 },
  header: {
    gap: 16,
    marginBottom: 20,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: -4,
  },
  backText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
  },
  title: {
    color: TOKENS.colors.text,
    fontSize: 28,
    lineHeight: 34,
  },
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
  search: {
    flex: 1,
    color: TOKENS.colors.text,
    fontSize: 15,
    paddingVertical: 12,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as object)
      : {}),
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toolbarSpacer: {
    flex: 1,
  },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  gridItem: {
    minWidth: 0,
  },
  loader: {
    marginTop: 40,
    marginBottom: 40,
  },
  empty: {
    color: TOKENS.colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  error: {
    color: TOKENS.colors.accent,
    fontSize: 13,
    marginBottom: 12,
  },
});
