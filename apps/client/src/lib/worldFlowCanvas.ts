/**
 * World flow canvas helpers — ported from Admin W9 worldDocument layout / link rules.
 * Uses Scene DocumentV1 opaque event effects ({ unlock_levels }, { unlock_gallery }, …).
 */
import type {
  WorldDocumentEvent,
  WorldDocumentV1,
} from '../types/worldDocument';

export type FlowSelect =
  | { kind: 'level'; code: string }
  | { kind: 'event'; id: string }
  | { kind: 'gallery'; id: string }
  | { kind: 'ending'; id: string };

export type FlowLinkFrom = { kind: 'level'; code: string } | { kind: 'event'; id: string };

export type FlowEdgeLink =
  | { type: 'unlock'; fromLevel: string; toLevel: string }
  | { type: 'ev-lv'; fromEvent: string; toLevel: string }
  | { type: 'ev-gal'; fromEvent: string; toGallery: string }
  | { type: 'ev-end'; fromEvent: string; toEnding: string };

function clampCanvas(n: number, lo = 6, hi = 94) {
  return Math.min(hi, Math.max(lo, n));
}

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

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).filter(Boolean);
}

export function eventBelongsToLevel(ev: WorldDocumentEvent, levelCode: string): boolean {
  if (ev.level_code === levelCode) return true;
  const t = String(ev.trigger || '');
  return (
    t === `level_clear:${levelCode}` ||
    t === `enter_level:${levelCode}` ||
    t.startsWith(`level_clear:${levelCode}`) ||
    t.startsWith(`enter_level:${levelCode}`)
  );
}

export function eventsForLevel(doc: WorldDocumentV1, levelCode: string): WorldDocumentEvent[] {
  return doc.events.filter((e) => eventBelongsToLevel(e, levelCode));
}

