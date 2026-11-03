import React from 'react';
import { useTheme } from '../../theme/system/ThemeContext';
import { AgentConfirmModal } from '../../components/free-chat/AgentConfirmModal';
import {
  DefaultAgentDetailModal,
  type AgentDetailListItem,
  type DefaultAgentDetailModalProps,
} from '../../pages/default/components/DefaultAgentDetailModal';
import type { RoleItem } from '../../types/api';

type ThemedAgentDetailModalProps = {
  visible: boolean;
  role: AgentDetailListItem | null;
  mode: DefaultAgentDetailModalProps['mode'];
  onClose: () => void;
  onStartChat: (roleId: string) => void;
  onViewMedia?: (roleId: string) => void;
  onManage?: (roleId: string) => void;
  onSocialManage?: (roleId: string) => void;
};

export function ThemedAgentDetailModal({
  visible,
  role,
  mode,
  onClose,
  onStartChat,
  onViewMedia,
  onManage,
  onSocialManage,
}: ThemedAgentDetailModalProps) {
  const { themeId, loaded } = useTheme();

  if (themeId === 'default' && loaded) {
    return (
      <DefaultAgentDetailModal
        visible={visible}
        role={role}
        mode={mode}
        onClose={onClose}
        onStartChat={onStartChat}
        onViewMedia={onViewMedia}
        onManage={onManage}
        onSocialManage={onSocialManage}
      />
    );
  }

  if (mode === 'explore' && role) {
    const libraryRole: RoleItem = {
      id: role.id,
      name: role.name,
      scene_name: role.introduction ?? '',
      avatar_url: role.avatar_url,
      figure_url: role.figure_url,
      introduction: role.introduction,
      attributes: role.attributes,
      supported_langs: role.supported_langs,
      categories: role.categories,
      is_owner: false,
      publish_status: 'published',
    };
    return (
      <AgentConfirmModal
        visible={visible}
        role={libraryRole}
        onClose={onClose}
        onStartChat={onStartChat}
      />
    );
  }

  return (
    <AgentConfirmModal
      visible={visible}
      role={role as RoleItem | null}
      onClose={onClose}
      onStartChat={onStartChat}
      onManage={onManage}
      onSocialManage={onSocialManage}
    />
  );
}
