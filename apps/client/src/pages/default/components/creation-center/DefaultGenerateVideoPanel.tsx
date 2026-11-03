/**
 * Creation Center · AI 生视频面板
 * 对接后端 /ai-video-gen/*（Gateway Key 在服务端）。
 * 布局参考 Venice Studio / OurDream：左控制栏 + 右主画布 + 作品画廊。
 */
import type { Lang } from '../../../../i18n/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { IMAGE_GEN_TEMPLATES } from '../../../../constants/imageGenTemplates';
import type { ImageGenCategory } from '../../../../constants/imageGenCategoryPresets';
import { resolveStaticUrl } from '../../../../constants/config';
import {
  deleteAiVideoGenRecord,
  generateAiVideo,
  getAiVideoGenMeta,
  getAiVideoGenRecord,
  uploadAiVideoGenReference,
} from '../../../../api/aiVideoGen';
import { useAuthStore } from '../../../../stores/authStore';
import { useAiVideoGenHistory } from '../../../../hooks/useAiVideoGenHistory';
import { useIsDesktop } from '../../../../hooks/useIsDesktop';
import { requireLoginForAction } from '../../../../utils/requireLogin';
import { formatApiError, formatGenRecordError, getApiErrorCode } from '../../../../utils/apiError';
import { notifyError, notifySuccess } from '../../../../utils/notify';
import { compressImageForUpload } from '../../../../utils/compressImageForUpload';
import { quoteAiVideoPoints } from '../../../../utils/aiVideoGenPricing';
import { copyText } from '../../../../utils/copyOrShare';
import {
  pickChatImage,
  PhotoPermissionDeniedError,
  type ChatImageUploadFile,
} from '../../../../utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../../../utils/promptPhotoLibraryAccessSettings';
import type { AiVideoGenMetaResp, AiVideoGenRecordItem } from '../../../../types/api';
import { AgentMediaVideoView } from '../../agent-media/AgentMediaVideoView';
import { ThemedGeneralConfirmModal } from '../../../../components/ui/ThemedGeneralConfirmModal';
import {
  CreationCenterPresetBrowser,
  CreationCenterPresetSheet,
  CreationCenterPresetSlots,
  createCreationCenterPresetStyles,
  useCreationCenterPresetSelection,
  type CreationCenterDisplayTemplate,
} from './shared';

/** 与 Gateway 文档一致的默认时长档（meta 未返回时回落） */
const FALLBACK_DURATION_OPTIONS = [2, 5, 8] as const;

/** 模型家族：决定顶部页签与参数区（音轨 / H3 分辨率） */
type ModelFamily = 'omniforge' | 'minimax-h3';

/** 上游 Gateway 支持的 model id（与后端 Catalog 对齐） */
type VideoModelId =
  | 'omniforge'
  | 'omniforge-flf2v'
  | 'omniforge-t2v'
  | 'omniforge-ic'
  | 'minimax-h3-t2va'
  | 'minimax-h3-fl2va'
  | 'minimax-h3-ref2va';

/** 结束帧：本地新选图需再上传；历史回填可仅带本站 static URL */
type EndFramePick = {
  previewUri: string;
  file?: ChatImageUploadFile;
  filename: string;
};

/** MiniMax H3 模式芯片（产品仅暴露 H3） */
const H3_MODELS: { id: VideoModelId; labelKey: string }[] = [
  { id: 'minimax-h3-ref2va', labelKey: 'creationCenter.videoModeRef2va' },
  { id: 'minimax-h3-fl2va', labelKey: 'creationCenter.videoModeFl2va' },
  { id: 'minimax-h3-t2va', labelKey: 'creationCenter.videoModeT2va' },
];

/** H3 画幅预设：width/height 须被 32 整除；含 16:9 / 9:16 / 4:3 / 3:4 / 1:1（前端档位名 1k / 2k） */
const FALLBACK_H3_SIZE_PRESETS = [
  { id: '9x16_512', label: '9:16 · 1k', width: 512, height: 896 },
  { id: '9x16_768', label: '9:16 · 2k', width: 768, height: 1344 },
  { id: '16x9_512', label: '16:9 · 1k', width: 896, height: 512 },
  { id: '16x9_768', label: '16:9 · 2k', width: 1344, height: 768 },
  { id: '1x1_512', label: '1:1 · 1k', width: 512, height: 512 },
  { id: '1x1_768', label: '1:1 · 2k', width: 768, height: 768 },
  { id: '4x3_512', label: '4:3 · 1k', width: 640, height: 480 },
  { id: '4x3_768', label: '4:3 · 2k', width: 768, height: 576 },
  { id: '3x4_512', label: '3:4 · 1k', width: 480, height: 640 },
  { id: '3x4_768', label: '3:4 · 2k', width: 576, height: 768 },
] as const;

const VIDEO_ASPECT_OPTIONS = ['9:16', '16:9', '1:1', '4:3', '3:4'] as const;
type VideoAspectKey = (typeof VIDEO_ASPECT_OPTIONS)[number];

/** 从预设 id / 像素比解析长宽比（兼容旧 low/default） */
function aspectKeyOfPreset(preset: { id: string; width: number; height: number }): VideoAspectKey {
  const id = preset.id.trim().toLowerCase();
  if (id === 'low' || id === 'default' || id.startsWith('9x16')) return '9:16';
  if (id.startsWith('16x9')) return '16:9';
  if (id.startsWith('1x1')) return '1:1';
  if (id.startsWith('4x3')) return '4:3';
  if (id.startsWith('3x4')) return '3:4';
  const { width: w, height: h } = preset;
  if (w > 0 && h > 0) {
    const r = w / h;
    if (Math.abs(r - 9 / 16) < 0.03) return '9:16';
    if (Math.abs(r - 16 / 9) < 0.03) return '16:9';
    if (Math.abs(r - 1) < 0.03) return '1:1';
    if (Math.abs(r - 4 / 3) < 0.03) return '4:3';
    if (Math.abs(r - 3 / 4) < 0.03) return '3:4';
  }
  return '9:16';
}

/** 同比例内分辨率档：1k（原 512 档）/ 2k（原 768 档） */
function resolutionTierOfPreset(preset: { id: string; width: number; height: number }): '1k' | '2k' {
  const id = preset.id.trim().toLowerCase();
  if (id.includes('768') || id === 'default' || id.includes('_2k') || id.includes('2k')) return '2k';
  if (id.includes('512') || id === 'low' || id.includes('_1k') || id.includes('1k')) return '1k';
  return Math.max(preset.width, preset.height) >= 768 ? '2k' : '1k';
}

/** 产品可选的 H3 model id（历史任务仍可能出现 Omni 旧 id） */
const H3_MODEL_IDS: VideoModelId[] = [
  'minimax-h3-ref2va',
  'minimax-h3-fl2va',
  'minimax-h3-t2va',
];

/** 全部已知 model id，用于类型守卫与历史记录兼容 */
const ALL_MODEL_IDS: VideoModelId[] = [
  'omniforge',
  'omniforge-flf2v',
  'omniforge-t2v',
  'omniforge-ic',
  ...H3_MODEL_IDS,
];

/** 校验字符串是否为受支持的 VideoModelId */
function isVideoModelId(id: string): id is VideoModelId {
  return (ALL_MODEL_IDS as string[]).includes(id);
}

/** 由 model id 推断产品家族（决定页签与参数区） */
function familyOf(model: VideoModelId): ModelFamily {
  return model.startsWith('minimax-h3') ? 'minimax-h3' : 'omniforge';
}

/** 当前模式是否必须上传主图（T2V / T2VA 除外） */
function needsImage(model: VideoModelId): boolean {
  return model !== 'omniforge-t2v' && model !== 'minimax-h3-t2va';
}

/** FLF2V：结束帧必填 */
function needsEndImageRequired(model: VideoModelId): boolean {
  return model === 'omniforge-flf2v';
}

/** 是否展示结束帧 / 第二参考上传槽（必填或可选） */
function allowsEndImage(model: VideoModelId): boolean {
  return (
    model === 'omniforge-flf2v' ||
    model === 'minimax-h3-fl2va' ||
    model === 'minimax-h3-ref2va'
  );
}

/**
 * 按模式拼英文 prompt 前缀（身份锁定 / IC 两段式 / Image 1 标签）。
 * 若用户已手写同类前缀，上层会跳过重复追加。
 */
function buildPromptPrefix(model: VideoModelId): string {
  if (model === 'minimax-h3-ref2va') {
    return 'Image 1 as the same character, keep 2D style matching Image 1 (not photorealistic). ';
  }
  if (model === 'omniforge-ic') {
    return 'Reference sheet: …\n\nGenerated video: ';
  }
  if (model === 'omniforge' || model === 'omniforge-flf2v' || model === 'minimax-h3-fl2va') {
    return 'The same character as the input image. ';
  }
  return '';
}

/** 需要全身入画的姿势预设（避免 Medium shot 把四肢裁出画外）——含 iOS SFW + Web 成人 id */
const FULL_BODY_POSE_IDS = new Set([
  'standing',
  'sitting',
  'walking',
  'waving',
  'crossed_arms',
  'hands_pockets',
  'reading',
  'three_quarter',
  'over_shoulder',
  'missionary',
  'doggy',
  'cowgirl',
  'against_wall',
  'on_knees',
  'arching',
  'pinup',
  'spreading',
]);

/** 近景/头肩姿势：仍要求头脸完整入画，但不必强行全身 */
const CLOSE_FRAMING_POSE_IDS = new Set(['portrait', 'leaning', 'peace_sign', 'profile', 'coffee']);

