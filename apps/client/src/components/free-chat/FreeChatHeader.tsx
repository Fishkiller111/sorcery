import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { resolveStaticUrl } from '../../constants/config';
import { TOKENS } from '../../pages/default/theme/tokens';
import { VerifiedRealPersonBadge } from '../agent/VerifiedRealPersonBadge';
import { type FreeChatUiVariant, glassWebStyle } from './freeChatUi';

interface FreeChatHeaderProps {
  agentName?: string;
  agentAvatar?: string;
  agentColor?: string;
  moodActivity?: string;
  onBack: () => void;
  /** 移动端：打开 Agent 会话列表（悬浮抽屉），避免左侧窄轨挤占聊天区 */
  onAgentList?: () => void;
  onCall?: () => void;
  callDisabled?: boolean;
  onHistory?: () => void;
  onEvents?: () => void;
  onBackground?: () => void;
  backgroundActive?: boolean;
  onInfo?: () => void;
  infoActive?: boolean;
  verifiedRealPerson?: boolean;
  /** World play: manual save progress. */
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  /** Play chat: report creator / content. */
  onReport?: () => void;
  variant?: FreeChatUiVariant;
}

export function FreeChatHeader({
  agentName,
  agentAvatar,
  agentColor = COLORS.accent.gold,
  moodActivity,
  onBack,
  onAgentList,
  onCall,
  callDisabled,
  onHistory,
  onEvents,
  onBackground,
  backgroundActive,
  onInfo,
  infoActive,
  verifiedRealPerson,
  onSave,
  saveDisabled,
  saveLoading,
  onReport,
  variant = 'soviet',
}: FreeChatHeaderProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const isDefault = variant === 'default';
  const avatarUri = agentAvatar ? resolveStaticUrl(agentAvatar) : undefined;
  const iconColor = isDefault ? TOKENS.colors.navTextInactive : COLORS.agents.paleGold;
  /** Header paint extends under the notch; content sits just below the status bar. */
  const topInset = Platform.OS === 'web' ? 12 : insets.top;

  return (
    <View
      style={[
        styles.root,
        isDefault && styles.rootDefault,
        { paddingTop: topInset + 4 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </Pressable>
          {onAgentList ? (
            <Pressable
              onPress={onAgentList}
              style={styles.backBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('chat.expandSidebar')}
            >
              <Ionicons name="albums-outline" size={20} color={iconColor} />
            </Pressable>
          ) : null}

          {avatarUri ? (
            <View style={{ position: 'relative' }}>
              <ExpoImage
                source={{ uri: avatarUri }}
                style={[styles.avatar, isDefault && styles.avatarDefault]}
                contentFit="cover"
              />
              {verifiedRealPerson ? <VerifiedRealPersonBadge size={14} /> : null}
            </View>
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                isDefault && styles.avatarDefault,
                { backgroundColor: isDefault ? TOKENS.colors.cardSolid : agentColor },
              ]}
            />
          )}

          <View style={styles.titleBlock}>
            <Text style={[styles.agentName, isDefault && styles.agentNameDefault]} numberOfLines={1}>
              {(agentName || t('freeChat.title')).toUpperCase()}
            </Text>
            {moodActivity ? (
              <Text style={[styles.statusText, isDefault && styles.statusTextDefault]} numberOfLines={1}>
                {moodActivity}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightGroup}>
          {onReport ? (
            <Pressable
              onPress={onReport}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('agentMedia.report')}
            >
              <Text style={[styles.reportText, isDefault && styles.reportTextDefault]}>
                {t('agentMedia.report')}
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.actionsRow}>
            {onSave ? (
              <Pressable
                onPress={onSave}
                disabled={saveDisabled || saveLoading}
                style={[
                  styles.squareIconBtn,
                  isDefault && styles.squareIconBtnDefault,
                  (saveDisabled || saveLoading) && styles.squareIconBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('worldPlay.saveProgress')}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color={iconColor} />
                ) : (
                  <Ionicons
                    name="bookmark-outline"
                    size={18}
                    color={saveDisabled ? 'rgba(245,241,232,0.28)' : iconColor}
                  />
                )}
              </Pressable>
            ) : null}
            {onCall ? (
              <Pressable
                onPress={onCall}
                disabled={callDisabled}
                style={[
                  styles.squareIconBtn,
                  isDefault && styles.squareIconBtnDefault,
                  callDisabled && styles.squareIconBtnDisabled,
                ]}
                accessibilityLabel={t('voiceCall.title')}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={callDisabled ? 'rgba(245,241,232,0.28)' : iconColor}
                />
              </Pressable>
            ) : null}
            {onHistory ? (
              <Pressable onPress={onHistory} style={[styles.squareIconBtn, isDefault && styles.squareIconBtnDefault]}>
                <Ionicons name="time-outline" size={18} color={iconColor} />
              </Pressable>
            ) : null}
            {onEvents ? (
              <Pressable onPress={onEvents} style={[styles.squareIconBtn, isDefault && styles.squareIconBtnDefault]}>
                <Ionicons name="flash-outline" size={18} color={iconColor} />
              </Pressable>
            ) : null}
            {onBackground ? (
              <Pressable
                onPress={onBackground}
                style={[
                  styles.squareIconBtn,
                  isDefault && styles.squareIconBtnDefault,
                  backgroundActive && (isDefault ? styles.squareIconBtnActiveDefault : styles.squareIconBtnActive),
                ]}
                accessibilityLabel={t('chat.bgTitle')}
              >
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={backgroundActive ? '#fff' : iconColor}
                />
              </Pressable>
            ) : null}
            {onInfo ? (
              <Pressable
                onPress={onInfo}
                style={[
                  styles.infoIconBtn,
                  isDefault && styles.infoIconBtnDefault,
                  infoActive && (isDefault ? styles.infoIconBtnActiveDefault : styles.infoIconBtnActive),
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={infoActive ? '#fff' : iconColor}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.footerBlock}>
        <Text style={[styles.protectedText, isDefault && styles.protectedTextDefault]}>
          {t('chat.protectedChat')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#08090C',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.agents.border,
    zIndex: 3,
  },
  rootDefault: {
    /** Opaque page bg so notch + name bar read as one block (not glass over gradient). */
    backgroundColor: TOKENS.colors.bg,
    borderBottomColor: TOKENS.colors.cardBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  backBtn: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexShrink: 0,
  },
  avatarDefault: {
    borderRadius: TOKENS.radius.input,
    borderColor: TOKENS.colors.cardBorder,
  },
  avatarFallback: {
    backgroundColor: COLORS.accent.gold,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  agentName: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 1.2,
      lineHeight: 22,
    },
    'display',
  ),
  agentNameDefault: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.6,
      lineHeight: 20,
    },
    'serif',
  ),
  statusText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      marginTop: 1,
      lineHeight: 14,
    },
    'sans',
  ),
  statusTextDefault: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      marginTop: 1,
      lineHeight: 14,
    },
    'sans',
  ),
  rightGroup: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  reportText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans',
  ),
  reportTextDefault: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans',
  ),
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  squareIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.agents.paleGold,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareIconBtnDefault: {
    borderRadius: TOKENS.radius.input,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...glassWebStyle,
  },
  squareIconBtnDisabled: {
    opacity: 0.45,
  },
  squareIconBtnActive: {
    backgroundColor: COLORS.accent.redDark,
    borderColor: COLORS.accent.red,
  },
  squareIconBtnActiveDefault: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  infoIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.agents.paleGold,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconBtnDefault: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    ...glassWebStyle,
  },
  infoIconBtnActive: {
    backgroundColor: COLORS.accent.redDark,
    borderColor: COLORS.accent.red,
  },
  infoIconBtnActiveDefault: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  footerBlock: {
    marginTop: 4,
  },
  protectedText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 9,
      letterSpacing: 0.5,
    },
    'mono',
  ),
  protectedTextDefault: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 9,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono',
  ),
});
