/**
 * Client-side judge prompt presets (S4) when templates API is unavailable.
 * Aligns with hybrid judge: creator criteria appended to the referee system prompt.
 */
export type SimulatorJudgePreset = {
  id: string;
  /** i18n key under simulator.judgePreset.* */
  labelKey: string;
  prompt: string;
};

export const SIMULATOR_JUDGE_PRESETS: SimulatorJudgePreset[] = [
  {
    id: 'strict',
    labelKey: 'simulator.judgePreset.strict',
    prompt:
      'Win only when the player clearly and explicitly completes the stated goal. Prefer continue on ambiguity. Fail only on clear fail conditions.',
  },
  {
    id: 'balanced',
    labelKey: 'simulator.judgePreset.balanced',
    prompt:
      'Win when the goal is reasonably achieved by implication or clear progress. Fail when fail conditions are strongly indicated. Otherwise continue.',
  },
  {
    id: 'lenient',
    labelKey: 'simulator.judgePreset.lenient',
    prompt:
      'Favor continue unless victory or failure is unmistakable. Give the player room to roleplay; do not fail on minor missteps.',
  },
];
