import React from 'react';
import { useThemePage } from '../src/theme/useThemePage';
import { DefaultChatsScreen } from '../src/pages/default/Chats';

export default function Chats() {
  const ThemedPage = useThemePage({
    default: DefaultChatsScreen,
  });

  if (ThemedPage) {
    return <ThemedPage />;
  }

  return <DefaultChatsScreen />;
}
