import { Platform, type ImageSourcePropType } from 'react-native';
import { appStaticImage } from '../utils/appStaticAssets';

function igPreview(file: string): ImageSourcePropType {
  return appStaticImage(`ui/creation-center/image-gen/${file}`);
}

/** Structured prompt parts for Creation Center image gen (Character / Pose / Clothing / Scene). */

export type ImageGenCategory = 'character' | 'pose' | 'clothing' | 'scene';

export type ImageGenPresetOption = {
  id: string;
  /** i18n key under creationCenter.* */
  labelKey: string;
  /** English prompt fragment composed into the final prompt */
  promptPart: string;
  /** Optional emoji / symbol fallback */
  emoji?: string;
  /** Preview thumbnail (bundled plate or R2 URI) */
  preview?: ImageSourcePropType;
};

export const IMAGE_GEN_CATEGORIES: ImageGenCategory[] = [
  'character',
  'pose',
  'clothing',
  'scene',
];

/** iOS App Store：仅用干净姿势预设。 */
const POSE_PRESETS_SFW: ImageGenPresetOption[] = [
  {
    id: 'portrait',
    labelKey: 'creationCenter.posePortraitSafe',
    promptPart:
      'friendly close-up portrait, soft natural smile, looking at viewer, clean head-and-shoulders framing',
  },
  {
    id: 'standing',
    labelKey: 'creationCenter.poseStandingSafe',
    promptPart:
      'full-body standing pose, relaxed upright posture, arms naturally at sides, entire body centered in frame with safe margins',
  },
  {
    id: 'sitting',
    labelKey: 'creationCenter.poseSittingSafe',
    promptPart:
      'sitting casually on a chair, upright posture, hands resting on lap, calm everyday expression',
  },
  {
    id: 'leaning',
    labelKey: 'creationCenter.poseLeaningSafe',
    promptPart:
      'leaning lightly against a railing or wall, relaxed casual stance, gentle smile, medium framing',
  },
  {
    id: 'over_shoulder',
    labelKey: 'creationCenter.poseOverShoulderSafe',
    promptPart:
      'looking back over the shoulder with a friendly glance, natural three-quarter turn, casual lifestyle photo',
  },
  {
    id: 'walking',
    labelKey: 'creationCenter.poseWalking',
    promptPart:
      'walking toward camera at a natural pace, full-body street-style shot, entire body centered in frame with safe margins',
  },
  {
    id: 'waving',
    labelKey: 'creationCenter.poseWaving',
    promptPart:
      'waving hello with one hand raised, cheerful expression, medium full-body framing',
  },
  {
    id: 'crossed_arms',
    labelKey: 'creationCenter.poseCrossedArms',
    promptPart:
      'standing with arms crossed confidently, straight posture, calm professional look, medium shot',
  },
  {
    id: 'hands_pockets',
    labelKey: 'creationCenter.poseHandsPockets',
    promptPart:
      'standing with hands in pockets, relaxed street style, full-body centered in frame with safe margins',
  },
  {
    id: 'reading',
    labelKey: 'creationCenter.poseReading',
    promptPart:
      'sitting and reading a book, focused gentle expression, cozy lifestyle framing',
  },
  {
    id: 'coffee',
    labelKey: 'creationCenter.poseCoffee',
    promptPart:
      'holding a coffee cup with both hands, soft smile, cafe lifestyle portrait',
  },
  {
    id: 'peace_sign',
    labelKey: 'creationCenter.posePeaceSign',
    promptPart:
      'casual selfie pose with a peace sign near the face, bright friendly expression, head-and-shoulders framing',
  },
  {
    id: 'three_quarter',
    labelKey: 'creationCenter.poseThreeQuarter',
    promptPart:
      'classic three-quarter fashion pose, one foot slightly forward, natural editorial stance, full body in frame',
  },
  {
    id: 'profile',
    labelKey: 'creationCenter.poseProfile',
    promptPart:
      'clean side-profile portrait looking left, calm expression, soft studio lighting',
  },
];

