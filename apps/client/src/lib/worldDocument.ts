import type {
  ChecklistItem,
  WorldDocumentCast,
  WorldDocumentEvent,
  WorldDocumentLevel,
  WorldDocumentScene,
  WorldDocumentV1,
} from '../types/worldDocument';

export function emptyDocument(title: string): WorldDocumentV1 {
  return {
    schema_version: '1',
    identity: {
      title: title.trim() || 'Untitled World',
      content_rating: 'standard',
      canonical_lang: 'en',
      supported_langs: ['en', 'zh', 'jp', 'ru', 'es'],
    },
    lore: { knowledge: [] },
    cast: [],
    entries: { enabled: ['level_list'], primary: 'level_list' },
    levels: [],
    scenes: [],
    events: [],
    gallery: [],
    endings: { enabled: false, nodes: [] },
  };
}

/** Parse draft document from API (may arrive as object or already typed). */
export function normalizeDocument(raw: unknown, fallbackTitle = 'Untitled World'): WorldDocumentV1 {
  if (!raw || typeof raw !== 'object') {
    return emptyDocument(fallbackTitle);
  }
  const doc = raw as WorldDocumentV1;
  return {
    schema_version: doc.schema_version || '1',
    identity: {
      title: doc.identity?.title || fallbackTitle,
      tagline: doc.identity?.tagline || '',
      content_rating: doc.identity?.content_rating || 'standard',
      cover_image: doc.identity?.cover_image || '',
      tags: Array.isArray(doc.identity?.tags) ? [...doc.identity.tags] : [],
      canonical_lang: doc.identity?.canonical_lang || 'en',
      supported_langs: Array.isArray(doc.identity?.supported_langs)
        ? [...doc.identity.supported_langs]
        : ['en', 'zh', 'jp', 'ru', 'es'],
    },
    lore: {
      canon: doc.lore?.canon || '',
      knowledge: Array.isArray(doc.lore?.knowledge) ? doc.lore.knowledge.map((k) => ({ ...k })) : [],
    },
    cast: Array.isArray(doc.cast) ? doc.cast.map((c) => ({ ...c })) : [],
    default_player_cast_id: doc.default_player_cast_id || '',
    entries: {
      enabled: Array.isArray(doc.entries?.enabled) ? [...doc.entries.enabled] : ['level_list'],
      primary: doc.entries?.primary || 'level_list',
      map_image: doc.entries?.map_image || '',
    },
    levels: Array.isArray(doc.levels) ? doc.levels.map((l) => ({ ...l })) : [],
    scenes: Array.isArray(doc.scenes) ? doc.scenes.map((s) => ({ ...s })) : [],
    events: Array.isArray(doc.events) ? doc.events.map((e) => ({ ...e })) : [],
    gallery: Array.isArray(doc.gallery) ? doc.gallery.map((g) => ({ ...g })) : [],
    endings: {
      enabled: !!doc.endings?.enabled,
      nodes: Array.isArray(doc.endings?.nodes) ? doc.endings.nodes.map((n) => ({ ...n })) : [],
    },
    i18n: doc.i18n,
  };
}

/** Suggest a world code from title (latin) or a random fallback. */
export function suggestWorldCode(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  if (/^[a-z][a-z0-9_]{2,63}$/.test(slug)) {
    return slug.slice(0, 64);
  }
  const tail = Date.now().toString(36).slice(-6);
  return `world_${tail}`;
}

export function isValidWorldCode(code: string): boolean {
  return /^[a-z][a-z0-9_]{2,63}$/.test(code.trim());
}

export function sceneForLevel(doc: WorldDocumentV1, levelCode: string): WorldDocumentScene | undefined {
  return doc.scenes.find((s) => s.level_code === levelCode);
}

export function upsertSceneForLevel(
  doc: WorldDocumentV1,
  level: WorldDocumentLevel,
  patch: Partial<WorldDocumentScene>,
): WorldDocumentV1 {
  const sceneCode = level.linked_scene || `sc_${level.code.replace(/^lv_/, '')}`;
  const existing = doc.scenes.find((s) => s.level_code === level.code || s.code === sceneCode);
  const nextScene: WorldDocumentScene = {
    code: existing?.code || sceneCode,
    title: patch.title ?? existing?.title ?? `${level.title}场景`,
    level_code: level.code,
    background_image: patch.background_image ?? existing?.background_image,
    lead_cast_id: patch.lead_cast_id ?? existing?.lead_cast_id,
    present_cast_ids: patch.present_cast_ids ?? existing?.present_cast_ids,
    opening: patch.opening ?? existing?.opening,
    play_goal: patch.play_goal ?? existing?.play_goal,
  };
  const scenes = existing
    ? doc.scenes.map((s) => (s.code === existing.code ? nextScene : s))
    : [...doc.scenes, nextScene];
  const levels = doc.levels.map((l) =>
    l.code === level.code ? { ...l, linked_scene: nextScene.code } : l,
  );
  return { ...doc, scenes, levels };
}

