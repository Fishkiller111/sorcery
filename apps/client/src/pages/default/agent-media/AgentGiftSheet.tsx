import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getExploreGiftCatalog, sendExploreGift } from '../../../api/roles';
import { getPointsBalance } from '../../../api/referral';
import { ApiError } from '../../../api/client';
import { resolveStaticUrl } from '../../../constants/config';
import { useI18n } from '../../../i18n/I18nContext';
import type { GiftItemView, SendMediaResp } from '../../../types/api';
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import { notifyError, notifySuccess, notifyWarning } from '../../../utils/notify';
import { formatApiError } from '../../../utils/apiError';
import { GiftFxOverlay } from './GiftFxOverlay';

/** UI 默认配色；非原始设计稿素材。 */
const GIFT_UI = {
  panelFrom: '#10152A',
  panelMid: '#16122C',
  panelTo: '#1C1230',
  panelBorder: 'rgba(120, 100, 180, 0.28)',
  rowBg: 'rgba(28, 30, 52, 0.72)',
  rowBgActive: 'rgba(48, 36, 78, 0.88)',
  rowBorder: 'rgba(110, 90, 170, 0.22)',
  rowBorderActive: 'rgba(200, 90, 200, 0.55)',
  avatarRing: ['#5B8CFF', '#B04DFF', '#E04BB8'] as const,
  divider: ['#FF4B7A', '#C44DFF', 'rgba(90, 70, 140, 0.15)'] as const,
  crown: ['#6EB6FF', '#C44DFF', '#FF5AA8'] as const,
  text: '#FFFFFF',
  textSecondary: '#B8B4C8',
  textMuted: '#8E8AA0',
  sendFrom: '#E84B6A',
  sendTo: '#A848C8',
} as const;

type AgentGiftSheetProps = {
  visible: boolean;
  roleId: string;
  agentName?: string;
  onClose: () => void;
  onSent?: (pointsSpent: number) => void;
};

/** 中性自制占位符，替代未授权的装饰图形。 */
function GiftCrownIcon({ size = 40 }: { size?: number }) {
  return <View style={{ width: size, height: size * 0.82, borderWidth: 1, borderColor: GIFT_UI.textMuted, borderRadius: 4 }} />;
}

function GiftAvatar({ uri, size = 52 }: { uri: string | null; size?: number }) {
  const inner = size - 4;
  return (
    <LinearGradient
      colors={[...GIFT_UI.avatarRing]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatarRing, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <View
        style={[
          styles.avatarInner,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
          },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <Ionicons name="gift-outline" size={22} color={GIFT_UI.textMuted} />
        )}
      </View>
    </LinearGradient>
  );
}