/** Web / Android：成人向姿势预设（遮点，不露点）。 */
const POSE_PRESETS_MATURE: ImageGenPresetOption[] = [
  {
    id: 'portrait',
    labelKey: 'creationCenter.posePortrait',
    promptPart:
      'sultry close-up portrait, bedroom eyes, parted lips, looking at viewer with seductive gaze, intimate framing',
    preview: igPreview('pose_portrait.webp'),
  },
  {
    id: 'standing',
    labelKey: 'creationCenter.poseStanding',
    promptPart:
      'full-body standing seductive pose, hip cocked, arched back, chest pushed forward, inviting eye contact, entire body centered in frame with safe margins',
    preview: igPreview('pose_standing.webp'),
  },
  {
    id: 'sitting',
    labelKey: 'creationCenter.poseSitting',
    promptPart:
      'sitting with thighs pressed together then slightly parted, leaning back, provocative lounge pose',
    preview: igPreview('pose_sitting.webp'),
  },
  {
    id: 'leaning',
    labelKey: 'creationCenter.poseLeaning',
    promptPart:
      'leaning forward toward camera, deep cleavage angle, seductive smile, intimate close framing',
    preview: igPreview('pose_leaning.webp'),
  },
  {
    id: 'over_shoulder',
    labelKey: 'creationCenter.poseOverShoulder',
    promptPart:
      'looking back over the shoulder, arched spine, teasing glance, sensual rear three-quarter view',
    preview: igPreview('pose_over_shoulder.webp'),
  },
  {
    id: 'missionary',
    labelKey: 'creationCenter.poseMissionary',
    promptPart:
      'lying on back missionary-tease pose, knees raised, legs slightly open, looking up at viewer invitingly, body covered by lingerie fabric, full body centered in frame with safe margins, erotic bedroom framing, no nudity',
    preview: igPreview('pose_missionary.webp'),
  },
  {
    id: 'doggy',
    labelKey: 'creationCenter.poseDoggy',
    promptPart:
      'on all fours doggy-style tease pose, arched back, looking back over shoulder, hips raised, full body centered in frame with safe margins, clothed erotic angle, no nudity',
    preview: igPreview('pose_doggy.webp'),
  },
  {
    id: 'cowgirl',
    labelKey: 'creationCenter.poseCowgirl',
    promptPart:
      'straddling cowgirl tease pose sitting astride, hands on thighs, looking down seductively, full body centered in frame with safe margins, clothed, erotic dominant framing, no nudity',
    preview: igPreview('pose_cowgirl.webp'),
  },
  {
    id: 'against_wall',
    labelKey: 'creationCenter.poseAgainstWall',
    promptPart:
      'pressed against the wall, one leg lifted, hands above head, breathless sensual expression, intimate close body contact pose',
    preview: igPreview('pose_against_wall.webp'),
  },
  {
    id: 'on_knees',
    labelKey: 'creationCenter.poseOnKnees',
    promptPart:
      'kneeling on the bed facing viewer, hands on thighs, looking up with obedient seductive eyes, erotic submissive pose, clothed',
    preview: igPreview('pose_on_knees.webp'),
  },
  {
    id: 'arching',
    labelKey: 'creationCenter.poseArching',
    promptPart:
      'lying on bed arched back, chest lifted, head tilted back in pleasure, sensual body curve, fabric covering intimate areas',
    preview: igPreview('pose_arching.webp'),
  },
  {
    id: 'pinup',
    labelKey: 'creationCenter.posePinup',
    promptPart:
      'classic erotic pin-up pose, one knee bent, hand in hair, playful teasing smile, glamorous seductive body language',
    preview: igPreview('pose_pinup.webp'),
  },
  {
    id: 'spreading',
    labelKey: 'creationCenter.poseSpreading',
    promptPart:
      'sitting with legs spread teasingly toward camera, hands resting on inner thighs, intense eye contact, underwear covering, highly erotic, no nudity no genitals',
    preview: igPreview('pose_spreading.webp'),
  },
  {
    id: 'from_behind',
    labelKey: 'creationCenter.poseFromBehind',
    promptPart:
      'standing from behind looking back, hands on hips, emphasizing curves and hips, teasing rear view, clothed, erotic',
    preview: igPreview('pose_from_behind.webp'),
  },
];

