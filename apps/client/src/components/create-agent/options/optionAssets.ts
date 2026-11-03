import type { ImageSourcePropType } from 'react-native';
import { appStaticImage } from '../../../utils/appStaticAssets';

export const OPTION_CARD_BG = require('../../../../assets/images/ui/create-agent/background.png');

/** 768×1024 — matches `background.png` */
export const OPTION_CARD_ASPECT = 768 / 1024;

// 非 R18：本地 standard 图集。R18 图在 R2，不打进 IPA。

const STYLE_GENDER: Record<string, Record<string, ImageSourcePropType>> = {
  female: {
    realistic: require('../../../../assets/images/ui/create-agent/options/standard/style/style_gender_female_realistic.webp'),
    anime: require('../../../../assets/images/ui/create-agent/options/standard/style/style_gender_female_anime.webp'),
  },
  male: {
    realistic: require('../../../../assets/images/ui/create-agent/options/standard/style/style_gender_male_realistic.webp'),
    anime: require('../../../../assets/images/ui/create-agent/options/standard/style/style_gender_male_anime.webp'),
  },
  neutral: {
    realistic: require('../../../../assets/images/ui/create-agent/options/standard/style/style_gender_neutral_realistic.webp'),
    anime: require('../../../../assets/images/ui/create-agent/options/standard/style/style_gender_neutral_anime.webp'),
  },
};

const ETHNICITY: Record<string, ImageSourcePropType> = {
  asian: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_ethnicity_asian.webp'),
  white: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_ethnicity_white.webp'),
  black: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_ethnicity_black.webp'),
  latina: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_ethnicity_latina.webp'),
  middle_eastern: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_ethnicity_middle_eastern.webp'),
  fantasy: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_ethnicity_fantasy.webp'),
};

const HAIR: Record<string, ImageSourcePropType> = {
  long: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_long.webp'),
  short: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_short.webp'),
  wavy: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_wavy.webp'),
  braided: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_braided.webp'),
  ponytail: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_ponytail.webp'),
  bun: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_bun.webp'),
  shag: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_shag.webp'),
  pigtails: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_pigtails.webp'),
  side_bangs: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_side_bangs.webp'),
  crown_braid: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_crown_braid.webp'),
  buzz: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_buzz.webp'),
  hime: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_hime.webp'),
  bald: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_bald.webp'),
  pixie: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_hair_pixie.webp'),
};

const BODY: Record<string, ImageSourcePropType> = {
  slim: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_body_slim.webp'),
  athletic: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_body_athletic.webp'),
  curvy: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_body_curvy.webp'),
  muscular: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_body_muscular.webp'),
  average: require('../../../../assets/images/ui/create-agent/options/standard/basics/basics_body_average.webp'),
};

const PERSONALITY: Record<string, ImageSourcePropType> = {
  calm: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_calm.webp'),
  witty: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_witty.webp'),
  romantic: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_romantic.webp'),
  mysterious: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_mysterious.webp'),
  playful: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_playful.webp'),
  stoic: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_stoic.webp'),
  caring: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_caring.webp'),
  bold: require('../../../../assets/images/ui/create-agent/options/standard/personality/personality_bold.webp'),
};

function r18OrLocal(
  local: ImageSourcePropType | undefined,
  r18Path: string,
  r18: boolean,
): ImageSourcePropType | undefined {
  if (local === undefined) return undefined;
  return r18 ? appStaticImage(r18Path) : local;
}

export function getStyleGenderImage(
  gender: string,
  artStyle = 'realistic',
  r18 = false,
): ImageSourcePropType | undefined {
  return r18OrLocal(
    STYLE_GENDER[gender]?.[artStyle],
    `ui/create-agent/options/r18/style/style_gender_${gender}_${artStyle}.webp`,
    r18,
  );
}

export function getEthnicityImage(id: string, r18 = false): ImageSourcePropType | undefined {
  return r18OrLocal(
    ETHNICITY[id],
    `ui/create-agent/options/r18/basics/basics_ethnicity_${id}.webp`,
    r18,
  );
}

export function getHairStyleImage(id: string, r18 = false): ImageSourcePropType | undefined {
  return r18OrLocal(
    HAIR[id],
    `ui/create-agent/options/r18/basics/basics_hair_${id}.webp`,
    r18,
  );
}

export function getBodyTypeImage(id: string, r18 = false): ImageSourcePropType | undefined {
  return r18OrLocal(
    BODY[id],
    `ui/create-agent/options/r18/basics/basics_body_${id}.webp`,
    r18,
  );
}

export function getPersonalityImage(id: string, r18 = false): ImageSourcePropType | undefined {
  return r18OrLocal(
    PERSONALITY[id],
    `ui/create-agent/options/r18/personality/personality_${id}.webp`,
    r18,
  );
}
