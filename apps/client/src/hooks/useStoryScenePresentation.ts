import { useCallback, useEffect, useRef, useState } from 'react';
import type { BeatId } from '../engine/types';
import type { VisualInsertDef } from '../data/visualInsertTypes';
import {
  findVisualInsertById,
  getVisualInsertsForScene,
  hasScenePresentation,
} from '../data/storyPresentationRegistry';
import { S0_04_CHAPTER_END_INSERTS } from '../data/s0_04/visualInserts';
import { isStoryAudioKey } from '../data/storyAudioRegistry';
import {
  findBeatEnterInserts,
  findIntentInsert,
  findRoundGteInsert,
} from '../utils/matchVisualInsert';
import { ambienceCrossfadeMs, ambienceForBeat, storyAudioPlayer } from '../utils/storyAudioPlayer';
import type { ChatMessage } from '../engine/types';
import type { StoryRewardStagePayload } from '../types/story';

export interface ActiveVisualInsert {
  id: string;
  image: string;
  fadeInMs: number;
  fadeOutMs: number;
}

type PendingInsert = { def: VisualInsertDef; beatId: BeatId };
type PendingSfx = { sfx: string; duckDb: number };

interface Options {
  sceneId: string;
  currentBeat: BeatId;
  messages: ChatMessage[];
  isGenerating: boolean;
  awaitingAssistantReply: boolean;
  rewardActive: boolean;
  rewardStage: StoryRewardStagePayload | null;
  rewardBranchId?: string | null;
  badEndVisible: boolean;
  sceneClearPending?: boolean;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useStoryScenePresentation({
  sceneId,
  currentBeat,
  messages,
  isGenerating,
  awaitingAssistantReply,
  rewardActive,
  rewardStage,
  rewardBranchId,
  badEndVisible,
  sceneClearPending = false,
}: Options) {
  const [activeInsert, setActiveInsert] = useState<ActiveVisualInsert | null>(null);
  const [chapterEndActive, setChapterEndActive] = useState(false);
  const playedRef = useRef(new Set<string>());
  const beatRoundRef = useRef<Record<string, number>>({});
  const prevBeatRef = useRef<BeatId | null>(null);
  const prevBadEndRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingChainRef = useRef<{ def: VisualInsertDef; beatId: BeatId } | null>(null);
  const activeInsertIdRef = useRef<string | null>(null);
  const chapterEndStartedRef = useRef(false);
  const whistleRunningRef = useRef(false);
  const pendingInsertsRef = useRef<PendingInsert[]>([]);
  const pendingSfxRef = useRef<PendingSfx[]>([]);
  const displayQueueRef = useRef<PendingInsert[]>([]);

  const presentationEnabled = hasScenePresentation(sceneId);

  const queueInsert = useCallback((def: VisualInsertDef, beatId: BeatId) => {
    pendingInsertsRef.current.push({ def, beatId });
  }, []);

  const queueSfx = useCallback((sfx: string, duckDb = -6) => {
    pendingSfxRef.current.push({ sfx, duckDb });
  }, []);

  const flushPendingPresentation = useCallback(() => {
    const inserts = pendingInsertsRef.current;
    const sfxs = pendingSfxRef.current;
    pendingInsertsRef.current = [];
    pendingSfxRef.current = [];
    for (const { sfx, duckDb } of sfxs) {
      if (isStoryAudioKey(sfx)) {
        storyAudioPlayer.playSfx(sfx, duckDb);
      }
    }
    for (const { def, beatId } of inserts) {
      showInsertRef.current?.(def, beatId);
    }
  }, []);

  const canFlushPresentation = useCallback(() => {
    if (rewardActive) {
      return !!(rewardStage?.text?.trim());
    }
    return !awaitingAssistantReply;
  }, [rewardActive, rewardStage?.text, awaitingAssistantReply]);

  useEffect(() => {
    if (
      pendingInsertsRef.current.length === 0 &&
      pendingSfxRef.current.length === 0
    ) {
      return;
    }
    if (canFlushPresentation()) {
      flushPendingPresentation();
    }
  }, [
    messages,
    isGenerating,
    awaitingAssistantReply,
    rewardActive,
    rewardStage?.text,
    canFlushPresentation,
    flushPendingPresentation,
  ]);

  useEffect(() => {
    if (prevBadEndRef.current && !badEndVisible) {
      playedRef.current.clear();
      beatRoundRef.current = {};
      chapterEndStartedRef.current = false;
      whistleRunningRef.current = false;
      pendingInsertsRef.current = [];
      pendingSfxRef.current = [];
      displayQueueRef.current = [];
    }
    prevBadEndRef.current = badEndVisible;
  }, [badEndVisible]);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    hideTimerRef.current = null;
    enterTimerRef.current = null;
  }, []);

  const showInsertRef = useRef<((def: VisualInsertDef, beatId: BeatId) => void) | null>(null);
  const drainDisplayQueueRef = useRef<(() => void) | null>(null);

  const presentInsert = useCallback(
    (def: VisualInsertDef, beatId: BeatId) => {
      if (!presentationEnabled) return;
      playedRef.current.add(`${beatId}:${def.id}`);
      activeInsertIdRef.current = def.id;

      if (def.sfx && isStoryAudioKey(def.sfx)) {
        storyAudioPlayer.playSfx(def.sfx, def.duckAmbienceDb ?? -6);
      }

      if (def.chainNext) {
        const next = findVisualInsertById(sceneId, def.chainNext);
        pendingChainRef.current = next ? { def: next, beatId } : null;
      } else {
        pendingChainRef.current = null;
      }

      setActiveInsert({
        id: def.id,
        image: def.image,
        fadeInMs: def.fadeInMs ?? 300,
        fadeOutMs: def.fadeOutMs ?? 400,
      });
    },
    [sceneId, presentationEnabled],
  );

  const drainDisplayQueue = useCallback(() => {
    if (activeInsertIdRef.current) return;
    const next = displayQueueRef.current.shift();
    if (!next) return;
    presentInsert(next.def, next.beatId);
  }, [presentInsert]);

  drainDisplayQueueRef.current = drainDisplayQueue;

  const enqueueInsertDisplay = useCallback(
    (def: VisualInsertDef, beatId: BeatId) => {
      if (!presentationEnabled) return;
      if (activeInsertIdRef.current) {
        displayQueueRef.current.push({ def, beatId });
        return;
      }
      if (hideTimerRef.current) {
        displayQueueRef.current.push({ def, beatId });
        return;
      }
      presentInsert(def, beatId);
    },
    [presentationEnabled, presentInsert],
  );

  const startWhistleChain = useCallback(() => {
    if (sceneId !== 's0_04' || whistleRunningRef.current) return;
    if (playedRef.current.has('beat_2:whistle')) return;
    playedRef.current.add('beat_2:whistle');
    whistleRunningRef.current = true;
    void (async () => {
      await storyAudioPlayer.playMusic('s0_04_music_whistle', -8);
      whistleRunningRef.current = false;
      const stopInsert = findVisualInsertById('s0_04', 'I-04-04');
      if (stopInsert && !playedRef.current.has('beat_2:I-04-04')) {
        showInsertRef.current?.(stopInsert, 'beat_2');
      }
    })();
  }, [sceneId]);

  const dismissInsert = useCallback(() => {
    setActiveInsert((prev) => {
      if (!prev) return null;

      if (sceneId === 's0_04' && prev.id === 'I-04-03') {
        startWhistleChain();
      }

      const chain = pendingChainRef.current;
      pendingChainRef.current = null;
      activeInsertIdRef.current = null;

      if (chain) {
        displayQueueRef.current.unshift(chain);
      }

      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        drainDisplayQueueRef.current?.();
      }, 350);

      return null;
    });
  }, [sceneId, startWhistleChain]);

  const showInsert = useCallback(
    (def: VisualInsertDef, beatId: BeatId) => {
      if (!presentationEnabled) return;
      enqueueInsertDisplay(def, beatId);
    },
    [presentationEnabled, enqueueInsertDisplay],
  );

  showInsertRef.current = showInsert;

  useEffect(() => {
    if (!presentationEnabled || badEndVisible) return;
    const amb = ambienceForBeat(sceneId, currentBeat);
    const crossfade = ambienceCrossfadeMs(sceneId, prevBeatRef.current, currentBeat);
    void storyAudioPlayer.setAmbience(amb, crossfade);
    prevBeatRef.current = currentBeat;
  }, [sceneId, currentBeat, badEndVisible, presentationEnabled]);

  useEffect(() => {
    if (!presentationEnabled || badEndVisible) return;
    const inserts = getVisualInsertsForScene(sceneId);
    const defs = findBeatEnterInserts(inserts, currentBeat, playedRef.current);
    if (!defs.length) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const def of defs) {
      const delay = def.trigger.type === 'beat_enter' ? def.trigger.delayMs ?? 0 : 0;
      timers.push(setTimeout(() => showInsert(def, currentBeat), delay));
    }

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [sceneId, currentBeat, badEndVisible, showInsert, presentationEnabled]);

  useEffect(() => {
    if (!presentationEnabled || !rewardStage) return;
    if (sceneId === 's0_01' && rewardStage.round >= 3 && rewardBranchId === 'R02') {
      if (!playedRef.current.has(`${currentBeat}:R02-sfx`)) {
        playedRef.current.add(`${currentBeat}:R02-sfx`);
        queueSfx('s0_01_r02_sfx_cough_blood', -6);
      }
    }
    if (sceneId === 's0_03' && rewardStage.round >= 2 && rewardBranchId === 'R06') {
      const r06 = findVisualInsertById(sceneId, 'I-R06-01');
      if (r06 && !playedRef.current.has(`${currentBeat}:${r06.id}`)) {
        playedRef.current.add(`${currentBeat}:${r06.id}`);
        queueInsert(r06, currentBeat);
      } else if (!playedRef.current.has(`${currentBeat}:R06-sfx`)) {
        playedRef.current.add(`${currentBeat}:R06-sfx`);
        queueSfx('s0_03_r06_sfx_projector', -6);
      }
    }
    if (sceneId === 's0_04' && rewardStage.round >= 2 && rewardBranchId === 'R04') {
      const r04 = findVisualInsertById(sceneId, 'I-R04-01');
      if (r04 && !playedRef.current.has(`${currentBeat}:${r04.id}`)) {
        playedRef.current.add(`${currentBeat}:${r04.id}`);
        queueInsert(r04, currentBeat);
      }
    }
  }, [
    sceneId,
    currentBeat,
    rewardStage?.round,
    rewardBranchId,
    presentationEnabled,
    queueInsert,
    queueSfx,
  ]);

  useEffect(() => {
    if (sceneId !== 's0_04' || !sceneClearPending || badEndVisible || chapterEndStartedRef.current) {
      return;
    }
    chapterEndStartedRef.current = true;
    setChapterEndActive(true);

    void (async () => {
      await storyAudioPlayer.setAmbience(null);
      for (const def of S0_04_CHAPTER_END_INSERTS) {
        if (def.sfx && isStoryAudioKey(def.sfx)) {
          storyAudioPlayer.playSfx(def.sfx, def.duckAmbienceDb ?? -6);
        }
        setActiveInsert({
          id: def.id,
          image: def.image,
          fadeInMs: def.fadeInMs ?? 300,
          fadeOutMs: def.fadeOutMs ?? 400,
        });
        await sleep(def.durationMs);
        setActiveInsert(null);
        await sleep(280);
      }
      if (isStoryAudioKey('s0_04_amb_silence')) {
        storyAudioPlayer.playSfx('s0_04_amb_silence', 0);
      }
      await sleep(500);
      setChapterEndActive(false);
    })();
  }, [sceneId, sceneClearPending, badEndVisible]);

  useEffect(() => {
    if (badEndVisible) {
      setActiveInsert(null);
      pendingChainRef.current = null;
      activeInsertIdRef.current = null;
      displayQueueRef.current = [];
      void storyAudioPlayer.setAmbience(null);
    }
  }, [badEndVisible]);

  useEffect(() => () => {
    clearTimers();
    void storyAudioPlayer.stopAll();
  }, [clearTimers]);

  const onUserSend = useCallback(
    (text: string) => {
      if (!presentationEnabled || badEndVisible) return;

      const inserts = getVisualInsertsForScene(sceneId);
      const count = (beatRoundRef.current[currentBeat] ?? 0) + 1;
      beatRoundRef.current[currentBeat] = count;

      const intentIns = findIntentInsert(inserts, currentBeat, text, playedRef.current);
      if (intentIns) {
        queueInsert(intentIns, currentBeat);
        return;
      }

      const roundIns = findRoundGteInsert(inserts, currentBeat, count, playedRef.current);
      if (roundIns) {
        queueInsert(roundIns, currentBeat);
      }
    },
    [sceneId, currentBeat, badEndVisible, queueInsert, presentationEnabled],
  );

  return {
    activeInsert,
    onUserSend,
    dismissInsert,
    insertBlocking: activeInsert !== null,
    chapterEndActive,
  };
}
