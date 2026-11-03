export type WizardStep = 'style' | 'basics' | 'voice' | 'personality' | 'image';

/** 创建 Agent 向导步骤顺序（voice 在 basics 之后） */
export const WIZARD_STEPS: WizardStep[] = ['style', 'basics', 'voice', 'personality', 'image'];

export type LangId = 'en' | 'zh' | 'jp' | 'ru' | 'es';

export const CANONICAL_LANG: LangId = 'en';

export type LocaleFields = {
  name: string;
  introduction: string;
  personality: string[];
  appearance: string;
  sceneName: string;
  sceneDesc: string;
};

export type StyleDraft = {
  gender?: string;
  /** Apparent age in years, 0–100. */
  age?: number;
  artStyle?: string;
};

/** Preset id for user-written ethnicity / hair / body prompts. */
export const CUSTOM_OPTION_ID = 'custom';

export type BasicsDraft = {
  ethnicity?: string;
  hairStyle?: string;
  bodyType?: string;
  /** Free-text when ethnicity === CUSTOM_OPTION_ID */
  ethnicityCustom?: string;
  hairStyleCustom?: string;
  bodyTypeCustom?: string;
};

export type BasicsCustomField = 'ethnicity' | 'hairStyle' | 'bodyType';

export type OptionDef = {
  id: string;
  labelKey: string;
  emoji?: string;
  appearancePart?: string;
};

/** 初始化各语言表单字段为空 */
export function emptyLocale(): LocaleFields {
  return {
    name: '',
    introduction: '',
    personality: [],
    appearance: '',
    sceneName: '',
    sceneDesc: '',
  };
}
