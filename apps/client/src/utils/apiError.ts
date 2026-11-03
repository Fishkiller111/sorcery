import { ApiError } from '../api/client';

/** Maps backend `error_code` (see ai-character/internal/errors/codes.go) to i18n keys. */
export const API_ERROR_I18N_KEYS: Record<string, string> = {
  // Auth — keep all under errors.* so login/register/reset share one map
  AUTH_001: 'errors.authInvalidEmail',
  AUTH_002: 'errors.authRateLimited',
  AUTH_003: 'errors.authCodeExpired',
  AUTH_004: 'errors.authCodeInvalid',
  AUTH_005: 'errors.authTokenMissing',
  AUTH_006: 'errors.authTokenInvalid',
  AUTH_007: 'errors.authUserNotFound',
  AUTH_008: 'errors.authKicked',
  AUTH_009: 'errors.authEmailRegistered',
  AUTH_010: 'errors.authUserNotFoundReset',
  AUTH_011: 'errors.authPasswordNotSet',
  AUTH_012: 'errors.authInvalidPassword',
  AUTH_013: 'errors.authPasswordMismatch',
  AUTH_014: 'errors.authWeakPassword',
  AUTH_015: 'errors.authAccountDisabled',
  AUTH_016: 'errors.authGoogleInvalid',
  AUTH_017: 'errors.authGoogleNotConfigured',
  AUTH_018: 'errors.authGoogleEmailTaken',
  AUTH_019: 'errors.authAppleInvalid',
  AUTH_020: 'errors.authAppleNotConfigured',
  AUTH_021: 'errors.authAppleAlreadyLinked',
  AUTH_022: 'errors.authAppleCodeInvalid',
  AUTH_023: 'errors.authAppleEmailTaken',
  AUTH_028: 'errors.authEmailTakenByOther',
  AUTH_029: 'errors.authEmailBindReserved',
  AUTH_EXPIRED: 'errors.unauthorized',
  NETWORK_ERROR: 'errors.networkError',

  ANN_001: 'errors.announcementNotFound',
  ROLE_001: 'errors.roleNotFound',
  ROLE_002: 'errors.roleInvalidAsset',
  ROLE_003: 'errors.roleTooLarge',
  ROLE_004: 'errors.roleRateLimited',
  ROLE_005: 'errors.authTokenInvalid',
  ROLE_006: 'errors.roleForbidden',
  ROLE_007: 'errors.rolePendingReview',
  ROLE_008: 'errors.roleInvalidPublish',
  ROLE_009: 'errors.roleEnglishOnly',
  ROLE_010: 'errors.roleInvalidParams',
  ROLE_011: 'errors.roleRevisionNotFound',
  ROLE_012: 'errors.roleModerationFailed',
  ROLE_013: 'errors.imagePreviewDisabled',
  ROLE_014: 'errors.roleNameTaken',
  ROLE_015: 'errors.rolePreviewPointsInsufficient',

  SOCIAL_001: 'errors.socialMediaNotFound',
  SOCIAL_002: 'errors.socialNotOwner',
  SOCIAL_003: 'errors.socialMediaLocked',
  SOCIAL_004: 'errors.socialInvalidMedia',
  SOCIAL_006: 'errors.socialLimitReached',
  SOCIAL_008: 'errors.socialInvalidPrice',
  SOCIAL_016: 'errors.socialMediaPricingLocked',
  SOCIAL_017: 'errors.socialMediaInBundle',
  SOCIAL_018: 'errors.socialReportInvalid',
  SOCIAL_019: 'errors.socialReportNotFound',
  SOCIAL_020: 'errors.socialAffectionRequired',
  SOCIAL_021: 'errors.socialVipRequired',
  SOCIAL_022: 'errors.mediaSubmissionNotFound',
  SOCIAL_023: 'errors.mediaSubmissionForbidden',
  SOCIAL_024: 'errors.mediaSubmissionInvalid',
  SOCIAL_025: 'errors.mediaSubmissionDup',

  CHAT_001: 'errors.chatSessionNotFound',
  CHAT_002: 'errors.chatSessionForbidden',
  CHAT_003: 'chat.stillResponding',
  CHAT_004: 'errors.chatEventCooldown',
  CHAT_005: 'errors.chatEventNotFound',
  CHAT_006: 'errors.chatInterruptFailed',
  CHAT_007: 'chat.quotaDisabledMessage',
  CHAT_008: 'chat.quotaExceededMessage',
  CHAT_009: 'chat.fairUseLimitedMessage',

  VOICE_001: 'chat.voiceQuotaExceededMessage',
  VOICE_002: 'chat.voiceQuotaExceededMessage',

  CALL_001: 'voiceCall.disabled',
  CALL_002: 'voiceCall.noElevenVoice',
  CALL_003: 'voiceCall.quotaExceeded',
  CALL_004: 'voiceCall.notFound',
  CALL_005: 'voiceCall.conflict',
  CALL_006: 'voiceCall.invalid',
  CALL_007: 'voiceCall.vipRequired',

  PHOTO_001: 'requestPhoto.vipRequired',
  PHOTO_002: 'requestPhoto.affectionRequired',
  PHOTO_003: 'requestPhoto.noneAvailable',
  PHOTO_004: 'requestPhoto.matureRequired',
  PHOTO_005: 'requestPhoto.rateLimited',
  PHOTO_006: 'requestPhoto.invalidStyle',

  USER_001: 'errors.authUserNotFound',
  USER_002: 'errors.userInvalidParams',

  VIP_001: 'vip.shop.storyLocked',
  VIP_002: 'errors.vipCreateAgent',
  VIP_003: 'errors.vipOfficialRoleForbidden',
  VIP_004: 'errors.vipPlanNotFound',
  VIP_005: 'errors.vipActiveSubscription',
  VIP_006: 'errors.vipCheckoutFailed',
  VIP_007: 'errors.vipInvalidProvider',
  VIP_008: 'errors.vipDowngradeForbidden',
  VIP_009: 'errors.vipNoActiveSubscription',
  VIP_010: 'errors.vipMatureForbidden',
  VIP_012: 'errors.vipApplePayUnavailable',
  VIP_013: 'errors.vipApplePayTokenInvalid',
  VIP_014: 'errors.vipApplePayFailed',
  VIP_015: 'errors.vipApplePayPlanUnsupported',

  PTS_001: 'pointsShop.insufficient',
  PTS_002: 'errors.pointsCatalogNotFound',

  IMGGEN_001: 'creationCenter.disabled',
  IMGGEN_002: 'creationCenter.imgGenInvalidParams',
  IMGGEN_003: 'creationCenter.imgGenDailyLimit',
  IMGGEN_004: 'pointsShop.insufficient',
  IMGGEN_005: 'creationCenter.imgGenNotFound',
  IMGGEN_006: 'creationCenter.imgGenFailed',
  IMGGEN_007: 'creationCenter.imgGenContentFiltered',

  VIDGEN_001: 'creationCenter.videoGenDisabled',
  VIDGEN_002: 'creationCenter.videoGenInvalidParams',
  VIDGEN_003: 'creationCenter.videoGenInflightLimit',
  VIDGEN_004: 'pointsShop.insufficient',
  VIDGEN_005: 'creationCenter.videoGenNotFound',
  VIDGEN_006: 'creationCenter.videoGenFailed',
  VIDGEN_007: 'creationCenter.videoGenUnavailable',
  VIDGEN_008: 'creationCenter.videoGenContentFiltered',

  IMG_001: 'errors.chatImageUnsupported',
  IMG_002: 'errors.chatImageTooLarge',
  IMG_003: 'errors.chatImageInvalid',
  IMG_004: 'errors.chatImageVisionDisabled',
  IMG_005: 'errors.chatImageModeration',

  VOICEDSG_001: 'creationCenter.voiceLibrary.disabled',
  VOICEDSG_002: 'creationCenter.voiceLibrary.invalidParams',
  VOICEDSG_003: 'creationCenter.voiceLibrary.dailyLimit',
  VOICEDSG_004: 'pointsShop.insufficient',
  VOICEDSG_005: 'creationCenter.voiceLibrary.notFound',
  VOICEDSG_006: 'creationCenter.voiceLibrary.generateFailed',
  VOICEDSG_007: 'creationCenter.voiceLibrary.invalidState',
  VOICEDSG_009: 'creationCenter.voiceLibrary.providerLimit',

  STORY_001: 'errors.storySceneNotFound',
  STORY_002: 'errors.storySessionNotFound',
  STORY_003: 'errors.storySessionForbidden',
  STORY_004: 'chat.stillResponding',
  STORY_005: 'errors.storyBadEnd',
  STORY_006: 'errors.storySceneLocked',
  STORY_007: 'errors.storyParallelNoChat',
  STORY_008: 'errors.storyChapterNotFound',
  STORY_009: 'errors.storyChapterLocked',
  STORY_010: 'errors.storyChapterNeedCatalog',
  STORY_011: 'errors.storyChapterNeedPoints',
  STORY_012: 'errors.storyConfigInvalid',
  STORY_013: 'errors.storySeasonNotFound',
  STORY_014: 'errors.storyDebugForbidden',
  STORY_015: 'errors.storyDevOnly',

  SIMULATOR_DEV_ONLY: 'errors.simulatorDevOnly',
  SIMULATOR_AI_LIMIT: 'simulator.create.aiLimit',
  SIMULATOR_AI_JOB_NOT_FOUND: 'simulator.create.aiFailed',
  SIMULATOR_AI_JOB_FORBIDDEN: 'errors.forbidden',
  WORLD_015: 'worldEditor.create.aiLimit',
  SIMULATOR_009: 'errors.simulatorPlayerCastInvalid',
  SIMULATOR_010: 'errors.simulatorPlayerCastRequired',

  MATURE_001: 'errors.matureConsentInvalid',

  ASR_001: 'errors.asrInvalidFormat',
  ASR_002: 'errors.asrInvalidAudio',
  ASR_003: 'errors.asrDecodeFailed',
  ASR_004: 'chat.asrFailed',

  SURVEY_001: 'errors.surveyNotFound',
  SURVEY_002: 'errors.surveyInactive',
  SURVEY_003: 'errors.surveyAlreadySubmit',
  SURVEY_004: 'errors.surveyInvalidAnswer',
  SURVEY_005: 'errors.surveyInvalidParams',

  SYS_001: 'errors.unknown',
};

function isTechnicalMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('sql') ||
    lower.includes('arguments provided') ||
    lower.includes('internal server error') ||
    lower === 'unknown error' ||
    lower === 'unauthorized' ||
    lower.startsWith('api error ') ||
    lower.startsWith('network error:')
  );
}

/** Generic “provider failed” codes — prefer backend detail over vague i18n when safe. */
const GENERIC_GEN_FAIL_CODES = new Set(['IMGGEN_006', 'VIDGEN_006', 'VIDGEN_007']);

function stripGenErrorCodePrefix(message: string): string {
  return message.replace(/^(IMGGEN|VIDGEN)_\d{3}:\s*/i, '').trim();
}

function looksLikeContentFilter(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('content filter') ||
    lower.includes('content_filter') ||
    lower.includes('content_violation') ||
    lower.includes('content policy') ||
    lower.includes('safety') ||
    lower.includes('moderat') ||
    lower.includes('nsfw') ||
    lower.includes('blocked') ||
    lower.includes('敏感') ||
    lower.includes('违规') ||
    lower.includes('审核') ||
    lower.includes('内容安全')
  );
}

export type GenRecordErrorFields = {
  error_code?: string | null;
  error_message?: string | null;
};

/**
 * User-facing reason for a failed AI image/video job.
 * Prefers clear safety copy / backend detail over generic “生成失败”.
 */
