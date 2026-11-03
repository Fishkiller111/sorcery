import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { FreeChatShell } from '../../components/shell/FreeChatShell';
import { AgentList } from '../../components/free-chat/AgentList';
import { AgentConfirmModal } from '../../components/free-chat/AgentConfirmModal';
import { Agent } from '../../components/free-chat/AgentCard';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useAuthStore } from '../../stores/authStore';
import { listAllRoles } from '../../api/roles';
import { notifyError } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { requireLoginForAction } from '../../utils/requireLogin';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import type { RoleItem } from '../../types/api';

const EMBLEM_CCCP = require('../../../assets/images/ui/agents/emblem_cccp_badge.png');

/** Soviet 主题 Free Chat Agent 列表（非独立路由） */
export default function FreeChatSoviet() {
  const { t, lang } = useI18n();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isRestored = useAuthStore((s) => s.isRestored);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  const ownedRoles = roles.filter((role) => role.is_owner === true);

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
      console.error('Failed to load free chat data:', err);
      notifyError(t('freeChat.error'), formatApiError(t, err));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, t]);

  useFocusEffect(
    useCallback(() => {
      if (!isRestored) return;
      loadData();
    }, [isRestored, loadData]),
  );

  const handleAgentPress = useCallback((agent: Agent) => {
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    const role = ownedRoles.find((r) => r.id === agent.id) ?? null;
    setSelectedRole(role);
  }, [isLoggedIn, ownedRoles, router, t]);

  const handleCloseConfirm = useCallback(() => {
    setSelectedRole(null);
  }, []);

  const handleSettingsPress = useCallback(
    (agent: Agent) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      router.push(`/agent/${agent.id}/settings`);
    },
    [isLoggedIn, router, t],
  );

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

  if (!isRestored) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={COLORS.agents.brightGold} />
      </View>
    );
  }

  return (
    <FreeChatShell>
      <View style={styles.pageRoot}>
        <LinearGradient colors={['#12141a', '#0a0b0f', '#050608']} style={styles.gradient} />

        <View style={[styles.content, pageContentPadding]}>
        <View style={styles.titleRow}>
          <Image source={EMBLEM_CCCP} style={styles.titleEmblem} resizeMode="contain" />
          <Text style={Typo(styles.title, 'display', lang)}>{t('freeChat.title')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.agents.brightGold} style={styles.loader} />
        ) : loadFailed ? (
          <View style={styles.errorContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={loadData} activeOpacity={0.7}>
              <Text style={Typo(styles.retryText, 'display', lang)}>{t('freeChat.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <AgentList
            roles={ownedRoles}
            onAgentPress={handleAgentPress}
            onSettingsPress={handleSettingsPress}
          />
        )}
      </View>
      </View>

      <AgentConfirmModal
        visible={selectedRole !== null}
        role={selectedRole}
        onClose={handleCloseConfirm}
        onStartChat={handleStartChat}
        onManage={handleManage}
        onSocialManage={handleSocialManage}
      />

    </FreeChatShell>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  pageRoot: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  titleEmblem: {
    width: 28,
    height: 42,
  },
  title: {
    color: COLORS.agents.paleGold,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loader: {
    marginTop: 40,
  },
  errorContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.agents.brightGold,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: '#0a0b0f',
    fontSize: 13,
    fontWeight: '700',
  },
});
