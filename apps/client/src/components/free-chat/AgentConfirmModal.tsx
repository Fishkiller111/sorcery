import type { Lang } from '../../i18n/types';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { resolveStaticUrl } from '../../constants/config';
import { getRole } from '../../api/roles';
import type { RoleDetailResp, RoleItem } from '../../types/api';

interface AgentConfirmModalProps {
  visible: boolean;
  role: RoleItem | null;
  onClose: () => void;
  onStartChat: (roleId: string) => void;
  onManage?: (roleId: string) => void;
  onSocialManage?: (roleId: string) => void;
}

function parseAttributes(attrJson?: string): Record<string, unknown> | null {
  if (!attrJson) return null;
  try {
    return JSON.parse(attrJson);
  } catch {
    return null;
  }
}

function formatAttributeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? v : String(v))).join(' · ');
  }
  return null;
}

function DetailSection({
  title,
  titleTone = 'gold',
  children,
  showDivider = true,
}: {
  title: string;
  titleTone?: 'gold' | 'red';
  children: React.ReactNode;
  showDivider?: boolean;
}) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={[styles.section, showDivider && styles.sectionDivider]}>
      <Text style={[styles.sectionTitle, titleTone === 'red' && styles.sectionTitleRed]}>{title}</Text>
      {children}
    </View>
  );
}

