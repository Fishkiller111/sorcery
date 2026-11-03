/**
 * AI 生图面板：布局对齐生视频工作室（左控制栏 + 中画布/预设 + 右队列），
 * 宽屏锁定单视口高度，列内各自滚动。
 */
import type { Lang } from '../../../../i18n/types';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { DefaultImageGenSettingsModal } from './DefaultImageGenSettingsModal';
import { SubmitToMediaLibraryModal } from './SubmitToMediaLibraryModal';
import { generateAiImage, getAiImageGenMeta, uploadAiImageGenReference } from '../../../../api/aiImageGen';
import { resolveStaticUrl } from '../../../../constants/config';
import { IMAGE_GEN_TEMPLATES } from '../../../../constants/imageGenTemplates';
import { useAuthStore } from '../../../../stores/authStore';
import { useAiImageGenHistory } from '../../../../hooks/useAiImageGenHistory';
import { useIsDesktop } from '../../../../hooks/useIsDesktop';
import { requireLoginForAction } from '../../../../utils/requireLogin';
import { formatApiError, formatGenRecordError, getApiErrorCode } from '../../../../utils/apiError';
import { notifyError, notifySuccess } from '../../../../utils/notify';
import { compressImageForUpload } from '../../../../utils/compressImageForUpload';
import { downloadImageToDevice } from '../../../../utils/downloadImage';
import type { AiImageGenMetaResp, AiImageGenRecordItem } from '../../../../types/api';
import type { ImageGenCategory } from '../../../../constants/imageGenCategoryPresets';
import {
  CreationCenterPresetBrowser,
  CreationCenterPresetSheet,
  CreationCenterPresetSlots,
  createCreationCenterPresetStyles,
  useCreationCenterPresetSelection,
  type CreationCenterDisplayTemplate,
} from './shared';

const IMAGE_CHARACTER_COPY = {
  browserHintKey: 'creationCenter.characterBrowserHint',
  uploadTitleKey: 'creationCenter.characterUpload',
  uploadSubKey: 'creationCenter.characterUploadSub',
  uploadFilledSubKey: 'creationCenter.characterUploadSub',
} as const;

/** 与生视频一致的三列阈值 */
const STUDIO_SPLIT_MIN_WIDTH = 842;

function isImageSucceeded(status: string) {
  return status === 'succeeded' || status === 'completed';
}

function isImageActive(status: string) {
  return status === 'pending' || status === 'processing';
}

function statusLabel(status: string, t: (key: string) => string): string {
  if (isImageSucceeded(status)) return t('creationCenter.historyStatusCompleted');
  if (status === 'failed') return t('creationCenter.historyStatusFailed');
  if (isImageActive(status)) return t('creationCenter.historyStatusPending');
  return status;
}

