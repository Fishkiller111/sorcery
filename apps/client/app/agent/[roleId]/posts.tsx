import React from 'react';
import { useThemePage } from '../../../src/theme/useThemePage';
import { DefaultAgentSocialManageScreen } from '../../../src/pages/default/AgentSocialManage';

export default function AgentSocialManageRoute() {
  const ThemedPage = useThemePage({
    default: DefaultAgentSocialManageScreen,
  });

  if (ThemedPage) {
    return <ThemedPage />;
  }

  return <DefaultAgentSocialManageScreen />;
}
