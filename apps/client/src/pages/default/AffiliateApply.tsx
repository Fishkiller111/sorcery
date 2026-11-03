import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from './theme/tokens';
import { safeGoBack } from '../../utils/safeGoBack';
import { formatApiError } from '../../utils/apiError';
import { notifyError, notifySuccess } from '../../utils/notify';
import {
  submitAffiliateApplication,
  uploadAffiliateProof,
  type AffiliateApplyChannel,
} from '../../api/affiliate';
import { pickChatImage, isNativeUploadFile, type ChatImageUploadFile } from '../../utils/pickChatImage';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { themedScrollViewProps } from '../../theme/webScrollbar';

const CHANNELS: AffiliateApplyChannel[] = ['youtube', 'x', 'tg', 'reddit', 'discord'];
const MODE_A_BULLETS = [
  'affiliate.modeABullet1',
  'affiliate.modeABullet2',
  'affiliate.modeABullet3',
] as const;
const MODE_B_BULLETS = [
  'affiliate.modeBBullet1',
  'affiliate.modeBBullet2',
  'affiliate.modeBBullet3',
] as const;
const RULE_KEYS = [
  'affiliate.rule1',
  'affiliate.rule2',
  'affiliate.rule3',
  'affiliate.rule4',
  'affiliate.rule5',
] as const;
const PAYOUT_ROWS = [
  ['affiliate.payoutCycle', 'affiliate.payoutCycleValue'],
  ['affiliate.payoutMin', 'affiliate.payoutMinValue'],
  ['affiliate.payoutMethod', 'affiliate.payoutMethodValue'],
  ['affiliate.payoutDate', 'affiliate.payoutDateValue'],
] as const;
const MAX_PROOF = 3;
const MAX_PROOF_BYTES = 2 * 1024 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ProofItem = {
  localUri: string;
  uploadedUrl?: string;
  uploading?: boolean;
};

function channelLabelKey(id: AffiliateApplyChannel): string {
  switch (id) {
    case 'youtube':
      return 'affiliate.channelYoutube';
    case 'x':
      return 'affiliate.channelX';
    case 'tg':
      return 'affiliate.channelTg';
    case 'reddit':
      return 'affiliate.channelReddit';
    case 'discord':
      return 'affiliate.channelDiscord';
  }
}

async function estimateFileBytes(file: ChatImageUploadFile): Promise<number | null> {
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    return file.size;
  }
  if (isNativeUploadFile(file) && Platform.OS === 'web') {
    try {
      const res = await fetch(file.uri);
      const blob = await res.blob();
      return blob.size;
    } catch {
      return null;
    }
  }
  return null;
}