export function addLinearLevel(doc: WorldDocumentV1, title?: string): WorldDocumentV1 {
  const idx = doc.levels.length + 1;
  const code = `lv_${idx}_${Date.now().toString(36).slice(-4)}`;
  const sceneCode = `sc_${code.replace(/^lv_/, '')}`;
  const prev = doc.levels[doc.levels.length - 1];
  const level: WorldDocumentLevel = {
    code,
    title: title?.trim() || `关卡 ${idx}`,
    synopsis: '',
    linked_scene: sceneCode,
    is_start: doc.levels.length === 0,
    unlock_from: prev ? [prev.code] : undefined,
  };
  const scene: WorldDocumentScene = {
    code: sceneCode,
    title: `${level.title}场景`,
    level_code: code,
    opening: '',
    play_goal: '',
  };
  const events = [...doc.events];
  if (prev) {
    events.push({
      event_id: `ev_clear_${prev.code}`,
      level_code: prev.code,
      trigger: `level_clear:${prev.code}`,
      effects: { unlock_levels: [code] },
    });
  }
  return {
    ...doc,
    levels: [...doc.levels, level],
    scenes: [...doc.scenes, scene],
    events,
  };
}

export function reorderLevelsLinear(doc: WorldDocumentV1, orderedCodes: string[]): WorldDocumentV1 {
  const byCode = new Map(doc.levels.map((l) => [l.code, l]));
  const levels: WorldDocumentLevel[] = [];
  for (let i = 0; i < orderedCodes.length; i++) {
    const code = orderedCodes[i];
    const src = byCode.get(code);
    if (!src) continue;
    levels.push({
      ...src,
      is_start: i === 0,
      unlock_from: i === 0 ? undefined : [orderedCodes[i - 1]],
    });
  }
  // Rebuild clear→unlock chain for consecutive pairs.
  const keep = doc.events.filter((e) => !String(e.trigger || '').startsWith('level_clear:'));
  const chain = levels.slice(0, -1).map((lv, i) => ({
    event_id: `ev_clear_${lv.code}`,
    level_code: lv.code,
    trigger: `level_clear:${lv.code}`,
    effects: { unlock_levels: [levels[i + 1].code] },
  }));
  return { ...doc, levels, events: [...keep, ...chain] };
}

export function removeLevel(doc: WorldDocumentV1, levelCode: string): WorldDocumentV1 {
  const remaining = doc.levels.filter((l) => l.code !== levelCode).map((l) => l.code);
  const trimmed: WorldDocumentV1 = {
    ...doc,
    levels: doc.levels.filter((l) => l.code !== levelCode),
    scenes: doc.scenes.filter((s) => s.level_code !== levelCode),
    events: doc.events.filter(
      (e) =>
        e.level_code !== levelCode &&
        !String(e.trigger || '').includes(levelCode) &&
        !JSON.stringify(e.effects || {}).includes(levelCode),
    ),
  };
  return remaining.length ? reorderLevelsLinear(trimmed, remaining) : trimmed;
}

export function setCastPlayable(
  doc: WorldDocumentV1,
  castId: string,
  playable: boolean,
  asDefault?: boolean,
): WorldDocumentV1 {
  const cast = doc.cast.map((c) =>
    c.cast_id === castId ? { ...c, is_playable: playable } : c,
  );
  let defaultId = doc.default_player_cast_id;
  if (asDefault && playable) {
    defaultId = castId;
  } else if (defaultId === castId && !playable) {
    defaultId = cast.find((c) => c.is_playable)?.cast_id || '';
  }
  return { ...doc, cast, default_player_cast_id: defaultId };
}

