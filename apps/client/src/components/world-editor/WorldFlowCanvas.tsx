import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import type { WorldDocumentV1 } from '../../types/worldDocument';
import {
  FLOW_BOARD,
  FLOW_NODE,
  boardToPct,
  edgeEndpoints,
  eventsForLevel,
  listFlowEdges,
  nodeCenter,
  pctToBoard,
  type FlowEdgeLink,
  type FlowLinkFrom,
  type FlowSelect,
} from '../../lib/worldFlowCanvas';
import {
  eventEffectSummary,
  eventTriggerSummary,
  listHappenedThings,
  parseEventEffects,
} from '../../lib/worldDocument';
import { TOKENS } from '../../pages/default/theme/tokens';
import { Typo } from '../../theme/typography';

type Props = {
  doc: WorldDocumentV1;
  selection: FlowSelect | null;
  linkFrom: FlowLinkFrom | null;
  expanded: Record<string, boolean>;
  onSelect: (sel: FlowSelect | null) => void;
  onToggleExpand: (levelCode: string) => void;
  onRequestLink: (from: FlowLinkFrom) => void;
  onCancelLink: () => void;
  onDropLink: (to: FlowSelect) => void;
  onRemoveLink: (link: FlowEdgeLink) => void;
  onRemoveNode: (sel: FlowSelect) => void;
  onMoveLevel: (code: string, x: number, y: number) => void;
  onMoveGallery: (id: string, x: number, y: number) => void;
  onMoveEnding: (id: string, x: number, y: number) => void;
  onOrganize?: () => void;
};

type DragState = {
  kind: 'pan' | 'node';
  nodeKind?: 'level' | 'gallery' | 'ending';
  id?: string;
  startPageX: number;
  startPageY: number;
  originPanX: number;
  originPanY: number;
  originPctX: number;
  originPctY: number;
  moved: boolean;
};

type CtxMenu = { x: number; y: number; sel: FlowSelect };

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function edgePath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.4);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function edgeColor(link: FlowEdgeLink) {
  if (link.type === 'unlock') return '#8a7f6e';
  if (link.type === 'ev-lv') return '#3b82f6';
  if (link.type === 'ev-gal') return '#a855f7';
  return '#dc2626';
}

function posKey(kind: string, id: string) {
  return `${kind}:${id}`;
}

