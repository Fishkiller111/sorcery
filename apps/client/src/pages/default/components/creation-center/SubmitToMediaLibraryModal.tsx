import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../../i18n/I18nContext';
import { TOKENS } from '../../theme/tokens';
import { listExploreRoles } from '../../../../api/roles';
import { submitAiImageToRoleMedia } from '../../../../api/mediaSubmissions';
import { resolveStaticUrl } from '../../../../constants/config';
import { formatApiError } from '../../../../utils/apiError';
import { notifyError, notifySuccess } from '../../../../utils/notify';
import type { ExploreRoleItem } from '../../../../types/api';

type Props = {
  visible: boolean;
  recordId: string;
  onClose: () => void;
};

export function SubmitToMediaLibraryModal({ visible, recordId, onClose }: Props) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<ExploreRoleItem[]>([]);
  const [selected, setSelected] = useState<ExploreRoleItem | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const resp = await listExploreRoles({ q: query.trim() || undefined, page_size: 30 });
      setRoles(resp.roles ?? []);
    } catch (e) {
      notifyError(formatApiError(t, e));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setQ('');
    void load('');
  }, [visible, load]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => void load(q), 280);
    return () => clearTimeout(timer);
  }, [q, visible, load]);

  const onSubmit = async () => {
    if (!selected?.id || !recordId || submitting) return;
    setSubmitting(true);
    try {
      const resp = await submitAiImageToRoleMedia(recordId, selected.id);
      if (resp.review_queue === 'admin') {
        notifySuccess(t('creationCenter.submitSuccessAdmin'));
      } else {
        notifySuccess(t('creationCenter.submitSuccessCreator'));
      }
      onClose();
    } catch (e) {
      notifyError(t('creationCenter.submitFailed'), formatApiError(t, e));
    } finally {
      setSubmitting(false);
    }
  };

  const styles = useMemo(() => createStyles(), []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('creationCenter.submitPickRoleTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={22} color={TOKENS.colors.text} />
            </Pressable>
          </View>
          <Text style={styles.hint}>{t('creationCenter.submitPickRoleHint')}</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('creationCenter.submitSearchPlaceholder')}
            placeholderTextColor={TOKENS.colors.textMuted}
            style={styles.search}
          />
          {loading ? (
            <ActivityIndicator color={TOKENS.colors.accent} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={roles}
              keyExtractor={(item) => item.id}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = selected?.id === item.id;
                const avatar = item.avatar_url ? resolveStaticUrl(item.avatar_url) : null;
                const official = (item.source || '').toLowerCase() === 'official';
                return (
                  <Pressable
                    onPress={() => setSelected(item)}
                    style={[styles.row, active && styles.rowActive]}
                  >
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPh]} />
                    )}
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.name || item.id}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {official ? 'Official' : 'UGC'} · {item.id}
                      </Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color={TOKENS.colors.accent} />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.empty}>{t('creationCenter.historyEmpty')}</Text>
              }
            />
          )}
          <Pressable
            onPress={() => void onSubmit()}
            disabled={!selected || submitting}
            style={[styles.submitBtn, (!selected || submitting) && styles.submitDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{t('creationCenter.submitConfirm')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: TOKENS.colors.cardSolid,
      borderRadius: 16,
      padding: 16,
      maxHeight: '85%',
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: TOKENS.colors.text,
      flex: 1,
      marginRight: 8,
    },
    hint: {
      fontSize: 12,
      color: TOKENS.colors.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    search: {
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: TOKENS.colors.text,
      marginBottom: 10,
    },
    list: { maxHeight: 320 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    rowActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPh: { backgroundColor: TOKENS.colors.cardBorder },
    rowText: { flex: 1 },
    rowName: { fontSize: 15, color: TOKENS.colors.text, fontWeight: '500' },
    rowMeta: { fontSize: 11, color: TOKENS.colors.textMuted, marginTop: 2 },
    empty: {
      fontSize: 13,
      color: TOKENS.colors.textMuted,
      textAlign: 'center',
      paddingVertical: 24,
    },
    submitBtn: {
      marginTop: 12,
      backgroundColor: TOKENS.colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    submitDisabled: { opacity: 0.45 },
    submitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  });
}