export function formatGenRecordError(
  t: (key: string) => string,
  record: GenRecordErrorFields,
  kind: 'image' | 'video' = 'image',
): string {
  const code = (record.error_code || '').trim();
  const rawMsg = stripGenErrorCodePrefix((record.error_message || '').trim());
  const fallback =
    kind === 'video' ? t('creationCenter.videoGenFailed') : t('creationCenter.imgGenFailed');
  const contentFiltered =
    kind === 'video'
      ? t('creationCenter.videoGenContentFiltered')
      : t('creationCenter.imgGenContentFiltered');

  if (
    code === 'IMGGEN_007' ||
    code === 'VIDGEN_008' ||
    looksLikeContentFilter(rawMsg) ||
    looksLikeContentFilter(code)
  ) {
    return contentFiltered;
  }

  if (code && !GENERIC_GEN_FAIL_CODES.has(code)) {
    const key = API_ERROR_I18N_KEYS[code];
    if (key) {
      const localized = t(key);
      if (localized !== key) return localized;
    }
  }

  if (rawMsg && !isTechnicalMessage(rawMsg)) {
    return rawMsg.length > 180 ? `${rawMsg.slice(0, 177)}...` : rawMsg;
  }

  if (code) {
    const key = API_ERROR_I18N_KEYS[code];
    if (key) {
      const localized = t(key);
      if (localized !== key) return localized;
    }
  }

  return fallback;
}

