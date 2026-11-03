import type { Lang } from '../../../../i18n/types';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  generateVoiceDesign,
  getVoiceDesignMeta,
  getVoiceDesignRecord,
  saveVoiceDesign,
} from '../../../../api/voiceDesign';
import { getApiErrorCode, formatApiError } from '../../../../utils/apiError';
import { notifyError, notifySuccess } from '../../../../utils/notify';
import { MessageHost } from '../../../../components/ui/Message';
import { unlockWebAudioAutoplay } from '../../../../utils/streamAudioPlayer';
import { audioPlayer } from '../../../../utils/audioPlayer';
import { resolveStaticUrl } from '../../../../constants/config';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { themedScrollViewProps } from '../../../../theme/webScrollbar';
import type {
  GenerateVoiceDesignResp,
  VoiceDesignMetaResp,
  VoiceDesignPreviewItem,
  VoiceDesignRecordDetailResp,
} from '../../../../types/api';

type DefaultVoiceDesignModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after async generate is accepted (switch to My Voices). */
  onSubmitted?: () => void;
  onSaved?: () => void;
  /** When set, open in pick/save mode for an existing preview_ready record. */
  pickRecordId?: string | null;
};

const PROMPT_SUGGESTIONS = [
  'A massive evil ogre with a deep, resonant and slightly silly tone',
  'A warm, calm male narrator with a rich and reassuring voice',
  'A bright anime-style young female voice, energetic and expressive',
];

const DEFAULT_PROMPT_MIN_LENGTH = 20;
const DEFAULT_PROMPT_MAX_LENGTH = 1000;

function promptRuneLength(value: string) {
  return Array.from(value.trim()).length;
}

function slugVoiceName(prompt: string, fallback: string) {
  const cleaned = prompt
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
  return cleaned || fallback;
}