function levelDepthMap(doc: WorldDocumentV1): Map<string, number> {
  const levels = doc.levels;
  const depth = new Map<string, number>();
  if (!levels.length) return depth;

  const children = new Map<string, Set<string>>();
  const ensure = (code: string) => {
    if (!children.has(code)) children.set(code, new Set());
  };
  for (const lv of levels) {
    ensure(lv.code);
    for (const from of lv.unlock_from ?? []) {
      ensure(from);
      children.get(from)!.add(lv.code);
    }
  }
  for (const ev of doc.events) {
    const fx = effectsObj(ev.effects);
    const unlockLevels = asStringArray(fx.unlock_levels);
    if (!unlockLevels.length) continue;
    let parent = '';
    const t = String(ev.trigger || '');
    if (t.startsWith('level_clear:')) parent = t.slice('level_clear:'.length);
    else if (ev.level_code) parent = ev.level_code;
    if (!parent) continue;
    ensure(parent);
    for (const code of unlockLevels) children.get(parent)!.add(code);
  }

  const start = levels.find((l) => l.is_start) ?? levels[0];
  const queue = [start.code];
  depth.set(start.code, 0);
  while (queue.length) {
    const code = queue.shift()!;
    const d = depth.get(code) ?? 0;
    for (const next of children.get(code) ?? []) {
      const prev = depth.get(next);
      if (prev === undefined || d + 1 < prev) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  for (const lv of levels) {
    if (!depth.has(lv.code)) depth.set(lv.code, 0);
  }
  return depth;
}

function applyLevelColumnLayout(doc: WorldDocumentV1, force: boolean) {
  const levels = doc.levels;
  if (!levels.length) return;
  const depth = levelDepthMap(doc);
  const byDepth = new Map<number, typeof levels>();
  for (const lv of levels) {
    const d = depth.get(lv.code) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(lv);
  }
  for (const group of byDepth.values()) {
    group.sort(
      (a, b) => levels.findIndex((l) => l.code === a.code) - levels.findIndex((l) => l.code === b.code),
    );
  }
  const maxDepth = Math.max(...depth.values(), 0);
  const xLeft = 14;
  const xRight = 52;
  for (const [d, group] of byDepth) {
    group.forEach((lv, i) => {
      if (!force && lv.canvas_position) return;
      const x = maxDepth === 0 ? 30 : xLeft + (d / Math.max(maxDepth, 1)) * (xRight - xLeft);
      const spread = Math.min(16, 70 / Math.max(group.length, 1));
      const y = group.length === 1 ? 48 : 48 + (i - (group.length - 1) / 2) * spread;
      lv.canvas_position = {
        x: clampCanvas(x, 8, 58),
        y: clampCanvas(y, 10, 90),
      };
    });
  }
}

function applyGalleryColumnLayout(doc: WorldDocumentV1, force: boolean) {
  const items = doc.gallery || [];
  if (!items.length) return;
  const n = items.length;
  const cols = n > 16 ? 3 : n > 8 ? 2 : 1;
  const xs = cols === 1 ? [70] : cols === 2 ? [64, 76] : [60, 70, 80];
  const rowCount = Math.ceil(n / cols);
  items.forEach((g, i) => {
    if (!force && g.canvas_position) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const y = rowCount <= 1 ? 50 : 8 + (row / Math.max(rowCount - 1, 1)) * 84;
    g.canvas_position = {
      x: clampCanvas(xs[col] ?? 70, 58, 84),
      y: clampCanvas(y, 6, 94),
    };
  });
}

function applyEndingColumnLayout(doc: WorldDocumentV1, force: boolean) {
  const nodes = doc.endings?.nodes || [];
  if (!nodes.length) return;
  const n = nodes.length;
  nodes.forEach((node, i) => {
    if (!force && node.canvas_position) return;
    const y = n === 1 ? 50 : 18 + (i / Math.max(n - 1, 1)) * 64;
    node.canvas_position = {
      x: clampCanvas(90, 86, 94),
      y: clampCanvas(y, 10, 90),
    };
  });
}

export function ensureLevelCanvasLayout(doc: WorldDocumentV1): WorldDocumentV1 {
  const next = cloneDoc(doc);
  const levels = next.levels;
  if (!levels.length) return next;
  const missing = levels.filter((l) => !l.canvas_position);
  if (!missing.length) {
    const xs = levels.map((l) => l.canvas_position!.x);
    const ys = levels.map((l) => l.canvas_position!.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    if (cx < 28 && cy < 28) {
      const dx = 50 - cx;
      const dy = 50 - cy;
      for (const lv of levels) {
        lv.canvas_position = {
          x: Math.min(92, Math.max(8, lv.canvas_position!.x + dx)),
          y: Math.min(92, Math.max(8, lv.canvas_position!.y + dy)),
        };
      }
    }
    return next;
  }
  applyLevelColumnLayout(next, false);
  return next;
}

export function ensureAssetCanvasLayout(doc: WorldDocumentV1): WorldDocumentV1 {
  const next = cloneDoc(doc);
  applyGalleryColumnLayout(next, false);
  applyEndingColumnLayout(next, false);
  return next;
}

export function ensureWorldFlowLayout(doc: WorldDocumentV1): WorldDocumentV1 {
  return ensureAssetCanvasLayout(ensureLevelCanvasLayout(doc));
}

export function organizeWorldFlowCanvas(doc: WorldDocumentV1): WorldDocumentV1 {
  const next = cloneDoc(doc);
  applyLevelColumnLayout(next, true);
  applyGalleryColumnLayout(next, true);
  applyEndingColumnLayout(next, true);
  return next;
}

function cloneDoc(doc: WorldDocumentV1): WorldDocumentV1 {
  return {
    ...doc,
    levels: doc.levels.map((l) => ({
      ...l,
      unlock_from: l.unlock_from ? [...l.unlock_from] : undefined,
      canvas_position: l.canvas_position ? { ...l.canvas_position } : undefined,
      map_position: l.map_position ? { ...l.map_position } : undefined,
    })),
    gallery: (doc.gallery || []).map((g) => ({
      ...g,
      canvas_position: g.canvas_position ? { ...g.canvas_position } : undefined,
    })),
    endings: {
      ...doc.endings,
      nodes: (doc.endings?.nodes || []).map((n) => ({
        ...n,
        canvas_position: n.canvas_position ? { ...n.canvas_position } : undefined,
        require_flags: n.require_flags ? [...n.require_flags] : undefined,
        storyboard: n.storyboard ? n.storyboard.map((s) => ({ ...s })) : undefined,
      })),
    },
    events: doc.events.map((e) => ({ ...e })),
  };
}

export function listFlowEdges(doc: WorldDocumentV1): FlowEdgeLink[] {
  const out: FlowEdgeLink[] = [];
  for (const lv of doc.levels) {
    for (const from of lv.unlock_from ?? []) {
      out.push({ type: 'unlock', fromLevel: from, toLevel: lv.code });
    }
  }
  for (const ev of doc.events) {
    const fx = effectsObj(ev.effects);
    for (const code of asStringArray(fx.unlock_levels)) {
      out.push({ type: 'ev-lv', fromEvent: ev.event_id, toLevel: code });
    }
    for (const gid of asStringArray(fx.unlock_gallery)) {
      out.push({ type: 'ev-gal', fromEvent: ev.event_id, toGallery: gid });
    }
    const endingId = fx.ending != null ? String(fx.ending) : '';
    if (endingId) {
      out.push({ type: 'ev-end', fromEvent: ev.event_id, toEnding: endingId });
    }
  }
  return out;
}

export function setLevelCanvasPosition(
  doc: WorldDocumentV1,
  code: string,
  x: number,
  y: number,
): WorldDocumentV1 {
  const next = cloneDoc(doc);
  next.levels = next.levels.map((l) =>
    l.code === code
      ? { ...l, canvas_position: { x: clampCanvas(x, 1, 98), y: clampCanvas(y, 1, 98) } }
      : l,
  );
  return next;
}

export function setGalleryCanvasPosition(
  doc: WorldDocumentV1,
  id: string,
  x: number,
  y: number,
): WorldDocumentV1 {
  const next = cloneDoc(doc);
  next.gallery = (next.gallery || []).map((g) =>
    g.gallery_id === id
      ? { ...g, canvas_position: { x: clampCanvas(x, 1, 98), y: clampCanvas(y, 1, 98) } }
      : g,
  );
  return next;
}

export function setEndingCanvasPosition(
  doc: WorldDocumentV1,
  id: string,
  x: number,
  y: number,
): WorldDocumentV1 {
  const next = cloneDoc(doc);
  next.endings = {
    ...next.endings,
    nodes: (next.endings.nodes || []).map((n) =>
      n.ending_id === id
        ? { ...n, canvas_position: { x: clampCanvas(x, 1, 98), y: clampCanvas(y, 1, 98) } }
        : n,
    ),
  };
  return next;
}

export function addUnlockEdge(doc: WorldDocumentV1, from: string, to: string): WorldDocumentV1 {
  if (from === to) return doc;
  const next = cloneDoc(doc);
  const lv = next.levels.find((l) => l.code === to);
  if (!lv) return doc;
  const list = lv.unlock_from ?? [];
  if (!list.includes(from)) {
    lv.unlock_from = [...list, from];
    lv.is_start = false;
  }
  return next;
}

export function setLevelAsStart(doc: WorldDocumentV1, code: string): WorldDocumentV1 {
  const next = cloneDoc(doc);
  for (const lv of next.levels) {
    lv.is_start = lv.code === code;
    if (lv.code === code) lv.unlock_from = undefined;
  }
  return next;
}

/** Drop a link from level/event onto a target (Admin dropFlowLink rules). */
export function dropFlowLink(
  doc: WorldDocumentV1,
  from: FlowLinkFrom,
  to: FlowSelect,
): WorldDocumentV1 {
  if (from.kind === 'level' && to.kind === 'level') {
    return addUnlockEdge(doc, from.code, to.code);
  }
  if (from.kind !== 'event') return doc;
  const next = cloneDoc(doc);
  const ev = next.events.find((e) => e.event_id === from.id);
  if (!ev) return doc;
  const fx = { ...effectsObj(ev.effects) };

  if (to.kind === 'level') {
    const list = asStringArray(fx.unlock_levels);
    if (!list.includes(to.code)) {
      fx.unlock_levels = [...list, to.code];
      ev.effects = fx;
      const lv = next.levels.find((l) => l.code === to.code);
      if (lv && ev.level_code && !(lv.unlock_from ?? []).includes(ev.level_code)) {
        lv.unlock_from = [...(lv.unlock_from ?? []), ev.level_code];
        lv.is_start = false;
      }
    }
  } else if (to.kind === 'gallery') {
    const list = asStringArray(fx.unlock_gallery);
    if (!list.includes(to.id)) {
      fx.unlock_gallery = [...list, to.id];
      ev.effects = fx;
    }
  } else if (to.kind === 'ending') {
    if (String(fx.ending || '') !== to.id) {
      fx.ending = to.id;
      ev.effects = fx;
      if (!next.endings.enabled) next.endings.enabled = true;
    }
  }
  return next;
}

export function removeFlowLink(doc: WorldDocumentV1, link: FlowEdgeLink): WorldDocumentV1 {
  const next = cloneDoc(doc);
  if (link.type === 'unlock') {
    next.levels = next.levels.map((l) => {
      if (l.code !== link.toLevel) return l;
      const unlock_from = (l.unlock_from || []).filter((c) => c !== link.fromLevel);
      return {
        ...l,
        unlock_from: unlock_from.length ? unlock_from : undefined,
        is_start: unlock_from.length === 0 ? l.is_start || false : false,
      };
    });
    return next;
  }
  const ev = next.events.find((e) => e.event_id === link.fromEvent);
  if (!ev) return next;
  const fx = { ...effectsObj(ev.effects) };
  if (link.type === 'ev-lv') {
    const nextLevels = asStringArray(fx.unlock_levels).filter((c) => c !== link.toLevel);
    if (nextLevels.length) fx.unlock_levels = nextLevels;
    else delete fx.unlock_levels;
    // Also drop structural unlock_from from event's level if present
    if (ev.level_code) {
      next.levels = next.levels.map((l) => {
        if (l.code !== link.toLevel) return l;
        const unlock_from = (l.unlock_from || []).filter((c) => c !== ev.level_code);
        return { ...l, unlock_from: unlock_from.length ? unlock_from : undefined };
      });
    }
  } else if (link.type === 'ev-gal') {
    const nextGal = asStringArray(fx.unlock_gallery).filter((c) => c !== link.toGallery);
    if (nextGal.length) fx.unlock_gallery = nextGal;
    else delete fx.unlock_gallery;
  } else if (link.type === 'ev-end') {
    if (String(fx.ending || '') === link.toEnding) delete fx.ending;
  }
  ev.effects = fx;
  return next;
}

/** Add an isolated level (no unlock chain) for canvas branching. */
export function addIsolatedLevel(doc: WorldDocumentV1, title?: string): WorldDocumentV1 {
  const next = cloneDoc(doc);
  const idx = next.levels.length + 1;
  const code = `lv_${idx}_${Date.now().toString(36).slice(-4)}`;
  const sceneCode = `sc_${code.replace(/^lv_/, '')}`;
  const isFirst = next.levels.length === 0;
  next.levels.push({
    code,
    title: title?.trim() || `关卡 ${idx}`,
    synopsis: '',
    linked_scene: sceneCode,
    is_start: isFirst,
    unlock_from: undefined,
    canvas_position: { x: 28 + (idx % 4) * 8, y: 30 + (idx % 5) * 10 },
  });
  next.scenes.push({
    code: sceneCode,
    title: `${title?.trim() || `关卡 ${idx}`}场景`,
    level_code: code,
    opening: '',
    play_goal: '',
  });
  return next;
}

/** Remove a level without forcing a linear reorder (canvas-safe). */
export function removeLevelKeepTopology(doc: WorldDocumentV1, levelCode: string): WorldDocumentV1 {
  const next = cloneDoc(doc);
  next.levels = next.levels
    .filter((l) => l.code !== levelCode)
    .map((l) => {
      const unlock_from = (l.unlock_from || []).filter((c) => c !== levelCode);
      return {
        ...l,
        unlock_from: unlock_from.length ? unlock_from : undefined,
        is_start: unlock_from.length === 0 ? !!l.is_start : false,
      };
    });
  if (next.levels.length && !next.levels.some((l) => l.is_start)) {
    next.levels[0].is_start = true;
    next.levels[0].unlock_from = undefined;
  }
  next.scenes = next.scenes.filter((s) => s.level_code !== levelCode);
  next.events = next.events.filter(
    (e) =>
      e.level_code !== levelCode &&
      !String(e.trigger || '').includes(levelCode) &&
      !JSON.stringify(e.effects || {}).includes(levelCode),
  );
  return next;
}

export function removeEventById(doc: WorldDocumentV1, eventId: string): WorldDocumentV1 {
  const next = cloneDoc(doc);
  next.events = next.events.filter((e) => e.event_id !== eventId);
  return next;
}

export function addCanvasGalleryStub(doc: WorldDocumentV1, title?: string): WorldDocumentV1 {
  const next = cloneDoc(doc);
  const id = `cg_${Date.now().toString(36)}`;
  next.gallery = [
    ...(next.gallery || []),
    {
      gallery_id: id,
      title: title?.trim() || `CG ${(next.gallery || []).length + 1}`,
      canvas_position: { x: 72, y: 20 + ((next.gallery || []).length % 6) * 12 },
    },
  ];
  return next;
}

export function addCanvasEndingStub(doc: WorldDocumentV1, title?: string): WorldDocumentV1 {
  const next = cloneDoc(doc);
  const id = `end_${Date.now().toString(36)}`;
  const nodes = [
    ...(next.endings.nodes || []),
    {
      ending_id: id,
      title: title?.trim() || `Ending ${(next.endings.nodes || []).length + 1}`,
      require_flags: [] as string[],
      canvas_position: { x: 90, y: 30 + ((next.endings.nodes || []).length % 5) * 12 },
    },
  ];
  next.endings = { enabled: true, nodes };
  return next;
}

/** Board geometry helpers for RN canvas (percent → px). */
export const FLOW_BOARD = { width: 1600, height: 1000 } as const;
export const FLOW_NODE = {
  level: { w: 168, h: 72 },
  event: { w: 148, h: 40 },
  gallery: { w: 140, h: 56 },
  ending: { w: 140, h: 56 },
} as const;

export function pctToBoard(xPct: number, yPct: number) {
  return {
    x: (clampCanvas(xPct, 0, 100) / 100) * FLOW_BOARD.width,
    y: (clampCanvas(yPct, 0, 100) / 100) * FLOW_BOARD.height,
  };
}

export function boardToPct(x: number, y: number) {
  return {
    x: clampCanvas((x / FLOW_BOARD.width) * 100, 1, 98),
    y: clampCanvas((y / FLOW_BOARD.height) * 100, 1, 98),
  };
}

export function nodeCenter(kind: 'level' | 'gallery' | 'ending', xPct: number, yPct: number) {
  const size = FLOW_NODE[kind];
  const p = pctToBoard(xPct, yPct);
  return { x: p.x, y: p.y, w: size.w, h: size.h, left: p.x - size.w / 2, top: p.y - size.h / 2 };
}

export function edgeEndpoints(
  from: { x: number; y: number; w: number; h: number },
  to: { x: number; y: number; w: number; h: number },
) {
  return {
    x1: from.x + from.w / 2,
    y1: from.y,
    x2: to.x - to.w / 2,
    y2: to.y,
  };
}
