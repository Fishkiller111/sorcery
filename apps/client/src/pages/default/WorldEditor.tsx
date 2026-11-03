import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { listAllRoles } from '../../api/roles';
import type { RoleItem } from '../../types/api';
import type { WorldContentRating, WorldEditorTab } from '../../types/worldDocument';
import { sceneForLevel } from '../../lib/worldDocument';
import {
  useSimpleWorldEditor,
  type SimpleWorldEditorState,
} from '../../components/world-editor/useSimpleWorldEditor';
import { LevelExtrasPanel } from '../../components/world-editor/LevelExtrasPanel';
import { MapPanel } from '../../components/world-editor/MapPanel';
import { AdvancedWorldEditor } from '../../components/world-editor/AdvancedWorldEditor';
import { uploadWorldAsset, deleteWorld } from '../../api/worldEditor';
import { ApiError } from '../../api/client';
import { pickWorldEditorImage } from '../../utils/pickRoleImage';
import { PhotoPermissionDeniedError } from '../../utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../utils/promptPhotoLibraryAccessSettings';
import { resolveStaticUrl } from '../../constants/config';
import { isLinearLevelTopology, listHappenedThings } from '../../lib/worldDocument';
import { notifyError, notifySuccess } from '../../utils/notify';
import { Image } from 'expo-image';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { DefaultShell } from './components/DefaultShell';
import { DefaultCreateAgentSectionLabel } from './components/create-agent/DefaultCreateAgentSectionLabel';
import { DefaultCreateAgentDiamond } from './components/create-agent/DefaultCreateAgentDiamond';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { TOKENS } from './theme/tokens';

/** Figma tab order — expert mode is the top toggle, not a tab. */
const TABS: { key: WorldEditorTab; labelKey: string }[] = [
  { key: 'lore', labelKey: 'worldEditor.tabs.lore' },
  { key: 'cast', labelKey: 'worldEditor.tabs.cast' },
  { key: 'levels', labelKey: 'worldEditor.tabs.levels' },
  { key: 'endings', labelKey: 'worldEditor.tabs.endings' },
  { key: 'overview', labelKey: 'worldEditor.tabs.overview' },
];

const RATINGS: WorldContentRating[] = ['standard', 'r', 'r18'];

const ACCENT_GRAD = ['#a22f3a', '#d44a55'] as const;
const PANEL_GRAD = ['rgba(21,26,38,0.72)', 'rgba(7,9,16,0.82)'] as const;
const TAB_IDLE_GRAD = ['rgba(145,152,171,0.09)', 'rgba(59,62,69,0.49)'] as const;

/** iOS App Store: basic editor only — no expert canvas or JSON import/export. */
const IOS_WORLD_BASIC_ONLY = Platform.OS === 'ios';

function notifyWorldUploadError(e: unknown, t: (key: string) => string) {
  if (e instanceof PhotoPermissionDeniedError) {
    promptPhotoLibraryAccessSettings(t);
    return;
  }
  notifyError(e instanceof ApiError ? e.message : t('worldEditor.uploadFailed'));
}

