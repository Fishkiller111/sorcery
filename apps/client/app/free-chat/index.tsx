import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultAgentsScreen } from '../../src/pages/default/Agents';
import FreeChatSoviet from '../../src/pages/soviet/FreeChat';

export default function FreeChat() {
  const ThemedPage = useThemePage({
    default: DefaultAgentsScreen,
  });

  if (ThemedPage) {
    return <ThemedPage />;
  }

  return <FreeChatSoviet />;
}
