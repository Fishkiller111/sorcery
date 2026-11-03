import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useI18n } from '../../i18n/I18nContext';
import { createRole, generateRolePreview, getRolePreviewMeta, getRolePreviewRecord, updateRoleEvents, uploadRoleAsset } from '../../api/roles';
import { useCropUpload } from '../../hooks/useCropUpload';
import { PhotoPermissionDeniedError } from '../../utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../utils/promptPhotoLibraryAccessSettings';
import { pickRoleFigureImage } from '../../utils/pickRoleImage';
import { FIGURE_CROP_OUTPUT } from '../../utils/cropAvatarImage';
import { resolveStaticUrl } from '../../constants/config';
import { defaultRoleEvents } from '../../constants/defaultRoleEvents';
import {
  formatApiError,
  INTRO_MAX,
  INTRO_MIN,
  introLength,
  MAX_PERSONALITY_TAG_LEN,
  personalityTagLength,
} from '../../utils/roleForm';
import { formatGenRecordError } from '../../utils/apiError';
import { notifyError, notifyWarning } from '../../utils/notify';
import {
  clearCreateAgentDraft,
  loadCreateAgentDraft,
  saveCreateAgentDraft,
  type CreateAgentDraftV1,
} from './createAgentDraftStorage';
import { useAuthStore } from '../../stores/authStore';
import type { Lang } from '../../i18n/types';
import { basicsDraftComplete, buildAppearanceFromDraft } from './buildAppearance';
import { DEFAULT_AGE } from './age';
import { ENABLE_CREATE_PREVIEW } from './features';
import {
  WIZARD_STEPS,
  emptyLocale,
  type BasicsDraft,
  type LocaleFields,
  type StyleDraft,
  type WizardStep,
} from './types';
import type { RoleEventInput, RolePreviewMetaResp } from '../../types/api';
import { validateRoleEvents } from '../agent/RoleEventEditor';

const PERSONALITY_MAX = 8;
const PREVIEW_POLL_MS = 3000;
const PREVIEW_POLL_MAX_MS = 5 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type LocaleValidationError =
  | 'nameRequired'
  | 'personalityRequired'
  | 'personalityTooMany'
  | 'personalityTagTooLong'
  | 'introTooShort'
  | 'introTooLong';

function getLocaleValidationError(fields: LocaleFields): LocaleValidationError | null {
  if (!fields.name.trim()) return 'nameRequired';
  if (fields.personality.length < 1) return 'personalityRequired';
  if (fields.personality.length > PERSONALITY_MAX) return 'personalityTooMany';
  if (fields.personality.some((tag) => personalityTagLength(tag) > MAX_PERSONALITY_TAG_LEN)) {
    return 'personalityTagTooLong';
  }
  const introLen = introLength(fields.introduction);
  if (introLen < INTRO_MIN) return 'introTooShort';
  if (introLen > INTRO_MAX) return 'introTooLong';
  return null;
}

function mergeAppearance(built: string, manual: string): string {
  const parts = [built, manual.trim()].filter(Boolean);
  return parts.join('. ');
}

