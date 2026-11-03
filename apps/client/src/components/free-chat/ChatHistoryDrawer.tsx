import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { TOKENS } from '../../pages/default/theme/tokens';
import { deleteChatSession, listChatSessions } from '../../api/chat';
import { MessageHost } from '../ui/Message';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { notifyError, notifySuccess } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { type FreeChatUiVariant, glassWebStyle } from './freeChatUi';
import type { ChatSessionListItem } from '../../types/api';

interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  roleId: string;
  currentSessionId?: string | null;
  onSelectSession: (sessionId: string) => void | Promise<void>;
  onNewChat: () => void | Promise<void>;
  /** 删除的是当前会话时，由父级切到新会话 / 重建 */
  onDeletedCurrent?: () => void | Promise<void>;
  variant?: FreeChatUiVariant;
}

function sessionPreview(item: ChatSessionListItem): string {
  const text = (item.preview || '').trim();
  return text || '—';
}

function sessionTimestamp(item: ChatSessionListItem): number {
  return item.last_message_at || item.started_at || 0;
}

function formatRelativeTime(ts: number, t: (key: string) => string): string {
  if (!ts) return '';
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const diff = Date.now() - ms;
  if (diff < 0) return t('chat.relativeJustNow');
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('chat.relativeJustNow');
  if (minutes < 60) return t('chat.relativeMinutesAgo').replace('{n}', String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('chat.relativeHoursAgo').replace('{n}', String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t('chat.relativeDaysAgo').replace('{n}', String(days));
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function ChatHistoryDrawer({
  visible,
  onClose,
  roleId,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeletedCurrent,
  variant = 'soviet',
}: ChatHistoryDrawerProps) {
  const { t } = useI18n();
  const isDefault = variant === 'default';
  const { width: screenWidth } = useWindowDimensions();
  const panelWidth = Math.min(380, Math.max(280, screenWidth * 0.34));

  const slideAnim = useRef(new Animated.Value(panelWidth)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const resp = await listChatSessions(roleId);
      setSessions(resp.data ?? []);
    } catch (err) {
      console.warn('Failed to list chat sessions:', err);
      setSessions([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      void fetchSessions();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: panelWidth, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      setPendingDeleteId(null);
    }
  }, [visible, panelWidth, slideAnim, backdropAnim, fetchSessions]);

  const handleSelect = async (sessionId: string) => {
    if (actionLoading || deleting) return;
    if (sessionId === currentSessionId) {
      onClose();
      return;
    }
    setActionLoading(true);
    try {
      await onSelectSession(sessionId);
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (actionLoading || deleting) return;
    setActionLoading(true);
    try {
      await onNewChat();
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId || deleting) return;
    const targetId = pendingDeleteId;
    const wasCurrent = targetId === currentSessionId;
    setDeleting(true);
    try {
      await deleteChatSession(targetId);
      setPendingDeleteId(null);
      setSessions((prev) => prev.filter((s) => s.session_id !== targetId));
      notifySuccess(t('chat.deleteConversationSuccess'));
      if (wasCurrent && onDeletedCurrent) {
        await onDeletedCurrent();
      }
      await fetchSessions();
    } catch (err) {
      notifyError(formatApiError(t, err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.panel,
            isDefault && styles.panelDefault,
            isDefault && glassWebStyle,
            { width: panelWidth, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={[styles.panelHeader, isDefault && styles.panelHeaderDefault]}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={isDefault ? TOKENS.colors.text : COLORS.agents.paleGold}
              />
            </Pressable>
            <Text style={[styles.panelTitle, isDefault && styles.panelTitleDefault]} numberOfLines={1}>
              {t('chat.history')}
            </Text>
          </View>

          <Pressable
            onPress={() => void handleNewChat()}
            disabled={actionLoading || deleting}
            style={[styles.newChatBtn, isDefault && styles.newChatBtnDefault]}
          >
            <Ionicons
              name="add"
              size={18}
              color={isDefault ? TOKENS.colors.accent : COLORS.accent.red}
            />
            <Text style={[styles.newChatText, isDefault && styles.newChatTextDefault]}>
              {t('chat.newConversation')}
            </Text>
          </Pressable>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator
                color={isDefault ? TOKENS.colors.accent : COLORS.accent.gold}
              />
            </View>
          ) : loadError ? (
            <View style={styles.centerState}>
              <Text style={[styles.emptyText, isDefault && styles.emptyTextDefault]}>
                {t('chat.historyLoadFailed')}
              </Text>
              <Pressable onPress={() => void fetchSessions()} style={styles.retryBtn}>
                <Text style={[styles.retryText, isDefault && styles.retryTextDefault]}>
                  {t('chat.retry')}
                </Text>
              </Pressable>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={[styles.emptyText, isDefault && styles.emptyTextDefault]}>
                {t('chat.historyEmpty')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.session_id}
              renderItem={({ item }) => {
                const active = item.session_id === currentSessionId;
                return (
                  <Pressable
                    onPress={() => void handleSelect(item.session_id)}
                    disabled={actionLoading || deleting}
                    style={[
                      styles.sessionRow,
                      isDefault && styles.sessionRowDefault,
                      active && (isDefault ? styles.sessionRowActiveDefault : styles.sessionRowActive),
                    ]}
                  >
                    <Text
                      style={[styles.previewText, isDefault && styles.previewTextDefault]}
                      numberOfLines={1}
                    >
                      {sessionPreview(item)}
                    </Text>
                    <Text style={[styles.timeText, isDefault && styles.timeTextDefault]}>
                      {formatRelativeTime(sessionTimestamp(item), t)}
                    </Text>
                    <Pressable
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        if (actionLoading || deleting) return;
                        setPendingDeleteId(item.session_id);
                      }}
                      hitSlop={8}
                      disabled={actionLoading || deleting}
                      style={styles.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('chat.deleteConversation')}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={isDefault ? TOKENS.colors.textMuted : 'rgba(232, 213, 181, 0.45)'}
                      />
                    </Pressable>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              {...themedScrollViewProps(isDefault ? 'default' : 'soviet')}
            />
          )}

          {actionLoading ? (
            <View style={styles.actionOverlay} pointerEvents="none">
              <ActivityIndicator color={isDefault ? TOKENS.colors.accent : COLORS.accent.gold} />
            </View>
          ) : null}
        </Animated.View>
      </View>

      <ThemedGeneralConfirmModal
        visible={pendingDeleteId != null}
        icon="trash"
        title={t('chat.deleteConversation')}
        subtitle={t('chat.deleteConversationConfirm')}
        subtitleTone="warning"
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('chat.deleteConversation')}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
      />

      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#12141a',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.agents.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 16,
  },
  panelDefault: {
    backgroundColor: TOKENS.colors.navBg,
    borderLeftColor: TOKENS.colors.navBorder,
    shadowOpacity: 0.25,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 52,
    paddingHorizontal: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.agents.border,
  },
  panelHeaderDefault: {
    borderBottomColor: TOKENS.colors.lineFaint,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: Typo(
    {
      flex: 1,
      color: COLORS.agents.paleGold,
      fontSize: 16,
      fontWeight: '600',
    },
    'sans',
  ),
  panelTitleDefault: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    'sans',
  ),
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 213, 181, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  newChatBtnDefault: {
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: TOKENS.radius.button,
  },
  newChatText: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  newChatTextDefault: {
    color: TOKENS.colors.text,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(232, 213, 181, 0.12)',
  },
  sessionRowDefault: {
    borderBottomColor: TOKENS.colors.lineFaint,
  },
  sessionRowActive: {
    backgroundColor: 'rgba(232, 213, 181, 0.06)',
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  sessionRowActiveDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: TOKENS.radius.button,
  },
  previewText: Typo(
    {
      flex: 1,
      minWidth: 0,
      color: 'rgba(232, 213, 181, 0.78)',
      fontSize: 14,
      lineHeight: 20,
    },
    'sans',
  ),
  previewTextDefault: {
    color: TOKENS.colors.textSecondary,
  },
  timeText: Typo(
    {
      flexShrink: 0,
      color: 'rgba(232, 213, 181, 0.45)',
      fontSize: 12,
    },
    'sans',
  ),
  timeTextDefault: {
    color: TOKENS.colors.textMuted,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    'sans',
  ),
  emptyTextDefault: {
    color: TOKENS.colors.textMuted,
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: Typo(
    {
      color: COLORS.accent.red,
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
  retryTextDefault: {
    color: TOKENS.colors.accent,
  },
  actionOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
});
