import React from 'react';
import { useThemePage } from '../../src/theme/useThemePage';
import { DefaultMyWorldsScreen } from '../../src/pages/default/MyWorlds';

export default function WorldListRoute() {
  const ThemedPage = useThemePage({
    default: DefaultMyWorldsScreen,
  });

  if (ThemedPage) {
    return <ThemedPage />;
  }

  return <DefaultMyWorldsScreen />;
}