/** iOS：日常/得体服装。 */
const CLOTHING_PRESETS_SFW: ImageGenPresetOption[] = [
  {
    id: 'casual',
    labelKey: 'creationCenter.clothingCasual',
    promptPart:
      'casual everyday outfit, neat t-shirt and jeans, comfortable sneakers, modest coverage',
  },
  {
    id: 'sweater',
    labelKey: 'creationCenter.clothingSweater',
    promptPart:
      'cozy knit sweater and long pants, soft autumn layers, fully covered modest look',
  },
  {
    id: 'hoodie',
    labelKey: 'creationCenter.clothingHoodie',
    promptPart:
      'hoodie with casual pants and sneakers, relaxed streetwear, fully covered',
  },
  {
    id: 'blouse',
    labelKey: 'creationCenter.clothingBlouse',
    promptPart:
      'neat blouse tucked into a knee-length skirt, polished daytime outfit, modest neckline',
  },
  {
    id: 'office',
    labelKey: 'creationCenter.clothingOffice',
    promptPart:
      'business casual blazer over a blouse with tailored trousers, professional office attire',
  },
  {
    id: 'day_dress',
    labelKey: 'creationCenter.clothingDayDress',
    promptPart:
      'modest knee-length day dress with sleeves, clean silhouette, elegant but everyday',
  },
  {
    id: 'evening',
    labelKey: 'creationCenter.clothingEveningSafe',
    promptPart:
      'elegant evening dress with modest neckline and full coverage, formal event look, tasteful glam',
  },
  {
    id: 'sport',
    labelKey: 'creationCenter.clothingSportSafe',
    promptPart:
      'athletic track jacket and joggers, gym-ready sportswear, practical and fully covered',
  },
  {
    id: 'winter',
    labelKey: 'creationCenter.clothingWinter',
    promptPart:
      'winter coat with scarf and boots, layered cold-weather outfit, fully covered',
  },
  {
    id: 'summer',
    labelKey: 'creationCenter.clothingSummer',
    promptPart:
      'light summer blouse and midi skirt, breezy but modest daytime outfit',
  },
  {
    id: 'fantasy',
    labelKey: 'creationCenter.clothingFantasySafe',
    promptPart:
      'fantasy adventure cloak over tunic and trousers, leather belt and boots, fully covered costume',
  },
  {
    id: 'maid',
    labelKey: 'creationCenter.clothingMaidSafe',
    promptPart:
      'classic modest maid uniform with long skirt, apron and long sleeves, fully covered cosplay',
  },
  {
    id: 'school',
    labelKey: 'creationCenter.clothingSchoolSafe',
    promptPart:
      'adult in neat school-inspired uniform, buttoned blouse and knee-length skirt, clearly adult face, modest coverage',
  },
  {
    id: 'kimono',
    labelKey: 'creationCenter.clothingKimono',
    promptPart:
      'traditional kimono with obi sash, neat sleeves and full coverage, cultural formal wear',
  },
];