export function addCastFromRole(
  doc: WorldDocumentV1,
  role: { id: string; name: string; figure_url?: string; avatar_url?: string; introduction?: string },
): WorldDocumentV1 {
  if (doc.cast.some((c) => c.role_id === role.id)) {
    return doc;
  }
  const castId = `cast_${role.id.replace(/[^a-zA-Z0-9]/g, '').slice(-10) || Date.now().toString(36)}`;
  const next: WorldDocumentCast = {
    cast_id: castId,
    role_id: role.id,
    name: role.name,
    world_identity: role.introduction || '',
    figure_image: role.figure_url || '',
    avatar_image: role.avatar_url || '',
    is_playable: doc.cast.length === 0,
  };
  return {
    ...doc,
    cast: [...doc.cast, next],
    default_player_cast_id:
      doc.default_player_cast_id || (next.is_playable ? castId : doc.default_player_cast_id),
  };
}

export function buildSimpleChecklist(doc: WorldDocumentV1): ChecklistItem[] {
  const coreKnowledge = (doc.lore.knowledge || []).filter((k) => k.importance === 'core' || !k.importance);
  const playable = doc.cast.filter((c) => c.is_playable);
  const startLevel = doc.levels.find((l) => l.is_start) || doc.levels[0];
  const startScene = startLevel ? sceneForLevel(doc, startLevel.code) : undefined;
  const hasClearEvent = doc.events.some((e) => String(e.trigger || '').startsWith('level_clear:'));
  const hasGallery = (doc.gallery || []).length > 0;
  const entriesOk =
    (doc.entries.enabled || []).length > 0 && !!(doc.entries.primary || (doc.entries.enabled || [])[0]);

  return [
    {
      id: 'identity',
      labelKey: 'worldEditor.checklist.identity',
      ok: !!(
        doc.identity.title &&
        doc.identity.tagline &&
        doc.identity.content_rating &&
        doc.identity.cover_image
      ),
    },
    {
      id: 'lore',
      labelKey: 'worldEditor.checklist.lore',
      ok: !!(doc.lore.canon && coreKnowledge.length >= 1),
    },
    {
      id: 'cast',
      labelKey: 'worldEditor.checklist.cast',
      ok: playable.length >= 1 && !!doc.default_player_cast_id,
    },
    {
      id: 'entries',
      labelKey: 'worldEditor.checklist.entries',
      ok: entriesOk,
    },
    {
      id: 'levels',
      labelKey: 'worldEditor.checklist.levels',
      ok: !!startLevel && !!startScene?.lead_cast_id,
    },
    {
      id: 'clear',
      labelKey: 'worldEditor.checklist.clear',
      ok: hasClearEvent || doc.levels.length <= 1,
    },
    {
      id: 'gallery',
      labelKey: 'worldEditor.checklist.gallery',
      ok: hasGallery,
    },
    {
      id: 'endings',
      labelKey: 'worldEditor.checklist.endings',
      ok: !doc.endings.enabled || (doc.endings.nodes || []).length >= 1,
    },
  ];
}

export type CgTriggerPreset = 'enter_level' | 'level_clear' | 'intent' | 'flag';

export type LevelCgCard = {
  gallery_id: string;
  title: string;
  image_path?: string;
  content_rating?: string;
  trigger: CgTriggerPreset;
  keywords?: string;
  require_flag?: string;
  event_id: string;
};

export type HappenedThing = {
  id: string;
  label: string;
  level_code?: string;
  trigger: CgTriggerPreset;
  keywords?: string;
  event_id: string;
};