/**
 * ROLE_010 is a bucket code — map known validation messages to specific copy
 * so create/edit agent flows can tell users the real reason.
 */
const ROLE_INVALID_PARAMS_DETAIL_KEYS: Array<{ match: RegExp; key: string }> = [
  { match: /invalid personality tag/i, key: 'errors.rolePersonalityTagInvalid' },
  { match: /invalid personality/i, key: 'errors.rolePersonalityInvalid' },
  { match: /invalid introduction/i, key: 'errors.roleIntroductionInvalid' },
  { match: /invalid name/i, key: 'errors.roleNameInvalid' },
  { match: /invalid scene_name/i, key: 'errors.roleSceneNameInvalid' },
  { match: /figure required/i, key: 'errors.roleFigureRequired' },
  { match: /english only/i, key: 'errors.roleEnglishOnly' },
  { match: /invalid event fields/i, key: 'errors.roleEventFieldsInvalid' },
  { match: /invalid locale/i, key: 'errors.roleLocaleInvalid' },
  { match: /invalid comment/i, key: 'errors.roleCommentInvalid' },
];

function resolveRoleInvalidParamsDetail(
  t: (key: string) => string,
  message: string | undefined,
): string | null {
  if (!message || isTechnicalMessage(message)) return null;
  for (const { match, key } of ROLE_INVALID_PARAMS_DETAIL_KEYS) {
    if (!match.test(message)) continue;
    const localized = t(key);
    if (localized !== key) return localized;
  }
  return null;
}

export function getApiErrorCode(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.code;
  return undefined;
}

/** Resolve a backend API error to a localized user-facing message. */
export function formatApiError(t: (key: string) => string, err: unknown): string {
  if (err instanceof ApiError) {
    // ROLE_010 carries concrete validation reasons in `message` — prefer those.
    if (err.code === 'ROLE_010') {
      const detail = resolveRoleInvalidParamsDetail(t, err.message);
      if (detail) return detail;
    }
    if (err.code) {
      const key = API_ERROR_I18N_KEYS[err.code];
      if (key) {
        const localized = t(key);
        if (localized !== key) return localized;
      }
    }
    if (err.status === 401) {
      const unauthorized = t('errors.unauthorized');
      if (unauthorized !== 'errors.unauthorized') return unauthorized;
    }
    // 未映射错误码时，直接展示后端 error_message / message（过滤技术文案）
    if (err.message && !isTechnicalMessage(err.message)) {
      const detail = resolveRoleInvalidParamsDetail(t, err.message);
      if (detail) return detail;
      return err.message;
    }
    return t('errors.unknown');
  }
  if (err instanceof Error && err.message && !isTechnicalMessage(err.message)) {
    return err.message;
  }
  return t('errors.unknown');
}
