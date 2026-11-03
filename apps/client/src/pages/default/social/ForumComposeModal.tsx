import React from 'react';
import { SocialComposeModal } from './SocialComposeModal';
import type { ForumBoardSlug } from '../../../types/api';

type Props = {
  visible: boolean;
  board: ForumBoardSlug;
  onClose: () => void;
  onPosted: () => void;
  userAvatarUri?: string | null;
  userDisplayName?: string;
};

/** Forum compose — wraps SocialComposeModal with board + forum APIs. */
export function ForumComposeModal({
  visible,
  board,
  onClose,
  onPosted,
  userAvatarUri,
  userDisplayName,
}: Props) {
  return (
    <SocialComposeModal
      visible={visible}
      onClose={onClose}
      onPosted={onPosted}
      userAvatarUri={userAvatarUri}
      userDisplayName={userDisplayName}
      forumBoard={board}
    />
  );
}