export function DefaultGenerateImagePanel() {
  const { t, lang } = useI18n();
  const presetStyles = useMemo(() => createCreationCenterPresetStyles(lang), [lang]);
  const styles = useMemo(() => createStyles(lang), [lang]);
  const router = useRouter();
  const params = useLocalSearchParams<{ referenceUrl?: string; roleName?: string }>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAppDesktop = useIsDesktop();
  const { width: windowWidth } = useWindowDimensions();

  /** 扣除侧栏与页边距后的可用宽；不足则走堆叠 + 预设底栏 */
  const studioContentWidth =
    windowWidth -
    (isAppDesktop ? TOKENS.layout.sidebarWidth : 0) -
    TOKENS.layout.contentPadding * 2;
  const studioSplit = studioContentWidth >= STUDIO_SPLIT_MIN_WIDTH;

  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  /** 宽屏默认展开预设；窄屏点槽位再出底栏 */
  const [presetsOpen, setPresetsOpen] = useState(studioSplit);
  const [meta, setMeta] = useState<AiImageGenMetaResp | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [generating, setGenerating] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [stylePreset, setStylePreset] = useState('');
  const appliedReferenceRef = useRef<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 桌面工作室始终拉历史并轮询进行中任务
  const history = useAiImageGenHistory(true);
  const { refresh: refreshHistory } = history;

  const onTemplateSelected = useCallback((template: CreationCenterDisplayTemplate) => {
    if (template.aspectRatio) setAspectRatio(template.aspectRatio);
    if (template.tagCodes?.length) setSelectedTags(template.tagCodes);
  }, []);

  const onCharacterChanged = useCallback(() => {
    setSelectedHistoryId(null);
  }, []);

  const presets = useCreationCenterPresetSelection({
    onTemplateSelected,
    onCharacterChanged,
    isDesktopOverride: studioSplit,
  });

  const {
    isDesktop,
    categoryMeta,
    activeCategory,
    setActiveCategory,
    character,
    poseId,
    clothingId,
    sceneId,
    customPrompt,
    setCustomPrompt,
    composedPrompt,
    selectCharacterTemplate,
    pickCharacterReference,
    applyDeepLinkReference,
    slotSelection,
    clearCategory,
    selectPreset,
    tileWidthStyle,
    onPresetGridLayout,
  } = presets;

  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    void getAiImageGenMeta(lang)
      .then((resp) => {
        if (!cancelled) {
          setMeta(resp);
          if (resp.aspect_ratios?.[0]) {
            setAspectRatio(resp.aspect_ratios[0]);
          }
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
  }, [lang]);

  useEffect(() => {
    const raw = params.referenceUrl;
    const referenceUrl = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
    if (!referenceUrl || appliedReferenceRef.current === referenceUrl) return;
    appliedReferenceRef.current = referenceUrl;
    const rawName = params.roleName;
    const roleName = (Array.isArray(rawName) ? rawName[0] : rawName)?.trim() ?? '';
    applyDeepLinkReference(referenceUrl, roleName);
  }, [applyDeepLinkReference, params.referenceUrl, params.roleName]);

  const displayTemplates = useMemo((): CreationCenterDisplayTemplate[] => {
    if (meta?.templates?.length) {
      return meta.templates.map((tpl) => ({
        id: tpl.template_id,
        previewUri: resolveStaticUrl(tpl.image_url),
        prompt: tpl.prompt,
        aspectRatio: tpl.aspect_ratio as '9:16' | '1:1' | '16:9',
        tagCodes: tpl.tag_codes,
        label: tpl.prompt.slice(0, 28) || tpl.template_id,
      }));
    }
    return IMAGE_GEN_TEMPLATES.map((tpl) => ({
      id: tpl.id,
      localPreview: tpl.preview,
      prompt: t(tpl.promptKey),
      aspectRatio: tpl.aspectRatio,
      tagCodes: tpl.tagCodes,
      label: t(tpl.labelKey),
    }));
  }, [meta, t]);

  const selectedRecord = useMemo(
    () => history.items.find((item) => item.record_id === selectedHistoryId) ?? null,
    [history.items, selectedHistoryId],
  );

  const pointsCost = meta?.points_cost ?? 0;
  const canGenerate = Boolean(composedPrompt.trim()) && Boolean(meta?.enabled) && !generating;

  const resolveReferenceImageUrl = useCallback(async (): Promise<string | undefined> => {
    const refUri = character?.referenceUri?.trim();
    if (!refUri) return undefined;
    if (!meta?.i2i_enabled) {
      notifyError(t('creationCenter.i2iDisabled'));
      throw new Error('i2i_disabled');
    }
    if (character?.referenceFile) {
      const compressed = await compressImageForUpload({
        previewUri: refUri,
        file: character.referenceFile,
        filename: character.referenceFilename || 'reference.jpg',
      });
      const uploaded = await uploadAiImageGenReference(compressed.file, compressed.filename);
      return uploaded.image_url;
    }
    if (refUri.startsWith('/static/') || refUri.startsWith('http://') || refUri.startsWith('https://')) {
      return refUri;
    }
    notifyError(t('creationCenter.characterUploadRequired'));
    throw new Error('reference_upload_required');
  }, [character, meta?.i2i_enabled, t]);

  const onGenerate = useCallback(async () => {
    if (!requireLoginForAction(isLoggedIn, router, t('errors.authTokenMissing'))) return;
    const trimmed = composedPrompt.trim();
    if (!trimmed) {
      notifyError(t('creationCenter.promptRequired'));
      return;
    }
    if (!meta?.enabled) {
      notifyError(t('creationCenter.disabled'));
      return;
    }
    setGenerating(true);
    try {
      let referenceImageUrl: string | undefined;
      if (character?.referenceUri) {
        referenceImageUrl = await resolveReferenceImageUrl();
      }
      const resp = await generateAiImage({
        prompt: trimmed,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        aspect_ratio: aspectRatio,
        style_preset: stylePreset || undefined,
        negative_prompt: negativePrompt.trim() || undefined,
        reference_image_url: referenceImageUrl,
      });
      notifySuccess(t('creationCenter.generateQueued'));
      setSelectedHistoryId(resp.record_id);
      setPresetsOpen(false);
      refreshHistory();
    } catch (e) {
      if (e instanceof Error && (e.message === 'i2i_disabled' || e.message === 'reference_upload_required')) {
        return;
      }
      const code = getApiErrorCode(e);
      if (code === 'IMGGEN_004' || code === 'PTS_001') {
        notifyError(t('pointsShop.insufficient'));
      } else {
        notifyError(formatApiError(t, e));
      }
    } finally {
      setGenerating(false);
    }
  }, [
    aspectRatio,
    character?.referenceUri,
    composedPrompt,
    negativePrompt,
    refreshHistory,
    resolveReferenceImageUrl,
    selectedTags,
    stylePreset,
    isLoggedIn,
    meta?.enabled,
    router,
    t,
  ]);

  /** 打开预设：宽屏展开中栏；窄屏交给 Sheet */
  const openPresetSheet = useCallback(
    (id?: ImageGenCategory) => {
      if (id) setActiveCategory(id);
      if (studioSplit) {
        setPresetsOpen(true);
        return;
      }
      if (presetsOpen) return;
      setPresetsOpen(true);
    },
    [presetsOpen, setActiveCategory, studioSplit],
  );

  const onSelectPresetCategory = useCallback(
    (id: ImageGenCategory) => {
      openPresetSheet(id);
    },
    [openPresetSheet],
  );

  const closePresetSheet = useCallback(() => {
    setPresetsOpen(false);
  }, []);

  /** 左控制栏：预设槽 + 一体式 composer */
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

        <CreationCenterPresetSlots
          styles={presetStyles}
          isDesktop={isDesktop}
          categoryMeta={categoryMeta}
          activeCategory={activeCategory}
          onSelectCategory={onSelectPresetCategory}
          slotSelection={slotSelection}
          onClearCategory={clearCategory}
          recyclingKeyPrefix="image-slot"
        />

        <View style={styles.composerCard}>
          <TextInput
            style={styles.composerInput}
            value={customPrompt}
            onChangeText={setCustomPrompt}
            placeholder={t('creationCenter.customPromptPlaceholder')}
            placeholderTextColor={TOKENS.colors.textMuted}
            multiline
            textAlignVertical="top"
            editable={!generating}
          />

          <View style={styles.composerToolbarWrap}>
            <View style={styles.composerToolbar}>
              <View style={styles.composerToolsLeft}>
                <Pressable
                  onPress={() => setSettingsVisible(true)}
                  style={[styles.composerIconBtn, settingsVisible && styles.composerIconBtnActive]}
                  hitSlop={6}
                >
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={settingsVisible ? TOKENS.colors.text : TOKENS.colors.textMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.composerToolsRight}>
                {pointsCost > 0 ? (
                  <View style={styles.creditPill}>
                    <Ionicons name="cash-outline" size={14} color="#3DDC84" />
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
                      ? `${t('creationCenter.generate')} · ${t('creationCenter.pointsCost').replace('{n}', String(pointsCost))}`
                      : t('creationCenter.generate')
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

        {!metaLoading && meta && !meta.enabled ? (
          <Text style={styles.disabledHint}>{t('creationCenter.disabled')}</Text>
        ) : null}
      </ScrollView>
    </View>
  );

  const renderPresetBrowser = () => (
    <View style={[styles.rightBrowser, isDesktop && styles.rightBrowserDesktop]}>
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
            characterCopy={IMAGE_CHARACTER_COPY}
            recyclingKeyPrefix="image"
          />
        </ScrollView>
      )}
    </View>
  );

  const renderStage = () => {
    const imageUri =
      selectedRecord?.image_url && isImageSucceeded(selectedRecord.status)
        ? resolveStaticUrl(selectedRecord.image_url)
        : null;

    return (
      <View style={[styles.stage, !studioSplit && styles.stageStacked]}>
        <View style={styles.stageCanvas}>
          {selectedRecord ? (
            <>
              {imageUri ? (
                <>
                  <ExpoImage source={{ uri: imageUri }} style={styles.stageImage} contentFit="contain" />
                  <View style={styles.stageActions}>
                    <Pressable
                      onPress={() =>
                        void downloadImageToDevice(
                          imageUri,
                          `soulthread-${selectedRecord.record_id}.png`,
                          t,
                        )
                      }
                      style={styles.stageActionBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('creationCenter.downloadImage')}
                    >
                      <Ionicons name="download-outline" size={16} color={TOKENS.colors.text} />
                      <Text style={styles.stageActionText}>{t('creationCenter.downloadImage')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (!requireLoginForAction(isLoggedIn, router, t('creationCenter.historyLoginRequired'))) return;
                        setSubmitVisible(true);
                      }}
                      style={styles.stageActionBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('creationCenter.submitToMediaLibrary')}
                    >
                      <Ionicons name="cloud-upload-outline" size={16} color={TOKENS.colors.text} />
                      <Text style={styles.stageActionText}>
                        {t('creationCenter.submitToMediaLibrary')}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.stageProgressBox}>
                  {isImageActive(selectedRecord.status) ? (
                    <ActivityIndicator color={TOKENS.colors.accent} size="large" />
                  ) : (
                    <Ionicons name="image-outline" size={56} color={TOKENS.colors.textSecondary} />
                  )}
                  <Text style={styles.stageProgressTitle}>
                    {statusLabel(selectedRecord.status, t)}
                  </Text>
                  <Text style={styles.stagePrompt} numberOfLines={3}>
                    {selectedRecord.prompt}
                  </Text>
                  {selectedRecord.status === 'failed' ||
                  selectedRecord.error_code ||
                  selectedRecord.error_message ? (
                    <Text style={styles.historyError}>
                      {formatGenRecordError(t, selectedRecord, 'image')}
                    </Text>
                  ) : null}
                </View>
              )}
            </>
          ) : (
            <View style={styles.stageEmpty}>
              <View style={styles.stagePlayBadge}>
                <Ionicons name="image-outline" size={28} color={TOKENS.colors.text} />
              </View>
              <Text style={styles.stageEmptyTitle}>{t('creationCenter.imageStageEmptyTitle')}</Text>
              <Text style={styles.stageEmptySub}>{t('creationCenter.imageStageEmptySub')}</Text>
            </View>
          )}
        </View>
        <SubmitToMediaLibraryModal
          visible={submitVisible}
          recordId={selectedRecord?.record_id || ''}
          onClose={() => setSubmitVisible(false)}
        />
      </View>
    );
  };

  /** 最右队列列：与生视频同结构 */
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
            <Text style={styles.queueEmptyTitle}>{t('creationCenter.historyEmpty')}</Text>
            <Text style={styles.queueEmptySub}>{t('creationCenter.imageQueueEmptySub')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.queueList}
            contentContainerStyle={styles.queueListContent}
            showsVerticalScrollIndicator={false}
          >
            {history.items.map((job: AiImageGenRecordItem) => {
              const active = (selectedRecord?.record_id ?? '') === job.record_id;
              const thumb =
                job.image_url && isImageSucceeded(job.status)
                  ? resolveStaticUrl(job.image_url)
                  : null;
              return (
                <Pressable
                  key={job.record_id}
                  onPress={() => {
                    setSelectedHistoryId(job.record_id);
                    setPresetsOpen(false);
                  }}
                  style={[styles.queueCard, active && styles.queueCardActive]}
                >
                  {thumb ? (
                    <ExpoImage source={{ uri: thumb }} style={styles.queueThumb} contentFit="cover" />
                  ) : (
                    <View style={styles.queueThumbFallback}>
                      <Ionicons
                        name={isImageSucceeded(job.status) ? 'image' : 'hourglass-outline'}
                        size={18}
                        color={TOKENS.colors.textMuted}
                      />
                    </View>
                  )}
                  <View style={styles.queueMeta}>
                    <Text style={styles.galleryStatus} numberOfLines={1}>
                      {statusLabel(job.status, t)}
                    </Text>
                    {job.status === 'failed' ? (
                      <Text style={styles.historyError} numberOfLines={2}>
                        {formatGenRecordError(t, job, 'image')}
                      </Text>
                    ) : (
                      <Text style={styles.galleryModel} numberOfLines={2}>
                        {job.prompt}
                      </Text>
                    )}
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
          {presetsOpen ? null : renderStage()}
          {renderGallery()}
        </View>
      )}

      {/* 窄屏：与生视频共用的预设底栏 */}
      {!studioSplit ? (
        <CreationCenterPresetSheet
          visible={presetsOpen}
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
          characterCopy={IMAGE_CHARACTER_COPY}
          loading={metaLoading}
          recyclingKeyPrefix="image-sheet"
        />
      ) : null}

      <DefaultImageGenSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        stylePreset={stylePreset}
        onStylePresetChange={setStylePreset}
        negativePrompt={negativePrompt}
        onNegativePromptChange={setNegativePrompt}
        extraAspectRatios={meta?.aspect_ratios}
      />
    </View>
  );
}

