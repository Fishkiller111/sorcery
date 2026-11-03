import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useI18n } from '../i18n/I18nContext';
import {
  deleteRole,
  getRole,
  listRoleRevisions,
  publishRole,
  restoreRoleRevision,
  unpublishRole,
  updateRole,
  updateRoleEvents,
  uploadRoleAsset,
} from '../api/roles';
import {
  DEFAULT_ACTIVE_END_MINUTE,
  DEFAULT_ACTIVE_START_MINUTE,
  DEFAULT_AUTO_POST_TIMEZONE,
  DEFAULT_MEDIA_WEIGHT_MATURE,
  DEFAULT_MEDIA_WEIGHT_R,
  DEFAULT_MEDIA_WEIGHT_STANDARD,
  clampMediaWeight,
  getAutoPostConfig,
  hourToMinutes,
  minutesToHour,
  updateAutoPostConfig,
} from '../api/autopost';
import { useCropUpload } from './useCropUpload';
import { pickRoleFigureImage } from '../utils/pickRoleImage';
import { FIGURE_CROP_OUTPUT } from '../utils/cropAvatarImage';
import { formatApiError, INTRO_MAX, INTRO_MIN, introLength, MAX_PERSONALITY_TAG_LEN, personalityTagLength } from '../utils/roleForm';
import { notifyError, notifySuccess, notifyWarning } from '../utils/notify';
import type { ExploreRoleCategory, RoleDetailResp, RoleEventInput, RoleRevisionItem } from '../types/api';
import { parseEditableEvents, validateRoleEvents } from '../components/agent/RoleEventEditor';
import { appLangToAgentLang } from '../utils/agentLang';
import type { LangId } from '../components/create-agent/types';
import { ROLE_CATEGORY_HISTORY_ID } from '../utils/roleCategory';

function editLangForRole(detail: RoleDetailResp | null, appLang: string): LangId {
  const canonical = (detail?.canonical_lang as LangId | undefined) ?? appLangToAgentLang(appLang as 'en');
  if (detail?.supported_langs?.includes(canonical)) return canonical;
  if (detail?.supported_langs?.[0]) return detail.supported_langs[0] as LangId;
  return canonical;
}

function parseRoleForm(detail: RoleDetailResp) {
  let intro = '';
  let personality: string[] = [];
  let appearance = '';
  try {
    const attrs = JSON.parse(detail.attributes) as Record<string, unknown>;
    if (typeof attrs.background === 'string') intro = attrs.background;
    if (typeof attrs.appearance === 'string') appearance = attrs.appearance;
    if (Array.isArray(attrs.personality)) {
      personality = attrs.personality.filter((p): p is string => typeof p === 'string');
    }
  } catch {
    // ignore
  }
  return {
    name: detail.name,
    introduction: intro,
    personality,
    appearance,
    sceneName: detail.scene_name,
    sceneDesc: detail.scene_desc,
    figureUrl: detail.figure_url,
  };
}

function localeFromDetail(detail: RoleDetailResp, editLang: LangId) {
  const locale = detail.i18n?.[editLang];
  if (locale) {
    return {
      name: locale.name ?? detail.name,
      introduction: locale.introduction ?? '',
      personality: locale.personality ?? [],
      appearance: locale.appearance ?? '',
      sceneName: locale.scene_name ?? detail.scene_name,
      sceneDesc: locale.scene_desc ?? detail.scene_desc,
      figureUrl: detail.figure_url,
    };
  }
  return parseRoleForm(detail);
}

function exploreCategoriesFromRole(role: RoleDetailResp): ExploreRoleCategory[] {
  return (role.categories ?? []).filter(
    (c) => c.category_id !== 'myself' && c.category_id !== ROLE_CATEGORY_HISTORY_ID,
  );
}

