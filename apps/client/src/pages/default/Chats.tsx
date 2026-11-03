import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { useAuthStore } from '../../stores/authStore';
import type { ChatConversationListItem } from '../../types/api';
import { requireLoginForAction } from '../../utils/requireLogin';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { ChatAgentHistorySidebar } from '../../components/free-chat/ChatAgentHistorySidebar';
import { DefaultShell } from './components/DefaultShell';

/**
 * PC「聊天」页：复用 ChatAgentHistorySidebar 的列表 UI（layout=page）。
 */
export function DefaultChatsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const pagePad = useMobilePageContentPaddingStyle();
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, []),
  );

  const onSelect = useCallback(
    (item: ChatConversationListItem) => {
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
      router.push(`/free-chat/${encodeURIComponent(item.role_id)}` as never);
    },
    [isLoggedIn, router, t],
  );

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.root, pagePad]}>
        <ChatAgentHistorySidebar
          layout="page"
          variant="default"
          refreshKey={refreshKey}
          onSelectConversation={onSelect}
        />
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
});
