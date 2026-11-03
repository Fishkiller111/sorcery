import type { OptionDef } from '../types';

export const GENDER_OPTIONS: OptionDef[] = [
  { id: 'female', labelKey: 'createAgent.wizard.genderFemale', emoji: '♀', appearancePart: 'female' },
  { id: 'male', labelKey: 'createAgent.wizard.genderMale', emoji: '♂', appearancePart: 'male' },
  { id: 'neutral', labelKey: 'createAgent.wizard.genderNeutral', emoji: '⚧', appearancePart: 'androgynous' },
];

export const ART_STYLE_OPTIONS: OptionDef[] = [
  { id: 'realistic', labelKey: 'createAgent.wizard.artRealistic', emoji: '📷', appearancePart: 'realistic art style' },
  { id: 'anime', labelKey: 'createAgent.wizard.artAnime', emoji: '✨', appearancePart: 'anime art style' },
];