export function useAgentSettings() {
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const { t, lang: appLang } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RoleDetailResp | null>(null);
  const [name, setName] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [appearance, setAppearance] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [sceneDesc, setSceneDesc] = useState('');
  const [personality, setPersonality] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [seedCategories, setSeedCategories] = useState<ExploreRoleCategory[]>([]);
  const [figureUrl, setFigureUrl] = useState('');
  const [figurePreview, setFigurePreview] = useState<string | undefined>();
  const [voiceReferenceId, setVoiceReferenceId] = useState('');
  const [revisions, setRevisions] = useState<RoleRevisionItem[]>([]);
  const [events, setEvents] = useState<RoleEventInput[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<number | null>(null);
  const [scheduleTimezone, setScheduleTimezone] = useState(DEFAULT_AUTO_POST_TIMEZONE);
  const [scheduleStartHour, setScheduleStartHour] = useState(minutesToHour(DEFAULT_ACTIVE_START_MINUTE));
  const [scheduleEndHour, setScheduleEndHour] = useState(minutesToHour(DEFAULT_ACTIVE_END_MINUTE));
  const [scheduleUsingDefault, setScheduleUsingDefault] = useState(true);
  const [mediaWeightStandard, setMediaWeightStandard] = useState(DEFAULT_MEDIA_WEIGHT_STANDARD);
  const [mediaWeightR, setMediaWeightR] = useState(DEFAULT_MEDIA_WEIGHT_R);
  const [mediaWeightMature, setMediaWeightMature] = useState(DEFAULT_MEDIA_WEIGHT_MATURE);

  const uploadFigure = useCallback(
    (file: Parameters<typeof uploadRoleAsset>[1], filename: string) =>
      uploadRoleAsset('figure', file, filename),
    [],
  );

  const applyRoleForm = useCallback((role: RoleDetailResp) => {
    const editLang = editLangForRole(role, appLang);
    const form = localeFromDetail(role, editLang);
    const cats = exploreCategoriesFromRole(role);
    setName(form.name);
    setIntroduction(form.introduction);
    setPersonality(form.personality);
    setAppearance(form.appearance);
    setSceneName(form.sceneName);
    setSceneDesc(form.sceneDesc);
    setFigureUrl(form.figureUrl);
    setFigurePreview(undefined);
    setVoiceReferenceId(role.voice_reference_id ?? '');
    setCategoryIds(cats.map((c) => c.category_id));
    setSeedCategories(cats);
    setEvents(parseEditableEvents(role.events));
  }, [appLang]);

  const {
    cropPick,
    uploading: figureUploading,
    handlePick: handlePickFigure,
    handleCropCancel,
    handleCropConfirm,
  } = useCropUpload({
    pick: pickRoleFigureImage,
    output: FIGURE_CROP_OUTPUT,
    upload: uploadFigure,
    onSuccess: (resp, previewUri) => {
      setFigureUrl(resp.url);
      setFigurePreview(previewUri);
    },
    onError: (e) => {
      notifyError(formatApiError(t, e));
      setFigurePreview(undefined);
    },
  });

  const load = useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const [role, rev, autoPost] = await Promise.all([
        getRole(roleId),
        listRoleRevisions(roleId),
        getAutoPostConfig(roleId).catch(() => null),
      ]);
      if (!role.is_owner) {
        notifyWarning(t('agent.notOwner'));
        setLoadFailed(true);
        return;
      }
      setDetail(role);
      applyRoleForm(role);
      setRevisions(rev.revisions);
      if (autoPost) {
        const start = autoPost.active_start_minute;
        const end = autoPost.active_end_minute;
        const tz = autoPost.timezone || DEFAULT_AUTO_POST_TIMEZONE;
        setScheduleTimezone(tz);
        setScheduleStartHour(minutesToHour(start));
        setScheduleEndHour(minutesToHour(end));
        setScheduleUsingDefault(
          tz === DEFAULT_AUTO_POST_TIMEZONE &&
            start === DEFAULT_ACTIVE_START_MINUTE &&
            end === DEFAULT_ACTIVE_END_MINUTE,
        );
        setMediaWeightStandard(clampMediaWeight(autoPost.media_weight_standard ?? DEFAULT_MEDIA_WEIGHT_STANDARD));
        setMediaWeightR(clampMediaWeight(autoPost.media_weight_r ?? DEFAULT_MEDIA_WEIGHT_R));
        setMediaWeightMature(clampMediaWeight(autoPost.media_weight_mature ?? DEFAULT_MEDIA_WEIGHT_MATURE));
      } else {
        setScheduleTimezone(DEFAULT_AUTO_POST_TIMEZONE);
        setScheduleStartHour(minutesToHour(DEFAULT_ACTIVE_START_MINUTE));
        setScheduleEndHour(minutesToHour(DEFAULT_ACTIVE_END_MINUTE));
        setScheduleUsingDefault(true);
        setMediaWeightStandard(DEFAULT_MEDIA_WEIGHT_STANDARD);
        setMediaWeightR(DEFAULT_MEDIA_WEIGHT_R);
        setMediaWeightMature(DEFAULT_MEDIA_WEIGHT_MATURE);
      }
    } catch (e) {
      notifyError(formatApiError(t, e));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [applyRoleForm, roleId, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const removeTag = useCallback((tag: string) => {
    setPersonality((prev) => prev.filter((p) => p !== tag));
  }, []);

  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (!tag || personality.includes(tag)) return;
    if (personality.length >= 8) {
      notifyWarning(t('errors.personalityTooMany'));
      return;
    }
    if (personalityTagLength(tag) > MAX_PERSONALITY_TAG_LEN) {
      notifyWarning(t('errors.personalityTagTooLong'));
      return;
    }
    setPersonality((prev) => [...prev, tag]);
    setTagInput('');
  }, [tagInput, personality, t]);

  const showFormError = useCallback((msg: string | null) => {
    if (msg) notifyWarning(msg);
  }, []);

  const onSave = useCallback(async () => {
    if (!roleId) return;
    const introLen = introLength(introduction);
    if (introLen < INTRO_MIN) {
      notifyWarning(t('errors.introTooShort'));
      return;
    }
    if (introLen > INTRO_MAX) {
      notifyWarning(t('errors.introTooLong'));
      return;
    }
    try {
      setBusy('save');
      const updated = await updateRole(roleId, {
        name: name.trim(),
        introduction: introduction.trim(),
        personality,
        appearance: appearance.trim() || undefined,
        scene_name: sceneName.trim() || undefined,
        scene_desc: sceneDesc.trim() || undefined,
        figure_url: figureUrl || undefined,
        voice_reference_id: voiceReferenceId,
        category_ids: categoryIds,
      });
      setDetail(updated);
      applyRoleForm(updated);
      const rev = await listRoleRevisions(roleId);
      setRevisions(rev.revisions);
      notifySuccess(t('settings.saved'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  }, [
    applyRoleForm,
    appearance,
    categoryIds,
    figureUrl,
    introduction,
    name,
    personality,
    roleId,
    sceneDesc,
    sceneName,
    t,
    voiceReferenceId,
  ]);

  const onSaveEvents = useCallback(async () => {
    if (!roleId) return;
    const err = validateRoleEvents(events, t);
    if (err) {
      notifyWarning(err);
      return;
    }
    try {
      setBusy('events');
      const updated = await updateRoleEvents(roleId, { events });
      setDetail(updated);
      setEvents(parseEditableEvents(updated.events));
      notifySuccess(t('settings.saved'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  }, [events, roleId, t]);

  const onResetScheduleDefault = useCallback(() => {
    setScheduleTimezone(DEFAULT_AUTO_POST_TIMEZONE);
    setScheduleStartHour(minutesToHour(DEFAULT_ACTIVE_START_MINUTE));
    setScheduleEndHour(minutesToHour(DEFAULT_ACTIVE_END_MINUTE));
    setScheduleUsingDefault(true);
    setMediaWeightStandard(DEFAULT_MEDIA_WEIGHT_STANDARD);
    setMediaWeightR(DEFAULT_MEDIA_WEIGHT_R);
    setMediaWeightMature(DEFAULT_MEDIA_WEIGHT_MATURE);
  }, []);

  const onChangeScheduleStartHour = useCallback((hour: number) => {
    setScheduleStartHour(hour);
    setScheduleUsingDefault(false);
  }, []);

  const onChangeScheduleEndHour = useCallback((hour: number) => {
    setScheduleEndHour(hour);
    setScheduleUsingDefault(false);
  }, []);

  const onChangeScheduleTimezone = useCallback((tz: string) => {
    setScheduleTimezone(tz);
    setScheduleUsingDefault(false);
  }, []);

  const onSaveSchedule = useCallback(async () => {
    if (!roleId) return;
    const startMin = hourToMinutes(scheduleStartHour);
    const endMin = hourToMinutes(scheduleEndHour);
    if (
      scheduleStartHour < 0 ||
      scheduleStartHour > 23 ||
      scheduleEndHour < 1 ||
      scheduleEndHour > 24 ||
      startMin < 0 ||
      startMin >= 1440 ||
      endMin < 0 ||
      endMin > 1440
    ) {
      notifyWarning(t('agent.scheduleInvalid'));
      return;
    }
    try {
      setBusy('schedule');
      const updated = await updateAutoPostConfig(roleId, {
        timezone: scheduleTimezone.trim() || DEFAULT_AUTO_POST_TIMEZONE,
        active_start_minute: startMin,
        active_end_minute: endMin,
        media_weight_standard: clampMediaWeight(mediaWeightStandard),
        media_weight_r: clampMediaWeight(mediaWeightR),
        media_weight_mature: clampMediaWeight(mediaWeightMature),
        allow_mature_media: clampMediaWeight(mediaWeightMature) > 0,
      });
      setScheduleTimezone(updated.timezone || DEFAULT_AUTO_POST_TIMEZONE);
      setScheduleStartHour(minutesToHour(updated.active_start_minute));
      setScheduleEndHour(minutesToHour(updated.active_end_minute));
      setScheduleUsingDefault(
        (updated.timezone || DEFAULT_AUTO_POST_TIMEZONE) === DEFAULT_AUTO_POST_TIMEZONE &&
          updated.active_start_minute === DEFAULT_ACTIVE_START_MINUTE &&
          updated.active_end_minute === DEFAULT_ACTIVE_END_MINUTE,
      );
      setMediaWeightStandard(clampMediaWeight(updated.media_weight_standard ?? DEFAULT_MEDIA_WEIGHT_STANDARD));
      setMediaWeightR(clampMediaWeight(updated.media_weight_r ?? DEFAULT_MEDIA_WEIGHT_R));
      setMediaWeightMature(clampMediaWeight(updated.media_weight_mature ?? DEFAULT_MEDIA_WEIGHT_MATURE));
      notifySuccess(t('settings.saved'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  }, [mediaWeightMature, mediaWeightR, mediaWeightStandard, roleId, scheduleEndHour, scheduleStartHour, scheduleTimezone, t]);

  const onPublish = useCallback(async () => {
    if (!roleId) return;
    try {
      setBusy('publish');
      const resp = await publishRole(roleId);
      await load();
      if (resp.publish_status === 'rejected' && resp.moderation_note) {
        notifyWarning(resp.moderation_note);
      } else {
        notifySuccess(t('settings.saved'));
      }
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  }, [load, roleId, t]);

  const onUnpublish = useCallback(async () => {
    if (!roleId) return;
    try {
      setBusy('unpublish');
      await unpublishRole(roleId);
      await load();
      notifySuccess(t('settings.saved'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  }, [load, roleId, t]);

  const onDelete = useCallback(() => {
    if (!roleId) return;
    setConfirmDelete(true);
  }, [roleId]);

  const confirmDeleteAction = useCallback(async () => {
    if (!roleId) return;
    setConfirmDelete(false);
    try {
      setBusy('delete');
      await deleteRole(roleId);
      router.replace('/free-chat');
    } catch (e) {
      notifyError(formatApiError(t, e));
      setBusy(null);
    }
  }, [roleId, router, t]);

  const onRestore = useCallback((version: number) => {
    if (!roleId) return;
    setConfirmRestoreVersion(version);
  }, [roleId]);

  const confirmRestoreAction = useCallback(async () => {
    if (!roleId || confirmRestoreVersion == null) return;
    const version = confirmRestoreVersion;
    setConfirmRestoreVersion(null);
    try {
      setBusy(`restore-${version}`);
      const updated = await restoreRoleRevision(roleId, version);
      setDetail(updated);
      applyRoleForm(updated);
      const rev = await listRoleRevisions(roleId);
      setRevisions(rev.revisions);
      notifySuccess(t('settings.saved'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(null);
    }
  }, [applyRoleForm, confirmRestoreVersion, roleId, t]);

  const publishStatus = detail?.publish_status;
  const canPublish = publishStatus === 'none' || publishStatus === 'rejected';
  const canUnpublish = publishStatus === 'published';
  const canEdit = publishStatus !== 'pending_review';

  return {
    roleId,
    t,
    lang: appLang,
    router,
    loading,
    detail,
    loadFailed,
    name,
    setName,
    introduction,
    setIntroduction,
    appearance,
    setAppearance,
    sceneName,
    setSceneName,
    sceneDesc,
    setSceneDesc,
    personality,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    categoryIds,
    setCategoryIds,
    seedCategories,
    figureUrl,
    figurePreview,
    voiceReferenceId,
    setVoiceReferenceId,
    revisions,
    events,
    setEvents,
    busy,
    confirmDelete,
    setConfirmDelete,
    confirmRestoreVersion,
    setConfirmRestoreVersion,
    cropPick,
    figureUploading,
    handlePickFigure,
    handleCropCancel,
    handleCropConfirm,
    showFormError,
    onSave,
    onSaveEvents,
    onSaveSchedule,
    onResetScheduleDefault,
    onChangeScheduleStartHour,
    onChangeScheduleEndHour,
    onChangeScheduleTimezone,
    scheduleTimezone,
    scheduleStartHour,
    scheduleEndHour,
    scheduleUsingDefault,
    mediaWeightStandard,
    mediaWeightR,
    mediaWeightMature,
    setMediaWeightStandard,
    setMediaWeightR,
    setMediaWeightMature,
    onPublish,
    onUnpublish,
    onDelete,
    confirmDeleteAction,
    onRestore,
    confirmRestoreAction,
    publishStatus,
    canPublish,
    canUnpublish,
    canEdit,
  };
}

export type AgentSettingsViewModel = ReturnType<typeof useAgentSettings>;