/** 正文里出现这些词时，按全身构图处理 */
const FULL_BODY_PROMPT_RE =
  /\b(full[- ]?body|walking toward|street-style|standing pose|three-quarter|hands in pockets|on all fours|doggy|cowgirl|missionary|straddling|kneeling|pin-?up)\b/i;

/** 用户/预设已手写入画约束时，不再重复追加构图后缀 */
const HAS_FRAMING_GUARD_RE =
  /\b(fully visible|in[- ]frame|keep (the )?subject|safe margins?|no crop(?:ping)?|entire body visible|subject centered)\b/i;

/**
 * 成片构图后缀：人物必须完整留在画幅内，锁机位，避免贴边裁切。
 * 全身姿势用 full-body；近景姿势用 head-and-shoulders；其余用 medium 但仍带入画护栏。
 */
function buildPromptFramingSuffix(opts: {
  family: ModelFamily;
  poseId?: string | null;
  body: string;
}): string {
  const poseId = opts.poseId?.trim() || '';
  const preferFullBody =
    FULL_BODY_POSE_IDS.has(poseId) || FULL_BODY_PROMPT_RE.test(opts.body);
  const preferClose =
    !preferFullBody && CLOSE_FRAMING_POSE_IDS.has(poseId);

  const shot = preferFullBody
    ? 'full-body shot, entire body and face fully visible in frame'
    : preferClose
      ? 'head-and-shoulders shot, face and hair fully visible in frame'
      : 'medium shot, face and torso fully visible in frame';

  const framingGuard =
    'subject centered with safe margins from all edges, no cropping of head face or limbs, locked camera, no pan zoom or reframe';

  if (opts.family === 'minimax-h3') {
    return `${shot}, ${framingGuard}, one clear action, smooth cinematic motion`;
  }
  return `${shot}, ${framingGuard}, soft natural motion, consistent face and body, smooth animation`;
}

/**
 * 后端 NormalizeStaticReferenceURL 只认本站 /static 路径。
 * 外链 CDN 图需要用户重新选图走 upload-reference。
 */
function isStaticRefUrl(uri: string): boolean {
  const u = uri.trim();
  return u.startsWith('/static/') || u.includes('/static/');
}

/** 任务仍在进行，历史侧应显示进度条而非播放器 */
function isActiveRecordStatus(status: string) {
  return status === 'pending' || status === 'processing' || status === 'queued';
}

/** 任务成功（兼容 succeeded / completed） */
function isSucceededRecordStatus(status: string) {
  return status === 'succeeded' || status === 'completed';
}

/** 将后端 status 映射为界面文案 */
function statusLabel(status: string, t: (key: string) => string): string {
  if (isSucceededRecordStatus(status)) return t('creationCenter.historyStatusCompleted');
  if (status === 'failed') return t('creationCenter.historyStatusFailed');
  if (isActiveRecordStatus(status)) return t('creationCenter.historyStatusPending');
  return status;
}

/** 预设浏览器里「角色」槽的上传文案覆盖 */
const VIDEO_CHARACTER_COPY = {
  browserHintKey: 'creationCenter.videoCharacterBrowserHint',
  uploadTitleKey: 'creationCenter.videoFrameUpload',
  uploadSubKey: 'creationCenter.videoFrameUploadSub',
  uploadFilledSubKey: 'creationCenter.videoFrameChange',
} as const;

/** Web 原生 select 样式（视频设置气泡） */
const webSelectStyle: Record<string, string | number> = {
  width: '100%',
  minHeight: 38,
  padding: '8px 10px',
  borderRadius: 10,
  border: `1px solid ${TOKENS.colors.cardBorderFaint}`,
  backgroundColor: 'rgba(8, 10, 15, 0.65)',
  color: TOKENS.colors.text,
  fontSize: 13,
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
};

/** 三列工作室最小内容宽：左栏 400 + 中栏(≥两列图) 300 + 队列 260 + gap 32 − 150 余量 */
const STUDIO_SPLIT_MIN_WIDTH = 842;

/**
 * AI 生视频面板：对接 /ai-video-gen/*（Key 在后端）。
 * 布局参考 Venice Studio / OurDream：左控制栏 + 右主画布 + 作品画廊。
 */