export function WorldFlowCanvas({
  doc,
  selection,
  linkFrom,
  expanded,
  onSelect,
  onToggleExpand,
  onRequestLink,
  onCancelLink,
  onDropLink,
  onRemoveLink,
  onRemoveNode,
  onMoveLevel,
  onMoveGallery,
  onMoveEnding,
}: Props) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.8);
  const [viewport, setViewport] = useState({ w: 800, h: 500 });
  const [preview, setPreview] = useState<Record<string, { x: number; y: number }>>({});
  const [wire, setWire] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const didFit = useRef(false);
  const rootRef = useRef<View>(null);
  const flags = useMemo(() => listHappenedThings(doc), [doc]);

  const pctOf = useCallback(
    (kind: 'level' | 'gallery' | 'ending', id: string, fallbackX: number, fallbackY: number) => {
      const p = preview[posKey(kind, id)];
      if (p) return p;
      return { x: fallbackX, y: fallbackY };
    },
    [preview],
  );

  const levelRects = useMemo(() => {
    const map = new Map<string, ReturnType<typeof nodeCenter>>();
    for (const lv of doc.levels) {
      const p = pctOf('level', lv.code, lv.canvas_position?.x ?? 40, lv.canvas_position?.y ?? 50);
      map.set(lv.code, nodeCenter('level', p.x, p.y));
    }
    return map;
  }, [doc.levels, pctOf]);

  const galleryRects = useMemo(() => {
    const map = new Map<string, ReturnType<typeof nodeCenter>>();
    for (const g of doc.gallery || []) {
      const p = pctOf('gallery', g.gallery_id, g.canvas_position?.x ?? 72, g.canvas_position?.y ?? 30);
      map.set(g.gallery_id, nodeCenter('gallery', p.x, p.y));
    }
    return map;
  }, [doc.gallery, pctOf]);

  const endingRects = useMemo(() => {
    const map = new Map<string, ReturnType<typeof nodeCenter>>();
    for (const n of doc.endings?.nodes || []) {
      const p = pctOf('ending', n.ending_id, n.canvas_position?.x ?? 90, n.canvas_position?.y ?? 50);
      map.set(n.ending_id, nodeCenter('ending', p.x, p.y));
    }
    return map;
  }, [doc.endings, pctOf]);

  const eventAnchors = useMemo(() => {
    const map = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const lv of doc.levels) {
      if (!expanded[lv.code]) continue;
      const parent = levelRects.get(lv.code);
      if (!parent) continue;
      eventsForLevel(doc, lv.code).forEach((ev, i) => {
        map.set(ev.event_id, {
          x: parent.x,
          y: parent.top + parent.h + 14 + i * (FLOW_NODE.event.h + 8) + FLOW_NODE.event.h / 2,
          w: FLOW_NODE.event.w,
          h: FLOW_NODE.event.h,
        });
      });
    }
    return map;
  }, [doc, expanded, levelRects]);

  const drawnEdges = useMemo(() => {
    const links = listFlowEdges(doc);
    const out: { key: string; path: string; color: string; link: FlowEdgeLink }[] = [];
    for (const link of links) {
      let fromBox: { x: number; y: number; w: number; h: number } | undefined;
      let toBox: { x: number; y: number; w: number; h: number } | undefined;
      if (link.type === 'unlock') {
        fromBox = levelRects.get(link.fromLevel);
        toBox = levelRects.get(link.toLevel);
      } else if (link.type === 'ev-lv') {
        fromBox = eventAnchors.get(link.fromEvent);
        if (!fromBox) {
          const ev = doc.events.find((e) => e.event_id === link.fromEvent);
          if (ev?.level_code) fromBox = levelRects.get(ev.level_code);
        }
        toBox = levelRects.get(link.toLevel);
      } else if (link.type === 'ev-gal') {
        fromBox = eventAnchors.get(link.fromEvent);
        toBox = galleryRects.get(link.toGallery);
      } else {
        fromBox = eventAnchors.get(link.fromEvent);
        toBox = endingRects.get(link.toEnding);
      }
      if (!fromBox || !toBox) continue;
      const ep = edgeEndpoints(fromBox, toBox);
      out.push({
        key: `${link.type}:${JSON.stringify(link)}`,
        path: edgePath(ep.x1, ep.y1, ep.x2, ep.y2),
        color: edgeColor(link),
        link,
      });
    }
    return out;
  }, [doc, levelRects, galleryRects, endingRects, eventAnchors]);

  const fitView = useCallback(() => {
    const boxes: { left: number; top: number; right: number; bottom: number }[] = [];
    for (const r of levelRects.values()) {
      boxes.push({ left: r.left, top: r.top, right: r.left + r.w, bottom: r.top + r.h });
    }
    for (const r of galleryRects.values()) {
      boxes.push({ left: r.left, top: r.top, right: r.left + r.w, bottom: r.top + r.h });
    }
    for (const r of endingRects.values()) {
      boxes.push({ left: r.left, top: r.top, right: r.left + r.w, bottom: r.top + r.h });
    }
    if (!boxes.length) {
      setZoom(0.85);
      setPan({
        x: viewport.w / 2 - (FLOW_BOARD.width * 0.85) / 2,
        y: viewport.h / 2 - (FLOW_BOARD.height * 0.85) / 2,
      });
      return;
    }
    const minX = Math.min(...boxes.map((b) => b.left));
    const minY = Math.min(...boxes.map((b) => b.top));
    const maxX = Math.max(...boxes.map((b) => b.right));
    const maxY = Math.max(...boxes.map((b) => b.bottom));
    const contentW = Math.max(120, maxX - minX);
    const contentH = Math.max(120, maxY - minY);
    const pad = 72;
    let z = Math.min((viewport.w - pad * 2) / contentW, (viewport.h - pad * 2) / contentH, 1.1);
    z = clampZoom(z);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoom(z);
    setPan({
      x: viewport.w / 2 - cx * z,
      y: viewport.h / 2 - cy * z,
    });
  }, [levelRects, galleryRects, endingRects, viewport.w, viewport.h]);

  useEffect(() => {
    if (didFit.current) return;
    if (viewport.w < 40 || !doc.levels.length) return;
    // Wait a tick so layout positions exist.
    const t = setTimeout(() => {
      fitView();
      didFit.current = true;
    }, 40);
    return () => clearTimeout(t);
  }, [doc.levels.length, fitView, viewport.w]);

  // Web: wheel zoom + context menu prevention on board
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = rootRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = node.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setZoom((z0) => {
        const z1 = clampZoom(z0 * factor);
        const boardX = (cx - pan.x) / z0;
        const boardY = (cy - pan.y) / z0;
        setPan({ x: cx - boardX * z1, y: cy - boardY * z1 });
        return z1;
      });
    };
    const onCtx = (e: MouseEvent) => {
      // handled in RN; prevent browser menu on canvas
      e.preventDefault();
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('contextmenu', onCtx);
    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('contextmenu', onCtx);
    };
  }, [pan.x, pan.y]);

  const pageToBoard = useCallback(
    (pageX: number, pageY: number, viewPageX: number, viewPageY: number) => {
      const lx = pageX - viewPageX;
      const ly = pageY - viewPageY;
      return {
        x: (lx - pan.x) / zoom,
        y: (ly - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom],
  );

  const hitInTarget = useCallback(
    (bx: number, by: number): FlowSelect | null => {
      for (const [id, r] of endingRects) {
        if (bx >= r.left - 8 && bx <= r.left + r.w + 8 && by >= r.top - 8 && by <= r.top + r.h + 8) {
          return { kind: 'ending', id };
        }
      }
      for (const [id, r] of galleryRects) {
        if (bx >= r.left - 8 && bx <= r.left + r.w + 8 && by >= r.top - 8 && by <= r.top + r.h + 8) {
          return { kind: 'gallery', id };
        }
      }
      for (const [code, r] of levelRects) {
        if (bx >= r.left - 8 && bx <= r.left + r.w + 8 && by >= r.top - 8 && by <= r.top + r.h + 8) {
          return { kind: 'level', code };
        }
      }
      return null;
    },
    [levelRects, galleryRects, endingRects],
  );

  const outPortBoard = useCallback(
    (from: FlowLinkFrom) => {
      if (from.kind === 'level') {
        const r = levelRects.get(from.code);
        if (!r) return null;
        return { x: r.x + r.w / 2, y: r.y };
      }
      const r = eventAnchors.get(from.id);
      if (!r) return null;
      return { x: r.x + r.w / 2, y: r.y };
    },
    [levelRects, eventAnchors],
  );

  useEffect(() => {
    if (!linkFrom) {
      setWire(null);
      return;
    }
    const start = outPortBoard(linkFrom);
    if (start) setWire({ x1: start.x, y1: start.y, x2: start.x + 40, y2: start.y });
  }, [linkFrom, outPortBoard]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setViewport({ w: width, h: height });
  };

  const beginPan = (e: GestureResponderEvent) => {
    setCtx(null);
    dragRef.current = {
      kind: 'pan',
      startPageX: e.nativeEvent.pageX,
      startPageY: e.nativeEvent.pageY,
      originPanX: pan.x,
      originPanY: pan.y,
      originPctX: 0,
      originPctY: 0,
      moved: false,
    };
  };

  const beginNodeDrag = (
    kind: 'level' | 'gallery' | 'ending',
    id: string,
    pctX: number,
    pctY: number,
    e: GestureResponderEvent,
  ) => {
    e.stopPropagation?.();
    setCtx(null);
    dragRef.current = {
      kind: 'node',
      nodeKind: kind,
      id,
      startPageX: e.nativeEvent.pageX,
      startPageY: e.nativeEvent.pageY,
      originPanX: pan.x,
      originPanY: pan.y,
      originPctX: pctX,
      originPctY: pctY,
      moved: false,
    };
  };

  const onMove = (e: GestureResponderEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.nativeEvent.pageX - d.startPageX;
    const dy = e.nativeEvent.pageY - d.startPageY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;

    if (d.kind === 'pan') {
      setPan({ x: d.originPanX + dx, y: d.originPanY + dy });
      if (linkFrom) {
        const start = outPortBoard(linkFrom);
        if (start) {
          // approximate board cursor from page delta — use location if available
          const viewPageX = e.nativeEvent.pageX - e.nativeEvent.locationX;
          const viewPageY = e.nativeEvent.pageY - e.nativeEvent.locationY;
          const b = pageToBoard(e.nativeEvent.pageX, e.nativeEvent.pageY, viewPageX, viewPageY);
          setWire({ x1: start.x, y1: start.y, x2: b.x, y2: b.y });
        }
      }
      return;
    }

    if (d.kind === 'node' && d.nodeKind && d.id) {
      const start = pctToBoard(d.originPctX, d.originPctY);
      const pct = boardToPct(start.x + dx / zoom, start.y + dy / zoom);
      setPreview((prev) => ({
        ...prev,
        [posKey(d.nodeKind!, d.id!)]: pct,
      }));
    }
  };

  const onEnd = (e: GestureResponderEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;

    if (d.kind === 'node' && d.nodeKind && d.id) {
      const dx = e.nativeEvent.pageX - d.startPageX;
      const dy = e.nativeEvent.pageY - d.startPageY;
      const start = pctToBoard(d.originPctX, d.originPctY);
      const pct = boardToPct(start.x + dx / zoom, start.y + dy / zoom);
      if (d.moved) {
        if (d.nodeKind === 'level') onMoveLevel(d.id, pct.x, pct.y);
        else if (d.nodeKind === 'gallery') onMoveGallery(d.id, pct.x, pct.y);
        else onMoveEnding(d.id, pct.x, pct.y);
      }
      setPreview((prev) => {
        const next = { ...prev };
        delete next[posKey(d.nodeKind!, d.id!)];
        return next;
      });
      return d.moved;
    }

    if (d.kind === 'pan' && linkFrom && !d.moved) {
      const viewPageX = e.nativeEvent.pageX - e.nativeEvent.locationX;
      const viewPageY = e.nativeEvent.pageY - e.nativeEvent.locationY;
      const b = pageToBoard(e.nativeEvent.pageX, e.nativeEvent.pageY, viewPageX, viewPageY);
      const hit = hitInTarget(b.x, b.y);
      if (hit) onDropLink(hit);
      else onCancelLink();
    }
    return d.moved;
  };

  const isSelected = (sel: FlowSelect) => {
    if (!selection || selection.kind !== sel.kind) return false;
    if (selection.kind === 'level' && sel.kind === 'level') return selection.code === sel.code;
    if (selection.kind === 'event' && sel.kind === 'event') return selection.id === sel.id;
    if (selection.kind === 'gallery' && sel.kind === 'gallery') return selection.id === sel.id;
    if (selection.kind === 'ending' && sel.kind === 'ending') return selection.id === sel.id;
    return false;
  };

  const openCtx = (sel: FlowSelect, e: GestureResponderEvent) => {
    e.preventDefault?.();
    setCtx({
      x: Math.min(e.nativeEvent.locationX, Math.max(8, viewport.w - 140)),
      y: Math.min(e.nativeEvent.locationY, Math.max(8, viewport.h - 100)),
      sel,
    });
    onSelect(sel);
  };

  const linking = !!linkFrom;

  return (
    <View
      ref={rootRef}
      style={styles.viewport}
      onLayout={onLayout}
      {...(Platform.OS === 'web'
        ? ({
            onContextMenu: (e: { preventDefault?: () => void }) => e.preventDefault?.(),
          } as object)
        : {})}
    >
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={() => setZoom((z) => clampZoom(z * 1.15))} hitSlop={6}>
          <Ionicons name="add" size={18} color={TOKENS.colors.text} />
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => setZoom((z) => clampZoom(z / 1.15))} hitSlop={6}>
          <Ionicons name="remove" size={18} color={TOKENS.colors.text} />
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={fitView} hitSlop={6}>
          <Ionicons name="scan-outline" size={16} color={TOKENS.colors.textSecondary} />
        </Pressable>
        {linking ? (
          <Pressable style={[styles.toolBtn, styles.toolBtnAccent]} onPress={onCancelLink}>
            <Ionicons name="close" size={16} color={TOKENS.colors.accent} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={styles.boardTouch}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={beginPan}
        onResponderMove={onMove}
        onResponderRelease={(e) => {
          void onEnd(e);
        }}
        onResponderTerminate={(e) => {
          void onEnd(e);
        }}
      >
        <View
          style={[
            styles.board,
            {
              width: FLOW_BOARD.width,
              height: FLOW_BOARD.height,
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: zoom }],
            },
          ]}
        >
          <Svg width={FLOW_BOARD.width} height={FLOW_BOARD.height} style={StyleSheet.absoluteFill} pointerEvents="none">
            {drawnEdges.map((e) => (
              <Path key={e.key} d={e.path} stroke={e.color} strokeWidth={2.5} fill="none" opacity={0.9} />
            ))}
            {wire ? (
              <Path
                d={edgePath(wire.x1, wire.y1, wire.x2, wire.y2)}
                stroke={TOKENS.colors.accent}
                strokeWidth={2}
                strokeDasharray="6 4"
                fill="none"
              />
            ) : null}
          </Svg>

          {(doc.gallery || []).map((g) => {
            const r = galleryRects.get(g.gallery_id)!;
            const sel = isSelected({ kind: 'gallery', id: g.gallery_id });
            const pct = pctOf('gallery', g.gallery_id, g.canvas_position?.x ?? 72, g.canvas_position?.y ?? 30);
            return (
              <View
                key={g.gallery_id}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => beginNodeDrag('gallery', g.gallery_id, pct.x, pct.y, e)}
                onResponderMove={onMove}
                onResponderRelease={(e) => {
                  const moved = onEnd(e);
                  if (!moved) {
                    if (linkFrom) onDropLink({ kind: 'gallery', id: g.gallery_id });
                    else onSelect({ kind: 'gallery', id: g.gallery_id });
                  }
                }}
                {...(Platform.OS === 'web'
                  ? ({
                      onContextMenu: (ev: GestureResponderEvent) =>
                        openCtx({ kind: 'gallery', id: g.gallery_id }, ev),
                    } as object)
                  : {})}
                style={[
                  styles.node,
                  styles.nodeGallery,
                  { left: r.left, top: r.top, width: r.w, height: r.h },
                  sel && styles.nodeOn,
                  linking && styles.nodeLinkTarget,
                ]}
              >
                <View style={styles.portIn} />
                <Ionicons name="image-outline" size={14} color="#c4b5fd" style={{ marginBottom: 2 }} />
                <Text style={styles.nodeTitle} numberOfLines={1}>
                  {g.title}
                </Text>
              </View>
            );
          })}

          {(doc.endings?.nodes || []).map((n) => {
            const r = endingRects.get(n.ending_id)!;
            const sel = isSelected({ kind: 'ending', id: n.ending_id });
            const pct = pctOf('ending', n.ending_id, n.canvas_position?.x ?? 90, n.canvas_position?.y ?? 50);
            return (
              <View
                key={n.ending_id}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => beginNodeDrag('ending', n.ending_id, pct.x, pct.y, e)}
                onResponderMove={onMove}
                onResponderRelease={(e) => {
                  const moved = onEnd(e);
                  if (!moved) {
                    if (linkFrom) onDropLink({ kind: 'ending', id: n.ending_id });
                    else onSelect({ kind: 'ending', id: n.ending_id });
                  }
                }}
                {...(Platform.OS === 'web'
                  ? ({
                      onContextMenu: (ev: GestureResponderEvent) =>
                        openCtx({ kind: 'ending', id: n.ending_id }, ev),
                    } as object)
                  : {})}
                style={[
                  styles.node,
                  styles.nodeEnding,
                  { left: r.left, top: r.top, width: r.w, height: r.h },
                  sel && styles.nodeOn,
                  linking && styles.nodeLinkTarget,
                ]}
              >
                <View style={styles.portIn} />
                <Ionicons name="flag-outline" size={14} color="#fca5a5" style={{ marginBottom: 2 }} />
                <Text style={styles.nodeTitle} numberOfLines={1}>
                  {n.title}
                </Text>
              </View>
            );
          })}

          {doc.levels.map((lv) => {
            const r = levelRects.get(lv.code)!;
            const sel = isSelected({ kind: 'level', code: lv.code });
            const evs = eventsForLevel(doc, lv.code);
            const open = !!expanded[lv.code];
            const pct = pctOf('level', lv.code, lv.canvas_position?.x ?? 40, lv.canvas_position?.y ?? 50);
            return (
              <View key={lv.code} style={{ position: 'absolute', left: r.left, top: r.top }}>
                <View
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={(e) => beginNodeDrag('level', lv.code, pct.x, pct.y, e)}
                  onResponderMove={onMove}
                  onResponderRelease={(e) => {
                    const moved = onEnd(e);
                    if (!moved) {
                      if (linkFrom) onDropLink({ kind: 'level', code: lv.code });
                      else onSelect({ kind: 'level', code: lv.code });
                    }
                  }}
                  {...(Platform.OS === 'web'
                    ? ({
                        onContextMenu: (ev: GestureResponderEvent) =>
                          openCtx({ kind: 'level', code: lv.code }, ev),
                      } as object)
                    : {})}
                  style={[
                    styles.node,
                    styles.nodeLevel,
                    { width: r.w, height: r.h, position: 'relative' },
                    sel && styles.nodeOn,
                    linking && styles.nodeLinkTarget,
                  ]}
                >
                  <View style={styles.portIn} />
                  <Text style={styles.nodeTitle} numberOfLines={1}>
                    {lv.title}
                  </Text>
                  <Text style={styles.nodeMeta}>
                    {lv.is_start || !(lv.unlock_from || []).length ? 'START · ' : ''}
                    {lv.code}
                  </Text>
                  <Pressable
                    style={styles.portOut}
                    hitSlop={12}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onRequestLink({ kind: 'level', code: lv.code });
                    }}
                  />
                </View>
                {evs.length > 0 ? (
                  <Pressable style={styles.expandBtn} onPress={() => onToggleExpand(lv.code)}>
                    <Text style={styles.expandText}>
                      {open ? '▾' : '▸'} {evs.length}
                    </Text>
                  </Pressable>
                ) : null}
                {open
                  ? evs.map((ev, i) => {
                      const top = FLOW_NODE.level.h + 8 + i * (FLOW_NODE.event.h + 8);
                      const evSel = isSelected({ kind: 'event', id: ev.event_id });
                      return (
                        <View
                          key={ev.event_id}
                          style={[
                            styles.node,
                            styles.nodeEvent,
                            {
                              position: 'absolute',
                              left: (r.w - FLOW_NODE.event.w) / 2,
                              top,
                              width: FLOW_NODE.event.w,
                              height: FLOW_NODE.event.h,
                            },
                            evSel && styles.nodeOn,
                          ]}
                        >
                          <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => onSelect({ kind: 'event', id: ev.event_id })}
                            onLongPress={() =>
                              openCtx({ kind: 'event', id: ev.event_id }, {
                                nativeEvent: { locationX: 40, locationY: 40 },
                                preventDefault: () => undefined,
                              } as unknown as GestureResponderEvent)
                            }
                          />
                          <Text style={styles.nodeTitle} numberOfLines={1}>
                            {eventTriggerSummary(ev.trigger, doc, flags)}
                          </Text>
                          <Text style={styles.nodeMeta} numberOfLines={1}>
                            {(() => {
                              const efx = parseEventEffects(ev.effects);
                              return efx.length
                                ? efx.map((ef) => eventEffectSummary(ef, doc, flags)).join(' · ')
                                : '（尚未添加结果）';
                            })()}
                          </Text>
                          <Pressable
                            style={styles.portOut}
                            hitSlop={12}
                            onPress={() => onRequestLink({ kind: 'event', id: ev.event_id })}
                          />
                        </View>
                      );
                    })
                  : null}
              </View>
            );
          })}
        </View>
      </View>

      {linking ? (
        <View style={styles.linkHint} pointerEvents="none">
          <Text style={styles.linkHintText}>点击目标节点完成连线</Text>
        </View>
      ) : null}

      {ctx ? (
        <View style={[styles.ctxMenu, { left: ctx.x, top: ctx.y }]}>
          <Pressable
            style={styles.ctxItem}
            onPress={() => {
              onRemoveNode(ctx.sel);
              setCtx(null);
            }}
          >
            <Ionicons name="trash-outline" size={14} color={TOKENS.colors.accent} />
            <Text style={styles.ctxDanger}>删除</Text>
          </Pressable>
          {selection?.kind === 'level' && drawnEdges.length ? (
            <Pressable
              style={styles.ctxItem}
              onPress={() => {
                const edge = drawnEdges.find(
                  (e) =>
                    (e.link.type === 'unlock' && e.link.toLevel === (ctx.sel as { code?: string }).code) ||
                    (e.link.type === 'ev-lv' && e.link.toLevel === (ctx.sel as { code?: string }).code),
                );
                if (edge) onRemoveLink(edge.link);
                setCtx(null);
              }}
            >
              <Ionicons name="git-commit-outline" size={14} color={TOKENS.colors.textSecondary} />
              <Text style={styles.ctxText}>删除入边</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.ctxItem} onPress={() => setCtx(null)}>
            <Text style={styles.ctxText}>取消</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    minHeight: 420,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: '#0c0e14',
    overflow: 'hidden',
    position: 'relative',
  },
  toolbar: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 6,
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(20,24,32,0.92)',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnAccent: { borderColor: TOKENS.colors.accent },
  boardTouch: { flex: 1 },
  board: {
    backgroundColor: '#10131a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  node: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  nodeLevel: { borderColor: 'rgba(186,60,71,0.4)' },
  nodeGallery: { borderColor: 'rgba(168,85,247,0.45)' },
  nodeEnding: { borderColor: 'rgba(220,38,38,0.5)' },
  nodeEvent: { borderColor: 'rgba(59,130,246,0.5)', backgroundColor: '#121826' },
  nodeOn: { borderColor: TOKENS.colors.accent, borderWidth: 2 },
  nodeLinkTarget: { borderStyle: 'dashed' as never },
  nodeTitle: Typo({ color: TOKENS.colors.text, fontSize: 12, fontWeight: '700' }, 'sans'),
  nodeMeta: Typo({ color: TOKENS.colors.textMuted, fontSize: 10, marginTop: 2 }, 'mono'),
  portIn: {
    position: 'absolute',
    left: -6,
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#64748b',
    borderWidth: 2,
    borderColor: '#0c0e14',
  },
  portOut: {
    position: 'absolute',
    right: -7,
    top: '50%',
    marginTop: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 2,
    borderColor: '#0c0e14',
    zIndex: 2,
  },
  expandBtn: { marginTop: 4, paddingVertical: 2 },
  expandText: Typo({ color: TOKENS.colors.textMuted, fontSize: 10 }, 'sans'),
  linkHint: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
  },
  linkHintText: Typo(
    {
      color: '#fff',
      fontSize: 12,
      backgroundColor: 'rgba(186,60,71,0.9)',
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    'sans',
  ),
  ctxMenu: {
    position: 'absolute',
    zIndex: 20,
    minWidth: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(16,19,26,0.98)',
    paddingVertical: 4,
    overflow: 'hidden',
  },
  ctxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ctxText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 13 }, 'sans'),
  ctxDanger: Typo({ color: TOKENS.colors.accent, fontSize: 13, fontWeight: '600' }, 'sans'),
});