function effectsObj(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

function parseTriggerPreset(trigger?: string): {
  kind: CgTriggerPreset;
  levelCode?: string;
  keywords?: string;
  flagId?: string;
} {
  const s = String(trigger || '');
  if (s.startsWith('enter_level:')) {
    return { kind: 'enter_level', levelCode: s.slice('enter_level:'.length) };
  }
  if (s.startsWith('level_clear:')) {
    return { kind: 'level_clear', levelCode: s.slice('level_clear:'.length) };
  }
  if (s.startsWith('flag:')) {
    return { kind: 'flag', flagId: s.slice('flag:'.length) };
  }
  if (s.startsWith('intent:')) {
    return { kind: 'intent', keywords: s.slice('intent:'.length).replace(/\|/g, ', ') };
  }
  return { kind: 'level_clear' };
}

function serializeTrigger(kind: CgTriggerPreset, levelCode: string, keywords?: string, flagId?: string): string {
  switch (kind) {
    case 'enter_level':
      return `enter_level:${levelCode}`;
    case 'flag':
      return `flag:${flagId || ''}`;
    case 'intent':
      return `intent:${(keywords || '')
        .split(/[,|，]/)
        .map((w) => w.trim())
        .filter(Boolean)
        .join('|')}`;
    case 'level_clear':
    default:
      return `level_clear:${levelCode}`;
  }
}

export function listLevelCgCards(doc: WorldDocumentV1, levelCode: string): LevelCgCard[] {
  const out: LevelCgCard[] = [];
  for (const ev of doc.events) {
    const fx = effectsObj(ev.effects);
    const ids = Array.isArray(fx.unlock_gallery) ? fx.unlock_gallery.map(String) : [];
    if (!ids.length) continue;
    const parsed = parseTriggerPreset(ev.trigger);
    const scoped =
      ev.level_code === levelCode ||
      parsed.levelCode === levelCode ||
      (parsed.kind === 'intent' && ev.level_code === levelCode);
    if (!scoped && parsed.kind !== 'flag') continue;
    if (parsed.kind !== 'flag' && parsed.levelCode && parsed.levelCode !== levelCode && ev.level_code !== levelCode) {
      continue;
    }
    for (const gid of ids) {
      const g = doc.gallery.find((item) => item.gallery_id === gid);
      if (!g) continue;
      const cond = effectsObj(ev.conditions);
      const req = Array.isArray(cond.require_flags) ? String(cond.require_flags[0] || '') : '';
      out.push({
        gallery_id: gid,
        title: g.title,
        image_path: g.image_path,
        content_rating: g.content_rating,
        trigger: parsed.kind,
        keywords: parsed.keywords,
        require_flag: req || undefined,
        event_id: ev.event_id,
      });
    }
  }
  return out;
}

export function upsertLevelCg(
  doc: WorldDocumentV1,
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
): WorldDocumentV1 {
  const galleryId = card.gallery_id || `cg_${Date.now().toString(36)}`;
  const eventId = `ev_cg_${galleryId}`;
  const gallery = [...doc.gallery];
  const gIdx = gallery.findIndex((g) => g.gallery_id === galleryId);
  const nextG = {
    gallery_id: galleryId,
    title: card.title.trim() || 'CG',
    image_path: card.image_path || '',
    content_rating: card.content_rating || doc.identity.content_rating,
  };
  if (gIdx >= 0) gallery[gIdx] = { ...gallery[gIdx], ...nextG };
  else gallery.push(nextG);

  const trigger = serializeTrigger(card.trigger, levelCode, card.keywords, card.require_flag);
  const conditions = card.require_flag ? { require_flags: [card.require_flag] } : undefined;
  const nextEvent = {
    event_id: eventId,
    level_code: levelCode,
    trigger,
    conditions,
    effects: { unlock_gallery: [galleryId] },
  };
  const events = doc.events.filter((e) => e.event_id !== eventId);
  events.push(nextEvent);
  return { ...doc, gallery, events };
}

export function removeLevelCg(doc: WorldDocumentV1, galleryId: string): WorldDocumentV1 {
  return {
    ...doc,
    gallery: doc.gallery.filter((g) => g.gallery_id !== galleryId),
    events: doc.events.filter((e) => {
      const fx = effectsObj(e.effects);
      const ids = Array.isArray(fx.unlock_gallery) ? fx.unlock_gallery.map(String) : [];
      return !ids.includes(galleryId);
    }),
  };
}

export function listHappenedThings(doc: WorldDocumentV1): HappenedThing[] {
  const out: HappenedThing[] = [];
  const seen = new Set<string>();
  for (const ev of doc.events) {
    const fx = effectsObj(ev.effects);
    const ids = Array.isArray(fx.set_flags) ? fx.set_flags.map(String) : [];
    if (!ids.length) continue;
    const parsed = parseTriggerPreset(ev.trigger);
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        label: String(ev.fail_hint || id),
        level_code: ev.level_code || parsed.levelCode,
        trigger: parsed.kind,
        keywords: parsed.keywords,
        event_id: ev.event_id,
      });
    }
  }
  return out;
}

export function listLevelHappenedThings(doc: WorldDocumentV1, levelCode: string): HappenedThing[] {
  return listHappenedThings(doc).filter((h) => h.level_code === levelCode);
}

