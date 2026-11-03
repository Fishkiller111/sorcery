import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import {
  createSimulator,
  getSimulatorAIGenerate,
  listSimulatorTemplates,
  startSimulatorAIGenerate,
} from '../../api/simulator';
import { ApiError } from '../../api/client';
import type { SimulatorContentRating, SimulatorTemplateItem } from '../../types/simulator';
import { notifyError, notifySuccess } from '../../utils/notify';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { resolveStaticUrl } from '../../constants/config';
import { DefaultShell } from './components/DefaultShell';
import { DefaultCreateAgentSectionLabel } from './components/create-agent/DefaultCreateAgentSectionLabel';
import { TOKENS } from './theme/tokens';

const RATINGS: { value: SimulatorContentRating; labelKey: string }[] = [
  { value: 'standard', labelKey: 'worldEditor.rating.standard' },
  { value: 'r', labelKey: 'worldEditor.rating.r' },
  { value: 'r18', labelKey: 'worldEditor.rating.r18' },
];

type CreateMode = 'blank' | 'template' | 'ai';

export default function DefaultCreateSimulator() {
  const { t } = useI18n();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();

  const [mode, setMode] = useState<CreateMode>('blank');
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState<SimulatorContentRating>('standard');
  const [templateCode, setTemplateCode] = useState('');
  const [templates, setTemplates] = useState<SimulatorTemplateItem[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [aiStatus, setAiStatus] = useState('');

  useEffect(() => {
    void listSimulatorTemplates()
      .then((r) => setTemplates(r.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (mode === 'template' && !templateCode) return false;
    if (mode === 'ai' && !aiPrompt.trim()) return false;
    return true;
  }, [aiPrompt, mode, templateCode, title]);

  const pollAI = useCallback(
    async (jobId: string) => {
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const job = await getSimulatorAIGenerate(jobId);
        setAiStatus(job.status);
        if (job.status === 'succeeded' && job.simulator_id) {
          notifySuccess(t('simulator.create.success'));
          router.replace(`/simulator/${job.simulator_id}`);
          return;
        }
        if (job.status === 'failed') {
          throw new ApiError(job.error_message || t('simulator.create.aiFailed'), 400);
        }
      }
      throw new ApiError(t('simulator.create.aiTimeout'), 408);
    },
    [router, t],
  );

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(true);
      return;
    }
    setSubmitting(true);
    setAiStatus('');
    try {
      if (mode === 'ai') {
        const start = await startSimulatorAIGenerate({
          prompt: aiPrompt.trim(),
          title_hint: trimmedTitle,
        });
        setAiStatus(start.status);
        await pollAI(start.job_id);
        return;
      }
      const resp = await createSimulator({
        title: trimmedTitle,
        content_rating: rating,
        starter: mode === 'blank' ? 'blank' : undefined,
        template_code: mode === 'template' ? templateCode : undefined,
      });
      notifySuccess(t('simulator.create.success'));
      router.replace(`/simulator/${resp.simulator.simulator_id}`);
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'SIMULATOR_AI_LIMIT' || e.code === 'WORLD_015')) {
        notifyError(t('simulator.create.aiLimit'));
      } else {
        notifyError(e instanceof ApiError ? e.message : t('simulator.create.failed'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [aiPrompt, mode, pollAI, rating, router, t, templateCode, title]);

  return (
    <DefaultShell scrollable>
      <View
        style={[
          styles.content,
          isDesktop ? styles.contentDesktop : styles.contentMobile,
          pageContentPadding,
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Text style={styles.back}>{t('simulator.back')}</Text>
        </Pressable>

        <Text style={styles.heading}>{t('simulator.create.heading')}</Text>
        <Text style={styles.subtitle}>{t('simulator.create.subtitle')}</Text>

        <DefaultCreateAgentSectionLabel label={t('simulator.create.modeLabel')} />
        <View style={styles.modeRow}>
          {(['blank', 'template', 'ai'] as CreateMode[]).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeChip, active && styles.modeChipOn]}
              >
                <Text style={[styles.modeText, active && styles.modeTextOn]}>
                  {t(`simulator.create.mode.${m}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'template' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tplRow}
          >
            {templates.map((tpl) => {
              const active = templateCode === tpl.code;
              return (
                <Pressable
                  key={tpl.code}
                  onPress={() => {
                    setTemplateCode(tpl.code);
                    setTitle(tpl.title);
                    setTitleError(false);
                    if (
                      tpl.content_rating === 'standard' ||
                      tpl.content_rating === 'r' ||
                      tpl.content_rating === 'r18'
                    ) {
                      setRating(tpl.content_rating);
                    }
                  }}
                  style={[styles.tplCard, active && styles.tplCardOn]}
                >
                  {tpl.cover_image ? (
                    <Image
                      source={{ uri: resolveStaticUrl(tpl.cover_image) ?? tpl.cover_image }}
                      style={styles.tplCover}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.tplCover, styles.tplCoverEmpty]}>
                      <Text style={styles.tplEmoji}>◇</Text>
                    </View>
                  )}
                  <View style={styles.tplBody}>
                    <Text style={styles.tplTitle} numberOfLines={1}>
                      {tpl.title}
                    </Text>
                    <Text style={styles.tplMeta} numberOfLines={2}>
                      {tpl.tagline || tpl.code}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {templates.length === 0 ? (
              <Text style={styles.hint}>{t('simulator.create.noTemplates')}</Text>
            ) : null}
          </ScrollView>
        ) : null}

        {mode === 'ai' ? (
          <>
            <DefaultCreateAgentSectionLabel label={t('simulator.create.aiPrompt')} />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              multiline
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder={t('simulator.create.aiPromptPlaceholder')}
              placeholderTextColor={TOKENS.colors.textMuted}
            />
          </>
        ) : null}

        <DefaultCreateAgentSectionLabel label={t('simulator.create.titleLabel')} />
        <TextInput
          style={[styles.input, titleError && styles.inputError]}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setTitleError(false);
          }}
          placeholder={t('simulator.create.titlePlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
        />

        <DefaultCreateAgentSectionLabel label={t('simulator.create.ratingLabel')} />
        <View style={styles.ratingRow}>
          {RATINGS.map((r) => {
            const active = rating === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setRating(r.value)}
                style={[styles.ratingChip, active && styles.ratingChipOn]}
              >
                <Text style={[styles.ratingText, active && styles.ratingTextOn]}>
                  {t(r.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.starterNote}>
          {mode === 'blank'
            ? t('simulator.create.starterNote')
            : mode === 'template'
              ? t('simulator.create.templateNote')
              : t('simulator.create.aiNote')}
        </Text>
        {aiStatus ? (
          <Text style={styles.hint}>
            {t('simulator.create.aiStatus')}: {aiStatus}
          </Text>
        ) : null}

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={submitting || !canSubmit}
          style={({ pressed }) => [
            styles.submit,
            (submitting || !canSubmit) && styles.submitDisabled,
            pressed && styles.submitPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={TOKENS.colors.text} />
          ) : (
            <Text style={styles.submitText}>{t('simulator.create.submit')}</Text>
          )}
        </Pressable>
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  contentMobile: { paddingHorizontal: TOKENS.layout.contentPadding },
  contentDesktop: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  backRow: { marginBottom: 8 },
  back: Typo({ color: TOKENS.colors.textSecondary, fontSize: 15 }, 'sans'),
  heading: Typo(
    { color: TOKENS.colors.text, fontSize: 26, fontWeight: '600', marginBottom: 6 },
    'serif',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 18,
    },
    'sans',
  ),
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
  },
  modeChipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.2)',
  },
  modeText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 13 }, 'sans'),
  modeTextOn: Typo({ color: TOKENS.colors.text, fontWeight: '700', fontSize: 13 }, 'sans'),
  tplRow: { gap: 10, paddingBottom: 12 },
  tplCard: {
    width: 148,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.5)',
    overflow: 'hidden',
  },
  tplCardOn: { borderColor: TOKENS.colors.accent },
  tplCover: {
    height: 72,
    backgroundColor: 'rgba(186, 60, 71, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tplCoverEmpty: {},
  tplEmoji: { color: TOKENS.colors.accent, fontSize: 22 },
  tplBody: { padding: 10, gap: 4 },
  tplTitle: Typo({ color: TOKENS.colors.text, fontSize: 13, fontWeight: '600' }, 'sans'),
  tplMeta: Typo({ color: TOKENS.colors.textMuted, fontSize: 11, lineHeight: 15 }, 'sans'),
  input: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: 10,
    backgroundColor: 'rgba(8, 10, 15, 0.5)',
    color: TOKENS.colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  inputMulti: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: TOKENS.colors.accent },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  ratingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  ratingChipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
  },
  ratingText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 13 }, 'sans'),
  ratingTextOn: Typo({ color: TOKENS.colors.text, fontWeight: '700', fontSize: 13 }, 'sans'),
  starterNote: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 10,
    },
    'sans',
  ),
  hint: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, marginBottom: 10 }, 'sans'),
  submit: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitPressed: { opacity: 0.85 },
  submitText: Typo({ color: TOKENS.colors.text, fontSize: 15, fontWeight: '700' }, 'sans'),
});
