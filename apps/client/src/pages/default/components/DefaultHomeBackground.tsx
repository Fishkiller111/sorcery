import React from 'react';
import { DefaultMainBackground } from './DefaultMainBackground';

type DefaultHomeBackgroundProps = {
  sidebarOverlayWidth?: number;
};

export function DefaultHomeBackground({ sidebarOverlayWidth = 0 }: DefaultHomeBackgroundProps) {
  return <DefaultMainBackground sidebarOverlayWidth={sidebarOverlayWidth} />;
}