export function DefaultVoiceDesignModal({
  visible,
  onClose,
  onSubmitted,
  onSaved,
  pickRecordId,
}: DefaultVoiceDesignModalProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const isPickMode = Boolean(pickRecordId);
  const [meta, setMeta] = useState<VoiceDesignMetaResp | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateVoiceDesignResp | VoiceDesignRecordDetailResp | null>(
    null,
  );
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || isPickMode) return;
    if (meta || metaLoading) return;
    setMetaLoading(true);
    void getVoiceDesignMeta()
      .then(setMeta)
      .catch((err) => {
        setInlineError(formatApiError(t, err));
      })
      .finally(() => {
        setMetaLoading(false);
      });
  }, [isPickMode, meta, metaLoading, t, visible]);

  useEffect(() => {
    if (!visible) {
      setPrompt('');
      setVoiceName('');
      setLoading(false);
      setSaving(false);
      setDetailLoading(false);
      setActivePreviewId(null);
      setPlayingPreviewId(null);
      setResult(null);
      setInlineError(null);
      void audioPlayer.stop();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !pickRecordId) return;
    setDetailLoading(true);
    setInlineError(null);
    void getVoiceDesignRecord(pickRecordId)
      .then((detail) => {
        setResult(detail);
        setPrompt(detail.prompt || '');
        setActivePreviewId(detail.previews[0]?.generated_voice_id ?? null);
        setVoiceName((prev) =>
          prev.trim() ||
          slugVoiceName(detail.prompt || '', t('creationCenter.voiceLibrary.defaultVoiceName')),
        );
        if (detail.status !== 'preview_ready') {
          setInlineError(t('creationCenter.voiceLibrary.invalidState'));
        }
      })
      .catch((err) => {
        setInlineError(formatApiError(t, err));
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [pickRecordId, t, visible]);

  const selectedPreview = useMemo(
    () => result?.previews.find((item) => item.generated_voice_id === activePreviewId) ?? null,
    [activePreviewId, result?.previews],
  );

  const pointsCostLabel = meta?.points_cost ?? 0;
  const showPickUI = isPickMode && result?.status === 'preview_ready';

  const close = () => {
    void audioPlayer.stop();
    onClose();
  };

  const onSuggestionPress = (value: string) => {
    setPrompt(value);
    if (!voiceName.trim()) {
      setVoiceName(slugVoiceName(value, t('creationCenter.voiceLibrary.defaultVoiceName')));
    }
  };

  const onGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      notifyError(t('creationCenter.voiceLibrary.promptRequired'));
      return;
    }
    const minLen = meta?.prompt_min_length ?? DEFAULT_PROMPT_MIN_LENGTH;
    const maxLen = meta?.prompt_max_length ?? DEFAULT_PROMPT_MAX_LENGTH;
    const runeLen = promptRuneLength(trimmed);
    if (runeLen < minLen || runeLen > maxLen) {
      notifyError(t('creationCenter.voiceLibrary.promptTooShort'));
      return;
    }
    if (meta && !meta.enabled) {
      notifyError(t('creationCenter.voiceLibrary.disabled'));
      return;
    }

    setLoading(true);
    setInlineError(null);
    void audioPlayer.stop();

    try {
      await generateVoiceDesign({
        prompt: trimmed,
        auto_generate_text: true,
      });
      notifySuccess(t('creationCenter.voiceLibrary.generateQueued'));
      onSubmitted?.();
      close();
    } catch (err) {
      const code = getApiErrorCode(err);
      const msg = formatApiError(t, err);
      if (code === 'PTS_001' || code === 'VOICEDSG_004') {
        notifyError(t('pointsShop.insufficient'));
      } else {
        setInlineError(msg);
        notifyError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onPlayPreview = async (preview: VoiceDesignPreviewItem) => {
    unlockWebAudioAutoplay();
    const id = preview.generated_voice_id;
    if (playingPreviewId === id) {
      await audioPlayer.stop();
      setPlayingPreviewId(null);
      return;
    }
    setPlayingPreviewId(id);
    try {
      const url = preview.audio_url ? resolveStaticUrl(preview.audio_url) : undefined;
      if (url) {
        await audioPlayer.playFromUrl(`voice-design-${id}`, url, (playing) => {
          if (!playing) setPlayingPreviewId(null);
        });
        return;
      }
      if (preview.audio_base64) {
        const format = preview.media_type.includes('wav') ? 'wav' : 'mp3';
        await audioPlayer.play(`voice-design-${id}`, preview.audio_base64, format, (playing) => {
          if (!playing) setPlayingPreviewId(null);
        });
        return;
      }
      setPlayingPreviewId(null);
      notifyError(t('creationCenter.voiceLibrary.previewFailed'));
    } catch {
      setPlayingPreviewId(null);
    }
  };

  const onSave = async () => {
    const recordId = result?.record_id || pickRecordId;
    if (!recordId || !selectedPreview) {
      notifyError(t('creationCenter.voiceLibrary.previewSelectRequired'));
      return;
    }
    const trimmedName = voiceName.trim();
    if (!trimmedName) {
      notifyError(t('creationCenter.voiceLibrary.voiceNameRequired'));
      return;
    }

    setSaving(true);
    setInlineError(null);
    try {
      await saveVoiceDesign(recordId, {
        generated_voice_id: selectedPreview.generated_voice_id,
        voice_name: trimmedName,
      });
      notifySuccess(t('creationCenter.voiceLibrary.saveSuccess'));
      onSaved?.();
      close();
    } catch (err) {
      const msg = formatApiError(t, err);
      setInlineError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isPickMode
                ? t('creationCenter.voiceLibrary.pickTitle')
                : t('creationCenter.voiceLibrary.designTitle')}
            </Text>
            <Pressable style={styles.closeBtn} onPress={close}>
              <Ionicons name="close" size={28} color={TOKENS.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {!isPickMode ? (
              <View style={styles.section}>
                <Text style={Typo(styles.label, 'sans', lang)}>
                  {t('creationCenter.voiceLibrary.promptLabel')}
                </Text>
                <TextInput
                  style={styles.promptInput}
                  multiline
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder={t('creationCenter.voiceLibrary.promptPlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  textAlignVertical="top"
                />
                <View style={styles.suggestionRow}>
                  {PROMPT_SUGGESTIONS.map((item) => (
                    <Pressable
                      key={item}
                      style={({ pressed }) => [
                        styles.suggestionChip,
                        prompt.trim() === item && styles.suggestionChipActive,
                        pressed && styles.chipPressed,
                      ]}
                      onPress={() => onSuggestionPress(item)}
                    >
                      <Text
                        style={[
                          Typo(styles.suggestionText, 'sans', lang),
                          prompt.trim() === item && Typo(styles.suggestionTextActive, 'sans', lang),
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={Typo(styles.helpText, 'sans', lang)} numberOfLines={3}>
                {prompt}
              </Text>
            )}

            {metaLoading || detailLoading ? (
              <ActivityIndicator color={TOKENS.colors.accent} />
            ) : null}

            {!isPickMode && pointsCostLabel > 0 ? (
              <Text style={Typo(styles.metaText, 'sans', lang)}>
                {t('creationCenter.voiceLibrary.pointsCost')}: {pointsCostLabel}
              </Text>
            ) : null}

            {!isPickMode ? (
              <Text style={Typo(styles.helpText, 'sans', lang)}>
                {t('creationCenter.voiceLibrary.asyncHint')}
              </Text>
            ) : null}

            {inlineError ? <Text style={Typo(styles.errorText, 'sans', lang)}>{inlineError}</Text> : null}

            {showPickUI ? (
              <View style={styles.section}>
                <Text style={Typo(styles.label, 'sans', lang)}>
                  {t('creationCenter.voiceLibrary.previewTitle')}
                </Text>
                <Text style={Typo(styles.helpText, 'sans', lang)}>
                  {t('creationCenter.voiceLibrary.previewHint')}
                </Text>

                <View style={styles.previewList}>
                  {(result?.previews ?? []).map((preview, index) => {
                    const selected = preview.generated_voice_id === activePreviewId;
                    const playing = preview.generated_voice_id === playingPreviewId;
                    return (
                      <Pressable
                        key={preview.generated_voice_id}
                        style={({ pressed }) => [
                          styles.previewCard,
                          selected && styles.previewCardActive,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={() => setActivePreviewId(preview.generated_voice_id)}
                      >
                        <View style={styles.previewMain}>
                          <View style={styles.previewTextWrap}>
                            <Text style={Typo(styles.previewTitle, 'sans', lang)}>
                              {t('creationCenter.voiceLibrary.previewOption')} {index + 1}
                            </Text>
                            <Text style={Typo(styles.previewMeta, 'mono', lang)}>
                              {preview.language || 'en'} · {preview.duration_secs.toFixed(1)}s
                            </Text>
                          </View>
                          <Pressable
                            style={styles.previewPlayBtn}
                            onPress={(e) => {
                              if (Platform.OS === 'web') e.stopPropagation?.();
                              void onPlayPreview(preview);
                            }}
                          >
                            <Ionicons
                              name={playing ? 'stop' : 'play'}
                              size={16}
                              color={TOKENS.colors.text}
                            />
                          </Pressable>
                        </View>
                        {selected ? (
                          <Text style={Typo(styles.selectedText, 'sans', lang)}>
                            {t('creationCenter.voiceLibrary.selected')}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={Typo(styles.label, 'sans', lang)}>
                  {t('creationCenter.voiceLibrary.voiceNameLabel')}
                </Text>
                <TextInput
                  style={styles.nameInput}
                  value={voiceName}
                  onChangeText={setVoiceName}
                  placeholder={t('creationCenter.voiceLibrary.voiceNamePlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {showPickUI ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (saving || !selectedPreview) && styles.primaryBtnDisabled,
                  pressed && styles.primaryBtnPressed,
                ]}
                disabled={saving || !selectedPreview}
                onPress={() => void onSave()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t('creationCenter.voiceLibrary.saveVoice')}
                  </Text>
                )}
              </Pressable>
            ) : !isPickMode ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  loading && styles.primaryBtnDisabled,
                  pressed && styles.primaryBtnPressed,
                ]}
                disabled={loading}
                onPress={() => void onGenerate()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t('creationCenter.voiceLibrary.generateVoice')}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 760,
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 20,
    gap: 16,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.46)',
        } as object)
      : {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
    },
    'serif', lang
  ),
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: 560,
  },
  content: {
    gap: 18,
    paddingBottom: 4,
  },
  section: {
    gap: 10,
  },
  label: { color: TOKENS.colors.textMuted, fontSize: 12, fontWeight: '600' },
  promptInput: Typo(
    {
      minHeight: 118,
      borderRadius: TOKENS.radius.card,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(10,12,20,0.44)',
      color: TOKENS.colors.text,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 14,
      lineHeight: 20,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
    },
    'sans', lang
  ),
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  suggestionChipActive: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.16)',
  },
  chipPressed: {
    opacity: 0.9,
  },
  suggestionText: { color: TOKENS.colors.textSecondary, fontSize: 13 },
  suggestionTextActive: {
    color: TOKENS.colors.text,
    fontWeight: '700',
  },
  metaText: { color: TOKENS.colors.textSecondary, fontSize: 12 },
  helpText: { color: TOKENS.colors.textMuted, fontSize: 12, lineHeight: 18 },
  errorText: { color: TOKENS.colors.accent, fontSize: 12, lineHeight: 18 },
  previewList: {
    gap: 10,
  },
  previewCard: {
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    padding: 12,
    gap: 6,
  },
  previewCardActive: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.08)',
  },
  cardPressed: {
    opacity: 0.92,
  },
  previewMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewTextWrap: {
    flex: 1,
    gap: 4,
  },
  previewTitle: { color: TOKENS.colors.text, fontSize: 14, fontWeight: '700' },
  previewMeta: { color: TOKENS.colors.textMuted, fontSize: 12 },
  previewPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  selectedText: { color: TOKENS.colors.accent, fontSize: 11, fontWeight: '700' },
  nameInput: Typo(
    {
      borderRadius: TOKENS.radius.card,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(10,12,20,0.44)',
      color: TOKENS.colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
    },
    'sans', lang
  ),
  footer: {
    alignItems: 'center',
    paddingTop: 2,
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 380,
    minHeight: 46,
    borderRadius: TOKENS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  primaryBtnText: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    'sans', lang
  ),
});
};