export default function DefaultWorldEditor() {
  const { worldId: worldIdParam } = useLocalSearchParams<{ worldId: string }>();
  const worldId = Array.isArray(worldIdParam) ? worldIdParam[0] : worldIdParam;
  const editor = useSimpleWorldEditor(worldId || '');
  const { t } = useI18n();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const expert = !IOS_WORLD_BASIC_ONLY && editor.editorMode === 'canvas';
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!IOS_WORLD_BASIC_ONLY || editor.loading || !editor.doc) return;
    if (editor.editorMode === 'canvas') {
      editor.exitCanvasMode('overview');
    }
  }, [editor.doc, editor.editorMode, editor.loading, editor]);

  const onHardDelete = useCallback(async () => {
    if (!worldId) return;
    setDeleting(true);
    try {
      await deleteWorld(worldId);
      notifySuccess(t('worldEditor.overview.deleteOk'));
      setDeleteOpen(false);
      router.replace('/world' as never);
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : t('worldEditor.overview.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  }, [router, t, worldId]);

  if (!worldId) {
    return (
      <DefaultShell>
        <View style={styles.center}>
          <Text style={styles.muted}>{t('worldEditor.invalidId')}</Text>
        </View>
      </DefaultShell>
    );
  }

  if (editor.loading || !editor.doc) {
    return (
      <DefaultShell>
        <View style={styles.center}>
          <ActivityIndicator color={TOKENS.colors.accent} />
        </View>
      </DefaultShell>
    );
  }

  return (
    <DefaultShell scrollable={!expert}>
      <View
        style={[
          styles.content,
          expert
            ? isDesktop
              ? styles.contentDesktopWide
              : styles.contentMobile
            : isDesktop
              ? styles.contentDesktop
              : styles.contentMobile,
          pageContentPadding,
          expert && styles.contentExpert,
        ]}
      >
        <View style={styles.chromeHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={TOKENS.colors.text} />
          </Pressable>
          <View style={styles.backBtnSpacer} />
          <View style={IOS_WORLD_BASIC_ONLY ? styles.modeBasicOnlyHidden : styles.modeToggle}>
            {IOS_WORLD_BASIC_ONLY ? null : (
              <>
                <Pressable
                  style={styles.modeSegPress}
                  onPress={() => {
                    if (expert) editor.exitCanvasMode(editor.tab === 'advanced' ? 'overview' : editor.tab);
                  }}
                >
                  {!expert ? (
                    <LinearGradient colors={[...ACCENT_GRAD]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.modeSegOn}>
                      <Text style={styles.modeSegTextOn}>{t('worldEditor.mode.basic')}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.modeSegOff}>
                      <Text style={styles.modeSegText}>{t('worldEditor.mode.basic')}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={styles.modeSegPress}
                  onPress={() => {
                    if (!expert) void editor.enterCanvasMode();
                  }}
                >
                  {expert ? (
                    <LinearGradient colors={[...ACCENT_GRAD]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.modeSegOn}>
                      <Text style={styles.modeSegTextOn}>{t('worldEditor.mode.expert')}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.modeSegOff}>
                      <Text style={styles.modeSegText}>{t('worldEditor.mode.expert')}</Text>
                    </View>
                  )}
                </Pressable>
              </>
            )}
          </View>
          <View style={styles.backBtnSpacer} />
        </View>

        {expert ? (
          <AdvancedWorldEditor editor={editor} t={t} worldId={worldId} embedded />
        ) : (
          <>
            <TextInput
              style={styles.headingInput}
              value={editor.doc.identity.title}
              onChangeText={(v) => editor.updateIdentity({ title: v })}
              placeholder={t('worldEditor.untitled')}
              placeholderTextColor={TOKENS.colors.textMuted}
              selectTextOnFocus
            />
            <Text style={styles.codeLine} numberOfLines={1}>
              {editor.world?.code || worldId}
              {editor.dirty ? ` · ${t('worldEditor.dirty')}` : ''}
            </Text>
            <View style={styles.titleDivider}>
              <View style={styles.titleLine} />
              <DefaultCreateAgentDiamond size={10} />
              <View style={styles.titleLine} />
            </View>

            <View style={styles.tabRow}>
              {TABS.map((tab) => {
                const active = editor.tab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => editor.setTab(tab.key)}
                    style={styles.tabPress}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[...ACCENT_GRAD]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.tabOn}
                      >
                        <Text style={styles.tabTextOn}>{t(tab.labelKey)}</Text>
                      </LinearGradient>
                    ) : (
                      <LinearGradient
                        colors={[...TAB_IDLE_GRAD]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.tab}
                      >
                        <Text style={styles.tabText}>{t(tab.labelKey)}</Text>
                      </LinearGradient>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.body}>
              {editor.tab === 'overview' ? (
                <OverviewSection editor={editor} t={t} worldId={worldId} />
              ) : null}
              {editor.tab === 'lore' ? <LoreSection editor={editor} worldId={worldId} t={t} /> : null}
              {editor.tab === 'cast' ? <CastSection editor={editor} t={t} /> : null}
              {editor.tab === 'levels' ? <LevelsSection editor={editor} worldId={worldId} t={t} /> : null}
              {editor.tab === 'endings' ? <EndingsSection editor={editor} worldId={worldId} t={t} /> : null}
            </View>

            <View style={styles.footerBar}>
              <Pressable
                onPress={() => {
                  if (editor.tab === 'overview') {
                    setDeleteOpen(true);
                    return;
                  }
                  router.push(`/world/${worldId}`);
                }}
                style={styles.footerBtnPress}
              >
                <LinearGradient
                  colors={[...PANEL_GRAD]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={[
                    styles.footerBtnSecondary,
                    editor.tab === 'overview' && styles.footerBtnDanger,
                  ]}
                >
                  <Text
                    style={[
                      styles.footerBtnSecondaryText,
                      editor.tab === 'overview' && styles.footerBtnDangerText,
                    ]}
                  >
                    {editor.tab === 'overview'
                      ? t('worldEditor.overview.deleteWorld')
                      : t('worldEditor.overview.tryPlay')}
                  </Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (editor.tab === 'overview' && !editor.dirty) {
                    void editor.publish();
                    return;
                  }
                  void editor.save();
                }}
                disabled={editor.saving || editor.publishing}
                style={[styles.footerBtnPress, (editor.saving || editor.publishing) && styles.btnDisabled]}
              >
                <LinearGradient
                  colors={[...ACCENT_GRAD]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.footerBtnPrimary}
                >
                  {editor.saving || editor.publishing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.footerBtnPrimaryText}>
                      {editor.tab === 'overview' && !editor.dirty
                        ? t('worldEditor.overview.submitReview')
                        : editor.dirty
                          ? t('worldEditor.save')
                          : t('worldEditor.saved')}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <ThemedGeneralConfirmModal
        visible={deleteOpen}
        icon="warning"
        title={t('worldEditor.overview.deleteWorld')}
        subtitle={t('worldEditor.overview.deleteConfirm')}
        cancelLabel={t('confirmModal.cancel')}
        confirmLabel={t('worldEditor.overview.deleteConfirmAction')}
        loading={deleting}
        onCancel={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={() => void onHardDelete()}
      />
    </DefaultShell>
  );
}

function OverviewSection({
  editor,
  t,
}: {
  editor: SimpleWorldEditorState;
  t: (k: string) => string;
  worldId: string;
}) {
  const ROW_H = 36;
  return (
    <View style={styles.section}>
      <Text style={styles.overviewLabel}>{t('worldEditor.overview.checklist')}</Text>
      <LinearGradient
        colors={[...PANEL_GRAD]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={styles.checklistCard}
      >
        <View style={styles.checklistRail}>
          <View style={styles.checklistTrack}>
            <View style={styles.checklistDash} />
            {editor.checklist.map((item) => (
              <View key={item.id} style={[styles.checkDiamondSlot, { height: ROW_H }]}>
                <DefaultCreateAgentDiamond size={11} muted={!item.ok} />
              </View>
            ))}
          </View>
          <View style={styles.checklistLabels}>
            {editor.checklist.map((item) => (
              <View key={item.id} style={[styles.checkLabelSlot, { height: ROW_H }]}>
                <Text style={[styles.checkLabel, item.ok && styles.checkLabelOk]}>
                  {t(item.labelKey)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
      <Text style={styles.hint}>
        {IOS_WORLD_BASIC_ONLY
          ? t('worldEditor.overview.basicHint')
          : t('worldEditor.overview.advancedHint')}
      </Text>
    </View>
  );
}

function LoreSection({
  editor,
  worldId,
  t,
}: {
  editor: SimpleWorldEditorState;
  worldId: string;
  t: (k: string) => string;
}) {
  const doc = editor.doc!;
  const [uploadingCover, setUploadingCover] = useState(false);
  const core = useMemo(() => {
    const list = doc.lore.knowledge || [];
    return list.find((k) => k.key === 'core_1' || k.importance === 'core') || list[0];
  }, [doc.lore.knowledge]);

  return (
    <View style={styles.section}>
      <DefaultCreateAgentSectionLabel label={t('worldEditor.lore.cover')} />
      {doc.identity.cover_image ? (
        <Image
          source={{ uri: resolveStaticUrl(doc.identity.cover_image) }}
          style={styles.coverPreview}
          contentFit="cover"
        />
      ) : null}
      <Pressable
        style={styles.secondaryBtn}
        disabled={uploadingCover || !worldId}
        onPress={() => {
          void (async () => {
            try {
              const picked = await pickWorldEditorImage('cover');
              if (!picked || !worldId) return;
              setUploadingCover(true);
              const resp = await uploadWorldAsset(worldId, 'cover', picked.file, picked.filename);
              editor.updateIdentity({ cover_image: resp.url });
            } catch (e) {
              notifyWorldUploadError(e, t);
            } finally {
              setUploadingCover(false);
            }
          })();
        }}
      >
        {uploadingCover ? (
          <ActivityIndicator color={TOKENS.colors.accent} size="small" />
        ) : (
          <Text style={styles.secondaryBtnText}>
            {doc.identity.cover_image ? t('worldEditor.lore.replaceCover') : t('worldEditor.lore.uploadCover')}
          </Text>
        )}
      </Pressable>

      <DefaultCreateAgentSectionLabel label={t('worldEditor.lore.title')} />
      <TextInput
        style={styles.input}
        value={doc.identity.title}
        onChangeText={(v) => editor.updateIdentity({ title: v })}
      />

      <DefaultCreateAgentSectionLabel label={t('worldEditor.lore.tagline')} />
      <TextInput
        style={styles.input}
        value={doc.identity.tagline || ''}
        onChangeText={(v) => editor.updateIdentity({ tagline: v })}
        placeholder={t('worldEditor.lore.taglinePlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />

      <DefaultCreateAgentSectionLabel label={t('worldEditor.lore.rating')} />
      <View style={styles.ratingRow}>
        {RATINGS.map((r) => {
          const active = doc.identity.content_rating === r;
          return (
            <Pressable
              key={r}
              onPress={() => editor.updateIdentity({ content_rating: r })}
              style={[styles.ratingChip, active && styles.ratingChipOn]}
            >
              <Text style={[styles.ratingText, active && styles.ratingTextOn]}>
                {t(`worldEditor.rating.${r}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DefaultCreateAgentSectionLabel label={t('worldEditor.lore.tags')} />
      <TextInput
        style={styles.input}
        value={(doc.identity.tags || []).join(', ')}
        onChangeText={(v) =>
          editor.updateIdentity({
            tags: v
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder={t('worldEditor.lore.tagsPlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />

      <DefaultCreateAgentSectionLabel label={t('worldEditor.lore.canon')} />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        multiline
        value={doc.lore.canon || ''}
        onChangeText={(v) => editor.updateLore({ canon: v })}
        placeholder={t('worldEditor.lore.canonPlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />

      <DefaultCreateAgentSectionLabel label={t('worldEditor.lore.coreKnowledge')} />
      <Text style={styles.hint}>{t('worldEditor.lore.coreKnowledgeHint')}</Text>
      <TextInput
        style={styles.input}
        value={core?.title || ''}
        onChangeText={(v) => editor.setCoreKnowledge(v, core?.body || '')}
        placeholder={t('worldEditor.lore.coreTitlePlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        multiline
        value={core?.body || ''}
        onChangeText={(v) => editor.setCoreKnowledge(core?.title || '', v)}
        placeholder={t('worldEditor.lore.coreBodyPlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />
    </View>
  );
}

function CastSection({
  editor,
  t,
}: {
  editor: SimpleWorldEditorState;
  t: (k: string) => string;
}) {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const doc = editor.doc!;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRoles(true);
      try {
        const list = await listAllRoles(50);
        if (!cancelled) setRoles(list.filter((r) => r.is_owner !== false));
      } catch {
        if (!cancelled) setRoles([]);
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const available = roles.filter((r) => !doc.cast.some((c) => c.role_id === r.id));

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>{t('worldEditor.cast.hint')}</Text>

      {doc.cast.map((c) => (
        <View key={c.cast_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{c.name}</Text>
            <Pressable onPress={() => editor.removeCast(c.cast_id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={TOKENS.colors.textMuted} />
            </Pressable>
          </View>
          {c.role_id ? <Text style={styles.meta}>Agent · {c.role_id.slice(0, 10)}…</Text> : null}
          <View style={styles.castActions}>
            <Pressable
              onPress={() => editor.togglePlayable(c.cast_id, !c.is_playable)}
              style={[styles.miniChip, c.is_playable && styles.miniChipOn]}
            >
              <Text style={[styles.miniChipText, c.is_playable && styles.miniChipTextOn]}>
                {t('worldEditor.cast.playable')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => editor.setDefaultPlayable(c.cast_id)}
              style={[
                styles.miniChip,
                doc.default_player_cast_id === c.cast_id && styles.miniChipOn,
              ]}
            >
              <Text
                style={[
                  styles.miniChipText,
                  doc.default_player_cast_id === c.cast_id && styles.miniChipTextOn,
                ]}
              >
                {t('worldEditor.cast.default')}
              </Text>
            </Pressable>
          </View>
        </View>
      ))}

      {doc.cast.length === 0 ? (
        <Text style={styles.muted}>{t('worldEditor.cast.empty')}</Text>
      ) : null}

      <Pressable onPress={() => setPickerOpen((v) => !v)} style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>
          {pickerOpen ? t('worldEditor.cast.hidePicker') : t('worldEditor.cast.addFromAgent')}
        </Text>
      </Pressable>

      {pickerOpen ? (
        <View style={styles.picker}>
          {loadingRoles ? <ActivityIndicator color={TOKENS.colors.accent} /> : null}
          {!loadingRoles && available.length === 0 ? (
            <Text style={styles.muted}>{t('worldEditor.cast.noAgents')}</Text>
          ) : null}
          {available.map((r) => (
            <Pressable
              key={r.id}
              style={styles.pickerRow}
              onPress={() => {
                editor.addRoleCast({
                  id: r.id,
                  name: r.name,
                  figure_url: r.figure_url,
                  avatar_url: r.avatar_url,
                  introduction: r.introduction || r.scene_name,
                });
              }}
            >
              <Text style={styles.pickerName}>{r.name}</Text>
              <Ionicons name="add-circle-outline" size={20} color={TOKENS.colors.accent} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LevelsSection({
  editor,
  worldId,
  t,
}: {
  editor: SimpleWorldEditorState;
  worldId: string;
  t: (k: string) => string;
}) {
  const doc = editor.doc!;
  const [expanded, setExpanded] = useState<string | null>(doc.levels[0]?.code || null);
  const [bgUploading, setBgUploading] = useState<string | null>(null);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [overCode, setOverCode] = useState<string | null>(null);
  const linear = isLinearLevelTopology(doc);
  const cardRefs = useRef<Record<string, View | null>>({});
  const layoutsRef = useRef<{ code: string; y: number; h: number }[]>([]);
  const dragFromRef = useRef<string | null>(null);

  const reorderTo = useCallback(
    (fromCode: string, toCode: string) => {
      if (!linear || fromCode === toCode) return;
      const codes = doc.levels.map((l) => l.code);
      const from = codes.indexOf(fromCode);
      const to = codes.indexOf(toCode);
      if (from < 0 || to < 0) return;
      const next = [...codes];
      next.splice(from, 1);
      next.splice(to, 0, fromCode);
      editor.reorderLevels(next);
    },
    [doc.levels, editor, linear],
  );

  const measureCards = useCallback(() => {
    const codes = doc.levels.map((l) => l.code);
    const collected: { code: string; y: number; h: number }[] = [];
    let left = codes.length;
    if (!left) {
      layoutsRef.current = [];
      return;
    }
    codes.forEach((code) => {
      const node = cardRefs.current[code];
      if (!node || typeof node.measureInWindow !== 'function') {
        left -= 1;
        if (left <= 0) layoutsRef.current = collected.sort((a, b) => a.y - b.y);
        return;
      }
      node.measureInWindow((_x, y, _w, h) => {
        collected.push({ code, y, h: Math.max(h, 1) });
        left -= 1;
        if (left <= 0) layoutsRef.current = collected.sort((a, b) => a.y - b.y);
      });
    });
  }, [doc.levels]);

  const hitCodeAtY = (pageY: number) => {
    const layouts = layoutsRef.current;
    if (!layouts.length) return null;
    for (const L of layouts) {
      if (pageY >= L.y && pageY <= L.y + L.h) return L.code;
    }
    // Clamp to nearest card when pointer is between gaps / outside.
    let best = layouts[0];
    let bestDist = Math.abs(pageY - (best.y + best.h / 2));
    for (const L of layouts) {
      const d = Math.abs(pageY - (L.y + L.h / 2));
      if (d < bestDist) {
        best = L;
        bestDist = d;
      }
    }
    return best.code;
  };

  const endDrag = (pageY: number) => {
    const from = dragFromRef.current;
    const to = hitCodeAtY(pageY);
    if (from && to) reorderTo(from, to);
    dragFromRef.current = null;
    setDragCode(null);
    setOverCode(null);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>
        {linear ? t('worldEditor.levels.hintDrag') : t('worldEditor.levels.hint')}
      </Text>
      {!linear && !IOS_WORLD_BASIC_ONLY ? (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>{t('worldEditor.levels.branchReadonly')}</Text>
          <Pressable onPress={() => void editor.enterCanvasMode()}>
            <Text style={styles.warnLink}>{t('worldEditor.overview.switchAdvanced')}</Text>
          </Pressable>
        </View>
      ) : null}

      {doc.levels.map((lv, index) => {
        const open = expanded === lv.code;
        const scene = sceneForLevel(doc, lv.code);
        const dragging = dragCode === lv.code;
        const dropTarget = !!(overCode === lv.code && dragCode && dragCode !== lv.code);
        return (
          <View
            key={lv.code}
            ref={(el) => {
              cardRefs.current[lv.code] = el;
            }}
            {...(Platform.OS === 'web'
              ? ({ dataSet: { levelCode: lv.code } } as object)
              : null)}
            style={[
              styles.card,
              dragging && styles.cardDragging,
              dropTarget && styles.cardDropTarget,
            ]}
          >
            <View style={styles.cardHeader}>
              {linear ? (
                Platform.OS === 'web' ? (
                  React.createElement(
                    'div',
                    {
                      style: {
                        width: 36,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 2,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)',
                        cursor: dragCode ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        touchAction: 'none',
                      },
                      onPointerDown: (e: {
                        pointerId: number;
                        clientY: number;
                        preventDefault: () => void;
                        currentTarget: { setPointerCapture: (id: number) => void };
                      }) => {
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        dragFromRef.current = lv.code;
                        setDragCode(lv.code);
                        setExpanded(null);
                        // Sync DOM rects immediately (no async measure race).
                        const nodes = document.querySelectorAll('[data-level-code]');
                        const collected: { code: string; y: number; h: number }[] = [];
                        nodes.forEach((n) => {
                          const code = (n as HTMLElement).getAttribute('data-level-code');
                          if (!code) return;
                          const r = (n as HTMLElement).getBoundingClientRect();
                          collected.push({ code, y: r.top, h: r.height });
                        });
                        layoutsRef.current = collected.sort((a, b) => a.y - b.y);
                        setOverCode(hitCodeAtY(e.clientY));
                      },
                      onPointerMove: (e: { clientY: number }) => {
                        if (!dragFromRef.current) return;
                        const hit = hitCodeAtY(e.clientY);
                        if (hit) setOverCode(hit);
                      },
                      onPointerUp: (e: { clientY: number }) => endDrag(e.clientY),
                      onPointerCancel: (e: { clientY: number }) => endDrag(e.clientY),
                    },
                    React.createElement(Ionicons, {
                      name: 'menu',
                      size: 18,
                      color: TOKENS.colors.textMuted,
                    }),
                  )
                ) : (
                  <View
                    style={styles.dragHandle}
                    hitSlop={8}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderTerminationRequest={() => false}
                    onResponderGrant={(e) => {
                      dragFromRef.current = lv.code;
                      setDragCode(lv.code);
                      setExpanded(null);
                      measureCards();
                      setOverCode(hitCodeAtY(e.nativeEvent.pageY));
                    }}
                    onResponderMove={(e) => {
                      if (!dragFromRef.current) return;
                      if (layoutsRef.current.length < doc.levels.length) measureCards();
                      const hit = hitCodeAtY(e.nativeEvent.pageY);
                      if (hit) setOverCode(hit);
                    }}
                    onResponderRelease={(e) => endDrag(e.nativeEvent.pageY)}
                    onResponderTerminate={(e) => endDrag(e.nativeEvent.pageY)}
                  >
                    <Ionicons name="menu" size={18} color={TOKENS.colors.textMuted} />
                  </View>
                )
              ) : null}
              <Pressable
                style={{ flex: 1, minWidth: 0 }}
                onPress={() => setExpanded(open ? null : lv.code)}
              >
                <Text style={styles.cardTitle}>
                  {index + 1}. {lv.title}
                  {lv.is_start ? ` · ${t('worldEditor.levels.start')}` : ''}
                </Text>
                <Text style={styles.meta}>{lv.code}</Text>
              </Pressable>
              {linear ? (
                <View style={styles.reorderCol}>
                  <Pressable
                    onPress={() => editor.moveLevel(lv.code, -1)}
                    hitSlop={6}
                    disabled={index === 0}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={16}
                      color={index === 0 ? TOKENS.colors.textMuted : TOKENS.colors.text}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => editor.moveLevel(lv.code, 1)}
                    hitSlop={6}
                    disabled={index === doc.levels.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={
                        index === doc.levels.length - 1
                          ? TOKENS.colors.textMuted
                          : TOKENS.colors.text
                      }
                    />
                  </Pressable>
                </View>
              ) : null}
              <Pressable onPress={() => setExpanded(open ? null : lv.code)} hitSlop={8}>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={TOKENS.colors.textMuted}
                />
              </Pressable>
            </View>

            {open ? (
              <View style={styles.levelBody}>
                <DefaultCreateAgentSectionLabel label={t('worldEditor.levels.levelTitle')} />
                <TextInput
                  style={styles.input}
                  value={lv.title}
                  onChangeText={(v) => editor.updateLevel(lv.code, { title: v })}
                />

                <DefaultCreateAgentSectionLabel label={t('worldEditor.levels.synopsis')} />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                  value={lv.synopsis || ''}
                  onChangeText={(v) => editor.updateLevel(lv.code, { synopsis: v })}
                />

                <DefaultCreateAgentSectionLabel label={t('worldEditor.levels.background')} />
                {scene?.background_image ? (
                  <Image
                    source={{ uri: resolveStaticUrl(scene.background_image) }}
                    style={styles.bgPreview}
                    contentFit="cover"
                  />
                ) : null}
                <Pressable
                  style={styles.secondaryBtn}
                  disabled={!!bgUploading || !worldId}
                  onPress={() => {
                    void (async () => {
                      try {
                        const picked = await pickWorldEditorImage('background');
                        if (!picked || !worldId) return;
                        setBgUploading(lv.code);
                        const resp = await uploadWorldAsset(
                          worldId,
                          'background',
                          picked.file,
                          picked.filename,
                        );
                        editor.updateLevelScene(lv, { background_image: resp.url });
                      } catch (e) {
                        notifyWorldUploadError(e, t);
                      } finally {
                        setBgUploading(null);
                      }
                    })();
                  }}
                >
                  {bgUploading === lv.code ? (
                    <ActivityIndicator color={TOKENS.colors.accent} size="small" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>
                      {scene?.background_image
                        ? t('worldEditor.levels.replaceBackground')
                        : t('worldEditor.levels.uploadBackground')}
                    </Text>
                  )}
                </Pressable>

                <DefaultCreateAgentSectionLabel label={t('worldEditor.levels.opening')} />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                  value={scene?.opening || ''}
                  onChangeText={(v) => editor.updateLevelScene(lv, { opening: v })}
                />

                <DefaultCreateAgentSectionLabel label={t('worldEditor.levels.playGoal')} />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                  value={scene?.play_goal || ''}
                  onChangeText={(v) => editor.updateLevelScene(lv, { play_goal: v })}
                />

                <DefaultCreateAgentSectionLabel label={t('worldEditor.levels.leadCast')} />
                <Text style={styles.hint}>{t('worldEditor.levels.leadCastHint')}</Text>
                <View style={styles.ratingRow}>
                  {doc.cast.map((c) => {
                    const active = scene?.lead_cast_id === c.cast_id;
                    return (
                      <Pressable
                        key={c.cast_id}
                        onPress={() => {
                          const present = new Set(scene?.present_cast_ids || []);
                          present.add(c.cast_id);
                          editor.updateLevelScene(lv, {
                            lead_cast_id: c.cast_id,
                            present_cast_ids: Array.from(present),
                          });
                        }}
                        style={[styles.ratingChip, active && styles.ratingChipOn]}
                      >
                        <Text style={[styles.ratingText, active && styles.ratingTextOn]}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                  {doc.cast.length === 0 ? (
                    <Text style={styles.muted}>{t('worldEditor.levels.needCast')}</Text>
                  ) : null}
                </View>

                <DefaultCreateAgentSectionLabel label={t('worldEditor.levels.presentCast')} />
                <View style={styles.ratingRow}>
                  {doc.cast.map((c) => {
                    const active = (scene?.present_cast_ids || []).includes(c.cast_id);
                    return (
                      <Pressable
                        key={c.cast_id}
                        onPress={() => {
                          const set = new Set(scene?.present_cast_ids || []);
                          if (set.has(c.cast_id)) set.delete(c.cast_id);
                          else set.add(c.cast_id);
                          editor.updateLevelScene(lv, { present_cast_ids: Array.from(set) });
                        }}
                        style={[styles.ratingChip, active && styles.ratingChipOn]}
                      >
                        <Text style={[styles.ratingText, active && styles.ratingTextOn]}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {doc.levels.length > 1 ? (
                  <Pressable
                    onPress={() => editor.deleteLevel(lv.code)}
                    style={styles.dangerBtn}
                  >
                    <Text style={styles.dangerBtnText}>{t('worldEditor.levels.delete')}</Text>
                  </Pressable>
                ) : null}

                <LevelExtrasPanel
                  editor={editor}
                  levelCode={lv.code}
                  worldId={editor.world?.world_id || ''}
                  t={t}
                />
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable onPress={() => editor.addLevel()} style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>{t('worldEditor.levels.add')}</Text>
      </Pressable>

      <DefaultCreateAgentSectionLabel label={t('worldEditor.tabs.map')} />
      <MapPanel editor={editor} t={t} />
    </View>
  );
}

function EndingsSection({
  editor,
  worldId,
  t,
}: {
  editor: SimpleWorldEditorState;
  worldId: string;
  t: (k: string) => string;
}) {
  const doc = editor.doc!;
  const nodes = doc.endings.nodes || [];
  const flags = listHappenedThings(doc);
  const [uploadingEnding, setUploadingEnding] = useState<string | null>(null);

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>{t('worldEditor.endings.hint')}</Text>
      <Pressable
        onPress={() => editor.updateEndingEnabled(!doc.endings.enabled)}
        style={[styles.secondaryBtn, doc.endings.enabled && styles.ratingChipOn]}
      >
        <Text style={styles.secondaryBtnText}>
          {doc.endings.enabled ? t('worldEditor.endings.enabled') : t('worldEditor.endings.disabled')}
        </Text>
      </Pressable>

      {doc.endings.enabled
        ? nodes.map((n) => {
            const cover = n.storyboard?.[0]?.image;
            const selected = new Set(n.require_flags || []);
            return (
              <View key={n.ending_id} style={styles.card}>
                <DefaultCreateAgentSectionLabel label={t('worldEditor.endings.title')} />
                <TextInput
                  style={styles.input}
                  value={n.title}
                  onChangeText={(v) => editor.updateEndingTitle(n.ending_id, v)}
                />

                <DefaultCreateAgentSectionLabel label={t('worldEditor.endings.image')} />
                {cover ? (
                  <Image
                    source={{ uri: resolveStaticUrl(cover) }}
                    style={styles.coverPreview}
                    contentFit="cover"
                  />
                ) : null}
                <Pressable
                  style={styles.secondaryBtn}
                  disabled={!!uploadingEnding || !worldId}
                  onPress={() => {
                    void (async () => {
                      try {
                        const picked = await pickWorldEditorImage('gallery');
                        if (!picked || !worldId) return;
                        setUploadingEnding(n.ending_id);
                        const resp = await uploadWorldAsset(
                          worldId,
                          'gallery',
                          picked.file,
                          picked.filename,
                        );
                        editor.setEndingCover(n.ending_id, resp.url);
                      } catch (e) {
                        notifyWorldUploadError(e, t);
                      } finally {
                        setUploadingEnding(null);
                      }
                    })();
                  }}
                >
                  {uploadingEnding === n.ending_id ? (
                    <ActivityIndicator color={TOKENS.colors.accent} size="small" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>
                      {cover ? t('worldEditor.endings.replaceImage') : t('worldEditor.endings.uploadImage')}
                    </Text>
                  )}
                </Pressable>

                <DefaultCreateAgentSectionLabel label={t('worldEditor.endings.requireFlags')} />
                <Text style={styles.hint}>{t('worldEditor.endings.requireFlagsHint')}</Text>
                <View style={styles.ratingRow}>
                  <Pressable
                    onPress={() => editor.setEndingFlags(n.ending_id, [])}
                    style={[styles.ratingChip, selected.size === 0 && styles.ratingChipOn]}
                  >
                    <Text style={[styles.ratingText, selected.size === 0 && styles.ratingTextOn]}>
                      {t('worldEditor.endings.unconditional')}
                    </Text>
                  </Pressable>
                  {flags.map((f) => {
                    const active = selected.has(f.id);
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => {
                          const next = new Set(selected);
                          if (next.has(f.id)) next.delete(f.id);
                          else next.add(f.id);
                          editor.setEndingFlags(n.ending_id, Array.from(next));
                        }}
                        style={[styles.ratingChip, active && styles.ratingChipOn]}
                      >
                        <Text style={[styles.ratingText, active && styles.ratingTextOn]}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {flags.length === 0 ? (
                  <Text style={styles.muted}>{t('worldEditor.endings.noFlags')}</Text>
                ) : null}

                <DefaultCreateAgentSectionLabel label={t('worldEditor.endings.caption')} />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  multiline
                  value={n.storyboard?.[0]?.caption || ''}
                  onChangeText={(v) => editor.updateEndingCaption(n.ending_id, v)}
                  placeholder={t('worldEditor.endings.captionPlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                />

                {(doc.endings.nodes || []).length > 1 ? (
                  <Pressable onPress={() => editor.deleteEnding(n.ending_id)} style={styles.dangerBtn}>
                    <Text style={styles.dangerBtnText}>{t('worldEditor.endings.delete')}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        : null}

      {doc.endings.enabled ? (
        <Pressable onPress={() => editor.addEnding()} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>{t('worldEditor.endings.add')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', gap: 10, paddingBottom: 28 },
  contentExpert: { flex: 1, paddingBottom: 16, maxWidth: '100%' as unknown as number },
  contentDesktop: {
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: TOKENS.layout.contentPadding,
  },
  contentDesktopWide: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: TOKENS.layout.contentPadding,
    flex: 1,
  },
  contentMobile: { paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  chromeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnSpacer: { width: 36 },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    maxWidth: 360,
    justifyContent: 'center',
  },
  modeBasicOnlyHidden: {
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  modeSegPress: { flex: 1 },
  modeSegOn: {
    height: 31,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSegOff: {
    height: 31,
    borderRadius: 1,
    borderWidth: 1.2,
    borderColor: 'rgba(46,52,66,0.62)',
    backgroundColor: 'rgba(59,62,69,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSegText: Typo({ color: '#d0d0d0', fontSize: 13, fontWeight: '500' }, 'sans'),
  modeSegTextOn: Typo({ color: '#F2F2F4', fontSize: 13, fontWeight: '600' }, 'sans'),
  headingInput: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      fontWeight: '700',
      marginTop: 8,
      paddingVertical: 2,
      paddingHorizontal: 0,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    'serif',
  ),
  codeLine: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 2 },
    'mono',
  ),
  titleDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  titleLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(214,214,214,0.35)' },
  tabRow: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  tabPress: { flex: 1 },
  tab: {
    height: 44,
    borderRadius: 1,
    borderWidth: 1.2,
    borderColor: 'rgba(46,52,66,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    height: 44,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: Typo({ color: '#a7a7a7', fontSize: 13, fontWeight: '700' }, 'sans'),
  tabTextOn: Typo({ color: '#fff', fontSize: 13, fontWeight: '700' }, 'sans'),
  body: { gap: 8, minHeight: 200 },
  section: { gap: 8, marginTop: 4 },
  overviewLabel: Typo(
    {
      color: '#d0d0d0',
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    'sans',
  ),
  checklistCard: {
    borderWidth: 1.4,
    borderColor: '#2b3557',
    borderRadius: 9,
    paddingVertical: 18,
    paddingHorizontal: 14,
    minHeight: 280,
  },
  checklistRail: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  checklistTrack: {
    width: 22,
    alignItems: 'center',
    position: 'relative',
  },
  checklistDash: {
    position: 'absolute',
    left: 10.5,
    top: 10,
    bottom: 10,
    width: 1,
    marginLeft: -0.5,
    borderStyle: 'dashed',
    borderLeftWidth: 1,
    borderColor: 'rgba(242,242,244,0.35)',
  },
  checkDiamondSlot: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  checklistLabels: { flex: 1, minWidth: 0 },
  checkLabelSlot: { justifyContent: 'center' },
  sectionTitle: Typo(
    { color: TOKENS.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
    'serif',
  ),
  hint: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, lineHeight: 18 }, 'sans'),
  muted: Typo({ color: TOKENS.colors.textMuted, fontSize: 13, marginVertical: 8 }, 'sans'),
  checkLabel: Typo({ color: '#7f7f7f', fontSize: 14 }, 'sans'),
  checkLabelOk: { color: '#F2F2F4' },
  dragHandle: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...(Platform.OS === 'web' ? ({ cursor: 'grab', userSelect: 'none' } as object) : null),
  },
  cardDragging: { opacity: 0.55, borderColor: 'rgba(186,60,71,0.55)' },
  cardDropTarget: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.12)',
  },
  footerBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    marginBottom: 8,
  },
  footerBtnPress: { flex: 1 },
  footerBtnSecondary: {
    height: 52,
    borderRadius: 9,
    borderWidth: 1.4,
    borderColor: '#2b3557',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPrimary: {
    height: 52,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondaryText: Typo({ color: TOKENS.colors.text, fontSize: 14, fontWeight: '600' }, 'sans'),
  footerBtnDanger: {
    borderColor: 'rgba(248,113,113,0.45)',
  },
  footerBtnDangerText: Typo({ color: '#f87171', fontSize: 14, fontWeight: '700' }, 'sans'),
  footerBtnPrimaryText: Typo({ color: '#fff', fontSize: 14, fontWeight: '700' }, 'sans'),
  input: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: TOKENS.colors.text,
    backgroundColor: TOKENS.colors.inputBg,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingChip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(8,10,15,0.5)',
  },
  ratingChipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.18)',
  },
  ratingText: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, fontWeight: '600' }, 'sans'),
  ratingTextOn: { color: TOKENS.colors.text },
  card: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    backgroundColor: 'rgba(8,10,15,0.45)',
    padding: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: Typo({ color: TOKENS.colors.text, fontSize: 15, fontWeight: '600', flex: 1 }, 'sans'),
  meta: Typo({ color: TOKENS.colors.textMuted, fontSize: 11 }, 'sans'),
  castActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniChip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniChipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.2)',
  },
  miniChipText: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, fontWeight: '600' }, 'sans'),
  miniChipTextOn: { color: TOKENS.colors.text },
  picker: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    padding: 8,
    gap: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  pickerName: Typo({ color: TOKENS.colors.text, fontSize: 14 }, 'sans'),
  levelBody: { gap: 8, marginTop: 4 },
  primaryBtn: {
    minHeight: 40,
    minWidth: 88,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: Typo({ color: '#fff', fontSize: 13, fontWeight: '700' }, 'sans'),
  secondaryBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8,10,15,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: Typo({ color: TOKENS.colors.text, fontSize: 13, fontWeight: '600' }, 'sans'),
  ghostBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 13 }, 'sans'),
  btnDisabled: { opacity: 0.45 },
  dangerBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dangerBtnText: Typo({ color: TOKENS.colors.accent, fontSize: 13, fontWeight: '600' }, 'sans'),
  coverPreview: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 220,
    borderRadius: TOKENS.radius.card,
    backgroundColor: '#111',
  },
  bgPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: TOKENS.radius.card,
    backgroundColor: '#111',
  },
  reorderCol: { gap: 2, marginRight: 4 },
  warnBanner: {
    borderWidth: 1,
    borderColor: 'rgba(186,60,71,0.45)',
    backgroundColor: 'rgba(186,60,71,0.12)',
    borderRadius: TOKENS.radius.card,
    padding: 12,
    gap: 6,
  },
  warnText: Typo({ color: TOKENS.colors.text, fontSize: 13, lineHeight: 18 }, 'sans'),
  warnLink: Typo({ color: TOKENS.colors.accent, fontSize: 13, fontWeight: '700' }, 'sans'),
});