export function DefaultAffiliateApply() {
  const router = useRouter();
  const { t, tp, lang } = useI18n();
  const isDesktop = useIsDesktop();
  const { width: windowWidth } = useWindowDimensions();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);

  const [selected, setSelected] = useState<Set<AffiliateApplyChannel>>(new Set());
  const [links, setLinks] = useState<Partial<Record<AffiliateApplyChannel, string>>>({});
  const [plan, setPlan] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [note, setNote] = useState('');
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // ru/es 文案更长：提高双列门槛，避免挤在一起
  const dualColMin = lang === 'ru' || lang === 'es' ? 900 : 720;
  const contentMax = Math.min(900, Math.max(320, windowWidth - (isDesktop ? 280 : 48)));
  const modeCols = isDesktop || windowWidth >= dualColMin;

  const toggleChannel = useCallback((id: AffiliateApplyChannel) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addProof = useCallback(async () => {
    if (proofs.length >= MAX_PROOF) {
      notifyError(t('affiliate.proofTooMany'));
      return;
    }
    try {
      const picked = await pickChatImage();
      if (!picked) return;
      const size = await estimateFileBytes(picked.file);
      if (size != null && size > MAX_PROOF_BYTES) {
        notifyError(t('affiliate.proofTooLarge'));
        return;
      }
      const idx = proofs.length;
      setProofs((prev) => [...prev, { localUri: picked.previewUri, uploading: true }]);
      try {
        const uploaded = await uploadAffiliateProof(picked.file, picked.filename);
        if (!uploaded.image_url) throw new Error('empty');
        setProofs((prev) =>
          prev.map((p, i) =>
            i === idx ? { localUri: picked.previewUri, uploadedUrl: uploaded.image_url, uploading: false } : p,
          ),
        );
      } catch (e) {
        setProofs((prev) => prev.filter((_, i) => i !== idx));
        notifyError(t('affiliate.errUpload'), formatApiError(t, e));
      }
    } catch (e) {
      notifyError(t('affiliate.errUpload'), formatApiError(t, e));
    }
  }, [proofs.length, t]);

  const removeProof = useCallback((index: number) => {
    setProofs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onSubmit = useCallback(async () => {
    if (submitting) return;
    const channels = CHANNELS.filter((c) => selected.has(c));
    if (channels.length === 0) {
      notifyError(t('affiliate.errChannels'));
      return;
    }
    const emailTrim = email.trim();
    if (!EMAIL_RE.test(emailTrim)) {
      notifyError(t('affiliate.errEmail'));
      return;
    }
    const tg = telegram.trim();
    if (!tg) {
      notifyError(t('affiliate.errTelegram'));
      return;
    }
    const wa = whatsapp.trim();
    if (!wa) {
      notifyError(t('affiliate.errWhatsapp'));
      return;
    }
    const planTrim = plan.trim();
    if (!planTrim) {
      notifyError(t('affiliate.errPlan'));
      return;
    }
    if (proofs.some((p) => p.uploading)) {
      notifyError(t('affiliate.errUpload'));
      return;
    }

    const channel_links: Partial<Record<AffiliateApplyChannel, string>> = {};
    for (const c of channels) {
      const url = (links[c] || '').trim();
      if (url) channel_links[c] = url;
    }
    const proof_image_urls = proofs.map((p) => p.uploadedUrl).filter((u): u is string => Boolean(u));

    setSubmitting(true);
    try {
      await submitAffiliateApplication({
        email: emailTrim,
        telegram_link: tg,
        whatsapp: wa,
        channels,
        channel_links,
        working_conditions: planTrim,
        applicant_note: note.trim() || undefined,
        proof_image_urls: proof_image_urls.length ? proof_image_urls : undefined,
        cooperation_model: 'channel',
        source: 'app',
        locale: lang,
      });
      setDone(true);
      notifySuccess(t('affiliate.successTitle'));
    } catch (e) {
      notifyError(t('affiliate.errSubmit'), formatApiError(t, e));
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    selected,
    email,
    telegram,
    whatsapp,
    plan,
    note,
    links,
    proofs,
    lang,
    t,
  ]);

  return (
    <DefaultShell scrollable={false}>
      <View style={[styles.root, pageContentPadding]}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <DefaultBackButton
            onPress={() => safeGoBack('/profile', router)}
            accessibilityLabel={t('affiliate.back')}
          />
          <Text style={styles.title}>
            {t('affiliate.applyTitle')}
          </Text>
        </View>

        <ScrollView
          {...scrollWebProps}
          style={scrollWebProps.style}
          contentContainerStyle={[styles.scrollInner, { maxWidth: contentMax }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>{t('affiliate.applyLead')}</Text>

          <View style={styles.benefitsBlock}>
            <Text style={styles.benefitsEyebrow}>{t('affiliate.benefitsEyebrow')}</Text>
            <Text style={styles.benefitsTagline}>{t('affiliate.benefitsTagline')}</Text>

            <View style={[styles.modeRow, modeCols && styles.modeRowDesktop]}>
              <View style={[styles.modeCard, modeCols && styles.modeCardDesktop]}>
                <View style={styles.modeBadge}>
                  <Text style={styles.modeBadgeText}>{t('affiliate.modeABadge')}</Text>
                </View>
                <Text style={styles.modeTitle}>{t('affiliate.modeATitle')}</Text>
                <Text style={[styles.modeRate, (lang === 'ru' || lang === 'es') && styles.modeRateCompact]}>
                  {t('affiliate.modeARate')}
                </Text>
                <Text style={styles.modeRateHint}>{t('affiliate.modeARateHint')}</Text>
                <Text style={styles.modeBody}>{t('affiliate.modeABody')}</Text>
                {MODE_A_BULLETS.map((key) => (
                  <View key={key} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>·</Text>
                    <Text style={styles.bulletText}>{t(key)}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.modeCard, modeCols && styles.modeCardDesktop]}>
                <View style={[styles.modeBadge, styles.modeBadgeAlt]}>
                  <Text style={styles.modeBadgeText}>{t('affiliate.modeBBadge')}</Text>
                </View>
                <Text style={styles.modeTitle}>{t('affiliate.modeBTitle')}</Text>
                <Text style={[styles.modeRate, lang === 'ru' || lang === 'es' ? styles.modeRateCompact : null]}>
                  {t('affiliate.modeBRate')}
                </Text>
                <Text style={styles.modeRateHint}>{t('affiliate.modeBRateHint')}</Text>
                <Text style={styles.modeBody}>{t('affiliate.modeBBody')}</Text>
                {MODE_B_BULLETS.map((key) => (
                  <View key={key} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>·</Text>
                    <Text style={styles.bulletText}>{t(key)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.payoutCard}>
              <Text style={styles.payoutTitle}>{t('affiliate.payoutTitle')}</Text>
              <View style={styles.payoutGrid}>
                {PAYOUT_ROWS.map(([labelKey, valueKey]) => (
                  <View key={labelKey} style={styles.payoutCell}>
                    <Text style={styles.payoutLabel}>{t(labelKey)}</Text>
                    <Text style={styles.payoutValue}>{t(valueKey)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.rulesCard}>
              <Text style={styles.payoutTitle}>{t('affiliate.rulesTitle')}</Text>
              {RULE_KEYS.map((key, idx) => (
                <View key={key} style={styles.bulletRow}>
                  <Text style={styles.ruleIndex}>{idx + 1}.</Text>
                  <Text style={styles.bulletText}>{t(key)}</Text>
                </View>
              ))}
            </View>
          </View>

          {done ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={28} color={TOKENS.colors.accent} />
              <Text style={styles.successText}>{t('affiliate.successTitle')}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.formSection}>{t('affiliate.formSection')}</Text>
              <Text style={styles.sectionLabel}>{t('affiliate.channelsLabel')}</Text>
              <View style={styles.chipRow}>
                {CHANNELS.map((id) => {
                  const on = selected.has(id);
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggleChannel(id)}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(channelLabelKey(id))}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {CHANNELS.filter((c) => selected.has(c)).map((id) => (
                <View key={`link-${id}`} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>
                    {tp('affiliate.channelLinkLabel', { channel: t(channelLabelKey(id)) })}
                  </Text>
                  <TextInput
                    value={links[id] || ''}
                    onChangeText={(v) => setLinks((prev) => ({ ...prev, [id]: v }))}
                    placeholder={t('affiliate.channelLinkPlaceholder')}
                    placeholderTextColor={TOKENS.colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
              ))}

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('affiliate.planLabel')}</Text>
                <TextInput
                  value={plan}
                  onChangeText={setPlan}
                  placeholder={t('affiliate.planPlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.textarea]}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('affiliate.proofLabel')}</Text>
                <Text style={styles.hint}>{t('affiliate.proofHint')}</Text>
                <View style={styles.proofRow}>
                  {proofs.map((p, idx) => (
                    <View key={`proof-${idx}`} style={styles.proofThumbWrap}>
                      <Image source={{ uri: p.localUri }} style={styles.proofThumb} contentFit="cover" />
                      {p.uploading ? (
                        <View style={styles.proofOverlay}>
                          <ActivityIndicator color="#fff" />
                        </View>
                      ) : null}
                      <Pressable style={styles.proofRemove} onPress={() => removeProof(idx)}>
                        <Text style={styles.proofRemoveText}>{t('affiliate.proofRemove')}</Text>
                      </Pressable>
                    </View>
                  ))}
                  {proofs.length < MAX_PROOF ? (
                    <Pressable style={styles.proofAdd} onPress={addProof}>
                      <Ionicons name="image-outline" size={22} color={TOKENS.colors.textMuted} />
                      <Text style={styles.proofAddText}>{t('affiliate.proofAdd')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Text style={styles.sectionLabel}>{t('affiliate.contactSection')}</Text>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('affiliate.emailLabel')}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('affiliate.emailPlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('affiliate.tgLabel')}</Text>
                <TextInput
                  value={telegram}
                  onChangeText={setTelegram}
                  placeholder={t('affiliate.tgPlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('affiliate.whatsappLabel')}</Text>
                <TextInput
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  placeholder={t('affiliate.whatsappPlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('affiliate.noteLabel')}</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={t('affiliate.notePlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.textareaShort]}
                />
              </View>

              <Pressable
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={onSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t('affiliate.submit')}</Text>
                )}
              </Pressable>
              {submitting ? <Text style={styles.hint}>{t('affiliate.submitting')}</Text> : null}
            </>
          )}
        </ScrollView>
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerDesktop: {
    paddingHorizontal: 24,
  },
  title: Typo(
    {
      flex: 1,
      flexShrink: 1,
      color: TOKENS.colors.text,
      fontSize: 22,
      letterSpacing: 0.4,
      lineHeight: 28,
    },
    'serif',
  ),
  scrollInner: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    alignSelf: 'center',
    width: '100%',
    gap: 14,
  },
  lead: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    'sans',
  ),
  benefitsBlock: {
    gap: 14,
    width: '100%',
  },
  benefitsEyebrow: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 12,
      letterSpacing: 0.6,
      fontWeight: '600',
    },
    'sans',
  ),
  benefitsTagline: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      lineHeight: 24,
      flexShrink: 1,
    },
    'serif',
  ),
  modeRow: {
    gap: 12,
  },
  modeRowDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  modeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    padding: 16,
    gap: 8,
    minWidth: 0,
  },
  modeCardDesktop: {
    minWidth: 0,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(201, 70, 78, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(201, 70, 78, 0.4)',
  },
  modeBadgeAlt: {
    backgroundColor: 'rgba(201, 168, 108, 0.18)',
    borderColor: 'rgba(201, 168, 108, 0.4)',
  },
  modeBadgeText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 11,
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    'sans',
  ),
  modeTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      flexShrink: 1,
    },
    'sans',
  ),
  modeRate: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: 0.5,
      flexShrink: 1,
    },
    'serif',
  ),
  modeRateCompact: {
    fontSize: 26,
    lineHeight: 32,
  },
  modeRateHint: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: -4,
      flexShrink: 1,
    },
    'sans',
  ),
  modeBody: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 21,
      marginTop: 2,
      marginBottom: 4,
      flexShrink: 1,
    },
    'sans',
  ),
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  bulletDot: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 16,
      lineHeight: 21,
      width: 10,
    },
    'sans',
  ),
  ruleIndex: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 21,
      width: 18,
      flexShrink: 0,
    },
    'sans',
  ),
  bulletText: Typo(
    {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 21,
    },
    'sans',
  ),
  payoutCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    gap: 12,
  },
  payoutTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
      flexShrink: 1,
    },
    'sans',
  ),
  payoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  payoutCell: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  payoutLabel: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      letterSpacing: 0.2,
      lineHeight: 16,
    },
    'sans',
  ),
  payoutValue: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      flexShrink: 1,
    },
    'sans',
  ),
  rulesCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    padding: 16,
    gap: 8,
  },
  sectionLabel: Typo(
    {
      marginTop: 8,
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
      flexShrink: 1,
    },
    'sans',
  ),
  formSection: Typo(
    {
      marginTop: 12,
      color: TOKENS.colors.accent,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.4,
      lineHeight: 20,
    },
    'sans',
  ),
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(201, 70, 78, 0.18)',
  },
  chipText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
    },
    'sans',
  ),
  chipTextOn: {
    color: TOKENS.colors.text,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
    },
    'sans',
  ),
  hint: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    'sans',
  ),
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    color: TOKENS.colors.text,
    fontSize: 14,
  },
  textarea: {
    minHeight: 110,
  },
  textareaShort: {
    minHeight: 72,
  },
  proofRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  proofThumbWrap: {
    width: 96,
    gap: 4,
    position: 'relative',
  },
  proofThumb: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  proofOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 96,
    height: 96,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  proofRemove: {
    alignSelf: 'center',
  },
  proofRemoveText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
    },
    'sans',
  ),
  proofAdd: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  proofAddText: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
    },
    'sans',
  ),
  submitBtn: {
    marginTop: 8,
    height: 48,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: Typo(
    {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    'sans',
  ),
  successBox: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 70, 78, 0.35)',
    backgroundColor: 'rgba(201, 70, 78, 0.1)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  successText: Typo(
    {
      flex: 1,
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    'sans',
  ),
});
