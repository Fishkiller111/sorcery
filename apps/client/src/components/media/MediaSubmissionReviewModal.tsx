import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { TOKENS } from '../../pages/default/theme/tokens';
import {
  approveMediaSubmission,
  getMediaSubmission,
  rejectMediaSubmission,
} from '../../api/mediaSubmissions';
import { resolveStaticUrl } from '../../constants/config';
import { formatApiError } from '../../utils/apiError';
import { notifyError, notifySuccess } from '../../utils/notify';
import type { RoleMediaSubmissionItem } from '../../types/api';

type Rating = 'standard' | 'r' | 'mature';

type Props = {
  visible: boolean;
  submissionId: string | null;
  onClose: () => void;
  onDone?: () => void;
};

export function MediaSubmissionReviewModal({ visible, submissionId, onClose, onDone }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [item, setItem] = useState<RoleMediaSubmissionItem | null>(null);
  const [rating, setRating] = useState<Rating>('standard');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'review' | 'reject'>('review');

  useEffect(() => {
    if (!visible || !submissionId) return;
    setMode('review');
    setReason('');
    setRating('standard');
    setLoading(true);
    void getMediaSubmission(submissionId)
      .then((row) => setItem(row))
      .catch((e) => {
        notifyError(formatApiError(t, e));
        setItem(null);
      })
      .finally(() => setLoading(false));
  }, [visible, submissionId, t]);

  const imageUri = item?.image_url ? resolveStaticUrl(item.image_url) : null;
  const canAct = item?.status === 'pending';

  const onApprove = async () => {
    if (!submissionId || !canAct || busy) return;
    setBusy(true);
    try {
      await approveMediaSubmission(submissionId, { content_rating: rating });
      notifySuccess(t('creationCenter.reviewApproved'));
      onDone?.();
      onClose();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!submissionId || !canAct || busy) return;
    if (!reason.trim()) {
      notifyError(t('creationCenter.reviewRejectReason'));
      return;
    }
    setBusy(true);
    try {
      await rejectMediaSubmission(submissionId, { reason: reason.trim() });
      notifySuccess(t('creationCenter.reviewRejected'));
      onDone?.();
      onClose();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(false);
    }
  };

  const styles = useMemo(() => createStyles(), []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('creationCenter.submitToMediaLibrary')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={TOKENS.colors.text} />
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={TOKENS.colors.accent} style={{ marginVertical: 28 }} />
          ) : item ? (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
              ) : null}
              <Text style={styles.meta}>
                {(item.role_name || item.role_id) + ' · ' + item.status}
              </Text>
              {item.prompt ? (
                <Text style={styles.prompt} numberOfLines={4}>
                  {item.prompt}
                </Text>
              ) : null}
              {item.reject_reason ? (
                <Text style={styles.rejectBox}>{item.reject_reason}</Text>
              ) : null}

              {canAct && mode === 'review' ? (
                <>
                  <Text style={styles.label}>{t('creationCenter.reviewPickRating')}</Text>
                  <View style={styles.ratingRow}>
                    {(['standard', 'r', 'mature'] as Rating[]).map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => setRating(r)}
                        style={[styles.ratingChip, rating === r && styles.ratingChipActive]}
                      >
                        <Text style={styles.ratingText}>
                          {r === 'standard'
                            ? t('creationCenter.reviewRatingStandard')
                            : r === 'r'
                              ? t('creationCenter.reviewRatingR')
                              : t('creationCenter.reviewRatingMature')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.btn, styles.btnGhost]}
                      onPress={() => setMode('reject')}
                      disabled={busy}
                    >
                      <Text style={styles.btnGhostText}>{t('creationCenter.reviewReject')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, styles.btnPrimary]}
                      onPress={() => void onApprove()}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>{t('creationCenter.reviewApprove')}</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : null}

              {canAct && mode === 'reject' ? (
                <>
                  <Text style={styles.label}>{t('creationCenter.reviewRejectReason')}</Text>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    style={styles.reasonInput}
                    multiline
                    placeholderTextColor={TOKENS.colors.textMuted}
                  />
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.btn, styles.btnGhost]}
                      onPress={() => setMode('review')}
                      disabled={busy}
                    >
                      <Text style={styles.btnGhostText}>{t('creationCenter.historyBack')}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, styles.btnDanger]}
                      onPress={() => void onReject()}
                      disabled={busy}
                    >
                      {busy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.btnPrimaryText}>{t('creationCenter.reviewReject')}</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          ) : (
            <Text style={styles.meta}>{t('creationCenter.notifEmpty')}</Text>
          )}
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
      maxHeight: '88%',
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    title: { fontSize: 16, fontWeight: '600', color: TOKENS.colors.text, flex: 1 },
    body: { maxHeight: 520 },
    preview: {
      width: '100%',
      height: 260,
      borderRadius: 12,
      backgroundColor: '#0a0c12',
      marginBottom: 10,
    },
    meta: { color: TOKENS.colors.textSecondary, fontSize: 12, marginBottom: 6 },
    prompt: { color: TOKENS.colors.text, fontSize: 13, lineHeight: 19, marginBottom: 10 },
    rejectBox: {
      color: '#f2a0a0',
      fontSize: 13,
      backgroundColor: 'rgba(179,59,69,0.15)',
      padding: 10,
      borderRadius: 8,
      marginBottom: 10,
    },
    label: { color: TOKENS.colors.textSecondary, fontSize: 12, marginBottom: 8, marginTop: 4 },
    ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    ratingChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
    },
    ratingChipActive: {
      borderColor: TOKENS.colors.accent,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    ratingText: { color: TOKENS.colors.text, fontSize: 12, fontWeight: '600' },
    reasonInput: {
      minHeight: 80,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      borderRadius: 10,
      padding: 10,
      color: TOKENS.colors.text,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    btn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnGhost: { borderWidth: 1, borderColor: TOKENS.colors.cardBorder },
    btnGhostText: { color: TOKENS.colors.text, fontWeight: '600' },
    btnPrimary: { backgroundColor: TOKENS.colors.accent },
    btnDanger: { backgroundColor: '#b33b45' },
    btnPrimaryText: { color: '#fff', fontWeight: '600' },
  });
}
