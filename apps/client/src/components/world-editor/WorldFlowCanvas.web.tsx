/**
 * Web canvas — mirrors soulthread-admin WorldFlowCanvas.vue pointer model:
 * - Hold Space (or middle mouse) to pan
 * - Pointer-down on node → drag node
 * - Pointer-down on out-port → rubber-band wire; release on in-port → link
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorldDocumentV1 } from '../../types/worldDocument';
import {
  eventsForLevel,
  listFlowEdges,
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

type WireDrag = {
  from: FlowLinkFrom;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pointerId: number;
  moved: boolean;
  restore?: FlowEdgeLink;
};

type CtxMenu =
  | { kind: 'node'; x: number; y: number; sel: FlowSelect }
  | { kind: 'edge'; x: number; y: number; link: FlowEdgeLink };

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function clampPct(n: number) {
  return clamp(n, 1, 98);
}

function portId(kind: string, id: string) {
  return `${kind}:${id}`;
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

function wireColor(from: FlowLinkFrom) {
  return from.kind === 'level' ? '#8a7f6e' : '#3b82f6';
}

function linkFromEdge(link: FlowEdgeLink): FlowLinkFrom {
  if (link.type === 'unlock') return { kind: 'level', code: link.fromLevel };
  return { kind: 'event', id: link.fromEvent };
}

function targetFromEdge(link: FlowEdgeLink): FlowSelect {
  if (link.type === 'unlock' || link.type === 'ev-lv') return { kind: 'level', code: link.toLevel };
  if (link.type === 'ev-gal') return { kind: 'gallery', id: link.toGallery };
  return { kind: 'ending', id: link.toEnding };
}

export function WorldFlowCanvas(props: Props) {
  const {
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
    onOrganize,
  } = props;

  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const spaceHeldRef = useRef(false);
  const panningRef = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const dragging = useRef<{
    kind: 'level' | 'gallery' | 'ending';
    id: string;
    pointerId: number;
    moved: boolean;
  } | null>(null);
  const dragPctRef = useRef<{ x: number; y: number } | null>(null);
  const wireDragRef = useRef<WireDrag | null>(null);
  const [wireDrag, setWireDragState] = useState<WireDrag | null>(null);
  const [preview, setPreview] = useState<Record<string, { x: number; y: number }>>({});
  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const [edgeTick, setEdgeTick] = useState(0);
  const didFit = useRef(false);

  const setWireDrag = useCallback((next: WireDrag | null) => {
    wireDragRef.current = next;
    setWireDragState(next);
  }, []);

  const setSpace = useCallback((v: boolean) => {
    spaceHeldRef.current = v;
    setSpaceHeld(v);
  }, []);

  const setPanActive = useCallback((v: boolean) => {
    panningRef.current = v;
    setPanning(v);
  }, []);

  const pctOf = useCallback(
    (kind: string, id: string, x?: number, y?: number) => {
      const p = preview[`${kind}:${id}`];
      if (p) return p;
      return { x: clampPct(x ?? 40), y: clampPct(y ?? 50) };
    },
    [preview],
  );

  const flags = useMemo(() => listHappenedThings(doc), [doc]);

  const measurePort = useCallback((id: string) => {
    const board = boardRef.current;
    if (!board) return null;
    const el = board.querySelector(`[data-port="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const br = board.getBoundingClientRect();
    const pr = el.getBoundingClientRect();
    const scaleX = br.width / board.offsetWidth || 1;
    const scaleY = br.height / board.offsetHeight || 1;
    return {
      x: (pr.left + pr.width / 2 - br.left) / scaleX,
      y: (pr.top + pr.height / 2 - br.top) / scaleY,
    };
  }, []);

  const clientToPct = useCallback((clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return { x: 50, y: 50 };
    const r = el.getBoundingClientRect();
    return {
      x: clampPct(((clientX - r.left) / (r.width || 1)) * 100),
      y: clampPct(((clientY - r.top) / (r.height || 1)) * 100),
    };
  }, []);

  const clientToBoard = useCallback((clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return null;
    const br = board.getBoundingClientRect();
    const scaleX = br.width / board.offsetWidth || 1;
    const scaleY = br.height / board.offsetHeight || 1;
    return {
      x: (clientX - br.left) / scaleX,
      y: (clientY - br.top) / scaleY,
    };
  }, []);

  const hitTestInPort = useCallback((clientX: number, clientY: number): FlowSelect | null => {
    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
      const port = (el as HTMLElement).closest?.('[data-port]') as HTMLElement | null;
      if (!port) continue;
      const id = port.getAttribute('data-port') || '';
      if (id.startsWith('level-in:')) return { kind: 'level', code: id.slice('level-in:'.length) };
      if (id.startsWith('gallery-in:')) return { kind: 'gallery', id: id.slice('gallery-in:'.length) };
      if (id.startsWith('ending-in:')) return { kind: 'ending', id: id.slice('ending-in:'.length) };
    }
    return null;
  }, []);

  const drawnEdges = useMemo(() => {
    void edgeTick;
    const links = listFlowEdges(doc);
    const out: {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      link: FlowEdgeLink;
    }[] = [];
    for (const link of links) {
      let from: { x: number; y: number } | null = null;
      let to: { x: number; y: number } | null = null;
      if (link.type === 'unlock') {
        from = measurePort(portId('level-out', link.fromLevel));
        to = measurePort(portId('level-in', link.toLevel));
      } else if (link.type === 'ev-lv') {
        from = measurePort(portId('event-out', link.fromEvent));
        if (!from) {
          const ev = doc.events.find((e) => e.event_id === link.fromEvent);
          if (ev?.level_code) from = measurePort(portId('level-out', ev.level_code));
        }
        to = measurePort(portId('level-in', link.toLevel));
      } else if (link.type === 'ev-gal') {
        from = measurePort(portId('event-out', link.fromEvent));
        to = measurePort(portId('gallery-in', link.toGallery));
      } else {
        from = measurePort(portId('event-out', link.fromEvent));
        to = measurePort(portId('ending-in', link.toEnding));
      }
      if (!from || !to) continue;
      out.push({
        key: `${link.type}:${JSON.stringify(link)}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        color: edgeColor(link),
        link,
      });
    }
    return out;
  }, [doc, expanded, measurePort, edgeTick, pan.x, pan.y, zoom, preview]);

  const refreshEdges = useCallback(() => {
    requestAnimationFrame(() => setEdgeTick((n) => n + 1));
  }, []);

  const clampZoom = (z: number) => clamp(z, MIN_ZOOM, MAX_ZOOM);

  const setZoomAround = useCallback(
    (next: number, anchorClient?: { x: number; y: number }) => {
      const vp = viewportRef.current;
      const z0 = zoom;
      const z1 = clampZoom(next);
      if (Math.abs(z1 - z0) < 0.001) return;
      if (!vp) {
        setZoom(z1);
        return;
      }
      const rect = vp.getBoundingClientRect();
      const cx = (anchorClient?.x ?? rect.left + rect.width / 2) - rect.left;
      const cy = (anchorClient?.y ?? rect.top + rect.height / 2) - rect.top;
      const boardX = (cx - pan.x) / z0;
      const boardY = (cy - pan.y) / z0;
      setPan({ x: cx - boardX * z1, y: cy - boardY * z1 });
      setZoom(z1);
      refreshEdges();
    },
    [zoom, pan.x, pan.y, refreshEdges],
  );

  const fitView = useCallback(() => {
    const vp = viewportRef.current;
    const board = boardRef.current;
    if (!vp || !board) return;
    const nodes = board.querySelectorAll('[data-flow-node]');
    if (!nodes.length) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const br = board.getBoundingClientRect();
    const scaleX = br.width / board.offsetWidth || 1;
    const scaleY = br.height / board.offsetHeight || 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach((node) => {
      const r = (node as HTMLElement).getBoundingClientRect();
      minX = Math.min(minX, (r.left - br.left) / scaleX);
      minY = Math.min(minY, (r.top - br.top) / scaleY);
      maxX = Math.max(maxX, (r.right - br.left) / scaleX);
      maxY = Math.max(maxY, (r.bottom - br.top) / scaleY);
    });
    const contentW = Math.max(80, maxX - minX);
    const contentH = Math.max(80, maxY - minY);
    const pad = 56;
    let z = Math.min((vp.clientWidth - pad * 2) / contentW, (vp.clientHeight - pad * 2) / contentH, 1.15);
    z = clampZoom(z);
    const contentCx = (minX + maxX) / 2;
    const contentCy = (minY + maxY) / 2;
    setPan({
      x: vp.clientWidth / 2 - contentCx * z,
      y: vp.clientHeight / 2 - contentCy * z,
    });
    setZoom(z);
    refreshEdges();
  }, [refreshEdges]);

  useEffect(() => {
    if (didFit.current) return;
    if (!doc.levels.length) return;
    const t = window.setTimeout(() => {
      fitView();
      didFit.current = true;
      window.setTimeout(fitView, 80);
    }, 50);
    return () => window.clearTimeout(t);
  }, [doc.levels.length, fitView]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const w = wireDragRef.current;
        if (w) {
          if (w.restore) onDropLink(targetFromEdge(w.restore));
          setWireDrag(null);
          onCancelLink();
          return;
        }
        if (linkFrom) onCancelLink();
        setCtx(null);
        return;
      }
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      setSpace(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      setSpace(false);
      setPanActive(false);
    };
    const onBlur = () => {
      setSpace(false);
      setPanActive(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [linkFrom, onCancelLink, onDropLink, setWireDrag, setSpace, setPanActive]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setZoomAround(zoom * factor, { x: e.clientX, y: e.clientY });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoom, setZoomAround]);

  useEffect(() => {
    refreshEdges();
  }, [doc, expanded, pan, zoom, refreshEdges]);

  const startWireDrag = (e: React.PointerEvent, from: FlowLinkFrom, restore?: FlowEdgeLink) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setCtx(null);
    dragging.current = null;
    const origin =
      from.kind === 'level'
        ? measurePort(portId('level-out', from.code))
        : measurePort(portId('event-out', from.id));
    const tip = clientToBoard(e.clientX, e.clientY);
    if (!origin || !tip) return;
    setWireDrag({
      from,
      color: wireColor(from),
      x1: origin.x,
      y1: origin.y,
      x2: tip.x,
      y2: tip.y,
      pointerId: e.pointerId,
      moved: false,
      restore,
    });
    onRequestLink(from);
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onViewportPointerDown = (e: React.PointerEvent) => {
    if (wireDragRef.current) return;
    setCtx(null);
    if (spaceHeldRef.current || e.button === 1) {
      e.preventDefault();
      setPanActive(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onViewportPointerMove = (e: React.PointerEvent) => {
    const w = wireDragRef.current;
    if (w && e.pointerId === w.pointerId) {
      const tip = clientToBoard(e.clientX, e.clientY);
      if (!tip) return;
      const dx = tip.x - w.x1;
      const dy = tip.y - w.y1;
      setWireDrag({
        ...w,
        x2: tip.x,
        y2: tip.y,
        moved: w.moved || dx * dx + dy * dy > 16,
      });
      return;
    }
    if (panningRef.current) {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
      return;
    }
    const drag = dragging.current;
    if (drag && !spaceHeldRef.current) {
      const p = clientToPct(e.clientX, e.clientY);
      drag.moved = true;
      dragPctRef.current = p;
      setPreview((prev) => ({ ...prev, [`${drag.kind}:${drag.id}`]: p }));
      refreshEdges();
    }
  };

  const onViewportPointerUp = (e: React.PointerEvent) => {
    const w = wireDragRef.current;
    if (w && e.pointerId === w.pointerId) {
      const target = hitTestInPort(e.clientX, e.clientY);
      setWireDrag(null);
      try {
        viewportRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (target) {
        onDropLink(target);
        return;
      }
      if (w.restore) {
        onDropLink(targetFromEdge(w.restore));
        onCancelLink();
        return;
      }
      if (!w.moved) return; // click-to-connect kept
      onCancelLink();
      return;
    }

    const drag = dragging.current;
    if (drag && (e.pointerId === drag.pointerId || drag.pointerId < 0)) {
      if (drag.moved && dragPctRef.current) {
        const p = dragPctRef.current;
        if (drag.kind === 'level') onMoveLevel(drag.id, p.x, p.y);
        else if (drag.kind === 'gallery') onMoveGallery(drag.id, p.x, p.y);
        else onMoveEnding(drag.id, p.x, p.y);
      }
      setPreview((prev) => {
        const next = { ...prev };
        delete next[`${drag.kind}:${drag.id}`];
        return next;
      });
      dragging.current = null;
      dragPctRef.current = null;
    }
    setPanActive(false);
    refreshEdges();
  };

  const onNodePointerDown = (
    e: React.PointerEvent,
    kind: 'level' | 'gallery' | 'ending',
    id: string,
    sel: FlowSelect,
  ) => {
    if (wireDragRef.current) return;
    if (spaceHeldRef.current || e.button === 1) return;
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.stopPropagation();
    dragging.current = { kind, id, pointerId: e.pointerId, moved: false };
    dragPctRef.current = null;
    onSelect(sel);
    // Capture on viewport (stable across re-renders); commit position only on pointerup.
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onNodeClick = (sel: FlowSelect) => {
    if (spaceHeldRef.current || wireDragRef.current) return;
    if (linkFrom) {
      onDropLink(sel);
      return;
    }
    onSelect(sel);
  };

  const isSelected = (sel: FlowSelect) => {
    if (!selection || selection.kind !== sel.kind) return false;
    if (selection.kind === 'level' && sel.kind === 'level') return selection.code === sel.code;
    if (selection.kind === 'event' && sel.kind === 'event') return selection.id === sel.id;
    if (selection.kind === 'gallery' && sel.kind === 'gallery') return selection.id === sel.id;
    if (selection.kind === 'ending' && sel.kind === 'ending') return selection.id === sel.id;
    return false;
  };

  const linkActive = (from: FlowLinkFrom) => {
    if (!linkFrom || linkFrom.kind !== from.kind) return false;
    if (linkFrom.kind === 'level' && from.kind === 'level') return linkFrom.code === from.code;
    if (linkFrom.kind === 'event' && from.kind === 'event') return linkFrom.id === from.id;
    return false;
  };

  const css = styles;

  return (
    <div
      ref={viewportRef}
      style={{
        ...css.viewport,
        cursor: spaceHeld || panning ? (panning ? 'grabbing' : 'grab') : 'default',
      }}
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
      onPointerCancel={onViewportPointerUp}
      onContextMenu={(e) => {
        e.preventDefault();
        setCtx(null);
      }}
    >
      <div style={css.hintLeft}>
        {(linkFrom || wireDrag) && (
          <div style={css.amberHint}>连线中：拖到目标左侧圆点松开；也可点一下目标</div>
        )}
        <div style={css.mutedHint}>从输出点拖出连线 · 线可右键删除 · 空格拖画布 · 滚轮缩放</div>
      </div>

      <div style={css.toolbar}>
        <button type="button" style={css.toolBtn} title="缩小" onClick={() => setZoomAround(zoom * 0.9)}>
          −
        </button>
        <button type="button" style={css.toolLabel} title="重置 100%" onClick={() => setZoomAround(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" style={css.toolBtn} title="放大" onClick={() => setZoomAround(zoom * 1.1)}>
          +
        </button>
        <button type="button" style={css.toolText} title="居中" onClick={fitView}>
          居中
        </button>
        {onOrganize ? (
          <button type="button" style={css.toolText} title="整理" onClick={onOrganize}>
            整理
          </button>
        ) : null}
      </div>

      <div
        ref={boardRef}
        style={{
          ...css.board,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg style={css.svg} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="mk-gray" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#8a7f6e" />
            </marker>
          </defs>
          {drawnEdges.map((edge) => (
            <g key={edge.key} style={{ pointerEvents: 'auto' }}>
              <path
                d={edgePath(edge.x1, edge.y1, edge.x2, edge.y2)}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                style={{ cursor: 'pointer' }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCtx({ kind: 'edge', x: e.clientX, y: e.clientY, link: edge.link });
                }}
              />
              <path
                d={edgePath(edge.x1, edge.y1, edge.x2, edge.y2)}
                fill="none"
                stroke={edge.color}
                strokeWidth={2}
                strokeOpacity={0.85}
                markerEnd="url(#mk-gray)"
                style={{ pointerEvents: 'none' }}
              />
              <circle
                cx={edge.x2}
                cy={edge.y2}
                r={7}
                fill="white"
                stroke={edge.color}
                strokeWidth={2}
                style={{ cursor: 'crosshair' }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemoveLink(edge.link);
                  startWireDrag(e, linkFromEdge(edge.link), edge.link);
                }}
              />
            </g>
          ))}
          {wireDrag ? (
            <path
              d={edgePath(wireDrag.x1, wireDrag.y1, wireDrag.x2, wireDrag.y2)}
              fill="none"
              stroke={wireDrag.color}
              strokeWidth={2.5}
              strokeDasharray="6 4"
              strokeOpacity={0.9}
              style={{ pointerEvents: 'none' }}
            />
          ) : null}
        </svg>

        {doc.levels.map((lv) => {
          const pct = pctOf('level', lv.code, lv.canvas_position?.x, lv.canvas_position?.y);
          const sel = isSelected({ kind: 'level', code: lv.code });
          const evs = eventsForLevel(doc, lv.code);
          const open = !!expanded[lv.code];
          return (
            <div
              key={lv.code}
              data-flow-node
              style={{
                ...css.nodeLevel,
                left: `${pct.x}%`,
                top: `${pct.y}%`,
                borderColor: sel ? TOKENS.colors.text : 'rgba(255,255,255,0.12)',
                boxShadow: sel ? '0 0 0 2px rgba(242,242,244,0.2)' : undefined,
              }}
              onPointerDown={(e) =>
                onNodePointerDown(e, 'level', lv.code, { kind: 'level', code: lv.code })
              }
              onClick={() => onNodeClick({ kind: 'level', code: lv.code })}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect({ kind: 'level', code: lv.code });
                setCtx({ kind: 'node', x: e.clientX, y: e.clientY, sel: { kind: 'level', code: lv.code } });
              }}
            >
              <button
                type="button"
                data-no-drag
                data-port={portId('level-in', lv.code)}
                style={{ ...css.port, ...css.portIn, background: '#78716c' }}
                title="输入连接点"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkFrom) onDropLink({ kind: 'level', code: lv.code });
                  else onSelect({ kind: 'level', code: lv.code });
                }}
              />
              <button
                type="button"
                data-no-drag
                data-port={portId('level-out', lv.code)}
                style={{
                  ...css.port,
                  ...css.portOut,
                  background: '#d97706',
                  transform: linkActive({ kind: 'level', code: lv.code })
                    ? 'translateY(-50%) scale(1.25)'
                    : 'translateY(-50%)',
                }}
                title="按住拖到下一关左侧圆点"
                onPointerDown={(e) => startWireDrag(e, { kind: 'level', code: lv.code })}
              />
              <div style={css.nodeBody}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={css.nodeTitle}>{lv.title || '未命名关卡'}</div>
                  <div style={css.nodeMeta}>
                    {lv.is_start ? <span style={{ color: '#fbbf24' }}>起点 · </span> : null}
                    {evs.length} 个事件
                  </div>
                </div>
                <button
                  type="button"
                  data-no-drag
                  style={css.expandBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(lv.code);
                    refreshEdges();
                  }}
                >
                  {open ? '收起' : '展开'}
                </button>
              </div>
              {open ? (
                <div data-no-drag style={css.eventList}>
                  {!evs.length ? (
                    <div style={css.emptyEv}>暂无事件</div>
                  ) : (
                    evs.map((ev) => {
                      const evSel = isSelected({ kind: 'event', id: ev.event_id });
                      const efx = parseEventEffects(ev.effects);
                      const effectText = efx.length
                        ? efx.map((ef) => eventEffectSummary(ef, doc, flags)).join(' · ')
                        : '（尚未添加结果）';
                      return (
                        <div
                          key={ev.event_id}
                          style={{
                            ...css.eventCard,
                            borderColor: evSel ? '#0369a1' : 'rgba(56,189,248,0.25)',
                            boxShadow: evSel ? '0 0 0 1px rgba(14,165,233,0.45)' : undefined,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNodeClick({ kind: 'event', id: ev.event_id });
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect({ kind: 'event', id: ev.event_id });
                            setCtx({
                              kind: 'node',
                              x: e.clientX,
                              y: e.clientY,
                              sel: { kind: 'event', id: ev.event_id },
                            });
                          }}
                        >
                          <div style={css.eventTitle}>
                            {eventTriggerSummary(ev.trigger, doc, flags)}
                          </div>
                          <div style={css.eventMeta}>{effectText}</div>
                          <button
                            type="button"
                            data-no-drag
                            data-port={portId('event-out', ev.event_id)}
                            style={{
                              ...css.port,
                              ...css.portOut,
                              background: '#0ea5e9',
                              top: '50%',
                            }}
                            title="按住拖到关卡 / 图鉴 / 结局"
                            onPointerDown={(e) => startWireDrag(e, { kind: 'event', id: ev.event_id })}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        {(doc.gallery || []).map((g) => {
          const pct = pctOf('gallery', g.gallery_id, g.canvas_position?.x ?? 72, g.canvas_position?.y ?? 30);
          const sel = isSelected({ kind: 'gallery', id: g.gallery_id });
          return (
            <div
              key={g.gallery_id}
              data-flow-node
              style={{
                ...css.nodeGallery,
                left: `${pct.x}%`,
                top: `${pct.y}%`,
                boxShadow: sel ? '0 0 0 2px rgba(168,85,247,0.45)' : undefined,
              }}
              onPointerDown={(e) =>
                onNodePointerDown(e, 'gallery', g.gallery_id, { kind: 'gallery', id: g.gallery_id })
              }
              onClick={() => onNodeClick({ kind: 'gallery', id: g.gallery_id })}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect({ kind: 'gallery', id: g.gallery_id });
                setCtx({
                  kind: 'node',
                  x: e.clientX,
                  y: e.clientY,
                  sel: { kind: 'gallery', id: g.gallery_id },
                });
              }}
            >
              <button
                type="button"
                data-no-drag
                data-port={portId('gallery-in', g.gallery_id)}
                style={{ ...css.port, left: -6, top: '50%', background: '#a855f7' }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkFrom) onDropLink({ kind: 'gallery', id: g.gallery_id });
                  else onSelect({ kind: 'gallery', id: g.gallery_id });
                }}
              />
              <div style={css.tagPurple}>图鉴</div>
              <div style={css.nodeTitle}>{g.title || '未命名'}</div>
            </div>
          );
        })}

        {(doc.endings?.nodes || []).map((n) => {
          const pct = pctOf('ending', n.ending_id, n.canvas_position?.x ?? 90, n.canvas_position?.y ?? 50);
          const sel = isSelected({ kind: 'ending', id: n.ending_id });
          return (
            <div
              key={n.ending_id}
              data-flow-node
              style={{
                ...css.nodeEnding,
                left: `${pct.x}%`,
                top: `${pct.y}%`,
                opacity: doc.endings.enabled ? 1 : 0.5,
                boxShadow: sel ? '0 0 0 2px rgba(244,63,94,0.45)' : undefined,
              }}
              onPointerDown={(e) =>
                onNodePointerDown(e, 'ending', n.ending_id, { kind: 'ending', id: n.ending_id })
              }
              onClick={() => onNodeClick({ kind: 'ending', id: n.ending_id })}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect({ kind: 'ending', id: n.ending_id });
                setCtx({
                  kind: 'node',
                  x: e.clientX,
                  y: e.clientY,
                  sel: { kind: 'ending', id: n.ending_id },
                });
              }}
            >
              <button
                type="button"
                data-no-drag
                data-port={portId('ending-in', n.ending_id)}
                style={{ ...css.port, left: -6, top: '50%', background: '#e11d48' }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkFrom) onDropLink({ kind: 'ending', id: n.ending_id });
                  else onSelect({ kind: 'ending', id: n.ending_id });
                }}
              />
              <div style={css.tagRose}>结局</div>
              <div style={css.nodeTitle}>{n.title || '未命名'}</div>
            </div>
          );
        })}
      </div>

      {ctx ? (
        <div
          style={{
            ...css.ctx,
            left: ctx.x,
            top: ctx.y,
          }}
        >
          <button
            type="button"
            style={css.ctxItem}
            onClick={() => {
              if (ctx.kind === 'edge') onRemoveLink(ctx.link);
              else onRemoveNode(ctx.sel);
              setCtx(null);
            }}
          >
            {ctx.kind === 'edge'
              ? '删除连线'
              : ctx.sel.kind === 'level'
                ? '删除关卡'
                : ctx.sel.kind === 'event'
                  ? '删除事件'
                  : ctx.sel.kind === 'gallery'
                    ? '删除图鉴'
                    : '删除结局'}
          </button>
          <button type="button" style={css.ctxItemMuted} onClick={() => setCtx(null)}>
            取消
          </button>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    position: 'relative',
    height: '100%',
    minHeight: 520,
    overflow: 'hidden',
    borderRadius: 12,
    border: `1px solid ${TOKENS.colors.cardBorderFaint}`,
    background: '#0c0e14',
    userSelect: 'none',
  },
  hintLeft: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 30,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  amberHint: {
    borderRadius: 8,
    background: 'rgba(251,191,36,0.9)',
    color: '#1c1917',
    fontSize: 12,
    padding: '6px 10px',
  },
  mutedHint: {
    borderRadius: 8,
    background: 'rgba(20,24,32,0.92)',
    color: 'rgba(198,200,206,0.85)',
    fontSize: 10,
    padding: '6px 10px',
  },
  toolbar: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    border: `1px solid ${TOKENS.colors.cardBorder}`,
    background: 'rgba(20,24,32,0.95)',
    padding: 4,
  },
  toolBtn: {
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: TOKENS.colors.text,
    cursor: 'pointer',
    fontSize: 14,
  },
  toolLabel: {
    minWidth: 44,
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: TOKENS.colors.textSecondary,
    cursor: 'pointer',
    fontSize: 10,
    fontVariantNumeric: 'tabular-nums',
  },
  toolText: {
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: TOKENS.colors.textSecondary,
    cursor: 'pointer',
    fontSize: 10,
    padding: '0 8px',
  },
  board: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '220%',
    height: '220%',
    transformOrigin: 'top left',
    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(232,228,220,0.12) 1px, transparent 0)',
    backgroundSize: '20px 20px',
  },
  svg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: 5,
  },
  nodeLevel: {
    position: 'absolute',
    zIndex: 10,
    width: 224,
    transform: 'translate(-50%, -50%)',
    cursor: 'grab',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(20,24,32,0.95)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  },
  nodeGallery: {
    position: 'absolute',
    zIndex: 10,
    width: 160,
    transform: 'translate(-50%, -50%)',
    cursor: 'grab',
    borderRadius: 10,
    border: '1px solid rgba(168,85,247,0.35)',
    background: 'rgba(46,16,64,0.92)',
    padding: '10px 12px 10px 14px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  },
  nodeEnding: {
    position: 'absolute',
    zIndex: 10,
    width: 160,
    transform: 'translate(-50%, -50%)',
    cursor: 'grab',
    borderRadius: 10,
    border: '1px solid rgba(244,63,94,0.35)',
    background: 'rgba(64,16,28,0.92)',
    padding: '10px 12px 10px 14px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  },
  port: {
    position: 'absolute',
    zIndex: 20,
    width: 14,
    height: 14,
    borderRadius: 999,
    border: '2px solid #fff',
    padding: 0,
    cursor: 'crosshair',
    transform: 'translateY(-50%)',
  },
  portIn: { left: -6, top: 20 },
  portOut: { right: -6, top: 20 },
  nodeBody: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 4,
    padding: '8px 12px',
  },
  nodeTitle: {
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nodeMeta: {
    marginTop: 2,
    color: TOKENS.colors.textMuted,
    fontSize: 10,
  },
  expandBtn: {
    flexShrink: 0,
    borderRadius: 6,
    border: `1px solid ${TOKENS.colors.cardBorder}`,
    background: 'transparent',
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    padding: '2px 6px',
    cursor: 'pointer',
  },
  eventList: {
    borderTop: `1px solid ${TOKENS.colors.cardBorderFaint}`,
    padding: '6px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  emptyEv: {
    textAlign: 'center',
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    padding: '8px 0',
  },
  eventCard: {
    position: 'relative',
    borderRadius: 8,
    border: '1px solid rgba(56,189,248,0.25)',
    background: 'rgba(14,40,64,0.9)',
    padding: '6px 16px 6px 8px',
    cursor: 'pointer',
  },
  eventTitle: {
    color: '#e0f2fe',
    fontSize: 10,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingRight: 10,
  },
  eventMeta: {
    marginTop: 2,
    color: 'rgba(251,191,36,0.85)',
    fontSize: 9,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingRight: 10,
  },
  tagPurple: {
    color: '#d8b4fe',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tagRose: {
    color: '#fda4af',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  ctx: {
    position: 'fixed',
    zIndex: 50,
    minWidth: 120,
    borderRadius: 10,
    border: `1px solid ${TOKENS.colors.cardBorder}`,
    background: 'rgba(16,19,26,0.98)',
    padding: '4px 0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  },
  ctxItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    color: TOKENS.colors.accent,
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  ctxItemMuted: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    padding: '10px 14px',
    cursor: 'pointer',
  },
};
