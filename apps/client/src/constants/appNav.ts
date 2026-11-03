import type React from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import type { NavItem } from '../components/shell/BottomNav';

export type ModernNavItem = {
  key: string;
  labelKey: string;
  route: string;
  ionicon: React.ComponentProps<typeof Ionicons>['name'];
  activeIonicon: React.ComponentProps<typeof Ionicons>['name'];
  /** Custom PNG pair (Default mobile bottom nav). When set, takes priority over ionicons. */
  icon?: ImageSourcePropType;
  activeIcon?: ImageSourcePropType;
  /** Center Create FAB artwork (includes +). */
  fabIcon?: ImageSourcePropType;
  replace?: boolean;
  requireAuth?: boolean;
};

export function isNavItemActive(pathname: string, route: string): boolean {
  const path = pathname.split('?')[0];
  if (route === '/') {
    return path === '/' || path === '' || path === '/explore';
  }
  // Default theme Chat tab — conversation list + in-chat free-chat rooms
  if (route === '/chats') {
    return path === '/chats' || path.startsWith('/free-chat/');
  }
  if (route === '/free-chat') {
    return (
      path === '/free-chat'
      || path.startsWith('/free-chat/')
      || path.startsWith('/agent/')
    );
  }
  if (route === '/social') {
    return path === '/social' || path.startsWith('/social/');
  }
  // World tab: mode-select catalog + in-world play / editor routes
  if (route === '/mode-select') {
    return (
      path === '/mode-select'
      || path === '/world'
      || path.startsWith('/world/')
      || path === '/create-world'
      || path === '/simulator'
      || path.startsWith('/simulator/')
    );
  }
  if (route === '/affiliate/apply') {
    return path === '/affiliate/apply' || path.startsWith('/affiliate/apply/');
  }
  if (route === '/affiliate') {
    return path === '/affiliate' || path === '/affiliate/';
  }
  return path === route || path.startsWith(`${route}/`);
}

/** Unified primary navigation — desktop SideNav + mobile BottomNav (Soviet theme). */
export const APP_NAV_ITEMS: NavItem[] = [
  {
    key: 'home',
    labelKey: 'nav.home',
    icon: require('../../assets/images/ui/shell/nav_home_pc.png'),
    route: '/',
    replace: true,
  },
  {
    key: 'world',
    labelKey: 'nav.world',
    icon: require('../../assets/images/ui/shell/nav_modes_pc.png'),
    route: '/mode-select',
  },
  {
    key: 'agents',
    labelKey: 'nav.agents',
    ionicon: 'chatbubbles-outline',
    activeIonicon: 'chatbubbles',
    route: '/free-chat',
  },
  {
    key: 'create',
    labelKey: 'nav.create',
    ionicon: 'add-circle-outline',
    activeIonicon: 'add-circle',
    route: '/create-agent',
    requireAuth: true,
  },
  {
    key: 'profile',
    labelKey: 'nav.profile',
    icon: require('../../assets/images/ui/shell/nav_profile_pc.png'),
    route: '/profile',
  },
];

/** Mobile bottom bar uses compact PNG icons where available. */
export const APP_NAV_ITEMS_MOBILE: NavItem[] = [
  {
    key: 'home',
    labelKey: 'nav.home',
    icon: require('../../assets/images/ui/nav/nav_home.png'),
    route: '/',
    replace: true,
  },
  {
    key: 'world',
    labelKey: 'nav.world',
    icon: require('../../assets/images/ui/nav/nav_modes.png'),
    route: '/mode-select',
  },
  {
    key: 'agents',
    labelKey: 'nav.agents',
    ionicon: 'chatbubbles-outline',
    activeIonicon: 'chatbubbles',
    route: '/free-chat',
  },
  {
    key: 'create',
    labelKey: 'nav.create',
    ionicon: 'add-circle-outline',
    activeIonicon: 'add-circle',
    route: '/create-agent',
    requireAuth: true,
  },
  {
    key: 'profile',
    labelKey: 'nav.profile',
    icon: require('../../assets/images/ui/nav/nav_profile.png'),
    route: '/profile',
  },
];

/** Unified primary navigation — Modern theme shell. */
export const MODERN_APP_NAV_ITEMS: ModernNavItem[] = [
  {
    key: 'home',
    labelKey: 'nav.home',
    route: '/',
    ionicon: 'compass-outline',
    activeIonicon: 'compass',
    replace: true,
  },
  {
    key: 'world',
    labelKey: 'nav.world',
    route: '/mode-select',
    ionicon: 'grid-outline',
    activeIonicon: 'grid',
  },
  {
    key: 'agents',
    labelKey: 'nav.agents',
    route: '/free-chat',
    ionicon: 'chatbubbles-outline',
    activeIonicon: 'chatbubbles',
  },
  {
    key: 'create',
    labelKey: 'nav.create',
    route: '/create-agent',
    ionicon: 'add-circle-outline',
    activeIonicon: 'add-circle',
    requireAuth: true,
  },
  {
    key: 'profile',
    labelKey: 'nav.profile',
    route: '/profile',
    ionicon: 'person-outline',
    activeIonicon: 'person',
  },
];
