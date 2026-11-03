import { LocalizedString } from '../i18n/types';

export type SceneId = 's0_01' | 's0_03' | 's0_04';
export type BeatId = 'prologue' | 'beat_1' | 'beat_2' | 'beat_3' | 'beat_4' | 'beat_4_reward' | 'beat_5' | 'scene_clear';
export type AgentId =
  | 'narrator'
  | 'foreman'
  | 'katya'
  | 'lucy'
  | 'old_bell'
  | 'anna'
  | 'player'
  | 'system';
export type ContentTier = 'standard' | 'mature';
export type BeatType = 'solitary' | 'dialogue' | 'parallel';
export type TransitionType = 'continue' | 'beat_advance' | 'reward_enter' | 'bad_end' | 'scene_clear';

export interface QuickPhrase {
  id: string;
  text: LocalizedString;
  intent?: string;
  setsFlag?: string;
  rewardHint?: boolean;
}

export interface FailTrigger {
  id: string;
  keywords: string[];
  languages?: ('english' | 'russian' | 'chinese')[];
}

export interface RewardEntry {
  branchId: string;
  minRounds: number;
  topics: string[];
  hintText: LocalizedString;
}

export interface BeatConfig {
  beatId: BeatId;
  type: BeatType;
  location: LocalizedString;
  time: LocalizedString;
  agent: AgentId;
  agentsPresent?: AgentId[];
  backgroundImage: string;
  openingNarration: LocalizedString;
  advanceNarration?: LocalizedString;
  chatGoal?: LocalizedString;
  taskHint?: LocalizedString;
  requiredFlags?: string[];
  passCondition: PassCondition;
  quickPhrases: QuickPhrase[];
  failTriggers?: FailTrigger[];
  rewardEntry?: RewardEntry;
}

export interface PassCondition {
  type: 'all_of' | 'any_of' | 'flag_set';
  flags?: string[];
  minRounds?: number;
}

export interface RewardStage {
  round: number;
  agent: AgentId;
  text: LocalizedString;
  standardImage?: string;
  matureImage?: string;
  sound?: string;
}

export interface RewardBranch {
  branchId: string;
  enterBeat: BeatId;
  returnBeat: BeatId;
  stages: RewardStage[];
  setFlagsOnComplete: string[];
}

export interface BadEndStep {
  step: number;
  text?: LocalizedString;
  sound?: string;
  sfx?: string;
  matureSfx?: string;
  insertImage?: string;
  standardImage?: string;
  matureImage?: string;
  durationMs: number;
}

export interface BadEndConfig {
  badEndId: string;
  triggerId: string;
  rollbackCheckpoint: BeatId;
  retryHint: LocalizedString;
  minSeconds: number;
  skipAfterFirstImage: boolean;
  steps: BadEndStep[];
}

export interface AgentResponseEntry {
  beatId: BeatId;
  agent: AgentId;
  keywords: string[];
  text: LocalizedString;
}

export interface SceneConfig {
  sceneId: SceneId;
  title: LocalizedString;
  playerRole: PlayerRole;
  entryCheckpoint: BeatId;
  passCondition: PassCondition;
  beats: BeatConfig[];
  rewards: RewardBranch[];
  badEnds: BadEndConfig[];
  agentResponses: AgentResponseEntry[];
}

export interface PlayerRole {
  character: 'emily';
  name: LocalizedString;
  mask: LocalizedString;
}

export interface ChatMessage {
  id: string;
  agent: AgentId | 'player';
  text: string;
  timestamp: number;
  type: 'system' | 'player' | 'agent' | 'image';
  imageUri?: string;
  flagTrigger?: string;
}

export interface SceneState {
  sceneId: SceneId;
  currentBeat: BeatId;
  flags: Record<string, boolean>;
  messages: ChatMessage[];
  matureEnabled: boolean;
  matureGateShown: boolean;
  rewardSeen: string[];
  badEndSeen: string[];
  rewardRoundsInBeat4: number;
}

export interface IntentResult {
  detected: boolean;
  intent: string;
  flagsToSet: string[];
  failTrigger?: string;
  rewardTrigger?: boolean;
}

export interface SceneTransition {
  type: TransitionType;
  toBeat?: BeatId;
  branchId?: string;
  badEndId?: string;
}

export interface AgentResponse {
  text: string;
  agent: AgentId;
  imageUri?: string;
}

export interface AgentProfile {
  id: AgentId;
  name: string;
  nameEn?: string;
  nameJp?: string;
  nameRu?: string;
  nameEs?: string;
  color: string;
  avatar?: string;
  portrait?: string;
}
