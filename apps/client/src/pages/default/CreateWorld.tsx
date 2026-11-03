import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import {
  createWorld,
  getWorldAIGenerate,
  listWorldTemplates,
  startWorldAIGenerate,
} from '../../api/worldEditor';
import { ApiError } from '../../api/client';
import { isValidWorldCode, suggestWorldCode } from '../../lib/worldDocument';
import type { WorldContentRating, WorldTemplateItem } from '../../types/worldDocument';
import { notifyError, notifySuccess } from '../../utils/notify';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { resolveStaticUrl } from '../../constants/config';
import { DefaultShell } from './components/DefaultShell';
import { DefaultCreateAgentSectionLabel } from './components/create-agent/DefaultCreateAgentSectionLabel';
import { TOKENS } from './theme/tokens';

const RATINGS: { value: WorldContentRating; labelKey: string }[] = [
  { value: 'standard', labelKey: 'worldEditor.rating.standard' },
  { value: 'r', labelKey: 'worldEditor.rating.r' },
  { value: 'r18', labelKey: 'worldEditor.rating.r18' },
];

type CreateMode = 'blank' | 'template' | 'ai';

export default function DefaultCreateWorld() {
  const { t } = useI18n();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();

  const [mode, setMode] = useState<CreateMode>('blank');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [rating, setRating] = useState<WorldContentRating>('standard');
  const [templateCode, setTemplateCode] = useState('');
  const [templates, setTemplates] = useState<WorldTemplateItem[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [aiStatus, setAiStatus] = useState('');

  useEffect(() => {
    void listWorldTemplates()
      .then((r) => setTemplates(r.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  const onTitleChange = useCallback(
    (v: string) => {
      setTitle(v);
      setTitleError(false);
      if (!codeTouched) setCode(suggestWorldCode(v));
    },
    [codeTouched],
  );

  const canSubmit = useMemo(() => {
    if (!title.trim() || !isValidWorldCode(code)) return false;
    if (mode === 'template' && !templateCode) return false;
    if (mode === 'ai' && !aiPrompt.trim()) return false;
    return true;
  }, [aiPrompt, code, mode, templateCode, title]);

  const pollAI = useCallback(
    async (jobId: string) => {
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const job = await getWorldAIGenerate(jobId);
        setAiStatus(job.status);
        if (job.status === 'succeeded' && job.world_id) {
          notifySuccess(t('worldEditor.create.success'));
          router.replace(`/world/${job.world_id}/edit`);
          return;
        }
        if (job.status === 'failed') {
          throw new ApiError(job.error_message || t('worldEditor.create.aiFailed'), 400);
        }
      }
      throw new ApiError(t('worldEditor.create.aiTimeout'), 408);
    },
    [router, t],
  );

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedCode = code.trim().toLowerCase();
    if (!trimmedTitle) {
      setTitleError(true);
      return;
    }
    if (!isValidWorldCode(trimmedCode)) {
      setCodeError(true);
      return;
    }
    setSubmitting(true);
    setAiStatus('');
    try {
      if (mode === 'ai') {
        const start = await startWorldAIGenerate({
          prompt: aiPrompt.trim(),
          title_hint: trimmedTitle,
          code_hint: trimmedCode,
        });
        setAiStatus(start.status);
        await pollAI(start.job_id);
        return;
      }
      const resp = await createWorld({
        title: trimmedTitle,
        code: trimmedCode,
        content_rating: rating,
        starter: mode === 'blank' ? 'blank_playable' : undefined,
        template_code: mode === 'template' ? templateCode : undefined,
      });
      notifySuccess(t('worldEditor.create.success'));
      router.replace(`/world/${resp.world.world_id}/edit`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'WORLD_012') {
        notifyError(t('worldEditor.create.limitReached'));
      } else if (e instanceof ApiError && e.code === 'WORLD_015') {
        notifyError(t('worldEditor.create.aiLimit'));
      } else {
        notifyError(e instanceof ApiError ? e.message : t('worldEditor.create.failed'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [aiPrompt, code, mode, pollAI, rating, router, t, templateCode, title]);

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
          <Text style={styles.back}>{t('worldEditor.back')}</Text>
        </Pressable>

        <Text style={styles.heading}>{t('worldEditor.create.heading')}</Text>
        <Text style={styles.subtitle}>{t('worldEditor.create.subtitle')}</Text>

        <DefaultCreateAgentSectionLabel label={t('worldEditor.create.modeLabel')} />
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
                  {t(`worldEditor.create.mode.${m}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'template' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tplRow}>
            {templates.map((tpl) => {
              const active = templateCode === tpl.code;
              return (
                <Pressable
                  key={tpl.code}
                  onPress={() => {
                    setTemplateCode(tpl.code);
                    if (!title.trim()) onTitleChange(tpl.title);
                    if (tpl.content_rating === 'standard' || tpl.content_rating === 'r' || tpl.content_rating === 'r18') {
                      setRating(tpl.content_rating);
                    }
                  }}
                  style={[styles.tplCard, active && styles.tplCardOn]}
                >
                  {tpl.cover_image ? (
                    <Image
                      source={{ uri: resolveStaticUrl(tpl.cover_image) }}
                      style={styles.tplCover}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.tplCover, styles.tplCoverEmpty]} />
                  )}
                  <View style={styles.tplBody}>
                    <Text style={styles.tplTitle} numberOfLines={1} ellipsizeMode="tail">
                      {tpl.title}
                    </Text>
                    <Text style={styles.tplMeta} numberOfLines={2} ellipsizeMode="tail">
                      {tpl.level_hint || tpl.tagline}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {templates.length === 0 ? (
              <Text style={styles.hint}>{t('worldEditor.create.noTemplates')}</Text>
            ) : null}
          </ScrollView>
        ) : null}

        {mode === 'ai' ? (
          <>
            <DefaultCreateAgentSectionLabel label={t('worldEditor.create.aiPrompt')} />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              multiline
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder={t('worldEditor.create.aiPromptPlaceholder')}
              placeholderTextColor={TOKENS.colors.textMuted}
            />
          </>
        ) : null}

        <DefaultCreateAgentSectionLabel label={t('worldEditor.create.titleLabel')} />
        <TextInput
          style={[styles.input, titleError && styles.inputError]}
          value={title}
          onChangeText={onTitleChange}
          placeholder={t('worldEditor.create.titlePlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
        />

        <DefaultCreateAgentSectionLabel label={t('worldEditor.create.codeLabel')} />
        <Text style={styles.hint}>{t('worldEditor.create.codeHint')}</Text>
        <TextInput
          style={[styles.input, codeError && styles.inputError]}
          value={code}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(v) => {
            setCodeTouched(true);
            setCodeError(false);
            setCode(v.toLowerCase().replace(/[^a-z0-9_]/g, ''));
          }}
          placeholder="my_world"
          placeholderTextColor={TOKENS.colors.textMuted}
        />

        <DefaultCreateAgentSectionLabel label={t('worldEditor.create.ratingLabel')} />
        <View style={styles.ratingRow}>
          {RATINGS.map((r) => {
            const active = rating === r.value;
            return (
              <Pressable
                key={r.value}
                onPress={() => setRating(r.value)}
                style={[styles.ratingChip, active && styles.ratingChipOn]}
              >
                <Text style={[styles.ratingText, active && styles.ratingTextOn]}>{t(r.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.starterNote}>
          {mode === 'blank'
            ? t('worldEditor.create.starterNote')
            : mode === 'template'
              ? t('worldEditor.create.templateNote')
              : t('worldEditor.create.aiNote')}
        </Text>
        {aiStatus ? (
          <Text style={styles.hint}>
            {t('worldEditor.create.aiStatus')}: {aiStatus}
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('worldEditor.create.submit')}</Text>
          )}
        </Pressable>
      </View>
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', gap: 10, paddingBottom: 48 },
  contentDesktop: {
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: TOKENS.layout.contentPadding,
  },
  contentMobile: { paddingHorizontal: 16 },
  backRow: { alignSelf: 'flex-start', marginBottom: 4 },
  back: Typo({ color: TOKENS.colors.accent, fontSize: 14 }, 'sans'),
  heading: Typo({ color: TOKENS.colors.text, fontSize: 26, fontWeight: '700', marginTop: 8 }, 'serif'),
  subtitle: Typo(
    { color: TOKENS.colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
    'sans',
  ),
  hint: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, marginBottom: 4 }, 'sans'),
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  modeChip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modeChipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.18)',
  },
  modeText: Typo({ color: TOKENS.colors.textMuted, fontSize: 13, fontWeight: '600' }, 'sans'),
  modeTextOn: { color: TOKENS.colors.text },
  tplRow: { gap: 10, paddingVertical: 4, alignItems: 'flex-start' },
  tplCard: {
    width: 148,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,10,15,0.5)',
  },
  tplCardOn: { borderColor: TOKENS.colors.accent },
  tplCover: { width: '100%', aspectRatio: 9 / 12, backgroundColor: '#111' },
  tplCoverEmpty: { backgroundColor: '#1a1d26' },
  tplBody: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 4,
    overflow: 'hidden',
  },
  tplTitle: Typo(
    { color: TOKENS.colors.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
    'sans',
  ),
  tplMeta: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
      height: 30,
      overflow: 'hidden',
    },
    'sans',
  ),
  input: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TOKENS.colors.text,
    backgroundColor: TOKENS.colors.inputBg,
    fontSize: 15,
    marginBottom: 8,
  },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  inputError: { borderColor: TOKENS.colors.accent },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  ratingChip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(8,10,15,0.5)',
  },
  ratingChipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.18)',
  },
  ratingText: Typo({ color: TOKENS.colors.textMuted, fontSize: 13, fontWeight: '600' }, 'sans'),
  ratingTextOn: { color: TOKENS.colors.text },
  starterNote: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 16 },
    'sans',
  ),
  submit: {
    marginTop: 8,
    height: 48,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitPressed: { backgroundColor: TOKENS.colors.accentPressed },
  submitText: Typo({ color: '#fff', fontSize: 15, fontWeight: '700' }, 'sans'),
});
