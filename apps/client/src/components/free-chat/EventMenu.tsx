import React, { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { MenuPanel, MenuPanelModal } from '../ui/MenuPanel';
import type { FreeChatUiVariant } from './freeChatUi';
import type { RoleEvent } from '../../types/api';
import { resolveRoleEventLabel } from '../../utils/roleEventLabel';

interface EventMenuProps {
  visible: boolean;
  events: RoleEvent[];
  onClose: () => void;
  onTrigger: (eventName: string, displayName: string) => void;
  disabled?: boolean;
  variant?: FreeChatUiVariant;
}

export function EventMenu({
  visible,
  events,
  onClose,
  onTrigger,
  disabled,
  variant = 'soviet',
}: EventMenuProps) {
  const { t } = useI18n();

  const items = useMemo(
    () =>
      events.map((e) => {
        const label = resolveRoleEventLabel(e.event_name, e.display_name, t);
        return {
          key: e.id,
          label,
          disabled,
          onPress: () => {
            if (disabled) return;
            onTrigger(e.event_name, label);
            onClose();
          },
        };
      }),
    [disabled, events, onClose, onTrigger, t],
  );

  return (
    <MenuPanelModal visible={visible} onClose={onClose} placement="top-end">
      <MenuPanel title={t('chat.events')} items={items} variant={variant} />
    </MenuPanelModal>
  );
}