export function upsertHappenedThing(
  doc: WorldDocumentV1,
  levelCode: string,
  thing: {
    id?: string;
    label: string;
    trigger: CgTriggerPreset;
    keywords?: string;
  },
): WorldDocumentV1 {
  const id =
    thing.id ||
    `flag_${thing.label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 24) || Date.now().toString(36)}`;
  const eventId = `ev_flag_${id}`;
  const trigger = serializeTrigger(thing.trigger, levelCode, thing.keywords, id);
  const nextEvent = {
    event_id: eventId,
    level_code: levelCode,
    trigger,
    effects: { set_flags: [id] },
    fail_hint: thing.label.trim() || id,
    fail_hint_visible: false,
  };
  const events = doc.events.filter((e) => e.event_id !== eventId);
  // Also drop older events that set the same flag.
  const filtered = events.filter((e) => {
    const fx = effectsObj(e.effects);
    const ids = Array.isArray(fx.set_flags) ? fx.set_flags.map(String) : [];
    return !ids.includes(id);
  });
  filtered.push(nextEvent);
  return { ...doc, events: filtered };
}

export function removeHappenedThing(doc: WorldDocumentV1, flagId: string): WorldDocumentV1 {
  const endings = {
    ...doc.endings,
    nodes: (doc.endings.nodes || []).map((n) => ({
      ...n,
      require_flags: (n.require_flags || []).filter((f) => f !== flagId),
    })),
  };
  return {
    ...doc,
    endings,
    events: doc.events.filter((e) => {
      const fx = effectsObj(e.effects);
      const ids = Array.isArray(fx.set_flags) ? fx.set_flags.map(String) : [];
      return !ids.includes(flagId);
    }),
  };
}

export function setEndingRequireFlags(
  doc: WorldDocumentV1,
  endingId: string,
  flags: string[],
): WorldDocumentV1 {
  return {
    ...doc,
    endings: {
      ...doc.endings,
      nodes: (doc.endings.nodes || []).map((n) =>
        n.ending_id === endingId ? { ...n, require_flags: flags } : n,
      ),
    },
  };
}

export function setEndingImage(doc: WorldDocumentV1, endingId: string, image: string): WorldDocumentV1 {
  return {
    ...doc,
    endings: {
      ...doc.endings,
      nodes: (doc.endings.nodes || []).map((n) => {
        if (n.ending_id !== endingId) return n;
        const slides = n.storyboard?.length
          ? n.storyboard.map((s, i) => (i === 0 ? { ...s, image } : s))
          : [{ slide_id: `slide_${endingId}`, image, caption: n.title }];
        return { ...n, storyboard: slides };
      }),
    },
  };
}

/** Auto-grid map pins for levels (0–100%). */
export function ensureLevelMapLayout(doc: WorldDocumentV1): WorldDocumentV1 {
  return {
    ...doc,
    levels: doc.levels.map((lv, i) => ({
      ...lv,
      map_position: lv.map_position || {
        x: 18 + (i % 4) * 20,
        y: 28 + Math.floor(i / 4) * 22,
      },
    })),
  };
}

export function setMapEntryEnabled(
  doc: WorldDocumentV1,
  enabled: boolean,
  opts?: { asPrimary?: boolean },
): WorldDocumentV1 {
  const enabledSet = new Set(doc.entries.enabled || ['level_list']);
  if (enabled) {
    enabledSet.add('map');
    enabledSet.add('level_list');
  } else {
    enabledSet.delete('map');
    if (enabledSet.size === 0) enabledSet.add('level_list');
  }
  const list = Array.from(enabledSet);
  let primary = doc.entries.primary || 'level_list';
  if (enabled && opts?.asPrimary) primary = 'map';
  if (!enabled && primary === 'map') primary = 'level_list';
  if (!list.includes(primary)) primary = list[0];
  const next = ensureLevelMapLayout({
    ...doc,
    entries: { ...doc.entries, enabled: list, primary },
  });
  return next;
}

export function setPrimaryEntry(doc: WorldDocumentV1, primary: string): WorldDocumentV1 {
  const enabled = new Set(doc.entries.enabled || ['level_list']);
  enabled.add(primary);
  return {
    ...doc,
    entries: { ...doc.entries, enabled: Array.from(enabled), primary },
  };
}

export type BadEndCard = {
  event_id: string;
  hint: string;
  rollback_checkpoint?: string;
  trigger: CgTriggerPreset;
  keywords?: string;
};

