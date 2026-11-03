import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { resolveStaticUrl } from '../../constants/config';
import { PublishStatusBadge } from '../agent/PublishStatusBadge';
import { AgentLangBadges } from '../agent/AgentLangBadges';
import type { RoleItem } from '../../types/api';
import { useI18n } from '../../i18n/I18nContext';

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  avatarColor?: string;
  lastMessage?: string;
  publishStatus?: string;
  isOwner?: boolean;
  worldviewName?: string;
  supportedLangs?: string[];
}

interface AgentCardProps {
  agent: Agent;
  onPress?: (agent: Agent) => void;
  onSettingsPress?: (agent: Agent) => void;
}

export function AgentCard({ agent, onPress, onSettingsPress }: AgentCardProps) {

  const { lang } = useI18n();
  const avatarSource = agent.avatarUrl ? { uri: resolveStaticUrl(agent.avatarUrl) } : undefined;
  const showBadge = agent.isOwner && agent.publishStatus !== undefined;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(agent)}
      activeOpacity={0.8}
    >
      {avatarSource ? (
        <Image source={avatarSource} style={styles.avatarImage} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, { backgroundColor: agent.avatarColor || COLORS.accent.gold }]}>
          <Text style={Typo(styles.avatarText, 'display', lang)}>{agent.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={Typo(styles.name, 'display', lang)}>{agent.name}</Text>
          {agent.worldviewName ? (
            <View style={styles.worldviewBadge}>
              <Text style={Typo(styles.worldviewBadgeText, 'mono', lang)} numberOfLines={1}>{agent.worldviewName}</Text>
            </View>
          ) : null}
        </View>
        <Text style={Typo(styles.desc, 'sans', lang)} numberOfLines={2}>{agent.description}</Text>
        {agent.supportedLangs?.length ? (
          <View style={styles.langRow}>
            <AgentLangBadges langs={agent.supportedLangs} uiLang={lang} compact />
          </View>
        ) : null}
        {showBadge ? <PublishStatusBadge status={agent.publishStatus} /> : null}
        {agent.lastMessage && (
          <Text style={Typo(styles.lastMessage, 'sans', lang)} numberOfLines={1}>{agent.lastMessage}</Text>
        )}
      </View>

      {agent.isOwner && onSettingsPress ? (
        <Pressable
          style={styles.settingsBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onSettingsPress(agent);
          }}
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={20} color={COLORS.text.muted} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={COLORS.text.muted} />
      )}
    </TouchableOpacity>
  );
}

export function roleItemToAgent(role: RoleItem): Agent {
  return {
    id: role.id,
    name: role.name,
    description: role.scene_name,
    avatarUrl: role.avatar_url,
    avatarColor: COLORS.accent.gold,
    publishStatus: role.publish_status,
    isOwner: role.is_owner,
    worldviewName: role.worldview_name,
    supportedLangs: role.supported_langs,
  };
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 22, 28, 0.85)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarText: { color: '#0a0b0f', fontSize: 18 },
  info: { flex: 1, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  name: { color: COLORS.text.primary, fontSize: 15, fontWeight: '700' },
  worldviewBadge: {
    maxWidth: '55%',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  worldviewBadgeText: { color: COLORS.accent.gold, fontSize: 10, fontWeight: '600' },
  desc: { color: COLORS.text.secondary, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  langRow: { marginBottom: 6 },
  lastMessage: { color: COLORS.text.muted, fontSize: 11 },
  settingsBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