/** Web / Android：成人向服装预设。 */
const CLOTHING_PRESETS_MATURE: ImageGenPresetOption[] = [
  {
    id: 'lingerie',
    labelKey: 'creationCenter.clothingLingerie',
    promptPart:
      'sexy black lace lingerie set, deep plunge bra covering nipples, matching panties, garter straps, sheer stockings, highly erotic, no nudity',
    preview: igPreview('clothing_lingerie.webp'),
  },
  {
    id: 'micro_bikini',
    labelKey: 'creationCenter.clothingMicroBikini',
    promptPart:
      'tiny micro bikini barely covering breasts and crotch, glossy fabric, extreme revealing swimwear, no nipples no genitals visible',
    preview: igPreview('clothing_micro_bikini.webp'),
  },
  {
    id: 'sheer',
    labelKey: 'creationCenter.clothingSheer',
    promptPart:
      'sheer translucent nightgown over matching lingerie, soft fabric clinging to body curves, teasing see-through look but nipples and genitals covered, erotic',
    preview: igPreview('clothing_sheer.webp'),
  },
  {
    id: 'bodysuit',
    labelKey: 'creationCenter.clothingBodysuit',
    promptPart:
      'skintight shiny latex bodysuit with zipper, hugging every curve, fetish glamorous look, covering completely, erotic silhouette',
    preview: igPreview('clothing_bodysuit.webp'),
  },
  {
    id: 'bunny',
    labelKey: 'creationCenter.clothingBunny',
    promptPart:
      'sexy bunny outfit, deep cut leotard covering, fishnet stockings, bow tie and cuffs, playful erotic cosplay, no nudity',
    preview: igPreview('clothing_bunny.webp'),
  },
  {
    id: 'maid',
    labelKey: 'creationCenter.clothingMaid',
    promptPart:
      'sexy French maid cosplay, short frilly skirt, tight corset top with deep cleavage covered, thigh-high stockings, erotic service vibe',
    preview: igPreview('clothing_maid.webp'),
  },
  {
    id: 'open_shirt',
    labelKey: 'creationCenter.clothingOpenShirt',
    promptPart:
      'unbuttoned oversized shirt over tiny lingerie, teasing open front, long bare legs, morning-after erotic fashion, nipples covered',
    preview: igPreview('clothing_open_shirt.webp'),
  },
  {
    id: 'stockings',
    labelKey: 'creationCenter.clothingStockings',
    promptPart:
      'lingerie with garter belt and sheer black stockings, high heels, focus on legs and hips, seductive stocking fetish look, covered',
    preview: igPreview('clothing_stockings.webp'),
  },
  {
    id: 'evening',
    labelKey: 'creationCenter.clothingEvening',
    promptPart:
      'slinky backless evening dress with extreme plunging neckline, thigh-high slit, clinging satin, glamorous erotic red-carpet look, fabric covering nipples',
    preview: igPreview('clothing_evening.webp'),
  },
  {
    id: 'sport',
    labelKey: 'creationCenter.clothingSport',
    promptPart:
      'skin-tight sports bra and tiny yoga shorts hugging curves, sweaty sheen, gym seduction look, covered, erotic athletic body',
    preview: igPreview('clothing_sport.webp'),
  },
  {
    id: 'school',
    labelKey: 'creationCenter.clothingSchool',
    promptPart:
      'adult woman in sexy shortened school-uniform inspired outfit, unbuttoned blouse, short pleated skirt, thigh highs, clearly adult face, erotic, no nudity',
    preview: igPreview('clothing_school.webp'),
  },
  {
    id: 'harness',
    labelKey: 'creationCenter.clothingHarness',
    promptPart:
      'strappy leather body harness over minimal lingerie, metal rings, fetish club fashion, erotic bondage aesthetic, nipples and genitals covered',
    preview: igPreview('clothing_harness.webp'),
  },
  {
    id: 'wet_look',
    labelKey: 'creationCenter.clothingWetLook',
    promptPart:
      'wet look clingy white shirt and panties, fabric translucent but nipples and genitals still covered by fabric, rain-soaked erotic vibe',
    preview: igPreview('clothing_wet_look.webp'),
  },
  {
    id: 'fantasy',
    labelKey: 'creationCenter.clothingFantasy',
    promptPart:
      'revealing dark fantasy sorceress costume, ornate metal and silk barely covering, deep cleavage, thigh slits, erotic magical couture, no nudity',
    preview: igPreview('clothing_fantasy.webp'),
  },
];

const SCENE_PRESETS_SHARED_BASE: ImageGenPresetOption[] = [
  {
    id: 'studio',
    labelKey: 'creationCenter.sceneStudio',
    promptPart: 'clean studio backdrop, soft professional lighting',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_studio.webp'),
  },
  {
    id: 'city_night',
    labelKey: 'creationCenter.sceneCityNight',
    promptPart: 'neon city night, shallow depth of field, cinematic lights',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_city_night.webp'),
  },
  {
    id: 'cafe',
    labelKey: 'creationCenter.sceneCafe',
    promptPart: 'cozy cafe interior, warm ambient light',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_cafe.webp'),
  },
  {
    id: 'forest',
    labelKey: 'creationCenter.sceneForest',
    promptPart: 'misty forest clearing, soft natural light',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_forest.webp'),
  },
  {
    id: 'beach',
    labelKey: 'creationCenter.sceneBeach',
    promptPart: 'golden-hour beach, warm sunset glow',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_beach.webp'),
  },
];