export function listLevelBadEnds(doc: WorldDocumentV1, levelCode: string): BadEndCard[] {
  const out: BadEndCard[] = [];
  for (const ev of doc.events) {
    if (ev.level_code && ev.level_code !== levelCode) continue;
    const fx = effectsObj(ev.effects);
    if (typeof fx.bad_end !== 'string' || !fx.bad_end) continue;
    const parsed = parseTriggerPreset(ev.trigger);
    if (parsed.levelCode && parsed.levelCode !== levelCode && ev.level_code !== levelCode) continue;
    out.push({
      event_id: ev.event_id,
      hint: String(fx.bad_end),
      rollback_checkpoint: typeof fx.rollback_checkpoint === 'string' ? fx.rollback_checkpoint : undefined,
      trigger: parsed.kind,
      keywords: parsed.keywords,
    });
  }
  return out;
}

export function upsertBadEnd(
  doc: WorldDocumentV1,
  levelCode: string,
  card: {
    event_id?: string;
    hint: string;
    trigger: CgTriggerPreset;
    keywords?: string;
    rollback_checkpoint?: string;
  },
): WorldDocumentV1 {
  const eventId = card.event_id || `ev_bad_${levelCode}_${Date.now().toString(36).slice(-4)}`;
  const trigger = serializeTrigger(card.trigger, levelCode, card.keywords);
  const effects: Record<string, unknown> = {
    bad_end: card.hint.trim() || 'Bad ending',
  };
  if (card.rollback_checkpoint) effects.rollback_checkpoint = card.rollback_checkpoint;
  else effects.rollback_checkpoint = levelCode; // F26: rollback to this level checkpoint
  const next = {
    event_id: eventId,
    level_code: levelCode,
    trigger,
    effects,
    fail_hint: card.hint.trim(),
    fail_hint_visible: true,
  };
  const events = doc.events.filter((e) => e.event_id !== eventId);
  events.push(next);
  return { ...doc, events };
}

export function removeBadEnd(doc: WorldDocumentV1, eventId: string): WorldDocumentV1 {
  return { ...doc, events: doc.events.filter((e) => e.event_id !== eventId) };
}

/** True when levels form a single-start linear unlock chain (simple editor fully editable). */
export function isLinearLevelTopology(doc: WorldDocumentV1): boolean {
  const levels = doc.levels;
  if (levels.length <= 1) return true;
  const starts = levels.filter((l) => l.is_start || !l.unlock_from?.length);
  if (starts.length !== 1) return false;
  const byCode = new Map(levels.map((l) => [l.code, l]));
  // Each non-start has exactly one unlock_from; no multi-in / multi-out branches.
  const unlockers = new Map<string, string[]>();
  for (const lv of levels) {
    const from = lv.unlock_from || [];
    if (lv.is_start || from.length === 0) continue;
    if (from.length !== 1) return false;
    if (!byCode.has(from[0])) return false;
    const arr = unlockers.get(from[0]) || [];
    arr.push(lv.code);
    unlockers.set(from[0], arr);
  }
  for (const kids of unlockers.values()) {
    if (kids.length > 1) return false;
  }
  return true;
}

export function moveLevel(doc: WorldDocumentV1, levelCode: string, dir: -1 | 1): WorldDocumentV1 {
  const idx = doc.levels.findIndex((l) => l.code === levelCode);
  if (idx < 0) return doc;
  const j = idx + dir;
  if (j < 0 || j >= doc.levels.length) return doc;
  const codes = doc.levels.map((l) => l.code);
  const tmp = codes[idx];
  codes[idx] = codes[j];
  codes[j] = tmp;
  return ensureLevelMapLayout(reorderLevelsLinear(doc, codes));
}

export function setLevelUnlockFrom(
  doc: WorldDocumentV1,
  levelCode: string,
  unlockFrom: string[],
): WorldDocumentV1 {
  return {
    ...doc,
    levels: doc.levels.map((l) => {
      if (l.code !== levelCode) return l;
      const from = unlockFrom.filter((c) => c && c !== levelCode);
      return {
        ...l,
        unlock_from: from.length ? from : undefined,
        is_start: from.length === 0 ? true : false,
      };
    }),
  };
}

