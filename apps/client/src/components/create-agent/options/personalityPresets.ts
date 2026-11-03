import type { OptionDef } from '../types';

export const PERSONALITY_PRESETS: OptionDef[] = [
  { id: 'calm', labelKey: 'createAgent.wizard.presetCalm', emoji: '🌿' },
  { id: 'witty', labelKey: 'createAgent.wizard.presetWitty', emoji: '💬' },
  { id: 'romantic', labelKey: 'createAgent.wizard.presetRomantic', emoji: '💕' },
  { id: 'mysterious', labelKey: 'createAgent.wizard.presetMysterious', emoji: '🌙' },
  { id: 'playful', labelKey: 'createAgent.wizard.presetPlayful', emoji: '🎭' },
  { id: 'stoic', labelKey: 'createAgent.wizard.presetStoic', emoji: '🗿' },
  { id: 'caring', labelKey: 'createAgent.wizard.presetCaring', emoji: '🤍' },
  { id: 'bold', labelKey: 'createAgent.wizard.presetBold', emoji: '🔥' },
];

export function presetTag(id: string): string {
  return id;
}