export function AgentGiftSheet({
  visible,
  roleId,
  agentName,
  onClose,
  onSent,
}: AgentGiftSheetProps) {
  const { t } = useI18n();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const [items, setItems] = useState<GiftItemView[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [fx, setFx] = useState<{
    tier: number;
    giftImageUrl?: string;
    reward?: SendMediaResp;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, bal] = await Promise.all([
        getExploreGiftCatalog(roleId),
        getPointsBalance().catch(() => null),
      ]);
      setItems(catalog.items ?? []);
      setBalance(bal?.points ?? null);
      setSelectedId((prev) => {
        if (prev && catalog.items.some((g) => g.gift_id === prev)) return prev;
        return catalog.items[0]?.gift_id ?? null;
      });
    } catch (err) {
      notifyError(t('agentMedia.giftLoadFailed'), formatApiError(t, err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [roleId, t]);

  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
      setSending(false);
      return;
    }
    void load();
  }, [visible, load]);

  const selected = items.find((g) => g.gift_id === selectedId) ?? null;

  const onSend = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const clientGiftId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const resp = await sendExploreGift(roleId, {
        gift_id: selected.gift_id,
        quantity: 1,
        client_gift_id: clientGiftId,
      });
      onSent?.(resp.points_spent);
      const tier = resp.effect_tier || selected.effect_tier || 0;
      if (tier >= 1) {
        setFx({
          tier,
          giftImageUrl: resp.gift_image_url || selected.image_url,
          reward: resp.already_processed ? undefined : resp.reward,
        });
      } else {
        notifySuccess(t('agentMedia.giftSuccess'));
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PTS_001') {
        notifyWarning(t('agentMedia.giftInsufficient'));
      } else if (err instanceof ApiError && err.code === 'SOCIAL_010') {
        notifyWarning(t('agentMedia.giftUnavailable'));
      } else {
        notifyError(t('agentMedia.giftLoadFailed'), formatApiError(t, err));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />

        <LinearGradient
          colors={[GIFT_UI.panelFrom, GIFT_UI.panelMid, GIFT_UI.panelTo]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.panel}
        >
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button">
            <Ionicons name="close" size={18} color={GIFT_UI.textMuted} />
          </Pressable>

          <View style={styles.crownWrap}>
            <GiftCrownIcon size={44} />
          </View>

          <LinearGradient
            colors={[...GIFT_UI.divider]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.divider}
          />

          {balance != null ? (
            <Text style={styles.balance}>
              {t('agentMedia.giftBalance').replace('{n}', String(balance))}
              {agentName ? ` · ${agentName}` : ''}
            </Text>
          ) : agentName ? (
            <Text style={styles.balance}>{agentName}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color={GIFT_UI.crown[1]} style={styles.loader} />
          ) : items.length === 0 ? (
            <Text style={styles.empty}>{t('agentMedia.giftEmpty')}</Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.gift_id}
              {...scrollWebProps}
              style={[styles.list, scrollWebProps.style]}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.gift_id === selectedId;
                const resolved = item.image_url ? resolveStaticUrl(item.image_url) : undefined;
                const uri: string | null = resolved || null;
                return (
                  <Pressable
                    onPress={() => setSelectedId(item.gift_id)}
                    style={({ pressed }) => [
                      styles.giftRow,
                      active && styles.giftRowActive,
                      pressed && styles.giftRowPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <GiftAvatar uri={uri} />
                    <View style={styles.giftCopy}>
                      <Text style={styles.giftName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text style={styles.giftDesc} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.giftCost}>
                      {t('agentMedia.giftCost').replace('{n}', String(item.cost_points))}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}

          <Pressable
            onPress={() => void onSend()}
            disabled={!selected || sending || loading}
            style={({ pressed }) => [
              styles.sendWrap,
              (!selected || sending || loading || pressed) && styles.sendDim,
            ]}
          >
            <LinearGradient
              colors={[GIFT_UI.sendFrom, GIFT_UI.sendTo]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.sendBtn}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>
                  {selected
                    ? `${t('agentMedia.giftSend')} · ${selected.cost_points}`
                    : t('agentMedia.giftSend')}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
    <GiftFxOverlay
      visible={Boolean(fx)}
      tier={fx?.tier ?? 1}
      giftImageUrl={fx?.giftImageUrl}
      reward={fx?.reward}
      agentName={agentName}
      onDone={() => setFx(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GIFT_UI.panelBorder,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 18,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        } as object)
      : {}),
    ...Platform.select({
      ios: {
        shadowColor: '#B04DFF',
        shadowOpacity: 0.22,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  divider: {
    alignSelf: 'center',
    width: '78%',
    height: 1.5,
    borderRadius: 999,
    marginBottom: 12,
  },
  balance: Typo(
    {
      color: GIFT_UI.textSecondary,
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 12,
    },
    'sans',
  ),
  loader: {
    marginVertical: 40,
  },
  empty: Typo(
    {
      color: GIFT_UI.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginVertical: 40,
      paddingHorizontal: 16,
    },
    'sans',
  ),
  list: {
    flexGrow: 0,
    maxHeight: 340,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: GIFT_UI.rowBg,
    borderWidth: 1,
    borderColor: GIFT_UI.rowBorder,
  },
  giftRowActive: {
    backgroundColor: GIFT_UI.rowBgActive,
    borderColor: GIFT_UI.rowBorderActive,
  },
  giftRowPressed: {
    opacity: 0.9,
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#12122A',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  giftCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  giftName: Typo(
    {
      color: GIFT_UI.text,
      fontSize: 15,
      fontWeight: '600',
    },
    'sans',
  ),
  giftDesc: Typo(
    {
      color: GIFT_UI.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans',
  ),
  giftCost: Typo(
    {
      color: GIFT_UI.crown[2],
      fontSize: 13,
      fontWeight: '700',
      marginRight: 6,
    },
    'sans',
  ),
  sendWrap: {
    marginTop: 14,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sendDim: {
    opacity: 0.55,
  },
  sendBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  sendBtnText: Typo(
    {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    'sans',
  ),
});