export function setEndingCaption(
  doc: WorldDocumentV1,
  endingId: string,
  caption: string,
): WorldDocumentV1 {
  return {
    ...doc,
    endings: {
      ...doc.endings,
      nodes: (doc.endings.nodes || []).map((n) => {
        if (n.ending_id !== endingId) return n;
        const slides = n.storyboard?.length
          ? n.storyboard.map((s, i) => (i === 0 ? { ...s, caption } : s))
          : [{ slide_id: `slide_${endingId}`, image: '', caption }];
        return { ...n, storyboard: slides };
      }),
    },
  };
}

export function addEndingNode(doc: WorldDocumentV1): WorldDocumentV1 {
  const id = `end_${Date.now().toString(36).slice(-5)}`;
  return {
    ...doc,
    endings: {
      enabled: true,
      nodes: [
        ...(doc.endings.nodes || []),
        { ending_id: id, title: `Ending ${(doc.endings.nodes || []).length + 1}`, require_flags: [] },
      ],
    },
  };
}

export function removeEndingNode(doc: WorldDocumentV1, endingId: string): WorldDocumentV1 {
  const nodes = (doc.endings.nodes || []).filter((n) => n.ending_id !== endingId);
  return {
    ...doc,
    endings: { enabled: doc.endings.enabled && nodes.length > 0, nodes },
  };
}

/** —— Flow / advanced event editor (DocumentV1 opaque trigger string + effects object) —— */

export type EventEffectKind =
  | 'unlock_levels'
  | 'bad_end'
  | 'unlock_gallery'
  | 'set_flags'
  | 'narration'
  | 'ending';

export type EventEffectCard = {
  kind: EventEffectKind;
  unlockLevels?: string[];
  badEndHint?: string;
  rollbackCheckpoint?: string;
  galleryIds?: string[];
  flagIds?: string[];
  narration?: string;
  endingId?: string;
};

export type EventTriggerView = {
  kind: CgTriggerPreset;
  levelCode?: string;
  keywords?: string;
  flagId?: string;
};

export function parseEventTrigger(trigger?: string): EventTriggerView {
  return parseTriggerPreset(trigger);
}

export function serializeEventTrigger(
  kind: CgTriggerPreset,
  levelCode: string,
  keywords?: string,
  flagId?: string,
): string {
  return serializeTrigger(kind, levelCode, keywords, flagId);
}

export function parseEventEffects(raw: unknown): EventEffectCard[] {
  const o = effectsObj(raw);
  const out: EventEffectCard[] = [];
  const unlock = Array.isArray(o.unlock_levels) ? o.unlock_levels.map(String).filter(Boolean) : [];
  if (unlock.length) out.push({ kind: 'unlock_levels', unlockLevels: unlock });
  if (typeof o.bad_end === 'string' && o.bad_end) {
    out.push({
      kind: 'bad_end',
      badEndHint: o.bad_end,
      rollbackCheckpoint: typeof o.rollback_checkpoint === 'string' ? o.rollback_checkpoint : undefined,
    });
  }
  const gallery = Array.isArray(o.unlock_gallery) ? o.unlock_gallery.map(String).filter(Boolean) : [];
  if (gallery.length) out.push({ kind: 'unlock_gallery', galleryIds: gallery });
  const flags = Array.isArray(o.set_flags) ? o.set_flags.map(String).filter(Boolean) : [];
  if (flags.length) out.push({ kind: 'set_flags', flagIds: flags });
  if (typeof o.narration === 'string' && o.narration) {
    out.push({ kind: 'narration', narration: o.narration });
  }
  if (typeof o.ending === 'string' && o.ending) {
    out.push({ kind: 'ending', endingId: o.ending });
  }
  return out;
}

export function serializeEventEffects(effects: EventEffectCard[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const e of effects) {
    switch (e.kind) {
      case 'unlock_levels':
        o.unlock_levels = e.unlockLevels ?? [];
        break;
      case 'bad_end':
        o.bad_end = e.badEndHint ?? '';
        if (e.rollbackCheckpoint) o.rollback_checkpoint = e.rollbackCheckpoint;
        break;
      case 'unlock_gallery':
        o.unlock_gallery = e.galleryIds ?? [];
        break;
      case 'set_flags':
        o.set_flags = e.flagIds ?? [];
        break;
      case 'narration':
        o.narration = e.narration ?? '';
        break;
      case 'ending':
        o.ending = e.endingId ?? '';
        break;
    }
  }
  return o;
}