/** 工作室布局样式：左控栏 + 中画布 + 右队列（对齐生视频） */
function createStyles(lang: Lang) {
  return StyleSheet.create({
    content: {
      width: '100%',
    },
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
    /** 窄屏整页滚动时给画布固定最小高度，避免 flex 塌缩 */
    stageStacked: {
      flex: 0,
      minHeight: 360,
    },
    stageCanvas: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      minHeight: 0,
      position: 'relative',
      ...(Platform.OS === 'web'
        ? ({
            backgroundImage:
              'radial-gradient(ellipse at 50% 40%, rgba(49,64,110,0.28) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(179,59,69,0.12) 0%, transparent 45%)',
          } as object)
        : {}),
    },
    stageImage: {
      width: '100%',
      height: '100%',
      maxHeight: 640,
    },
    stageActions: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
    stageActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(12, 14, 20, 0.82)',
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
    },
    stageActionText: {
      color: TOKENS.colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    stageProgressBox: {
      alignItems: 'center',
      gap: 12,
      maxWidth: 420,
      paddingHorizontal: 12,
    },
    stageProgressTitle: {
      color: TOKENS.colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    stagePrompt: {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
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
        fontWeight: '700',
        textAlign: 'center',
      },
      'serif',
      lang,
    ),
    stageEmptySub: {
      color: TOKENS.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    queueColumn: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: TOKENS.colors.cardBorder,
      backgroundColor: 'rgba(12, 14, 20, 0.92)',
      overflow: 'hidden',
      minHeight: 220,
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
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: TOKENS.colors.cardBorderFaint,
    },
    galleryTitle: {
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    queueBody: {
      flex: 1,
      minHeight: 0,
    },
    queueList: {
      flex: 1,
      minHeight: 0,
    },
    queueListContent: {
      padding: 10,
      gap: 8,
    },
    queueCard: {
      flexDirection: 'row',
      gap: 10,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: 'rgba(255,255,255,0.03)',
    },
    queueCardActive: {
      borderColor: 'rgba(186, 60, 71, 0.45)',
      backgroundColor: 'rgba(186, 60, 71, 0.1)',
    },
    queueThumb: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: '#141820',
    },
    queueThumbFallback: {
      width: 48,
      height: 48,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#141820',
    },
    queueMeta: {
      flex: 1,
      minWidth: 0,
      gap: 2,
      justifyContent: 'center',
    },
    galleryStatus: {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    galleryModel: {
      color: TOKENS.colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    galleryMore: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    loadMoreText: {
      color: TOKENS.colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    queueEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 20,
    },
    queueEmptyTitle: {
      color: TOKENS.colors.text,
      fontSize: 14,
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
      fontSize: 13,
      textAlign: 'center',
    },
    historyError: {
      color: '#E57373',
      fontSize: 12,
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    disabledHint: Typo(
      {
        color: TOKENS.colors.textMuted,
        fontSize: 13,
        lineHeight: 20,
      },
      'sans',
      lang,
    ),
  });
}