export function useCreateAgentWizard() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? '');

  const [step, setStep] = useState<WizardStep>('style');
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);

  const [styleDraft, setStyleDraft] = useState<StyleDraft>({ gender: 'female', age: DEFAULT_AGE });
  const [basicsDraft, setBasicsDraft] = useState<BasicsDraft>({});
  const [locale, setLocale] = useState<LocaleFields>(emptyLocale());
  const [tagInput, setTagInput] = useState('');
  const [figureUrl, setFigureUrl] = useState('');
  const [previewRecordId, setPreviewRecordId] = useState('');
  const [figurePreview, setFigurePreview] = useState<string | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [events, setEvents] = useState<RoleEventInput[]>([]);
  const [eventsSeeded, setEventsSeeded] = useState(false);
  const [voiceReferenceId, setVoiceReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<RolePreviewMetaResp | null>(null);
  /** 等本地草稿恢复完成后再允许自动生图，避免离开再进入时重复扣费 */
  const [draftReady, setDraftReady] = useState(false);

  const autoPreviewFiredRef = useRef(false);
  const generatePreviewRef = useRef<(customPrompt?: string) => Promise<void>>(async () => {});
  const pollPreviewRef = useRef<(recordId: string) => Promise<boolean>>(async () => false);
  const skipPersistRef = useRef(false);
  const previewPollGenRef = useRef(0);
  /** 仅草稿恢复时需要续跑的进行中任务 */
  const resumePreviewIdRef = useRef<string | null>(null);

  const refreshPreviewMeta = useCallback(async () => {
    if (!ENABLE_CREATE_PREVIEW || !userId) {
      setPreviewMeta(null);
      return;
    }
    try {
      setPreviewMeta(await getRolePreviewMeta());
    } catch {
      setPreviewMeta(null);
    }
  }, [userId]);

  useEffect(() => {
    void refreshPreviewMeta();
  }, [refreshPreviewMeta]);

  const previewEnabled = ENABLE_CREATE_PREVIEW && (previewMeta?.enabled ?? false);
  const previewCostLabel =
    previewMeta == null
      ? '…'
      : previewMeta.next_points_cost <= 0
        ? t('createAgent.wizard.previewFree')
        : String(previewMeta.next_points_cost);

  useEffect(() => {
    let cancelled = false;
    setDraftReady(false);
    if (!userId) {
      setDraftReady(true);
      return;
    }
    void loadCreateAgentDraft(userId).then((draft) => {
      if (cancelled) return;
      if (draft) {
        skipPersistRef.current = true;
        setStep(draft.step);
        setMaxReachedIndex(draft.maxReachedIndex);
        setStyleDraft(
          draft.styleDraft.gender || draft.styleDraft.artStyle
            ? { age: DEFAULT_AGE, ...draft.styleDraft }
            : { gender: 'female', age: DEFAULT_AGE },
        );
        setBasicsDraft(draft.basicsDraft);
        setLocale(draft.locale);
        setTagInput(draft.tagInput);
        setFigureUrl(draft.figureUrl);
        setPreviewRecordId(draft.previewRecordId);
        setFigurePreview(undefined);
        setVoiceReferenceId(draft.voiceReferenceId);
        setShowAdvanced(draft.showAdvanced);
        if (Array.isArray(draft.events) && draft.events.length > 0) {
          setEvents(draft.events);
          setEventsSeeded(true);
        }
        if (draft.figureUrl || draft.previewRecordId) {
          autoPreviewFiredRef.current = true;
        }
        if (draft.previewRecordId && !draft.figureUrl) {
          resumePreviewIdRef.current = draft.previewRecordId;
        }
      }
      setDraftReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!draftReady || eventsSeeded) return;
    setEvents(defaultRoleEvents(lang as Lang));
    setEventsSeeded(true);
  }, [draftReady, eventsSeeded, lang]);

  useEffect(() => {
    if (!draftReady || !userId) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const draft: CreateAgentDraftV1 = {
      version: 1,
      step,
      maxReachedIndex,
      styleDraft,
      basicsDraft,
      locale,
      tagInput,
      figureUrl,
      previewRecordId,
      voiceReferenceId,
      showAdvanced,
      events,
    };
    const timer = setTimeout(() => {
      void saveCreateAgentDraft(userId, draft);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    draftReady,
    userId,
    step,
    maxReachedIndex,
    styleDraft,
    basicsDraft,
    locale,
    tagInput,
    figureUrl,
    previewRecordId,
    voiceReferenceId,
    showAdvanced,
    events,
  ]);

  /** 生图假进度挂在向导全局，切换步骤不重置 */
  useEffect(() => {
    if (!generatingPreview) {
      setPreviewProgress(0);
      return;
    }
    setPreviewProgress(0.04);
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const next = 0.92 * (1 - Math.exp(-elapsed / 45_000));
      setPreviewProgress(Math.max(0.04, next));
    }, 200);
    return () => clearInterval(timer);
  }, [generatingPreview]);

  const uploadFigure = useCallback(
    (file: Parameters<typeof uploadRoleAsset>[1], filename: string) =>
      uploadRoleAsset('figure', file, filename),
    [],
  );

  const {
    cropPick,
    uploading,
    handlePick: handlePickFigure,
    handleCropCancel,
    handleCropConfirm,
  } = useCropUpload({
    pick: pickRoleFigureImage,
    output: FIGURE_CROP_OUTPUT,
    upload: uploadFigure,
    onSuccess: (resp, previewUri) => {
      setFigureUrl(resp.url);
      setPreviewRecordId('');
      setFigurePreview(previewUri);
    },
    onError: (e) => {
      if (e instanceof PhotoPermissionDeniedError) {
        promptPhotoLibraryAccessSettings(t);
        return;
      }
      notifyError(formatApiError(t, e));
      setFigurePreview(undefined);
    },
  });

  const stepIndex = WIZARD_STEPS.indexOf(step);
  const previewUri = figurePreview || resolveStaticUrl(figureUrl);
  const previewName = locale.name;
  const previewPersonality = locale.personality;

  const updateLocale = useCallback((patch: Partial<LocaleFields>) => {
    setLocale((prev) => ({ ...prev, ...patch }));
  }, []);

  const goToStep = useCallback((next: WizardStep) => {
    setStep(next);
    const idx = WIZARD_STEPS.indexOf(next);
    setMaxReachedIndex((prev) => Math.max(prev, idx));
  }, []);

  const togglePreset = useCallback(
    (tag: string) => {
      if (locale.personality.includes(tag)) {
        updateLocale({ personality: locale.personality.filter((p) => p !== tag) });
      } else if (locale.personality.length < PERSONALITY_MAX) {
        updateLocale({ personality: [...locale.personality, tag] });
      }
    },
    [locale.personality, updateLocale],
  );

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (!tag || locale.personality.includes(tag)) return;
    if (locale.personality.length >= PERSONALITY_MAX) {
      notifyWarning(t('errors.personalityTooMany'));
      return;
    }
    if (personalityTagLength(tag) > MAX_PERSONALITY_TAG_LEN) {
      notifyWarning(t('errors.personalityTagTooLong'));
      return;
    }
    updateLocale({ personality: [...locale.personality, tag] });
    setTagInput('');
  }, [tagInput, locale.personality, updateLocale, t]);

  const removeTag = useCallback(
    (tag: string) => {
      updateLocale({ personality: locale.personality.filter((p) => p !== tag) });
    },
    [locale.personality, updateLocale],
  );

  const validateStyle = useCallback(() => {
    if (!styleDraft.gender || !styleDraft.artStyle) {
      notifyWarning(t('createAgent.wizard.errorStyle'));
      return false;
    }
    return true;
  }, [styleDraft, t]);

  const validateBasics = useCallback(() => {
    if (!basicsDraftComplete(basicsDraft)) {
      notifyWarning(t('createAgent.wizard.errorBasics'));
      return false;
    }
    return true;
  }, [basicsDraft, t]);

  const validateLocale = useCallback(() => {
    const err = getLocaleValidationError(locale);
    if (!err) return true;
    switch (err) {
      case 'nameRequired':
        notifyWarning(t('errors.nameRequired'));
        break;
      case 'personalityRequired':
        notifyWarning(t('errors.personalityRequired'));
        break;
      case 'personalityTooMany':
        notifyWarning(t('errors.personalityTooMany'));
        break;
      case 'personalityTagTooLong':
        notifyWarning(t('errors.personalityTagTooLong'));
        break;
      case 'introTooShort':
        notifyWarning(t('errors.introTooShort'));
        break;
      case 'introTooLong':
        notifyWarning(t('errors.introTooLong'));
        break;
    }
    return false;
  }, [locale, t]);

  const validateImage = useCallback(() => {
    if (!figureUrl) {
      notifyWarning(t('errors.figureRequired'));
      return false;
    }
    return true;
  }, [figureUrl, t]);

  const showStepError = useCallback((msg: string | null) => {
    if (msg) notifyWarning(msg);
  }, []);

  const canProceed = useMemo(() => {
    switch (step) {
      case 'style':
        return Boolean(styleDraft.gender && styleDraft.artStyle);
      case 'basics':
        return basicsDraftComplete(basicsDraft);
      case 'voice':
        return true;
      case 'personality':
        return getLocaleValidationError(locale) === null;
      case 'image':
        return Boolean(figureUrl);
      default:
        return false;
    }
  }, [step, styleDraft, basicsDraft, figureUrl, locale]);

  const canCreate = Boolean(figureUrl) && getLocaleValidationError(locale) === null;

  const onNext = useCallback(() => {
    let ok = true;
    if (step === 'style') ok = validateStyle();
    else if (step === 'basics') ok = validateBasics();
    else if (step === 'personality') ok = validateLocale();

    if (!ok) return;

    const nextIndex = stepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      goToStep(WIZARD_STEPS[nextIndex]);
    }
  }, [step, stepIndex, validateStyle, validateBasics, validateLocale, goToStep]);

  const onBack = useCallback(() => {
    if (stepIndex > 0) goToStep(WIZARD_STEPS[stepIndex - 1]);
  }, [stepIndex, goToStep]);

  const onSubmit = useCallback(async () => {
    if (!validateImage() || !validateLocale()) return;

    const eventsErr = validateRoleEvents(events, t);
    if (eventsErr) {
      notifyWarning(eventsErr);
      return;
    }

    const builtAppearance = buildAppearanceFromDraft(styleDraft, basicsDraft);
    const appearance = mergeAppearance(builtAppearance, locale.appearance);

    try {
      setSubmitting(true);
      const created = await createRole({
        name: locale.name.trim(),
        introduction: locale.introduction.trim(),
        personality: locale.personality,
        appearance: appearance || undefined,
        gender: styleDraft.gender || undefined,
        scene_name: locale.sceneName.trim() || undefined,
        scene_desc: locale.sceneDesc.trim() || undefined,
        figure_url: figureUrl,
        voice_reference_id: voiceReferenceId.trim() || undefined,
      });
      try {
        await updateRoleEvents(created.id, { events });
      } catch (eventsError) {
        console.warn('Failed to save custom interaction events:', eventsError);
        notifyWarning(t('createAgent.wizard.eventsSaveWarn'));
      }
      if (userId) {
        await clearCreateAgentDraft(userId);
      }
      router.replace('/free-chat');
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setSubmitting(false);
    }
  }, [
    validateImage,
    validateLocale,
    events,
    styleDraft,
    basicsDraft,
    locale,
    figureUrl,
    voiceReferenceId,
    userId,
    router,
    t,
  ]);

  const pollPreviewUntilDone = useCallback(
    async (recordId: string): Promise<boolean> => {
      const gen = ++previewPollGenRef.current;
      const started = Date.now();
      while (Date.now() - started < PREVIEW_POLL_MAX_MS) {
        if (gen !== previewPollGenRef.current) return false;
        const item = await getRolePreviewRecord(recordId);
        if (gen !== previewPollGenRef.current) return false;
        if (item.status === 'succeeded' && item.url) {
          setFigureUrl(item.url);
          setFigurePreview(undefined);
          setPreviewRecordId('');
          return true;
        }
        if (item.status === 'failed') {
          setPreviewRecordId('');
          notifyError(formatGenRecordError(t, item, 'image'));
          return false;
        }
        await sleep(PREVIEW_POLL_MS);
      }
      if (gen === previewPollGenRef.current) {
        notifyError(t('creationCenter.imgGenFailed'));
      }
      return false;
    },
    [t],
  );

  pollPreviewRef.current = pollPreviewUntilDone;

  const generatePreview = useCallback(
    async (customPrompt?: string) => {
      if (generatingPreview) return;
      if (!styleDraft.gender || !styleDraft.artStyle) {
        notifyWarning(t('createAgent.wizard.errorStyle'));
        return;
      }
      if (!basicsDraftComplete(basicsDraft)) {
        notifyWarning(t('createAgent.wizard.errorBasics'));
        return;
      }
      const intro = locale.introduction.trim();
      const name = locale.name.trim();
      if (introLength(intro) < INTRO_MIN) {
        notifyWarning(t('errors.introTooShort'));
        return;
      }

      const builtAppearance = buildAppearanceFromDraft(styleDraft, basicsDraft);
      const appearanceParts = [builtAppearance, locale.appearance.trim(), customPrompt?.trim()].filter(
        Boolean,
      );

      try {
        setGeneratingPreview(true);
        const resp = await generateRolePreview({
          gender: styleDraft.gender,
          art_style: styleDraft.artStyle,
          age: styleDraft.age ?? DEFAULT_AGE,
          ethnicity: basicsDraft.ethnicity,
          hair_style: basicsDraft.hairStyle,
          body_type: basicsDraft.bodyType,
          name: name || undefined,
          introduction: intro || undefined,
          personality: locale.personality.length > 0 ? locale.personality : undefined,
          appearance: appearanceParts.length > 0 ? appearanceParts.join('. ') : undefined,
        });
        if (resp.url && (resp.status === 'succeeded' || !resp.record_id)) {
          setFigureUrl(resp.url);
          setFigurePreview(undefined);
          setPreviewRecordId('');
          void refreshPreviewMeta();
          return;
        }
        if (!resp.record_id) {
          notifyError(t('creationCenter.imgGenFailed'));
          void refreshPreviewMeta();
          return;
        }
        setPreviewRecordId(resp.record_id);
        const ok = await pollPreviewUntilDone(resp.record_id);
        if (ok) void refreshPreviewMeta();
      } catch (e) {
        notifyError(formatApiError(t, e));
        void refreshPreviewMeta();
      } finally {
        setGeneratingPreview(false);
      }
    },
    [
      generatingPreview,
      styleDraft,
      basicsDraft,
      locale.introduction,
      locale.name,
      locale.personality,
      locale.appearance,
      pollPreviewUntilDone,
      refreshPreviewMeta,
      t,
    ],
  );

  generatePreviewRef.current = generatePreview;

  /** 草稿恢复后继续轮询进行中的异步立绘 */
  useEffect(() => {
    if (!previewEnabled || !draftReady) return;
    const resumeId = resumePreviewIdRef.current;
    if (!resumeId || figureUrl) return;
    resumePreviewIdRef.current = null;
    let cancelled = false;
    setGeneratingPreview(true);
    void pollPreviewRef.current(resumeId).finally(() => {
      if (!cancelled) setGeneratingPreview(false);
    });
    return () => {
      cancelled = true;
      previewPollGenRef.current += 1;
    };
  }, [draftReady, figureUrl, previewEnabled]);

  /** 进入立绘步骤且尚无立绘/任务时自动生图一次 */
  useEffect(() => {
    if (!previewEnabled || !draftReady) return;
    if (step !== 'image') {
      if (figureUrl || previewRecordId) {
        autoPreviewFiredRef.current = true;
      } else {
        autoPreviewFiredRef.current = false;
      }
      return;
    }
    if (figureUrl || previewRecordId || generatingPreview || uploading) return;
    if (autoPreviewFiredRef.current) return;
    autoPreviewFiredRef.current = true;
    void generatePreviewRef.current();
  }, [draftReady, step, figureUrl, previewRecordId, generatingPreview, uploading, previewEnabled]);

  const openRegenerate = useCallback(() => {
    if (!figureUrl || generatingPreview || uploading) return;
    setRegenerateOpen(true);
  }, [figureUrl, generatingPreview, uploading]);

  const closeRegenerate = useCallback(() => {
    setRegenerateOpen(false);
  }, []);

  const onRegenerate = useCallback(
    (customPrompt: string) => {
      setRegenerateOpen(false);
      void generatePreview(customPrompt);
    },
    [generatePreview],
  );

  return {
    step,
    stepIndex,
    maxReachedIndex,
    styleDraft,
    setStyleDraft,
    basicsDraft,
    setBasicsDraft,
    locale,
    tagInput,
    setTagInput,
    showAdvanced,
    setShowAdvanced,
    events,
    setEvents,
    voiceReferenceId,
    setVoiceReferenceId,
    submitting,
    generatingPreview,
    previewProgress,
    previewEnabled,
    previewCostLabel,
    regenerateOpen,
    cropPick,
    uploading,
    handlePickFigure,
    handleCropCancel,
    handleCropConfirm,
    previewUri,
    previewName,
    previewPersonality,
    updateLocale,
    goToStep,
    togglePreset,
    addTag,
    removeTag,
    showStepError,
    canProceed,
    canCreate,
    onNext,
    onBack,
    onSubmit,
    openRegenerate,
    closeRegenerate,
    onRegenerate,
  };
}
