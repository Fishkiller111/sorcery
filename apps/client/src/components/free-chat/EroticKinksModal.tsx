import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { getEroticKinksMe, type EroticKinksMeResp } from '../../api/eroticKinks';
import { formatApiError } from '../../utils/apiError';
import { notifyError } from '../../utils/notify';

type Props = {
  visible: boolean;
  roleId: string;
  onClose: () => void;
};

const PANEL = {
  bg: '#0B0D18',
  text: '#F7F8FC',
  muted: '#7E879E',
  accent: '#E84B6A',
  line: 'rgba(255,255,255,0.08)',
  chip: 'rgba(232,75,106,0.18)',
} as const;

export function EroticKinksModal({ visible, roleId, onClose }: Props) {
  const { t } = useI18n();
  const scrollProps = themedScrollViewProps('default');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EroticKinksMeResp | null>(null);

  const load = useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    try {
      const resp = await getEroticKinksMe(roleId);
      setData(resp);
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setLoading(false);
    }
  }, [roleId, t]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const pressure = data?.maintain_pressure ?? 'low';
  const pressureColor =
    pressure === 'high' ? PANEL.accent : pressure === 'medium' ? '#E8A84B' : '#6BCB8A';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('freeChat.kinkModalTitle')}</Text>
          <Text style={styles.hint}>{t('freeChat.kinkHint')}</Text>

          {loading ? (
            <ActivityIndicator color={PANEL.accent} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={{ maxHeight: 420 }} {...scrollProps}>
              <Text style={styles.section}>{t('freeChat.kinkAddictions')}</Text>
              {data && data.addictions.length === 0 ? (
                <Text style={styles.empty}>{t('freeChat.kinkEmptyAddiction')}</Text>
              ) : (
                <View style={styles.chipRow}>
                  {(data?.addictions ?? []).map((a) => (
                    <View key={a.category} style={styles.chip}>
                      <Text style={styles.chipText}>
                        {t(`freeChat.kinkAddiction.${a.category}` as 'freeChat.kinkAddiction.anal') ||
                          a.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.pressureRow}>
                <Text style={styles.muted}>
                  {data?.active_count ?? 0}/9
                  {pressure === 'high' ? ` · ${t('freeChat.kinkPressureHigh')}` : ''}
                </Text>
                <View style={[styles.pressureDot, { backgroundColor: pressureColor }]} />
              </View>

              <Text style={[styles.section, { marginTop: 16 }]}>{t('freeChat.kinkStats')}</Text>
              {(data?.stats ?? []).map((s) => (
                <View key={s.category} style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {t(`freeChat.kinkCat.${s.category}` as 'freeChat.kinkCat.anal') || s.label}
                  </Text>
                  <Text style={styles.statCount}>{s.hit_count}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{t('freeChat.kinkUnlockDismiss')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: PANEL.bg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PANEL.line,
    padding: 20,
  },
  title: { ...Typo({ fontSize: 18, fontWeight: '600' }), color: PANEL.text, marginBottom: 6 },
  hint: { ...Typo({ fontSize: 12 }), color: PANEL.muted, marginBottom: 14 },
  section: { ...Typo({ fontSize: 13, fontWeight: '600' }), color: PANEL.text, marginBottom: 8 },
  empty: { ...Typo({ fontSize: 13 }), color: PANEL.muted, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    backgroundColor: PANEL.chip,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { ...Typo({ fontSize: 12 }), color: PANEL.accent },
  pressureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  muted: { ...Typo({ fontSize: 12 }), color: PANEL.muted },
  pressureDot: { width: 8, height: 8, borderRadius: 4 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PANEL.line,
  },
  statLabel: { ...Typo({ fontSize: 13 }), color: PANEL.text },
  statCount: { ...Typo({ fontSize: 13 }), color: PANEL.muted },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closeText: { ...Typo({ fontSize: 13, fontWeight: '600' }), color: PANEL.accent },
});