const SCENE_PRESETS_SFW: ImageGenPresetOption[] = [
  ...SCENE_PRESETS_SHARED_BASE,
  {
    id: 'bedroom',
    labelKey: 'creationCenter.sceneBedroom',
    promptPart:
      'tidy cozy bedroom, neat bedding, warm lamp light, calm private-room atmosphere',
  },
  {
    id: 'cyberpunk',
    labelKey: 'creationCenter.sceneCyberpunk',
    promptPart: 'cyberpunk street, rain reflections, neon signs',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_cyberpunk.webp'),
  },
  {
    id: 'castle',
    labelKey: 'creationCenter.sceneCastle',
    promptPart: 'gothic castle hall, candlelight atmosphere',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_castle.webp'),
  },
  {
    id: 'library',
    labelKey: 'creationCenter.sceneLibrary',
    promptPart: 'quiet library with tall bookshelves, soft reading-lamp light',
  },
  {
    id: 'park',
    labelKey: 'creationCenter.scenePark',
    promptPart: 'sunny city park with trees and benches, natural daylight',
  },
];

const SCENE_PRESETS_MATURE: ImageGenPresetOption[] = [
  ...SCENE_PRESETS_SHARED_BASE,
  {
    id: 'bedroom',
    labelKey: 'creationCenter.sceneBedroom',
    promptPart:
      'intimate bedroom, rumpled sheets, soft lamp light, shallow DOF, erotic private atmosphere',
    preview: igPreview('scene_bedroom.webp'),
  },
  {
    id: 'cyberpunk',
    labelKey: 'creationCenter.sceneCyberpunk',
    promptPart: 'cyberpunk street, rain reflections, neon signs',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_cyberpunk.webp'),
  },
  {
    id: 'castle',
    labelKey: 'creationCenter.sceneCastle',
    promptPart: 'gothic castle hall, candlelight atmosphere',
    preview: require('../../assets/images/ui/creation-center/image-gen/scene_castle.webp'),
  },
];

/** iOS 用干净版；Web / Android 用成人版。 */
const USE_SFW_IMAGE_GEN_PRESETS = Platform.OS === 'ios';

export const POSE_PRESETS: ImageGenPresetOption[] = USE_SFW_IMAGE_GEN_PRESETS
  ? POSE_PRESETS_SFW
  : POSE_PRESETS_MATURE;

export const CLOTHING_PRESETS: ImageGenPresetOption[] = USE_SFW_IMAGE_GEN_PRESETS
  ? CLOTHING_PRESETS_SFW
  : CLOTHING_PRESETS_MATURE;

export const SCENE_PRESETS: ImageGenPresetOption[] = USE_SFW_IMAGE_GEN_PRESETS
  ? SCENE_PRESETS_SFW
  : SCENE_PRESETS_MATURE;

export function presetsForCategory(category: Exclude<ImageGenCategory, 'character'>): ImageGenPresetOption[] {
  switch (category) {
    case 'pose':
      return POSE_PRESETS;
    case 'clothing':
      return CLOTHING_PRESETS;
    case 'scene':
      return SCENE_PRESETS;
  }
}

export function buildComposedImagePrompt(input: {
  characterPrompt?: string;
  posePrompt?: string;
  clothingPrompt?: string;
  scenePrompt?: string;
  customPrompt?: string;
}): string {
  const parts = [
    input.characterPrompt?.trim(),
    input.posePrompt?.trim(),
    input.clothingPrompt?.trim(),
    input.scenePrompt?.trim(),
    input.customPrompt?.trim(),
  ].filter((p): p is string => Boolean(p && p.length > 0));
  return parts.join(', ');
}
