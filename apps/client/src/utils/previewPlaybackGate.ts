import { useEffect, useState } from 'react';

type Listener = (activeId: string | null) => void;

/** 全局同时只允许一个 hover 预览视频占用 */
let activePreviewId: string | null = null;
const listeners = new Set<Listener>();

function notify(next: string | null) {
  for (const listener of listeners) listener(next);
}

/** hover 进入时抢占播放权 */
export function claimPreviewPlayback(id: string): void {
  if (activePreviewId === id) return;
  activePreviewId = id;
  notify(activePreviewId);
}

/** hover 离开时释放（仅释放自己持有的） */
export function releasePreviewPlayback(id: string): void {
  if (activePreviewId !== id) return;
  activePreviewId = null;
  notify(null);
}

export function getActivePreviewPlaybackId(): string | null {
  return activePreviewId;
}

/** 当前卡片是否持有预览播放权 */
export function usePreviewPlaybackOwner(id: string): boolean {
  const [activeId, setActiveId] = useState(activePreviewId);

  useEffect(() => {
    const onChange: Listener = (next) => setActiveId(next);
    listeners.add(onChange);
    setActiveId(activePreviewId);
    return () => {
      listeners.delete(onChange);
      // 卸载时释放，避免悬挂占用
      releasePreviewPlayback(id);
    };
  }, [id]);

  return activeId === id;
}
