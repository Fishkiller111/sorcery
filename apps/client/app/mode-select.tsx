import React from 'react';
import { useThemePage } from '../src/theme/useThemePage';
import { DefaultModeSelect } from '../src/pages/default/ModeSelect';
import { DefaultWorldsExploreScreen } from '../src/pages/default/WorldsExplore';

/** World tab (formerly Mode Select) — explore public story / script worlds. */
export default function ModeSelect() {
  const ThemedPage = useThemePage({
    modern: DefaultWorldsExploreScreen,
    default: DefaultModeSelect,
  });
  if (ThemedPage) return <ThemedPage />;
  return <DefaultWorldsExploreScreen />;
}
