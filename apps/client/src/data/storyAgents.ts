import { AGENTS as S0_01_AGENTS } from './s0_01/scene';
import { AGENTS as S0_03_AGENTS } from './s0_03/scene';
import { AGENTS as S0_04_AGENTS } from './s0_04/scene';
import type { AgentProfile } from '../engine/types';

export const AGENTS: Record<string, AgentProfile> = {
  ...S0_01_AGENTS,
  ...S0_03_AGENTS,
  ...S0_04_AGENTS,
};
