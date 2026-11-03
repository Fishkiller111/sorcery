import type { ImageSourcePropType } from 'react-native';
import { appStaticImage } from '../utils/appStaticAssets';

export type ImageGenTemplate = {
  id: string;
  preview: ImageSourcePropType;
  promptKey: string;
  /** Short UI label key under creationCenter.* */
  labelKey: string;
  /** Optional backend tag codes applied when this template is selected */
  tagCodes?: string[];
  /** Suggested aspect ratio for this look */
  aspectRatio: '9:16' | '1:1' | '16:9';
};

/** Fixed template previews shown in Creation Center → Generate Image */
export const IMAGE_GEN_TEMPLATES: ImageGenTemplate[] = [
  {
    id: 'realistic_female',
    preview: appStaticImage('ui/creation-center/image-gen/template_realistic_female.webp'),
    promptKey: 'creationCenter.templatePromptRealisticFemale',
    labelKey: 'creationCenter.templateLabelRealisticFemale',
    aspectRatio: '9:16',
  },
  {
    id: 'realistic_male',
    preview: appStaticImage('ui/creation-center/image-gen/template_realistic_male.webp'),
    promptKey: 'creationCenter.templatePromptRealisticMale',
    labelKey: 'creationCenter.templateLabelRealisticMale',
    aspectRatio: '9:16',
  },
  {
    id: 'fantasy',
    preview: appStaticImage('ui/creation-center/image-gen/template_fantasy.webp'),
    promptKey: 'creationCenter.templatePromptFantasy',
    labelKey: 'creationCenter.templateLabelFantasy',
    aspectRatio: '9:16',
  },
  {
    id: 'romantic',
    preview: appStaticImage('ui/creation-center/image-gen/template_romantic.webp'),
    promptKey: 'creationCenter.templatePromptRomantic',
    labelKey: 'creationCenter.templateLabelRomantic',
    aspectRatio: '9:16',
  },
];
