import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { getWorld, publishWorld, saveWorldDraft } from '../../api/worldEditor';
import { ApiError } from '../../api/client';
import {
  addCanvasEndingStub,
  addCanvasGalleryStub,
  addIsolatedLevel,
  addUnlockEdge,
  dropFlowLink,
  ensureWorldFlowLayout,
  organizeWorldFlowCanvas,
  removeEventById,
  removeFlowLink,
  removeLevelKeepTopology,
  setEndingCanvasPosition,
  setGalleryCanvasPosition,
  setLevelAsStart,
  setLevelCanvasPosition,
  type FlowEdgeLink,
  type FlowLinkFrom,
  type FlowSelect,
} from '../../lib/worldFlowCanvas';
import {
  addCastFromRole,
  addEndingNode,
  addLinearLevel,
  addWorldEvent,
  buildSimpleChecklist,
  ensureLevelMapLayout,
  moveLevel,
  normalizeDocument,
  removeBadEnd,
  removeEndingNode,
  removeHappenedThing,
  removeLevel,
  removeLevelCg,
  reorderLevelsLinear,
  setCastPlayable,
  setEndingCaption,
  setEndingImage,
  setEndingRequireFlags,
  setLevelUnlockFrom,
  setMapEntryEnabled,
  setPrimaryEntry,
  updateWorldEvent,
  upsertBadEnd,
  upsertHappenedThing,
  upsertLevelCg,
  upsertSceneForLevel,
  type CgTriggerPreset,
  type EventEffectCard,
} from '../../lib/worldDocument';
import type {
  WorldDocumentLevel,
  WorldDocumentScene,
  WorldDocumentV1,
  WorldEditorItem,
  WorldEditorTab,
} from '../../types/worldDocument';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';

export type WorldEditorMode = 'simple' | 'canvas';

type RoleLite = {
  id: string;
  name: string;
  figure_url?: string;
  avatar_url?: string;
  introduction?: string;
};