export function eventEffectSummary(
  ef: EventEffectCard,
  doc: WorldDocumentV1,
  flags: HappenedThing[],
): string {
  switch (ef.kind) {
    case 'unlock_levels': {
      const codes = ef.unlockLevels || [];
      if (!codes.length) return '解锁关卡…';
      return codes
        .map((c) => doc.levels.find((l) => l.code === c)?.title || c)
        .join('、');
    }
    case 'unlock_gallery': {
      const ids = ef.galleryIds || [];
      if (!ids.length) return '解锁图鉴…';
      return ids
        .map((id) => (doc.gallery || []).find((g) => g.gallery_id === id)?.title || id)
        .join('、');
    }
    case 'ending': {
      const id = ef.endingId || '';
      if (!id) return '进入结局…';
      return (doc.endings.nodes || []).find((n) => n.ending_id === id)?.title || id;
    }
    case 'set_flags': {
      const ids = ef.flagIds || [];
      if (!ids.length) return '记下这件事…';
      return ids.map((id) => flags.find((f) => f.id === id)?.label || id).join('、');
    }
    case 'bad_end':
      return ef.badEndHint?.trim() || '坏结局';
    case 'narration':
      return ef.narration?.trim() || '旁白';
    default:
      return '';
  }
}

export function eventTriggerSummary(
  trigger: string | undefined,
  doc: WorldDocumentV1,
  flags: HappenedThing[],
): string {
  const t = parseEventTrigger(trigger);
  switch (t.kind) {
    case 'enter_level': {
      const title = doc.levels.find((l) => l.code === t.levelCode)?.title || t.levelCode || '…';
      return `进入「${title}」`;
    }
    case 'level_clear': {
      const title = doc.levels.find((l) => l.code === t.levelCode)?.title || t.levelCode || '…';
      return `通关「${title}」`;
    }
    case 'intent':
      return t.keywords?.trim() ? `提到：${t.keywords}` : '提到某些词';
    case 'flag': {
      const label = flags.find((f) => f.id === t.flagId)?.label || t.flagId || '…';
      return `已发生：${label}`;
    }
    default:
      return String(trigger || '事件');
  }
}

export function addWorldEvent(
  doc: WorldDocumentV1,
  levelCode: string,
  kind: CgTriggerPreset,
  eventId?: string,
): { doc: WorldDocumentV1; eventId: string } {
  const id = eventId || `ev_${kind}_${levelCode}_${Date.now().toString(36).slice(-4)}`;
  const trigger = serializeEventTrigger(kind, levelCode, kind === 'intent' ? '' : undefined, '');
  const next: WorldDocumentEvent = {
    event_id: id,
    level_code: levelCode,
    trigger,
    effects: {},
  };
  return { doc: { ...doc, events: [...doc.events, next] }, eventId: id };
}

export function updateWorldEvent(
  doc: WorldDocumentV1,
  eventId: string,
  patch: {
    level_code?: string;
    trigger?: string;
    effects?: EventEffectCard[] | Record<string, unknown>;
    fail_hint_visible?: boolean;
    fail_hint?: string;
  },
): WorldDocumentV1 {
  return {
    ...doc,
    events: doc.events.map((ev) => {
      if (ev.event_id !== eventId) return ev;
      const effects =
        patch.effects === undefined
          ? ev.effects
          : Array.isArray(patch.effects)
            ? serializeEventEffects(patch.effects)
            : patch.effects;
      return {
        ...ev,
        level_code: patch.level_code !== undefined ? patch.level_code : ev.level_code,
        trigger: patch.trigger !== undefined ? patch.trigger : ev.trigger,
        effects,
        fail_hint_visible:
          patch.fail_hint_visible !== undefined ? patch.fail_hint_visible : ev.fail_hint_visible,
        fail_hint: patch.fail_hint !== undefined ? patch.fail_hint : ev.fail_hint,
      };
    }),
  };
}

export function emptyEffectCard(kind: EventEffectKind, doc: WorldDocumentV1): EventEffectCard {
  switch (kind) {
    case 'unlock_levels':
      return { kind, unlockLevels: [] };
    case 'unlock_gallery':
      return { kind, galleryIds: [] };
    case 'set_flags':
      return { kind, flagIds: [] };
    case 'bad_end':
      return { kind, badEndHint: '', rollbackCheckpoint: '上一存档点' };
    case 'narration':
      return { kind, narration: '' };
    case 'ending':
      return { kind, endingId: (doc.endings.nodes || [])[0]?.ending_id || '' };
  }
}

