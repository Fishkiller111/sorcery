import React from 'react';
import { useTheme } from '../../theme/system/ThemeContext';
import {
  BODY_MAX_HEIGHT,
  ConfirmModalPanel,
  GeneralConfirmModal,
  type GeneralConfirmModalProps,
} from './GeneralConfirmModal';
import {
  DEFAULT_BODY_MAX_HEIGHT,
  DefaultConfirmModalPanel,
  DefaultGeneralConfirmModal,
} from '../../pages/default/components/DefaultGeneralConfirmModal';

export { BODY_MAX_HEIGHT, DEFAULT_BODY_MAX_HEIGHT };
export type { GeneralConfirmModalProps, ConfirmModalIcon } from './GeneralConfirmModal';

export function ThemedConfirmModalPanel(props: Omit<GeneralConfirmModalProps, 'visible' | 'dismissOnBackdrop'>) {
  const { themeId, loaded } = useTheme();
  if (themeId === 'default' && loaded) {
    return <DefaultConfirmModalPanel {...props} />;
  }
  return <ConfirmModalPanel {...props} />;
}

export function ThemedGeneralConfirmModal(props: GeneralConfirmModalProps) {
  const { themeId, loaded } = useTheme();

  if (themeId === 'default' && loaded) {
    return <DefaultGeneralConfirmModal {...props} />;
  }

  return <GeneralConfirmModal {...props} />;
}
