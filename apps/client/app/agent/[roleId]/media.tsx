import React from 'react';
import { useThemePage } from '../../../src/theme/useThemePage';
import { DefaultAgentMediaScreen } from '../../../src/pages/default/AgentMedia';

export default function AgentMediaRoute() {
  const ThemedPage = useThemePage({
    default: DefaultAgentMediaScreen,
  });

  if (ThemedPage) {
    return <ThemedPage />;
  }

  return <DefaultAgentMediaScreen />;
}