export function DefaultGenerateVideoPanel() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const presetStyles = useMemo(() => createCreationCenterPresetStyles(lang), [lang]);
  const styles = useMemo(() => createStyles(lang), [lang]);
  const params = useLocalSearchParams<{ referenceUrl?: string; roleName?: string }>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAppDesktop = useIsDesktop();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  /** 扣除侧栏与页边距后的可用宽；不足则走移动端堆叠 + 预设底栏 */
  const studioContentWidth =
    windowWidth -
    (isAppDesktop ? TOKENS.layout.sidebarWidth : 0) -
    TOKENS.layout.contentPadding * 2;
  const studioSplit = studioContentWidth >= STUDIO_SPLIT_MIN_WIDTH;

  // —— 表单 / 任务 UI 状态 ——
  // 默认 MiniMax H3 · REF2VA
  const [model, setModel] = useState<VideoModelId>('minimax-h3-ref2va');
  const [durationSec, setDurationSec] = useState(5);
  const [seedText, setSeedText] = useState('7');
  const [enableAudio, setEnableAudio] = useState(false);
  const [h3SizeId, setH3SizeId] = useState('9x16_512');
  const [aspectKey, setAspectKey] = useState<VideoAspectKey>('9:16');
  const [endFrame, setEndFrame] = useState<EndFramePick | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [meta, setMeta] = useState<AiVideoGenMetaResp | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  /** 高级参数气泡（时长 / 分辨率 / 音轨；不含种子） */
  const [advancedOpen, setAdvancedOpen] = useState(false);
  /** 设置按钮窗口坐标，供气泡绝对定位 */
  const [settingsAnchor, setSettingsAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  /** 预设浏览器：宽屏默认展开并展示「角色」；窄屏点槽位再出底栏 */
  const [presetsOpen, setPresetsOpen] = useState(studioSplit);
  /** 参考图区展开（composer「+」） */
  const [imageAttachOpen, setImageAttachOpen] = useState(true);
  /** 队列卡片操作栏展开的 record_id */
  const [expandedActionsId, setExpandedActionsId] = useState<string | null>(null);
  /** 图片信息弹层当前记录 */
  const [imageInfoJob, setImageInfoJob] = useState<AiVideoGenRecordItem | null>(null);
  /** 删除确认中的记录 */
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<AiVideoGenRecordItem | null>(null);
  /** 队列单项操作进行中（防连点） */
  const [queueActionBusyId, setQueueActionBusyId] = useState<string | null>(null);
  /** 防止 deep link 参考图被重复 apply */
  const appliedReferenceRef = useRef<string | null>(null);
  /** 设置图标节点，用于 measureInWindow */
  const settingsBtnRef = useRef<View>(null);
  // 桌面创建页也展示历史侧栏，始终启用轮询
  const history = useAiVideoGenHistory(true);
  const { refresh: refreshHistory, removeItem: removeHistoryItem } = history;

  const family = familyOf(model);

  /** 更换角色时清空历史选中，避免预览错位 */
  const onCharacterChanged = useCallback(() => {
    setSelectedJobId(null);
  }, []);

  // 与生图共用的角色 / 姿势 / 场景预设选中逻辑
  const presets = useCreationCenterPresetSelection({
    characterHintKey: 'creationCenter.videoCategoryCharacterHint',
    photoPermissionDeniedKey: 'creationCenter.videoPermissionDenied',
    onCharacterChanged,
    isDesktopOverride: studioSplit,
  });

  const {
    isDesktop,
    categoryMeta,
    character,
    poseId,
    clothingId,
    sceneId,
    customPrompt,
    setCustomPrompt,
    composedPrompt: baseComposedPrompt,
    selectCharacterTemplate,
    pickCharacterReference,
    applyDeepLinkReference,
    selectPreset,
    clearCategory,
    clearCharacter,
    tileWidthStyle,
    onPresetGridLayout,
    activeCategory,
    setActiveCategory,
    slotSelection,
  } = presets;

  /**
   * 最终提交用 prompt：在用户/预设正文上按模式追加身份前缀与构图/动作后缀。
   * 若正文已含 Image 1 / same character / Generated video，则不再重复加前缀；
   * 但仍会补「人物完整入画」护栏（除非正文已自带同类约束）。
   */
  const composedPrompt = useMemo(() => {
    const body = (customPrompt.trim() || baseComposedPrompt.trim()).trim();
    if (!body) return '';
    const prefix = buildPromptPrefix(model);
    const framingSuffix = buildPromptFramingSuffix({
      family,
      poseId,
      body,
    });
    const needsFramingGuard = !HAS_FRAMING_GUARD_RE.test(body);

    // IC：强制两段式结构
    if (model === 'omniforge-ic') {
      if (body.includes('Generated video:')) {
        return needsFramingGuard ? `${body}, ${framingSuffix}` : body;
      }
      return `${prefix}${body}, consistent identity, ${framingSuffix}`;
    }

    const hasIdentityLock =
      body.toLowerCase().includes('image 1') || body.toLowerCase().includes('same character');
    if (hasIdentityLock) {
      return needsFramingGuard ? `${body}, ${framingSuffix}` : body;
    }
    return `${prefix}${body}, ${framingSuffix}`;
  }, [baseComposedPrompt, customPrompt, family, model, poseId]);

  /** 挂载时拉 meta，并同步默认时长 / 允许的模型 / H3 分辨率 */
  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    void getAiVideoGenMeta()
      .then((resp) => {
        if (cancelled) return;
        setMeta(resp);
        // 后台配置的默认时长
        if (resp.default_duration_sec > 0) {
          setDurationSec(resp.default_duration_sec);
        }
        // 当前选中若不在 H3 允许列表，切到第一个可用 H3 模型
        const h3Allowed = (resp.models ?? [])
          .map((m) => m.id)
          .filter((id): id is VideoModelId => isVideoModelId(id) && id.startsWith('minimax-h3'));
        if (h3Allowed.length) {
          setModel((prev) => (h3Allowed.includes(prev) ? prev : h3Allowed[0]));
        }
        const presetsList = resp.h3_size_presets?.length
          ? resp.h3_size_presets
          : [...FALLBACK_H3_SIZE_PRESETS];
        // 优先保留当前选中；否则落回 9:16 · 1k
        const preferred =
          presetsList.find((p) => p.id === h3SizeId) ||
          presetsList.find((p) => p.id === '9x16_512') ||
          presetsList.find((p) => p.id === 'low') ||
          presetsList[0];
        if (preferred) {
          setH3SizeId(preferred.id);
          setAspectKey(aspectKeyOfPreset(preferred));
        }
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // 仅挂载时拉 meta；h3SizeId 变更不重拉
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Agent 详情等入口带 referenceUrl 时，预填角色参考图 */
  useEffect(() => {
    const raw = params.referenceUrl;
    const referenceUrl = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
    if (!referenceUrl || appliedReferenceRef.current === referenceUrl) return;
    appliedReferenceRef.current = referenceUrl;
    const rawName = params.roleName;
    const roleName = (Array.isArray(rawName) ? rawName[0] : rawName)?.trim() ?? '';
    applyDeepLinkReference(referenceUrl, roleName);
  }, [applyDeepLinkReference, params.referenceUrl, params.roleName]);

  /** 底部预设浏览器用的角色模板列表（本地 IMAGE_GEN_TEMPLATES） */
  const displayTemplates = useMemo(
    (): CreationCenterDisplayTemplate[] =>
      IMAGE_GEN_TEMPLATES.map((tpl) => ({
        id: tpl.id,
        localPreview: tpl.preview,
        prompt: t(tpl.promptKey),
        label: t(tpl.labelKey),
      })),
    [t],
  );

  /** Admin 配置允许的 H3 model 集合；meta 空则放开全部 H3 */
  const allowedModelIds = useMemo(() => {
    if (!meta?.models?.length) return new Set(H3_MODEL_IDS);
    const fromMeta = meta.models
      .map((m) => m.id)
      .filter((id): id is VideoModelId => isVideoModelId(id) && id.startsWith('minimax-h3'));
    return new Set(fromMeta.length ? fromMeta : H3_MODEL_IDS);
  }, [meta]);

  /** 仅展示 MiniMax H3 三种模式 */
  const modeList = useMemo(() => {
    const filtered = H3_MODELS.filter((m) => allowedModelIds.has(m.id));
    return filtered.length ? filtered : H3_MODELS;
  }, [allowedModelIds]);

  /** 时长选项：优先用 meta，否则 2/5/8 */
  const durationOptions = useMemo(() => {
    if (meta?.duration_options_sec?.length) return meta.duration_options_sec;
    return [...FALLBACK_DURATION_OPTIONS];
  }, [meta]);

  /** H3 全部画幅预设（含各长宽比）；下拉里隐藏 legacy low/default 以免重复 */
  const h3SizePresets = useMemo(() => {
    const raw = meta?.h3_size_presets?.length
      ? meta.h3_size_presets
      : [...FALLBACK_H3_SIZE_PRESETS];
    return raw.filter((p) => p.id !== 'low' && p.id !== 'default');
  }, [meta]);

  /** 当前长宽比下的分辨率档 */
  const aspectSizePresets = useMemo(
    () => h3SizePresets.filter((p) => aspectKeyOfPreset(p) === aspectKey),
    [aspectKey, h3SizePresets],
  );

  const h3Size =
    aspectSizePresets.find((s) => s.id === h3SizeId) ??
    aspectSizePresets[0] ??
    h3SizePresets[0];

  /** 切换长宽比时尽量保留 1k / 2k 档位 */
  const onSelectAspect = useCallback(
    (next: VideoAspectKey) => {
      setAspectKey(next);
      const tier = h3Size ? resolutionTierOfPreset(h3Size) : '1k';
      const candidates = h3SizePresets.filter((p) => aspectKeyOfPreset(p) === next);
      const match =
        candidates.find((p) => resolutionTierOfPreset(p) === tier) || candidates[0];
      if (match) setH3SizeId(match.id);
    },
    [h3Size, h3SizePresets],
  );
  const modelMeta = meta?.models?.find((m) => m.id === model);
  // 基准积分（5s·低画质·无音轨）；实际扣费按时长×分辨率×音轨递增
  const basePointsCost = modelMeta?.points_cost ?? meta?.default_points_cost ?? 0;
  const pointsQuote = useMemo(
    () =>
      quoteAiVideoPoints({
        basePoints: basePointsCost,
        durationSec: durationSec,
        width: family === 'minimax-h3' ? h3Size?.width : undefined,
        height: family === 'minimax-h3' ? h3Size?.height : undefined,
        enableAudio: family === 'minimax-h3' ? enableAudio : false,
        applySizeScale: family === 'minimax-h3',
        pricing: meta?.pricing ?? null,
      }),
    [
      basePointsCost,
      durationSec,
      enableAudio,
      family,
      h3Size?.height,
      h3Size?.width,
      meta?.pricing,
    ],
  );
  /** 实付积分（含后台整体折扣） */
  const pointsCost = pointsQuote.points;
  const showListPrice =
    pointsQuote.discountPct > 0 && pointsQuote.listPoints > pointsQuote.points;

  // —— 提交按钮可用性 ——
  const startFrameUri = character?.referenceUri || character?.previewUri || null;
  const hasStartFrame = Boolean(
    character?.referenceFile ||
      (startFrameUri && isStaticRefUrl(startFrameUri)) ||
      character?.localPreview,
  );
  const imageOk = !needsImage(model) || hasStartFrame;
  const endOk = !needsEndImageRequired(model) || Boolean(endFrame);
  const canGenerate =
    imageOk &&
    endOk &&
    Boolean(composedPrompt.trim()) &&
    Boolean(meta?.enabled) &&
    !generating &&
    !metaLoading;

  /** 相册选择结束帧，并保留 file 供上传 */
  const pickEndFrame = useCallback(async () => {
    try {
      const file = await pickChatImage();
      if (!file?.previewUri || !file.file) return;
      setEndFrame({
        previewUri: file.previewUri,
        file: file.file,
        filename: file.filename || 'end-frame.jpg',
      });
    } catch (e) {
      if (e instanceof PhotoPermissionDeniedError) {
        promptPhotoLibraryAccessSettings(t);
        return;
      }
      notifyError(t('creationCenter.videoPickFailed'));
    }
  }, [t]);

  /** 切到不支持结束帧的模式时清掉已选尾帧 */
  useEffect(() => {
    if (!allowsEndImage(model)) setEndFrame(null);
  }, [model]);

  /**
   * 将本地图压缩并上传为 /static URL；若已是本站 static 则直接返回。
   * 外链或仅有本地预览模板时提示用户重新上传。
   */
  const resolveStaticImageUrl = useCallback(
    async (opts: {
      previewUri?: string | null;
      file?: ChatImageUploadFile;
      filename?: string;
    }): Promise<string> => {
      // 有本地文件 → 压缩后走 upload-reference
      if (opts.file && opts.previewUri) {
        const compressed = await compressImageForUpload({
          previewUri: opts.previewUri,
          file: opts.file,
          filename: opts.filename || 'reference.jpg',
        });
        const uploaded = await uploadAiVideoGenReference(compressed.file, compressed.filename);
        if (!uploaded.image_url) throw new Error('upload_empty');
        return uploaded.image_url;
      }
      // 已是本站 static（含绝对 URL 中带 /static/）
      const uri = opts.previewUri?.trim() ?? '';
      if (uri && isStaticRefUrl(uri)) {
        return uri.startsWith('http') ? uri : uri;
      }
      notifyError(t('creationCenter.videoUploadRequired'));
      throw new Error('reference_upload_required');
    },
    [t],
  );

  /**
   * 提交生视频：登录校验 → 上传参考图 → POST generate → 刷新画廊并选中新任务。
   */
  const onGenerate = useCallback(async () => {
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    const trimmed = composedPrompt.trim();
    if (!trimmed) {
      notifyError(t('creationCenter.promptRequired'));
      return;
    }
    if (!meta?.enabled) {
      notifyError(t('creationCenter.videoGenDisabled'));
      return;
    }
    setGenerating(true);
    try {
      let imageUrl: string | undefined;
      let endImageUrl: string | undefined;

      // 主图 / 参考图（按模式必填）
      if (needsImage(model)) {
        imageUrl = await resolveStaticImageUrl({
          previewUri: character?.referenceUri || character?.previewUri,
          file: character?.referenceFile,
          filename: character?.referenceFilename,
        });
      }

      // 结束帧或第二参考（FLF 必填；H3 可选）
      if (allowsEndImage(model) && endFrame) {
        endImageUrl = await resolveStaticImageUrl({
          previewUri: endFrame.previewUri,
          file: endFrame.file ?? undefined,
          filename: endFrame.filename,
        });
      } else if (needsEndImageRequired(model)) {
        notifyError(t('creationCenter.videoGenInvalidParams'));
        return;
      }

      const seedParsed = Number.parseInt(seedText.trim(), 10);
      const seed = Number.isFinite(seedParsed) ? seedParsed : undefined;

      // H3 才传音轨与宽高；OmniForge 画幅由服务端钉死
      const resp = await generateAiVideo({
        model,
        prompt: trimmed,
        image_url: imageUrl,
        end_image_url: endImageUrl,
        duration_sec: durationSec,
        seed,
        enable_audio: family === 'minimax-h3' ? enableAudio : undefined,
        ...(family === 'minimax-h3' && h3Size
          ? { size: h3Size.id, width: h3Size.width, height: h3Size.height }
          : {}),
      });

      notifySuccess(t('creationCenter.generateQueued'));
      setSelectedJobId(resp.record_id);
      setPresetsOpen(false);
      refreshHistory();
    } catch (e) {
      // 上传提示已弹出，避免重复 toast
      if (e instanceof Error && e.message === 'reference_upload_required') return;
      const code = getApiErrorCode(e);
      if (code === 'VIDGEN_004' || code === 'PTS_001') {
        notifyError(t('pointsShop.insufficient'));
      } else {
        notifyError(formatApiError(t, e));
      }
    } finally {
      setGenerating(false);
    }
  }, [
    character?.previewUri,
    character?.referenceFile,
    character?.referenceFilename,
    character?.referenceUri,
    composedPrompt,
    durationSec,
    enableAudio,
    endFrame,
    family,
    h3Size,
    isLoggedIn,
    meta?.enabled,
    model,
    refreshHistory,
    resolveStaticImageUrl,
    router,
    seedText,
    t,
  ]);

  /** 拉详情（列表 prompt 可能被截断；参考图字段保证齐全） */
  const loadJobDetail = useCallback(async (recordId: string) => {
    return getAiVideoGenRecord(recordId);
  }, []);

  /** 把历史任务参数回填到左侧表单，便于继续微调 */
  const applyJobToForm = useCallback(
    (job: AiVideoGenRecordItem) => {
      if (isVideoModelId(job.model)) {
        setModel(job.model);
      }
      if (job.duration_sec > 0) {
        setDurationSec(job.duration_sec);
      }
      setSeedText(job.seed != null ? String(job.seed) : '');
      setEnableAudio(Boolean(job.enable_audio));
      if (job.size) {
        setH3SizeId(job.size);
        const fromId = (meta?.h3_size_presets?.length
          ? meta.h3_size_presets
          : FALLBACK_H3_SIZE_PRESETS
        ).find((s) => s.id === job.size);
        if (fromId) setAspectKey(aspectKeyOfPreset(fromId));
        else if (job.width && job.height) {
          setAspectKey(aspectKeyOfPreset({ id: job.size, width: job.width, height: job.height }));
        }
      } else if (job.width && job.height) {
        const matched = (meta?.h3_size_presets?.length
          ? meta.h3_size_presets
          : FALLBACK_H3_SIZE_PRESETS
        ).find((s) => s.width === job.width && s.height === job.height);
        if (matched) {
          setH3SizeId(matched.id);
          setAspectKey(aspectKeyOfPreset(matched));
        } else {
          setAspectKey(aspectKeyOfPreset({ id: '', width: job.width, height: job.height }));
        }
      }

      clearCategory('pose');
      clearCategory('clothing');
      clearCategory('scene');
      setCustomPrompt(job.prompt || '');

      if (job.image_url) {
        applyDeepLinkReference(job.image_url);
      } else {
        clearCharacter();
      }

      if (job.end_image_url) {
        setEndFrame({
          previewUri: job.end_image_url,
          filename: 'end-frame.jpg',
        });
      } else {
        setEndFrame(null);
      }
    },
    [applyDeepLinkReference, clearCategory, clearCharacter, meta?.h3_size_presets, setCustomPrompt],
  );

  /**
   * 按历史任务原参数直接提交（用详情里的全文 prompt，避免再套一层前缀后缀）。
   */
  const submitGenerateFromJob = useCallback(
    async (job: AiVideoGenRecordItem) => {
      const clearBusy = () => {
        setQueueActionBusyId((prev) => (prev === job.record_id ? null : prev));
      };
      if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) {
        clearBusy();
        return;
      }
      if (!meta?.enabled) {
        notifyError(t('creationCenter.videoGenDisabled'));
        clearBusy();
        return;
      }
      const modelId = isVideoModelId(job.model) ? job.model : 'minimax-h3-ref2va';
      const jobFamily = familyOf(modelId);
      const prompt = job.prompt?.trim();
      if (!prompt) {
        notifyError(t('creationCenter.promptRequired'));
        clearBusy();
        return;
      }
      if (needsImage(modelId) && !job.image_url) {
        notifyError(t('creationCenter.videoUploadRequired'));
        clearBusy();
        return;
      }
      if (needsEndImageRequired(modelId) && !job.end_image_url) {
        notifyError(t('creationCenter.videoGenInvalidParams'));
        clearBusy();
        return;
      }

      setGenerating(true);
      setQueueActionBusyId(job.record_id);
      try {
        const resp = await generateAiVideo({
          model: modelId,
          prompt,
          image_url: job.image_url || undefined,
          end_image_url: job.end_image_url || undefined,
          duration_sec: job.duration_sec > 0 ? job.duration_sec : 5,
          seed: job.seed ?? undefined,
          enable_audio: jobFamily === 'minimax-h3' ? job.enable_audio : undefined,
          ...(jobFamily === 'minimax-h3' && (job.size || job.width)
            ? {
                size: job.size || undefined,
                width: job.width || undefined,
                height: job.height || undefined,
              }
            : {}),
        });
        notifySuccess(t('creationCenter.generateQueued'));
        setSelectedJobId(resp.record_id);
        setPresetsOpen(false);
        setExpandedActionsId(null);
        refreshHistory();
      } catch (e) {
        const code = getApiErrorCode(e);
        if (code === 'VIDGEN_004' || code === 'PTS_001') {
          notifyError(t('pointsShop.insufficient'));
        } else {
          notifyError(formatApiError(t, e));
        }
      } finally {
        setGenerating(false);
        clearBusy();
      }
    },
    [isLoggedIn, meta?.enabled, refreshHistory, router, t],
  );

  /** 图片信息：拉详情后弹层展示参考图与参数 */
  const onQueueImageInfo = useCallback(
    async (job: AiVideoGenRecordItem) => {
      setQueueActionBusyId(job.record_id);
      try {
        const detail = await loadJobDetail(job.record_id);
        setImageInfoJob(detail);
      } catch (e) {
        notifyError(formatApiError(t, e));
      } finally {
        setQueueActionBusyId(null);
      }
    },
    [loadJobDetail, t],
  );

  /** 重新生成：回填表单 + 原参数再提交 */
  const onQueueRegenerate = useCallback(
    async (job: AiVideoGenRecordItem) => {
      setQueueActionBusyId(job.record_id);
      try {
        const detail = await loadJobDetail(job.record_id);
        applyJobToForm(detail);
        await submitGenerateFromJob(detail);
      } catch (e) {
        setQueueActionBusyId(null);
        notifyError(formatApiError(t, e));
      }
    },
    [applyJobToForm, loadJobDetail, submitGenerateFromJob, t],
  );

  /** 复制提示词到剪贴板，回填后按原参数重新生成 */
  const onQueueCopyPromptRegenerate = useCallback(
    async (job: AiVideoGenRecordItem) => {
      setQueueActionBusyId(job.record_id);
      try {
        const detail = await loadJobDetail(job.record_id);
        if (detail.prompt?.trim()) {
          const copied = await copyText(detail.prompt);
          if (copied) notifySuccess(t('creationCenter.videoQueuePromptCopied'));
        }
        applyJobToForm(detail);
        await submitGenerateFromJob(detail);
      } catch (e) {
        setQueueActionBusyId(null);
        notifyError(formatApiError(t, e));
      }
    },
    [applyJobToForm, loadJobDetail, submitGenerateFromJob, t],
  );

  /** 确认删除历史记录 */
  const onConfirmDeleteJob = useCallback(async () => {
    const job = deleteConfirmJob;
    if (!job) return;
    setQueueActionBusyId(job.record_id);
    try {
      await deleteAiVideoGenRecord(job.record_id);
      removeHistoryItem(job.record_id);
      if (selectedJobId === job.record_id) {
        setSelectedJobId(null);
      }
      if (expandedActionsId === job.record_id) {
        setExpandedActionsId(null);
      }
      setDeleteConfirmJob(null);
      notifySuccess(t('creationCenter.videoQueueDeleted'));
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setQueueActionBusyId(null);
    }
  }, [deleteConfirmJob, expandedActionsId, removeHistoryItem, selectedJobId, t]);

  /** 当前选中的历史任务；无选中时默认第一条 */
  const selectedJob: AiVideoGenRecordItem | null =
    history.items.find((j) => j.record_id === selectedJobId) ?? history.items[0] ?? null;


  /**
   * 按模式解析参考图区说明文案（区分首帧 / 主参考、尾帧是否必填）。
   */
  const referenceSectionHint = useMemo(() => {
    if (model === 'minimax-h3-fl2va') return t('creationCenter.videoReferenceHintFl2va');
    if (model === 'minimax-h3-ref2va') return t('creationCenter.videoReferenceHintRef2va');
    if (model === 'omniforge-flf2v') return t('creationCenter.videoReferenceHintFlf2v');
    if (needsImage(model) && !allowsEndImage(model)) {
      return t('creationCenter.videoReferenceHintSingle');
    }
    return t('creationCenter.videoReferenceHint');
  }, [model, t]);

  /** 起始槽角色文案：FL2VA/FLF 为首帧，REF2VA 为主参考 */
  const startSlotRoleLabel = useMemo(() => {
    if (model === 'minimax-h3-ref2va') return t('creationCenter.videoRefSlotPrimaryRequired');
    return t('creationCenter.videoRefSlotStartRequired');
  }, [model, t]);

  /** 结束槽角色文案：FLF 必填尾帧，其余为可选尾帧 / 第二参考 */
  const endSlotRoleLabel = useMemo(() => {
    if (model === 'omniforge-flf2v') return t('creationCenter.videoRefSlotEndRequired');
    if (model === 'minimax-h3-ref2va') return t('creationCenter.videoRefSlotSecondaryOptional');
    return t('creationCenter.videoRefSlotEndOptional');
  }, [model, t]);

  /**
   * Composer 内方形参考图槽（缩略图 + 角色说明 + @Image 标签）。
   */
  const renderImageSlot = (
    kind: 'start' | 'end',
    uri: string | null | undefined,
    localPreview: unknown,
    onPick: () => void,
    onClear?: () => void,
    roleLabel?: string,
  ) => {
    const filled = Boolean(uri || localPreview);
    const tag =
      kind === 'start'
        ? t('creationCenter.videoRefTagImage1')
        : t('creationCenter.videoRefTagImage2');

    return (
      <View style={styles.refThumbItem}>
        <Pressable
          onPress={onPick}
          style={({ pressed }) => [
            styles.refThumb,
            !filled && styles.refThumbEmpty,
            pressed && styles.refThumbPressed,
          ]}
          accessibilityLabel={roleLabel ? `${roleLabel} ${tag}` : tag}
        >
          {filled ? (
            <ExpoImage
              source={uri ? { uri } : (localPreview as object)}
              style={styles.refThumbPreview}
              contentFit="cover"
              contentPosition="top"
            />
          ) : (
            <View style={styles.refThumbEmptyInner}>
              <Ionicons name="add" size={26} color={TOKENS.colors.textMuted} />
            </View>
          )}
        </Pressable>
        {/* 清除按钮与选图 Pressable 平级，避免点 X 误触打开文件选择 */}
        {filled && onClear ? (
          <Pressable onPress={onClear} style={styles.refThumbClear} hitSlop={6}>
            <Ionicons name="close" size={12} color="#fff" />
          </Pressable>
        ) : null}
        {roleLabel ? (
          <Text style={styles.refThumbRole} numberOfLines={2}>
            {roleLabel}
          </Text>
        ) : null}
        <Text style={styles.refThumbTag} numberOfLines={1}>
          {tag}
        </Text>
      </View>
    );
  };

  /** 打开预设：宽屏展开中栏；窄屏交给 CreationCenterPresetSheet 做入场动画 */
  const openPresetSheet = useCallback(
    (id?: ImageGenCategory) => {
      if (id) setActiveCategory(id);
      if (studioSplit) {
        setPresetsOpen(true);
        return;
      }
      // 已打开时只切分类，入场动画由 Sheet 组件负责
      if (presetsOpen) return;
      setPresetsOpen(true);
    },
    [presetsOpen, setActiveCategory, studioSplit],
  );

  /** 选中预设分类：打开浏览器并切到对应 tab */
  const onSelectPresetCategory = useCallback(
    (id: ImageGenCategory) => {
      openPresetSheet(id);
    },
    [openPresetSheet],
  );

  /** 关闭预设（宽屏收起中栏；窄屏由 Sheet onClose 调用） */
  const closePresetSheet = useCallback(() => {
    setPresetsOpen(false);
  }, []);

  /** 左控制栏：模式 → 预设槽 → composer（提示词+工具条+参数） */
  const renderControlRail = () => (
    <View style={[styles.controlRail, isDesktop && styles.controlRailDesktop]}>
      <ScrollView
        style={styles.controlScroll}
        contentContainerStyle={styles.controlScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {metaLoading ? (
          <ActivityIndicator color={TOKENS.colors.accent} style={styles.metaLoader} />
        ) : null}

        {/* 模式：等宽分段 */}
        <View style={styles.modeSeg}>
          {modeList.map((m) => {
            const active = model === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setModel(m.id)}
                style={[styles.modeSegItem, active && styles.modeSegItemActive]}
              >
                <Text style={[styles.modeSegText, active && styles.modeSegTextActive]} numberOfLines={1}>
                  {t(m.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 与生图一致的四槽预设 */}
        <CreationCenterPresetSlots
          styles={presetStyles}
          isDesktop={isDesktop}
          categoryMeta={categoryMeta}
          activeCategory={activeCategory}
          onSelectCategory={onSelectPresetCategory}
          slotSelection={slotSelection}
          onClearCategory={clearCategory}
          recyclingKeyPrefix="video-slot"
        />

        {/* 一体式提示词卡：参考图缩略行 → 输入 → 工具条 */}
        <View style={styles.composerCard}>
          {imageAttachOpen && (needsImage(model) || allowsEndImage(model)) ? (
            <View style={styles.refSection}>
              <Text style={styles.refSectionTitle}>{t('creationCenter.videoReferenceTitle')}</Text>
              <Text style={styles.refSectionHint}>{referenceSectionHint}</Text>
              <View style={styles.refThumbRow}>
                {needsImage(model)
                  ? renderImageSlot(
                      'start',
                      startFrameUri,
                      character?.localPreview,
                      () => void pickCharacterReference(),
                      () => clearCategory('character'),
                      startSlotRoleLabel,
                    )
                  : null}
                {allowsEndImage(model)
                  ? renderImageSlot(
                      'end',
                      endFrame?.previewUri,
                      null,
                      () => void pickEndFrame(),
                      () => setEndFrame(null),
                      endSlotRoleLabel,
                    )
                  : null}
              </View>
            </View>
          ) : null}

          <TextInput
            style={styles.composerInput}
            value={customPrompt}
            onChangeText={setCustomPrompt}
            placeholder={
              model === 'minimax-h3-ref2va'
                ? t('creationCenter.videoPromptPlaceholderRef')
                : t('creationCenter.videoPromptPlaceholder')
            }
            placeholderTextColor={TOKENS.colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          {/* 底栏；设置气泡用 Modal 脱离文档流 */}
          <View style={styles.composerToolbarWrap}>
            <View style={styles.composerToolbar}>
              <View style={styles.composerToolsLeft}>
                {needsImage(model) || allowsEndImage(model) ? (
                  <Pressable
                    onPress={() => {
                      setAdvancedOpen(false);
                      setImageAttachOpen((v) => !v);
                    }}
                    style={[styles.composerIconBtn, imageAttachOpen && styles.composerIconBtnActive]}
                    hitSlop={6}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={imageAttachOpen ? TOKENS.colors.text : TOKENS.colors.textMuted}
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  ref={settingsBtnRef}
                  onPress={() => {
                    if (advancedOpen) {
                      setAdvancedOpen(false);
                      return;
                    }
                    settingsBtnRef.current?.measureInWindow((x, y, width, height) => {
                      setSettingsAnchor({ x, y, width, height });
                      setAdvancedOpen(true);
                    });
                  }}
                  style={[styles.composerIconBtn, advancedOpen && styles.composerIconBtnActive]}
                  hitSlop={6}
                >
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={advancedOpen ? TOKENS.colors.text : TOKENS.colors.textMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.composerToolsRight}>
                {/* 单次生成消耗额度：来自 /ai-video-gen meta */}
                {pointsCost > 0 ? (
                  <View style={styles.creditPill}>
                    <Ionicons name="cash-outline" size={14} color="#3DDC84" />
                    {showListPrice ? (
                      <Text style={styles.creditPillListText}>{pointsQuote.listPoints}</Text>
                    ) : null}
                    <Text style={styles.creditPillText}>{pointsCost}</Text>
                  </View>
                ) : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.sendBtn,
                    !canGenerate && styles.sendBtnDisabled,
                    pressed && canGenerate && styles.sendBtnPressed,
                  ]}
                  onPress={() => void onGenerate()}
                  disabled={!canGenerate}
                  accessibilityLabel={
                    pointsCost > 0
                      ? `${t('creationCenter.videoSubmitQueue')} · ${t('creationCenter.pointsCost').replace('{n}', String(pointsCost))}`
                      : t('creationCenter.videoSubmitQueue')
                  }
                >
                  {generating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="arrow-up" size={20} color="#fff" />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* 视频设置气泡：Modal 悬浮，原生 select */}
        <Modal
          visible={advancedOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setAdvancedOpen(false)}
        >
          <View style={styles.settingsModalRoot} pointerEvents="box-none">
            <Pressable
              style={styles.settingsModalBackdrop}
              onPress={() => setAdvancedOpen(false)}
            />
            <View
              style={[
                styles.settingsPopover,
                {
                  left: Math.max(8, settingsAnchor.x - 12),
                  bottom: Math.max(8, windowHeight - settingsAnchor.y + 8),
                },
              ]}
            >
              <Text style={styles.settingsPopoverTitle}>
                {t('creationCenter.videoAdvancedSettings')}
              </Text>

              <Text style={styles.settingsFieldLabel}>{t('creationCenter.videoDuration')}</Text>
              {Platform.OS === 'web' ? (
                React.createElement(
                  'select',
                  {
                    value: String(durationSec),
                    onChange: (e: { target: { value: string } }) => {
                      const next = Number.parseInt(e.target.value, 10);
                      if (Number.isFinite(next)) setDurationSec(next);
                    },
                    style: webSelectStyle,
                  },
                  durationOptions.map((sec) =>
                    React.createElement(
                      'option',
                      { key: sec, value: String(sec) },
                      t('creationCenter.videoDurationSec').replace('{n}', String(sec)),
                    ),
                  ),
                )
              ) : (
                <View style={styles.settingsSelectNativeFallback}>
                  {durationOptions.map((sec) => {
                    const active = durationSec === sec;
                    return (
                      <Pressable
                        key={sec}
                        onPress={() => setDurationSec(sec)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {t('creationCenter.videoDurationSec').replace('{n}', String(sec))}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={styles.settingsFieldLabel}>{t('creationCenter.videoAspectLocked')}</Text>
              {Platform.OS === 'web' ? (
                React.createElement(
                  'select',
                  {
                    value: aspectKey,
                    onChange: (e: { target: { value: string } }) => {
                      const next = e.target.value as VideoAspectKey;
                      if ((VIDEO_ASPECT_OPTIONS as readonly string[]).includes(next)) {
                        onSelectAspect(next);
                      }
                    },
                    style: webSelectStyle,
                  },
                  VIDEO_ASPECT_OPTIONS.map((key) =>
                    React.createElement('option', { key, value: key }, key),
                  ),
                )
              ) : (
                <View style={styles.settingsSelectNativeFallback}>
                  {VIDEO_ASPECT_OPTIONS.map((key) => {
                    const active = aspectKey === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => onSelectAspect(key)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{key}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={styles.settingsFieldLabel}>{t('creationCenter.videoResolution')}</Text>
              {Platform.OS === 'web' ? (
                React.createElement(
                  'select',
                  {
                    value: h3Size?.id || h3SizeId,
                    onChange: (e: { target: { value: string } }) => setH3SizeId(e.target.value),
                    style: webSelectStyle,
                  },
                  aspectSizePresets.map((preset) =>
                    React.createElement(
                      'option',
                      { key: preset.id, value: preset.id },
                      `${resolutionTierOfPreset(preset)} · ${preset.width}×${preset.height}`,
                    ),
                  ),
                )
              ) : (
                <View style={styles.settingsSelectNativeFallback}>
                  {aspectSizePresets.map((preset) => {
                    const active = (h3Size?.id || h3SizeId) === preset.id;
                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() => setH3SizeId(preset.id)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {`${resolutionTierOfPreset(preset)} · ${preset.width}×${preset.height}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {(modelMeta?.supports_audio ?? true) ? (
                <View style={styles.settingsAudioRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.settingsFieldLabel}>
                      {t('creationCenter.videoEnableAudio')}
                    </Text>
                  </View>
                  <Switch
                    value={enableAudio}
                    onValueChange={setEnableAudio}
                    trackColor={{
                      false: 'rgba(255,255,255,0.12)',
                      true: 'rgba(186, 60, 71, 0.55)',
                    }}
                    thumbColor={enableAudio ? TOKENS.colors.accent : '#cfcfd4'}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );

  /** 右侧预设浏览器（宽屏三列：点槽位后替换主画布） */
  const renderPresetBrowser = () => (
    <View style={[styles.rightBrowser, styles.rightBrowserDesktop]}>
      {metaLoading ? (
        <ActivityIndicator color={TOKENS.colors.accent} style={styles.metaLoader} />
      ) : (
        <ScrollView
          style={styles.columnScroll}
          contentContainerStyle={styles.columnScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CreationCenterPresetBrowser
            styles={presetStyles}
            activeCategory={activeCategory}
            character={character}
            displayTemplates={displayTemplates}
            poseId={poseId}
            clothingId={clothingId}
            sceneId={sceneId}
            tileWidthStyle={tileWidthStyle}
            onPresetGridLayout={onPresetGridLayout}
            onPickCharacterReference={() => void pickCharacterReference()}
            onSelectCharacterTemplate={selectCharacterTemplate}
            onSelectPreset={selectPreset}
            characterCopy={VIDEO_CHARACTER_COPY}
            recyclingKeyPrefix="video"
          />
        </ScrollView>
      )}
    </View>
  );

  /** 移动端 / 窄屏：共用预设底栏 */
  const renderPresetSheet = () => (
    <CreationCenterPresetSheet
      visible={presetsOpen && !studioSplit}
      onClose={closePresetSheet}
      categoryMeta={categoryMeta}
      activeCategory={activeCategory}
      onChangeCategory={setActiveCategory}
      styles={presetStyles}
      character={character}
      displayTemplates={displayTemplates}
      poseId={poseId}
      clothingId={clothingId}
      sceneId={sceneId}
      tileWidthStyle={tileWidthStyle}
      onPresetGridLayout={onPresetGridLayout}
      onPickCharacterReference={pickCharacterReference}
      onSelectCharacterTemplate={selectCharacterTemplate}
      onSelectPreset={selectPreset}
      characterCopy={VIDEO_CHARACTER_COPY}
      loading={metaLoading}
      recyclingKeyPrefix="video-sheet"
    />
  );

  /** 主画布：成片预览 / 进度 / 空态（Venice center stage） */
  const renderStage = () => {
    const videoUri = selectedJob?.video_url ? resolveStaticUrl(selectedJob.video_url) : null;
    const progress = Math.max(0, Math.min(100, selectedJob?.progress_pct ?? 0));

    return (
      <View style={styles.stage}>
        <View style={styles.stageCanvas}>
          {selectedJob ? (
            <>
              {videoUri && isSucceededRecordStatus(selectedJob.status) ? (
                <View style={styles.stageVideoWrap}>
                  <AgentMediaVideoView
                    uri={videoUri}
                    style={styles.videoPlayer}
                    contentFit="contain"
                    nativeControls
                    autoPlay={false}
                  />
                </View>
              ) : (
                <View style={styles.stageProgressBox}>
                  {isActiveRecordStatus(selectedJob.status) ? (
                    <ActivityIndicator color={TOKENS.colors.accent} size="large" />
                  ) : (
                    <Ionicons name="play-circle-outline" size={56} color={TOKENS.colors.textSecondary} />
                  )}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    {progress}% · {statusLabel(selectedJob.status, t)}
                    {selectedJob.stage ? ` · ${selectedJob.stage}` : ''}
                  </Text>
                  {/* 中栏展示任务提示词（固定两行，超出省略） */}
                  {selectedJob.prompt ? (
                    <Text style={styles.stagePrompt} numberOfLines={2}>
                      {selectedJob.prompt}
                    </Text>
                  ) : null}
                  {selectedJob.status === 'failed' ||
                  selectedJob.error_code ||
                  selectedJob.error_message ? (
                    <Text style={styles.historyError}>
                      {formatGenRecordError(t, selectedJob, 'video')}
                    </Text>
                  ) : null}
                </View>
              )}
            </>
          ) : (
            <View style={styles.stageEmpty}>
              <View style={styles.stagePlayBadge}>
                <Ionicons name="play" size={28} color={TOKENS.colors.text} />
              </View>
              <Text style={styles.stageEmptyTitle}>{t('creationCenter.videoStageEmptyTitle')}</Text>
              <Text style={styles.stageEmptySub}>{t('creationCenter.videoStageEmptySub')}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  /** 最右队列列：与父行同高，内容超出时列内滚动（标题旁不再放刷新按钮） */
  const renderGallery = () => (
    <View style={[styles.queueColumn, isDesktop && styles.queueColumnDesktop]}>
      <View style={styles.galleryHeader}>
        <Text style={styles.galleryTitle}>{t('creationCenter.videoGalleryTitle')}</Text>
      </View>

      <View style={styles.queueBody}>
        {!history.isLoggedIn ? (
          <View style={styles.queueEmpty}>
            <Ionicons name="lock-closed-outline" size={28} color={TOKENS.colors.textMuted} />
            <Text style={styles.emptyHistoryText}>{t('creationCenter.historyLoginRequired')}</Text>
          </View>
        ) : history.loading && history.items.length === 0 ? (
          <ActivityIndicator color={TOKENS.colors.accent} style={styles.metaLoader} />
        ) : history.items.length === 0 ? (
          <View style={styles.queueEmpty}>
            <Ionicons name="time-outline" size={36} color={TOKENS.colors.textMuted} />
            <Text style={styles.queueEmptyTitle}>{t('creationCenter.videoQueueEmptyTitle')}</Text>
            <Text style={styles.queueEmptySub}>{t('creationCenter.videoQueueEmptySub')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.queueList}
            contentContainerStyle={styles.queueListContent}
            showsVerticalScrollIndicator={false}
          >
            {history.items.map((job) => {
              const active = (selectedJob?.record_id ?? '') === job.record_id;
              const thumb =
                (job.thumbnail_url && resolveStaticUrl(job.thumbnail_url)) ||
                (job.image_url && resolveStaticUrl(job.image_url)) ||
                null;
              const actionsExpanded = expandedActionsId === job.record_id;
              const actionBusy = queueActionBusyId === job.record_id;
              return (
                <Pressable
                  key={job.record_id}
                  onPress={() => {
                    setSelectedJobId(job.record_id);
                    setPresetsOpen(false);
                    if (expandedActionsId && expandedActionsId !== job.record_id) {
                      setExpandedActionsId(null);
                    }
                  }}
                  style={[styles.queueCard, active && styles.queueCardActive]}
                >
                  {thumb ? (
                    <ExpoImage source={{ uri: thumb }} style={styles.queueThumb} contentFit="cover" />
                  ) : (
                    <View style={styles.queueThumbFallback}>
                      <Ionicons
                        name={isSucceededRecordStatus(job.status) ? 'videocam' : 'hourglass-outline'}
                        size={18}
                        color={TOKENS.colors.textMuted}
                      />
                    </View>
                  )}
                  <View style={styles.queueMeta}>
                    <View style={styles.queueMetaTop}>
                      <Text style={styles.galleryStatus} numberOfLines={1}>
                        {statusLabel(job.status, t)}
                      </Text>
                      <Pressable
                        accessibilityLabel={
                          actionsExpanded
                            ? t('creationCenter.videoQueueActionCollapse')
                            : t('creationCenter.videoQueueActionExpand')
                        }
                        hitSlop={8}
                        disabled={actionBusy}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          setExpandedActionsId((prev) =>
                            prev === job.record_id ? null : job.record_id,
                          );
                        }}
                        style={styles.queueActionToggle}
                      >
                        {actionBusy ? (
                          <ActivityIndicator size="small" color={TOKENS.colors.accent} />
                        ) : (
                          <Ionicons
                            name={actionsExpanded ? 'chevron-forward' : 'ellipsis-horizontal'}
                            size={14}
                            color={TOKENS.colors.textSecondary}
                          />
                        )}
                      </Pressable>
                    </View>
                    {actionsExpanded ? (
                      <View style={styles.queueActionsRow}>
                        {(
                          [
                            {
                              key: 'info',
                              icon: 'images-outline' as const,
                              label: t('creationCenter.videoQueueActionImageInfo'),
                              onPress: () => void onQueueImageInfo(job),
                            },
                            {
                              key: 'regen',
                              icon: 'refresh-outline' as const,
                              label: t('creationCenter.videoQueueActionRegenerate'),
                              onPress: () => void onQueueRegenerate(job),
                            },
                            {
                              key: 'copy',
                              icon: 'copy-outline' as const,
                              label: t('creationCenter.videoQueueActionCopyPromptRegen'),
                              onPress: () => void onQueueCopyPromptRegenerate(job),
                            },
                            {
                              key: 'delete',
                              icon: 'trash-outline' as const,
                              label: t('creationCenter.videoQueueActionDelete'),
                              onPress: () => setDeleteConfirmJob(job),
                            },
                          ] as const
                        ).map((action) => (
                          <Pressable
                            key={action.key}
                            accessibilityLabel={action.label}
                            hitSlop={4}
                            disabled={actionBusy || generating}
                            onPress={(e) => {
                              e?.stopPropagation?.();
                              action.onPress();
                            }}
                            style={[
                              styles.queueActionBtn,
                              action.key === 'delete' && styles.queueActionBtnDanger,
                              (actionBusy || generating) && styles.queueActionBtnDisabled,
                            ]}
                          >
                            <Ionicons
                              name={action.icon}
                              size={13}
                              color={
                                action.key === 'delete'
                                  ? TOKENS.colors.accent
                                  : TOKENS.colors.textSecondary
                              }
                            />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {job.status === 'failed' ? (
                      <Text style={styles.historyError} numberOfLines={2}>
                        {formatGenRecordError(t, job, 'video')}
                      </Text>
                    ) : (
                      <Text style={styles.galleryModel} numberOfLines={2}>
                        {job.prompt || job.model.replace('minimax-h3-', '').toUpperCase()}
                      </Text>
                    )}
                    {isActiveRecordStatus(job.status) ? (
                      <View style={styles.queueProgress}>
                        <View
                          style={[
                            styles.galleryProgressFill,
                            { width: `${Math.max(0, Math.min(100, job.progress_pct ?? 0))}%` },
                          ]}
                        />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
            {history.hasMore ? (
              <Pressable
                onPress={history.loadMore}
                style={styles.galleryMore}
                disabled={history.loadingMore}
              >
                {history.loadingMore ? (
                  <ActivityIndicator color={TOKENS.colors.accent} />
                ) : (
                  <Text style={styles.loadMoreText}>{t('creationCenter.historyLoadMore')}</Text>
                )}
              </Pressable>
            ) : null}
          </ScrollView>
        )}
        {history.error ? <Text style={styles.historyError}>{history.error}</Text> : null}
      </View>
    </View>
  );

  const renderImageInfoModal = () => {
    if (!imageInfoJob) return null;
    const startUri = imageInfoJob.image_url
      ? resolveStaticUrl(imageInfoJob.image_url)
      : null;
    const endUri = imageInfoJob.end_image_url
      ? resolveStaticUrl(imageInfoJob.end_image_url)
      : null;
    const sizeLabel =
      imageInfoJob.width && imageInfoJob.height
        ? `${imageInfoJob.width}×${imageInfoJob.height}`
        : imageInfoJob.size || '—';
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setImageInfoJob(null)}
      >
        <Pressable style={styles.imageInfoBackdrop} onPress={() => setImageInfoJob(null)}>
          <Pressable style={styles.imageInfoSheet} onPress={(e) => e?.stopPropagation?.()}>
            <View style={styles.imageInfoHeader}>
              <Text style={styles.imageInfoTitle}>{t('creationCenter.videoImageInfoTitle')}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => setImageInfoJob(null)}
                accessibilityLabel={t('creationCenter.videoImageInfoClose')}
              >
                <Ionicons name="close" size={18} color={TOKENS.colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.imageInfoBody} showsVerticalScrollIndicator={false}>
              {!startUri && !endUri ? (
                <Text style={styles.imageInfoEmpty}>{t('creationCenter.videoImageInfoNoRef')}</Text>
              ) : (
                <View style={styles.imageInfoRefs}>
                  {startUri ? (
                    <View style={styles.imageInfoRefBlock}>
                      <Text style={styles.imageInfoLabel}>
                        {t('creationCenter.videoImageInfoStart')}
                      </Text>
                      <ExpoImage
                        source={{ uri: startUri }}
                        style={styles.imageInfoThumb}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                  {endUri ? (
                    <View style={styles.imageInfoRefBlock}>
                      <Text style={styles.imageInfoLabel}>
                        {t('creationCenter.videoImageInfoEnd')}
                      </Text>
                      <ExpoImage
                        source={{ uri: endUri }}
                        style={styles.imageInfoThumb}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                </View>
              )}
              <View style={styles.imageInfoMeta}>
                <Text style={styles.imageInfoMetaLine}>
                  {t('creationCenter.videoImageInfoModel')}: {imageInfoJob.model}
                </Text>
                <Text style={styles.imageInfoMetaLine}>
                  {t('creationCenter.videoImageInfoSize')}: {sizeLabel}
                </Text>
                <Text style={styles.imageInfoMetaLine}>
                  {t('creationCenter.videoImageInfoDuration')}: {imageInfoJob.duration_sec}s
                </Text>
                <Text style={styles.imageInfoMetaLine}>
                  {t('creationCenter.videoImageInfoSeed')}:{' '}
                  {imageInfoJob.seed != null ? imageInfoJob.seed : '—'}
                </Text>
                <Text style={styles.imageInfoMetaLine}>
                  {t('creationCenter.videoImageInfoPoints')}: {imageInfoJob.points_cost}
                </Text>
                <Text style={styles.imageInfoLabel}>
                  {t('creationCenter.videoImageInfoPrompt')}
                </Text>
                <Text style={styles.imageInfoPrompt}>{imageInfoJob.prompt || '—'}</Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // —— 工作室壳：宽屏三列等高；窄屏堆叠 + 预设底栏 ——
  return (
    <View style={[styles.content, studioSplit && styles.contentFill]}>
      {studioSplit ? (
        <View style={styles.studioSplit}>
          {renderControlRail()}
          <View style={styles.stageColumn}>
            {presetsOpen ? renderPresetBrowser() : renderStage()}
          </View>
          {renderGallery()}
        </View>
      ) : (
        <View style={styles.mobileStack}>
          {renderControlRail()}
          {renderStage()}
          {renderGallery()}
        </View>
      )}
      {renderPresetSheet()}
      {renderImageInfoModal()}
      <ThemedGeneralConfirmModal
        visible={Boolean(deleteConfirmJob)}
        icon="trash"
        title={t('creationCenter.videoQueueDeleteTitle')}
        subtitle={t('creationCenter.videoQueueDeleteBody')}
        confirmLabel={t('creationCenter.videoQueueDeleteConfirm')}
        cancelLabel={t('confirmModal.cancel')}
        loading={Boolean(deleteConfirmJob && queueActionBusyId === deleteConfirmJob.record_id)}
        onCancel={() => {
          if (queueActionBusyId) return;
          setDeleteConfirmJob(null);
        }}
        onConfirm={() => void onConfirmDeleteJob()}
      />
    </View>
  );
}

/** 工作室布局样式：左控栏 + 中画布 + 右队列 */
function createStyles(lang: Lang) {
  return StyleSheet.create({
    content: {
      width: '100%',
    },
    /** 宽屏：吃掉页头以下全部剩余高度（flex:1），不在此层做 overflow hidden */
    contentFill: {
      flex: 1,
      minHeight: 0,
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
            flexDirection: 'column',
          } as object)
        : {}),
    },
    studioSplit: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 16,
      width: '100%',
      flex: 1,
      minHeight: 0,
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
          } as object)
        : {}),
    },
    mobileStack: {
      gap: 14,
    },
    controlRail: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(12, 14, 20, 0.92)',
      // 圆角裁切仅限本列卡片，父级三列行不设 overflow:hidden
      overflow: 'hidden',
    },
    controlRailDesktop: {
      width: 400,
      maxWidth: 420,
      flexShrink: 0,
      alignSelf: 'stretch',
      minHeight: 0,
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
            flexDirection: 'column',
          } as object)
        : {}),
    },
    controlScroll: {
      width: '100%',
      flex: 1,
      minHeight: 0,
    },
    controlScrollContent: {
      gap: 10,
      padding: 14,
      paddingBottom: 16,
    },
    columnScroll: {
      width: '100%',
      flex: 1,
      minHeight: 0,
    },
    columnScrollContent: {
      paddingBottom: 8,
      flexGrow: 1,
    },
    modeSeg: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      backgroundColor: 'rgba(8, 10, 15, 0.65)',
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
    },
    modeSegItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      paddingHorizontal: 4,
      borderRadius: 9,
    },
    modeSegItemActive: {
      backgroundColor: 'rgba(186, 60, 71, 0.28)',
    },
    modeSegText: {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    modeSegTextActive: {
      color: TOKENS.colors.text,
    },
    /** 一体式提示词卡（参考 OurDream composer） */
    composerCard: {
      gap: 10,
      paddingTop: 12,
      paddingHorizontal: 12,
      paddingBottom: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(20, 22, 30, 0.95)',
      zIndex: 2,
      ...(Platform.OS === 'web' ? ({ overflow: 'visible' } as object) : {}),
    },
    composerInput: {
      minHeight: 64,
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 21,
      padding: 0,
      ...(Platform.OS === 'web'
        ? ({ outlineStyle: 'none', borderWidth: 0 } as object)
        : { borderWidth: 0 }),
    },
    composerToolbarWrap: {
      gap: 8,
      zIndex: 5,
    },
    settingsModalRoot: {
      flex: 1,
    },
    settingsModalBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'transparent',
    },
    settingsPopover: {
      position: 'absolute',
      width: 260,
      gap: 6,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(28, 30, 38, 0.98)',
      ...(Platform.OS === 'web'
        ? ({
            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
          } as object)
        : {
            elevation: 10,
          }),
    },
    settingsPopoverTitle: {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 4,
    },
    settingsFieldLabel: {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 4,
    },
    settingsSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: 'rgba(8, 10, 15, 0.65)',
    },
    settingsSelectDisabled: {
      opacity: 0.72,
    },
    settingsSelectText: {
      flex: 1,
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    settingsSelectNativeFallback: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    settingsAudioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 6,
    },
    composerToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingTop: 4,
    },
    composerToolsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    composerToolsRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    composerIconBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    composerIconBtnActive: {
      backgroundColor: 'rgba(186, 60, 71, 0.2)',
    },
    creditPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(61, 220, 132, 0.12)',
    },
    creditPillText: {
      color: '#3DDC84',
      fontSize: 13,
      fontWeight: '700',
    },
    /** 有整体折扣时展示的划线原价 */
    creditPillListText: {
      color: 'rgba(61, 220, 132, 0.55)',
      fontSize: 12,
      fontWeight: '600',
      textDecorationLine: 'line-through',
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: TOKENS.colors.accent,
    },
    sendBtnPressed: {
      backgroundColor: TOKENS.colors.accentPressed,
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
    /** 参考图区：标题 + 横向缩略图（对齐参考产品） */
    refSection: {
      width: '100%',
      gap: 8,
    },
    refSectionTitle: {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    refSectionHint: {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    /** 参考缩略图横排 */
    refThumbRow: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'flex-start',
    },
    refThumbItem: {
      width: 88,
      position: 'relative',
      gap: 3,
      alignItems: 'center',
    },
    refThumb: {
      width: 72,
      height: 72,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: 'rgba(8, 10, 15, 0.65)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    refThumbEmpty: {
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.22)',
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    refThumbPressed: {
      borderColor: 'rgba(186, 60, 71, 0.5)',
      backgroundColor: 'rgba(186, 60, 71, 0.1)',
    },
    refThumbPreview: {
      width: '100%',
      height: '100%',
    },
    refThumbEmptyInner: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    refThumbClear: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
    },
    /** 槽位角色说明（首帧 / 尾帧 / 必填可选） */
    refThumbRole: {
      color: TOKENS.colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      lineHeight: 13,
      textAlign: 'center',
      width: '100%',
    },
    refThumbTag: {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
    },
    paramLabel: {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
    paramHint: {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: TOKENS.radius.pill,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: TOKENS.colors.cardSolid,
    },
    chipActive: {
      borderColor: 'rgba(186, 60, 71, 0.55)',
      backgroundColor: 'rgba(186, 60, 71, 0.16)',
    },
    chipText: {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    chipTextActive: {
      color: TOKENS.colors.text,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 4,
    },
    switchCopy: {
      flex: 1,
      gap: 2,
    },
    metaLoader: {
      marginVertical: 8,
    },
    stageColumn: {
      flex: 1,
      minWidth: 300,
      minHeight: 0,
      alignSelf: 'stretch',
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
            flexDirection: 'column',
          } as object)
        : {}),
    },
    rightBrowser: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(8, 10, 15, 0.55)',
      padding: 14,
      overflow: 'hidden',
      flex: 1,
      minHeight: 0,
    },
    rightBrowserDesktop: {
      minWidth: 300,
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
            flexDirection: 'column',
          } as object)
        : {}),
    },
    stage: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(8, 10, 15, 0.55)',
      overflow: 'hidden',
      flex: 1,
      minHeight: 0,
    },
    stageCanvas: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      minHeight: 0,
      ...(Platform.OS === 'web'
        ? ({
            backgroundImage:
              'radial-gradient(ellipse at 50% 40%, rgba(49,64,110,0.28) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(179,59,69,0.12) 0%, transparent 45%)',
          } as object)
        : {}),
    },
    stageEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 48,
      maxWidth: 360,
    },
    stagePlayBadge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      marginBottom: 4,
    },
    stageEmptyTitle: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 18,
        lineHeight: 24,
        textAlign: 'center',
      },
      'sans',
      lang,
    ),
    stageEmptySub: {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    stageVideoWrap: {
      width: '100%',
      maxWidth: 320,
      aspectRatio: 9 / 16,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#050608',
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
    },
    videoPlayer: {
      width: '100%',
      height: '100%',
    },
    stageProgressBox: {
      width: '100%',
      maxWidth: 420,
      alignItems: 'center',
      gap: 10,
      paddingVertical: 28,
    },
    stagePrompt: {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
      marginTop: 4,
    },
    progressTrack: {
      width: '100%',
      height: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: TOKENS.colors.accent,
    },
    progressLabel: {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    queueColumn: {
      gap: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: 'rgba(12, 14, 20, 0.88)',
      width: '100%',
    },
    queueColumnDesktop: {
      width: 260,
      maxWidth: 280,
      flexShrink: 0,
      alignSelf: 'stretch',
      minHeight: 0,
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
            flexDirection: 'column',
          } as object)
        : {}),
    },
    galleryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
    },
    galleryTitle: Typo(
      {
        color: TOKENS.colors.text,
        fontSize: 15,
        fontWeight: '700',
      },
      'sans',
      lang,
    ),
    queueBody: {
      flex: 1,
      minHeight: 0,
      width: '100%',
      ...(Platform.OS === 'web'
        ? ({
            display: 'flex',
            flexDirection: 'column',
          } as object)
        : {}),
    },
    queueEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 24,
      paddingHorizontal: 12,
      minHeight: 0,
    },
    queueEmptyTitle: {
      color: TOKENS.colors.text,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    queueEmptySub: {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
    },
    emptyHistoryText: {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
    queueList: {
      flex: 1,
      minHeight: 0,
      width: '100%',
    },
    queueListContent: {
      gap: 10,
      paddingBottom: 8,
    },
    queueCard: {
      flexDirection: 'row',
      gap: 10,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: TOKENS.colors.cardSolid,
    },
    queueCardActive: {
      borderColor: 'rgba(186, 60, 71, 0.65)',
      backgroundColor: 'rgba(186, 60, 71, 0.12)',
    },
    queueThumb: {
      width: 52,
      height: 72,
      borderRadius: 8,
      backgroundColor: '#0a0b0f',
    },
    queueThumbFallback: {
      width: 52,
      height: 72,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(8, 10, 15, 0.8)',
    },
    queueMeta: {
      flex: 1,
      minWidth: 0,
      gap: 4,
      justifyContent: 'center',
    },
    queueMetaTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    queueActionToggle: {
      width: 22,
      height: 22,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      flexShrink: 0,
    },
    queueActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    queueActionBtn: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
    },
    queueActionBtnDanger: {
      backgroundColor: 'rgba(186, 60, 71, 0.12)',
      borderColor: 'rgba(186, 60, 71, 0.35)',
    },
    queueActionBtnDisabled: {
      opacity: 0.45,
    },
    queueProgress: {
      height: 3,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
      marginTop: 2,
    },
    galleryStatus: {
      color: TOKENS.colors.text,
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
      minWidth: 0,
    },
    galleryModel: {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    galleryProgressFill: {
      height: '100%',
      backgroundColor: TOKENS.colors.accent,
    },
    galleryMore: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: TOKENS.colors.cardBorderFaint,
    },
    loadMoreText: {
      color: TOKENS.colors.accent,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: 6,
    },
    historyError: {
      color: TOKENS.colors.accent,
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'center',
    },
    imageInfoBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    imageInfoSheet: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '80%',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorderFaint,
      backgroundColor: TOKENS.colors.cardSolid,
      overflow: 'hidden',
    },
    imageInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: TOKENS.colors.cardBorderFaint,
    },
    imageInfoTitle: {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    imageInfoBody: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    imageInfoEmpty: {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 10,
    },
    imageInfoRefs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 12,
    },
    imageInfoRefBlock: {
      width: 140,
      gap: 6,
    },
    imageInfoThumb: {
      width: 140,
      height: 180,
      borderRadius: 10,
      backgroundColor: '#0a0b0f',
    },
    imageInfoLabel: {
      color: TOKENS.colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 4,
    },
    imageInfoMeta: {
      gap: 6,
      paddingBottom: 8,
    },
    imageInfoMetaLine: {
      color: TOKENS.colors.text,
      fontSize: 12,
      lineHeight: 17,
    },
    imageInfoPrompt: {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
  });
}