export function useSimpleWorldEditor(worldId: string) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [world, setWorld] = useState<WorldEditorItem | null>(null);
  const [doc, setDoc] = useState<WorldDocumentV1 | null>(null);
  const [tab, setTab] = useState<WorldEditorTab>('overview');
  const [editorMode, setEditorMode] = useState<WorldEditorMode>('simple');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getWorld(worldId);
      setWorld(resp.world);
      setDoc(normalizeDocument(resp.draft?.document, resp.world.title));
      setDirty(false);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load world';
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [worldId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchDoc = useCallback((updater: (prev: WorldDocumentV1) => WorldDocumentV1) => {
    setDoc((prev) => {
      if (!prev) return prev;
      setDirty(true);
      return updater(prev);
    });
  }, []);

  const checklist = useMemo(() => (doc ? buildSimpleChecklist(doc) : []), [doc]);

  const save = useCallback(async () => {
    if (!doc) return false;
    setSaving(true);
    try {
      const resp = await saveWorldDraft(worldId, doc, doc.identity.title);
      setWorld(resp.world);
      setDoc(normalizeDocument(resp.draft.document, resp.world.title));
      setDirty(false);
      if (resp.warnings?.length) {
        notifyWarning(resp.warnings[0]);
      } else {
        notifySuccess('Saved');
      }
      return true;
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : 'Save failed');
      return false;
    } finally {
      setSaving(false);
    }
  }, [doc, worldId]);

  const publish = useCallback(async () => {
    if (dirty) {
      const ok = await save();
      if (!ok) return false;
    }
    setPublishing(true);
    try {
      const resp = await publishWorld(worldId);
      notifySuccess(resp.status === 'in_review' ? 'Submitted for review' : 'Published');
      await reload();
      return true;
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : 'Publish failed');
      return false;
    } finally {
      setPublishing(false);
    }
  }, [dirty, reload, save, worldId]);

  const updateIdentity = useCallback(
    (patch: Partial<WorldDocumentV1['identity']>) => {
      patchDoc((prev) => ({ ...prev, identity: { ...prev.identity, ...patch } }));
    },
    [patchDoc],
  );

  const updateLore = useCallback(
    (patch: Partial<WorldDocumentV1['lore']>) => {
      patchDoc((prev) => ({ ...prev, lore: { ...prev.lore, ...patch } }));
    },
    [patchDoc],
  );

  const setCoreKnowledge = useCallback(
    (title: string, body: string) => {
      patchDoc((prev) => {
        const knowledge = [...(prev.lore.knowledge || [])];
        const idx = knowledge.findIndex((k) => k.key === 'core_1' || k.importance === 'core');
        const item = {
          key: idx >= 0 ? knowledge[idx].key : 'core_1',
          title: title.trim() || 'Core lore',
          body: body.trim(),
          importance: 'core' as const,
        };
        if (idx >= 0) knowledge[idx] = item;
        else knowledge.unshift(item);
        return { ...prev, lore: { ...prev.lore, knowledge } };
      });
    },
    [patchDoc],
  );

  const addRoleCast = useCallback(
    (role: RoleLite) => {
      patchDoc((prev) => addCastFromRole(prev, role));
    },
    [patchDoc],
  );

  const removeCast = useCallback(
    (castId: string) => {
      patchDoc((prev) => {
        const cast = prev.cast.filter((c) => c.cast_id !== castId);
        const defaultId =
          prev.default_player_cast_id === castId
            ? cast.find((c) => c.is_playable)?.cast_id || ''
            : prev.default_player_cast_id;
        return { ...prev, cast, default_player_cast_id: defaultId };
      });
    },
    [patchDoc],
  );

  const togglePlayable = useCallback(
    (castId: string, playable: boolean) => {
      patchDoc((prev) => setCastPlayable(prev, castId, playable));
    },
    [patchDoc],
  );

  const setDefaultPlayable = useCallback(
    (castId: string) => {
      patchDoc((prev) => setCastPlayable(prev, castId, true, true));
    },
    [patchDoc],
  );

  const addLevel = useCallback(() => {
    patchDoc((prev) => addLinearLevel(prev));
  }, [patchDoc]);

  const deleteLevel = useCallback(
    (levelCode: string) => {
      patchDoc((prev) => removeLevel(prev, levelCode));
    },
    [patchDoc],
  );

  const updateLevel = useCallback(
    (levelCode: string, patch: Partial<WorldDocumentLevel>) => {
      patchDoc((prev) => ({
        ...prev,
        levels: prev.levels.map((l) => (l.code === levelCode ? { ...l, ...patch } : l)),
      }));
    },
    [patchDoc],
  );

  const updateLevelScene = useCallback(
    (level: WorldDocumentLevel, patch: Partial<WorldDocumentScene>) => {
      patchDoc((prev) => upsertSceneForLevel(prev, level, patch));
    },
    [patchDoc],
  );

  const updateEndingEnabled = useCallback(
    (enabled: boolean) => {
      patchDoc((prev) => ({
        ...prev,
        endings: {
          enabled,
          nodes: prev.endings.nodes?.length
            ? prev.endings.nodes
            : enabled
              ? [{ ending_id: 'end_true', title: 'True Ending', require_flags: [] }]
              : [],
        },
      }));
    },
    [patchDoc],
  );

  const updateEndingTitle = useCallback(
    (endingId: string, title: string) => {
      patchDoc((prev) => ({
        ...prev,
        endings: {
          ...prev.endings,
          nodes: (prev.endings.nodes || []).map((n) =>
            n.ending_id === endingId ? { ...n, title } : n,
          ),
        },
      }));
    },
    [patchDoc],
  );

  const upsertCg = useCallback(
    (
      levelCode: string,
      card: {
        gallery_id?: string;
        title: string;
        image_path?: string;
        content_rating?: string;
        trigger: CgTriggerPreset;
        keywords?: string;
        require_flag?: string;
      },
    ) => {
      patchDoc((prev) => upsertLevelCg(prev, levelCode, card));
    },
    [patchDoc],
  );

  const deleteCg = useCallback(
    (galleryId: string) => {
      patchDoc((prev) => removeLevelCg(prev, galleryId));
    },
    [patchDoc],
  );

  const upsertFlag = useCallback(
    (
      levelCode: string,
      thing: { id?: string; label: string; trigger: CgTriggerPreset; keywords?: string },
    ) => {
      patchDoc((prev) => upsertHappenedThing(prev, levelCode, thing));
    },
    [patchDoc],
  );

  const deleteFlag = useCallback(
    (flagId: string) => {
      patchDoc((prev) => removeHappenedThing(prev, flagId));
    },
    [patchDoc],
  );

  const setEndingFlags = useCallback(
    (endingId: string, flags: string[]) => {
      patchDoc((prev) => setEndingRequireFlags(prev, endingId, flags));
    },
    [patchDoc],
  );

  const setEndingCover = useCallback(
    (endingId: string, image: string) => {
      patchDoc((prev) => setEndingImage(prev, endingId, image));
    },
    [patchDoc],
  );

  const setMapEnabled = useCallback(
    (enabled: boolean) => {
      patchDoc((prev) => setMapEntryEnabled(prev, enabled, { asPrimary: false }));
    },
    [patchDoc],
  );

  const setPrimary = useCallback(
    (primary: string) => {
      patchDoc((prev) => setPrimaryEntry(prev, primary));
    },
    [patchDoc],
  );

  const setMapImage = useCallback(
    (url: string) => {
      patchDoc((prev) => ({
        ...prev,
        entries: { ...prev.entries, map_image: url },
      }));
    },
    [patchDoc],
  );

  const resetMapLayout = useCallback(() => {
    patchDoc((prev) =>
      ensureLevelMapLayout({
        ...prev,
        levels: prev.levels.map((l) => ({ ...l, map_position: undefined })),
      }),
    );
  }, [patchDoc]);

  const upsertBad = useCallback(
    (
      levelCode: string,
      card: {
        event_id?: string;
        hint: string;
        trigger: CgTriggerPreset;
        keywords?: string;
        rollback_checkpoint?: string;
      },
    ) => {
      patchDoc((prev) => upsertBadEnd(prev, levelCode, card));
    },
    [patchDoc],
  );

  const deleteBad = useCallback(
    (eventId: string) => {
      patchDoc((prev) => removeBadEnd(prev, eventId));
    },
    [patchDoc],
  );

  const moveLvl = useCallback(
    (levelCode: string, dir: -1 | 1) => {
      patchDoc((prev) => moveLevel(prev, levelCode, dir));
    },
    [patchDoc],
  );

  const reorderLevels = useCallback(
    (orderedCodes: string[]) => {
      patchDoc((prev) => ensureLevelMapLayout(reorderLevelsLinear(prev, orderedCodes)));
    },
    [patchDoc],
  );

  const setUnlockFrom = useCallback(
    (levelCode: string, unlockFrom: string[]) => {
      patchDoc((prev) => setLevelUnlockFrom(prev, levelCode, unlockFrom));
    },
    [patchDoc],
  );

  const updateEndingCaption = useCallback(
    (endingId: string, caption: string) => {
      patchDoc((prev) => setEndingCaption(prev, endingId, caption));
    },
    [patchDoc],
  );

  const addEnding = useCallback(() => {
    patchDoc((prev) => addEndingNode(prev));
  }, [patchDoc]);

  const deleteEnding = useCallback(
    (endingId: string) => {
      patchDoc((prev) => removeEndingNode(prev, endingId));
    },
    [patchDoc],
  );

  const enterCanvasMode = useCallback(async () => {
    if (Platform.OS === 'ios') return false;
    if (dirty) {
      const ok = await save();
      if (!ok) return false;
    }
    patchDoc((prev) => ensureWorldFlowLayout(prev));
    setEditorMode('canvas');
    return true;
  }, [dirty, patchDoc, save]);

  const exitCanvasMode = useCallback(
    (returnTab: WorldEditorTab = 'levels') => {
      setEditorMode('simple');
      setTab(returnTab);
    },
    [],
  );

  const organizeFlow = useCallback(() => {
    patchDoc((prev) => organizeWorldFlowCanvas(prev));
  }, [patchDoc]);

  const moveFlowLevel = useCallback(
    (code: string, x: number, y: number) => {
      patchDoc((prev) => setLevelCanvasPosition(prev, code, x, y));
    },
    [patchDoc],
  );

  const moveFlowGallery = useCallback(
    (id: string, x: number, y: number) => {
      patchDoc((prev) => setGalleryCanvasPosition(prev, id, x, y));
    },
    [patchDoc],
  );

  const moveFlowEnding = useCallback(
    (id: string, x: number, y: number) => {
      patchDoc((prev) => setEndingCanvasPosition(prev, id, x, y));
    },
    [patchDoc],
  );

  const connectFlow = useCallback(
    (from: FlowLinkFrom, to: FlowSelect) => {
      patchDoc((prev) => dropFlowLink(prev, from, to));
    },
    [patchDoc],
  );

  const disconnectFlow = useCallback(
    (link: FlowEdgeLink) => {
      patchDoc((prev) => removeFlowLink(prev, link));
    },
    [patchDoc],
  );

  const addFlowLevel = useCallback(() => {
    patchDoc((prev) => addIsolatedLevel(prev));
  }, [patchDoc]);

  const addFlowGallery = useCallback(() => {
    patchDoc((prev) => addCanvasGalleryStub(prev));
  }, [patchDoc]);

  const addFlowEnding = useCallback(() => {
    patchDoc((prev) => addCanvasEndingStub(prev));
  }, [patchDoc]);

  const linkUnlock = useCallback(
    (from: string, to: string) => {
      patchDoc((prev) => addUnlockEdge(prev, from, to));
    },
    [patchDoc],
  );

  const makeStart = useCallback(
    (code: string) => {
      patchDoc((prev) => setLevelAsStart(prev, code));
    },
    [patchDoc],
  );

  const removeFlowNode = useCallback(
    (sel: FlowSelect) => {
      if (sel.kind === 'level') {
        patchDoc((prev) => removeLevelKeepTopology(prev, sel.code));
      } else if (sel.kind === 'gallery') {
        patchDoc((prev) => removeLevelCg(prev, sel.id));
      } else if (sel.kind === 'ending') {
        patchDoc((prev) => removeEndingNode(prev, sel.id));
      } else if (sel.kind === 'event') {
        patchDoc((prev) => removeEventById(prev, sel.id));
      }
    },
    [patchDoc],
  );

  const addFlowEvent = useCallback(
    (levelCode: string, kind: CgTriggerPreset) => {
      const eventId = `ev_${kind}_${levelCode}_${Date.now().toString(36).slice(-4)}`;
      patchDoc((prev) => addWorldEvent(prev, levelCode, kind, eventId).doc);
      return eventId;
    },
    [patchDoc],
  );

  const updateFlowEvent = useCallback(
    (
      eventId: string,
      patch: {
        level_code?: string;
        trigger?: string;
        effects?: EventEffectCard[] | Record<string, unknown>;
        fail_hint_visible?: boolean;
        fail_hint?: string;
      },
    ) => {
      patchDoc((prev) => updateWorldEvent(prev, eventId, patch));
    },
    [patchDoc],
  );

  const replaceDocument = useCallback(
    (raw: unknown) => {
      const title = world?.title || 'Untitled World';
      setDoc(normalizeDocument(raw, title));
      setDirty(true);
    },
    [world?.title],
  );

  const exportDocumentJson = useCallback(() => {
    if (!doc) return null;
    return JSON.stringify(doc, null, 2);
  }, [doc]);

  return {
    loading,
    saving,
    publishing,
    dirty,
    world,
    doc,
    tab,
    setTab,
    editorMode,
    setEditorMode,
    enterCanvasMode,
    exitCanvasMode,
    error,
    checklist,
    reload,
    save,
    publish,
    updateIdentity,
    updateLore,
    setCoreKnowledge,
    addRoleCast,
    removeCast,
    togglePlayable,
    setDefaultPlayable,
    addLevel,
    deleteLevel,
    updateLevel,
    updateLevelScene,
    updateEndingEnabled,
    updateEndingTitle,
    upsertCg,
    deleteCg,
    upsertFlag,
    deleteFlag,
    setEndingFlags,
    setEndingCover,
    setMapEnabled,
    setPrimaryEntry: setPrimary,
    setMapImage,
    resetMapLayout,
    upsertBadEnd: upsertBad,
    deleteBadEnd: deleteBad,
    moveLevel: moveLvl,
    reorderLevels,
    setUnlockFrom,
    updateEndingCaption,
    addEnding,
    deleteEnding,
    organizeFlow,
    moveFlowLevel,
    moveFlowGallery,
    moveFlowEnding,
    connectFlow,
    disconnectFlow,
    addFlowLevel,
    addFlowGallery,
    addFlowEnding,
    linkUnlock,
    makeStart,
    removeFlowNode,
    addFlowEvent,
    updateFlowEvent,
    replaceDocument,
    exportDocumentJson,
  };
}

export type SimpleWorldEditorState = ReturnType<typeof useSimpleWorldEditor>;