function PillTag({ label }: { label: string }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export function AgentConfirmModal({
 visible, role, onClose, onStartChat, onManage, onSocialManage }: AgentConfirmModalProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const scrollWebProps = useMemo(() => themedScrollViewProps('soviet'), []);
  const [detail, setDetail] = useState<RoleDetailResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !role) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getRole(role.id)
      .then((resp) => {
        if (!cancelled) setDetail(resp);
      })
      .catch((err) => {
        console.error('Failed to load role detail:', err);
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, role?.id]);

  const attributes = useMemo(
    () => parseAttributes(detail?.attributes ?? role?.attributes),
    [detail?.attributes, role?.attributes],
  );

  const background = formatAttributeValue(attributes?.background);
  const coverIdentity = formatAttributeValue(attributes?.cover_identity);

  const displayName = detail?.name ?? role?.name ?? '';
  const sceneName = detail?.scene_name ?? role?.scene_name ?? '';
  const sceneDesc = detail?.scene_desc ?? '';
  const figureUrl = detail?.figure_url ?? role?.figure_url;
  const avatarUrl = detail?.avatar_url ?? role?.avatar_url;
  const portraitUrl = figureUrl || avatarUrl;
  const worldviewName = detail?.worldview_name ?? role?.worldview_name ?? '';
  const worldviewSummary = detail?.worldview_summary ?? role?.worldview_summary ?? '';

  const characterBio =
    role?.introduction?.trim() ||
    background ||
    worldviewSummary ||
    sceneDesc ||
    null;

  const operationTags = useMemo(() => {
    const tags: string[] = [];
    if (role?.categories?.length) {
      for (const cat of role.categories) {
        if (cat.name && !tags.includes(cat.name)) tags.push(cat.name);
      }
    }
    if (sceneName && !tags.includes(sceneName)) tags.push(sceneName);
    return tags;
  }, [role?.categories, sceneName]);

  const subtitleParts = [coverIdentity || sceneName, worldviewName].filter(Boolean);
  const subtitle = subtitleParts.join(' / ');

  if (!role) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.headerBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.agents.paleGold} />
            </Pressable>
            <Text style={styles.headerTitle}>{t('agent.detailTitle')}</Text>
            <View style={styles.headerBtn}>
              <Ionicons name="star-outline" size={20} color={COLORS.agents.paleGold} />
            </View>
          </View>

          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroImageWrap}>
                {portraitUrl ? (
                  <Image
                    source={{ uri: resolveStaticUrl(portraitUrl) }}
                    style={styles.heroImage}
                    contentFit="cover"
                    contentPosition="top"
                  />
                ) : (
                  <View style={[styles.heroImage, styles.heroImageFallback]}>
                    <Text style={Typo(styles.heroImageFallbackText, 'display', lang)}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.heroFooter}>
                <Text style={styles.heroName} numberOfLines={2}>
                  {displayName.toUpperCase()}
                </Text>
                {subtitle ? (
                  <View style={styles.heroSubtitleRow}>
                    <Text style={styles.heroSubtitle} numberOfLines={2}>{subtitle}</Text>
                    {worldviewName ? (
                      <Ionicons name="star" size={10} color={COLORS.accent.red} style={styles.heroStar} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.detailsPanel}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.agents.paleGold} style={styles.loader} />
              ) : null}

              {characterBio ? (
                <DetailSection title={t('agent.characterBio')}>
                  <Text style={styles.sectionBody}>{characterBio}</Text>
                </DetailSection>
              ) : null}

              {worldviewName ? (
                <DetailSection title={t('agent.affiliatedFaction')}>
                  <View style={styles.pillRow}>
                    <PillTag label={worldviewName} />
                  </View>
                </DetailSection>
              ) : null}

              {operationTags.length > 0 ? (
                <DetailSection title={t('agent.relatedOperations')} showDivider={false}>
                  <View style={styles.pillRow}>
                    {operationTags.map((tag) => (
                      <PillTag key={tag} label={tag} />
                    ))}
                  </View>
                </DetailSection>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.sendButton}
              onPress={() => onStartChat(role.id)}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.agents.paleGold} />
              <Text style={styles.sendButtonText}>{t('agent.sendMessage')}</Text>
            </Pressable>

            {role.is_owner && (onManage || onSocialManage) ? (
              <View style={styles.manageLinks}>
                {onManage ? (
                  <Pressable
                    style={({ pressed }) => [styles.manageButton, pressed && styles.manageButtonPressed]}
                    onPress={() => onManage(role.id)}
                  >
                    <Ionicons name="settings-outline" size={15} color="#E8D5C4" />
                    <Text style={styles.manageButtonText}>{t('agent.basicManage')}</Text>
                  </Pressable>
                ) : null}
                {onSocialManage ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.manageButton,
                      styles.socialManageButton,
                      pressed && styles.socialManageButtonPressed,
                    ]}
                    onPress={() => onSocialManage(role.id)}
                  >
                    <Ionicons name="chatbubbles-outline" size={15} color="#F2B8BE" />
                    <Text style={styles.socialManageButtonText}>{t('agent.socialManage')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '92%',
    backgroundColor: '#12141a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.agents.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    'display', lang
  ),
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  heroCard: {
    backgroundColor: '#5c1515',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.35)',
    overflow: 'hidden',
    paddingTop: 12,
  },
  heroImageWrap: {
    width: '58%',
    maxWidth: 220,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#3d1010',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3d1010',
  },
  heroImageFallbackText: { color: COLORS.agents.paleGold, fontSize: 48 },
  heroFooter: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
  },
  heroName: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: 1.5,
      lineHeight: 28,
    },
    'display', lang
  ),
  heroSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  heroSubtitle: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 12,
      lineHeight: 16,
      flexShrink: 1,
    },
    'sans', lang
  ),
  heroStar: {
    flexShrink: 0,
  },
  detailsPanel: {
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  section: {
    paddingVertical: 12,
  },
  sectionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(232, 213, 181, 0.12)',
  },
  sectionTitle: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    'display', lang
  ),
  sectionTitleRed: {
    color: COLORS.accent.redDark,
  },
  sectionBody: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    'sans', lang
  ),
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    maxWidth: '100%',
  },
  pillText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans', lang
  ),
  loader: {
    marginVertical: 16,
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.agents.border,
    gap: 8,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7a1e1e',
    borderRadius: 6,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(158, 27, 27, 0.6)',
  },
  sendButtonText: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    'display', lang
  ),
  manageLinks: {
    width: '100%',
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 213, 196, 0.35)',
    backgroundColor: 'rgba(232, 213, 196, 0.08)',
  },
  manageButtonPressed: {
    backgroundColor: 'rgba(232, 213, 196, 0.16)',
    transform: [{ scale: 0.98 }],
  },
  manageButtonText: Typo(
    {
      color: '#E8D5C4',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    'sans', lang
  ),
  socialManageButton: {
    borderColor: 'rgba(186, 60, 71, 0.55)',
    backgroundColor: 'rgba(186, 60, 71, 0.14)',
  },
  socialManageButtonPressed: {
    backgroundColor: 'rgba(186, 60, 71, 0.24)',
    transform: [{ scale: 0.98 }],
  },
  socialManageButtonText: Typo(
    {
      color: '#F2B8BE',
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    'sans', lang
  ),
});
};
