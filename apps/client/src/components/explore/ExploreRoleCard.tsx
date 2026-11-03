import React from 'react';
import { RoleGridCard, type RoleGridCardVariant } from '../agent/RoleGridCard';
import type { ExploreRoleItem } from '../../types/api';
import type { Lang } from '../../i18n/types';

interface ExploreRoleCardProps {
  item: ExploreRoleItem;
  uiLang: Lang;
  variant?: RoleGridCardVariant;
  onPress: (id: string) => void;
}

export function ExploreRoleCard({ item, uiLang, variant = 'grid', onPress }: ExploreRoleCardProps) {
  return (
    <RoleGridCard
      item={item}
      variant={variant}
      uiLang={uiLang}
      onPress={onPress}
      showCommunityStats
    />
  );
}
